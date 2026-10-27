import { TrustStatus, UserRole, VerificationStatus, type Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/http-error';
import { decryptText, encryptText } from './encryption.service';
import { gerarMatchesDaStartup } from './matching.service';

export type StatusVerificacao = 'NAO_SOLICITADA' | VerificationStatus;

export interface PedidoVerificacaoInput {
  legalName?: string | null;
  document?: string | null;
  website?: string | null;
  linkedin?: string | null;
  pitchUrl?: string | null;
  evidence: string;
  extraLinks?: string | null;
}

export interface FiltrosVerificacaoAdmin {
  status?: VerificationStatus;
  busca?: string;
  pagina: number;
  porPagina: number;
}

export interface DecisaoVerificacaoInput {
  decisao: 'APROVAR' | 'RECUSAR';
  motivo: string;
}

const usuarioResumo = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  verifiedAt: true,
  trustStatus: true,
  startupProfile: {
    select: {
      id: true,
      companyName: true,
      sector: true,
      stage: true,
      city: true,
      state: true,
      website: true,
      linkedin: true,
      pitchUrl: true,
      description: true,
      hiddenAt: true,
    },
  },
  investorProfile: {
    select: {
      id: true,
      companyName: true,
      sectorInterest: true,
      stageInterest: true,
      ticketMin: true,
      ticketMax: true,
      city: true,
      state: true,
      website: true,
      linkedin: true,
      portfolioUrl: true,
      bio: true,
      hiddenAt: true,
    },
  },
} satisfies Prisma.UserSelect;

type PedidoCompleto = {
  id: string;
  userId: string;
  status: VerificationStatus;
  legalName: string | null;
  document: string | null;
  website: string | null;
  linkedin: string | null;
  pitchUrl: string | null;
  evidence: string;
  extraLinks: string | null;
  submittedAt: Date;
  reviewedById: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
};

function decifrarOpcional(valor: string | null): string | null {
  return valor ? decryptText(valor) : null;
}

function serializarPedido(pedido: PedidoCompleto) {
  return {
    id: pedido.id,
    status: pedido.status,
    legalName: pedido.legalName,
    website: pedido.website,
    linkedin: pedido.linkedin,
    pitchUrl: pedido.pitchUrl,
    document: decifrarOpcional(pedido.document),
    evidence: decryptText(pedido.evidence),
    extraLinks: decifrarOpcional(pedido.extraLinks),
    submittedAt: pedido.submittedAt,
    reviewedAt: pedido.reviewedAt,
    reviewedById: pedido.reviewedById,
    reviewNote: decifrarOpcional(pedido.reviewNote),
  };
}

// GET /v1/me/verification
export async function meuStatusDeVerificacao(userId: string) {
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, verifiedAt: true },
  });

  if (!usuario) {
    throw HttpError.notFound('usuario nao encontrado');
  }

  const ultimo = await prisma.profileVerification.findFirst({
    where: { userId },
    orderBy: { submittedAt: 'desc' },
  });

  const pendente = await prisma.profileVerification.findFirst({
    where: { userId, status: VerificationStatus.PENDENTE },
    select: { id: true },
  });

  const status: StatusVerificacao = usuario.verifiedAt ? 'APROVADA' : (ultimo?.status ?? 'NAO_SOLICITADA');

  return {
    verificado: Boolean(usuario.verifiedAt),
    verificadoEm: usuario.verifiedAt,
    status,
    podeSolicitar: !usuario.verifiedAt && !pendente && usuario.role !== UserRole.ADMIN,
    solicitacao: ultimo ? serializarPedido(ultimo) : null,
  };
}

// POST /v1/me/verification
export async function solicitarVerificacao(userId: string, entrada: PedidoVerificacaoInput) {
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      verifiedAt: true,
      startupProfile: { select: { id: true } },
      investorProfile: { select: { id: true } },
    },
  });

  if (!usuario) {
    throw HttpError.notFound('usuario nao encontrado');
  }

  if (usuario.role === UserRole.ADMIN) {
    throw HttpError.forbidden('contas administrativas nao recebem selo de perfil');
  }

  if (usuario.verifiedAt) {
    throw HttpError.conflict('seu perfil ja esta verificado');
  }

  if (!usuario.startupProfile && !usuario.investorProfile) {
    throw HttpError.badRequest('crie um perfil de startup ou investidor antes de pedir o selo');
  }

  const pendente = await prisma.profileVerification.findFirst({
    where: { userId, status: VerificationStatus.PENDENTE },
    select: { id: true },
  });

  if (pendente) {
    throw HttpError.conflict('ja existe um pedido de verificacao em analise');
  }

  const pedido = await prisma.profileVerification.create({
    data: {
      userId,
      legalName: entrada.legalName?.trim() || null,
      document: entrada.document?.trim() ? encryptText(entrada.document.trim()) : null,
      website: entrada.website?.trim() || null,
      linkedin: entrada.linkedin?.trim() || null,
      pitchUrl: entrada.pitchUrl?.trim() || null,
      evidence: encryptText(entrada.evidence.trim()),
      extraLinks: entrada.extraLinks?.trim() ? encryptText(entrada.extraLinks.trim()) : null,
    },
  });

  return serializarPedido(pedido);
}

function whereDosPedidos(filtros: FiltrosVerificacaoAdmin): Prisma.ProfileVerificationWhereInput {
  return {
    ...(filtros.status ? { status: filtros.status } : {}),
    ...(filtros.busca
      ? {
          user: {
            OR: [
              { name: { contains: filtros.busca, mode: 'insensitive' as const } },
              { email: { contains: filtros.busca, mode: 'insensitive' as const } },
            ],
          },
        }
      : {}),
  };
}

// GET /v1/admin/verifications
export async function listarPedidosAdmin(filtros: FiltrosVerificacaoAdmin) {
  const where = whereDosPedidos(filtros);

  const pedidos = await prisma.profileVerification.findMany({
    where,
    include: { user: { select: usuarioResumo } },
    orderBy: [{ status: 'asc' }, { submittedAt: 'asc' }],
    skip: (filtros.pagina - 1) * filtros.porPagina,
    take: filtros.porPagina,
  });

  const total = await prisma.profileVerification.count({ where });

  const porStatus = await prisma.profileVerification.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  return {
    total,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
    contadores: {
      pendentes: porStatus.find((item) => item.status === VerificationStatus.PENDENTE)?._count._all ?? 0,
      aprovadas: porStatus.find((item) => item.status === VerificationStatus.APROVADA)?._count._all ?? 0,
      recusadas: porStatus.find((item) => item.status === VerificationStatus.RECUSADA)?._count._all ?? 0,
    },
    pedidos: pedidos.map((pedido) => ({
      ...serializarPedido(pedido),
      usuario: {
        id: pedido.user.id,
        name: pedido.user.name,
        email: pedido.user.email,
        role: pedido.user.role,
        status: pedido.user.status,
        trustStatus: pedido.user.trustStatus,
        verificado: Boolean(pedido.user.verifiedAt),
        criadoEm: pedido.user.createdAt,
        startup: pedido.user.startupProfile,
        investidor: pedido.user.investorProfile,
      },
    })),
  };
}

// GET /v1/admin/verifications/:id
export async function detalharPedidoVerificacao(id: string) {
  const pedido = await prisma.profileVerification.findUnique({
    where: { id },
    include: {
      user: { select: usuarioResumo },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  if (!pedido) {
    throw HttpError.notFound('pedido de verificacao nao encontrado');
  }

  return {
    ...serializarPedido(pedido),
    revisadoPor: pedido.reviewedBy,
    usuario: {
      id: pedido.user.id,
      name: pedido.user.name,
      email: pedido.user.email,
      role: pedido.user.role,
      status: pedido.user.status,
      trustStatus: pedido.user.trustStatus,
      verificado: Boolean(pedido.user.verifiedAt),
      criadoEm: pedido.user.createdAt,
      startup: pedido.user.startupProfile,
      investidor: pedido.user.investorProfile,
    },
  };
}

async function recalcularMatchesDoUsuario(startupId?: string, investorId?: string) {
  if (startupId) {
    await gerarMatchesDaStartup(startupId);
    return;
  }

  if (!investorId) {
    return;
  }

  const startups = await prisma.match.findMany({
    where: { investorId },
    select: { startupId: true },
    distinct: ['startupId'],
  });

  for (const { startupId } of startups) {
    await gerarMatchesDaStartup(startupId);
  }
}

// POST /v1/admin/verifications/:id/decision
export async function decidirPedidoVerificacao(id: string, adminId: string, entrada: DecisaoVerificacaoInput) {
  const pedido = await prisma.profileVerification.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      status: true,
      user: {
        select: {
          role: true,
          startupProfile: { select: { id: true } },
          investorProfile: { select: { id: true } },
        },
      },
    },
  });

  if (!pedido) {
    throw HttpError.notFound('pedido de verificacao nao encontrado');
  }

  if (pedido.status !== VerificationStatus.PENDENTE) {
    throw HttpError.conflict('este pedido ja foi decidido');
  }

  if (pedido.user.role === UserRole.ADMIN) {
    throw HttpError.badRequest('contas administrativas nao recebem selo de perfil');
  }

  const aprovado = entrada.decisao === 'APROVAR';
  const agora = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.profileVerification.update({
      where: { id },
      data: {
        status: aprovado ? VerificationStatus.APROVADA : VerificationStatus.RECUSADA,
        reviewedById: adminId,
        reviewedAt: agora,
        reviewNote: encryptText(entrada.motivo.trim()),
      },
    });

    if (aprovado) {
      await tx.user.update({
        where: { id: pedido.userId },
        data: {
          verifiedAt: agora,
          trustStatus: TrustStatus.CONFIAVEL,
          trustReason: null,
          trustUpdatedAt: agora,
        },
      });
    }
  });

  if (aprovado) {
    await recalcularMatchesDoUsuario(pedido.user.startupProfile?.id, pedido.user.investorProfile?.id);
  }

  return detalharPedidoVerificacao(id);
}
