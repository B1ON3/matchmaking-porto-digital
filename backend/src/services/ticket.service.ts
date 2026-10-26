import { randomUUID } from 'node:crypto';
import {
  TicketActionType,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TrustStatus,
  UserRole,
  UserStatus,
  type Prisma,
} from '@prisma/client';
import { prisma } from '../config/prisma';
import { decryptText, encryptText } from './encryption.service';
import { HttpError } from '../utils/http-error';

type Viewer = {
  id: string;
  role: UserRole;
};

export interface NovoTicketInput {
  category: TicketCategory;
  subject: string;
  description: string;
  targetUserId?: string | null;
  priority?: TicketPriority;
}

export interface FiltrosChamadosAdmin {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  busca?: string;
  pagina: number;
  porPagina: number;
}

export interface AcaoChamadoInput {
  acao: TicketActionType;
  motivo: string;
  observacao?: string;
}

const usuarioPublico = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  trustStatus: true,
} satisfies Prisma.UserSelect;

const mensagemInclude = {
  sender: { select: { id: true, name: true, role: true } },
} satisfies Prisma.TicketMessageInclude;

type MensagemComAutor = Prisma.TicketMessageGetPayload<{ include: typeof mensagemInclude }>;

const CATEGORIAS_COM_ALVO: TicketCategory[] = [
  TicketCategory.GOLPE,
  TicketCategory.PERFIL_FALSO,
  TicketCategory.ASSEDIO,
  TicketCategory.SPAM,
  TicketCategory.DADOS_INCORRETOS,
];

function decifrar(valor: string): string {
  return decryptText(valor);
}

function serializarMensagem(mensagem: MensagemComAutor) {
  return { ...mensagem, content: decifrar(mensagem.content) };
}

function gerarProtocolo(): string {
  const ano = new Date().getFullYear();
  return `CH-${ano}-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function prioridadePadrao(category: TicketCategory): TicketPriority {
  if (
    category === TicketCategory.GOLPE ||
    category === TicketCategory.PERFIL_FALSO ||
    category === TicketCategory.ASSEDIO
  ) {
    return TicketPriority.ALTA;
  }

  if (category === TicketCategory.SPAM || category === TicketCategory.DADOS_INCORRETOS) {
    return TicketPriority.NORMAL;
  }

  return TicketPriority.BAIXA;
}

async function buscarAcesso(ticketId: string, viewer: Viewer) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, reporterId: true, targetUserId: true, status: true, protocol: true },
  });

  if (!ticket) {
    throw HttpError.notFound('chamado nao encontrado');
  }

  if (viewer.role !== UserRole.ADMIN && ticket.reporterId !== viewer.id) {
    throw HttpError.forbidden('voce nao participa deste chamado');
  }

  return ticket;
}

export async function criarChamado(viewer: Viewer, input: NovoTicketInput) {
  if (viewer.role === UserRole.ADMIN) {
    throw HttpError.forbidden('a administracao nao abre chamados em nome de usuarios');
  }

  if (CATEGORIAS_COM_ALVO.includes(input.category) && !input.targetUserId) {
    throw HttpError.badRequest('selecione a pessoa ou o perfil que voce quer denunciar');
  }

  if (input.targetUserId) {
    if (input.targetUserId === viewer.id) {
      throw HttpError.badRequest('voce nao pode abrir um chamado contra si mesmo');
    }

    const alvo = await prisma.user.findUnique({
      where: { id: input.targetUserId },
      select: { id: true, role: true, status: true },
    });

    if (!alvo || alvo.status === UserStatus.EXCLUIDO) {
      throw HttpError.notFound('pessoa denunciada nao encontrada');
    }

    if (alvo.role === UserRole.ADMIN) {
      throw HttpError.badRequest('nao e possivel denunciar uma conta administrativa por aqui');
    }

    const conexao = await prisma.match.findFirst({
      where: {
        OR: [
          { startup: { userId: viewer.id }, investor: { userId: input.targetUserId } },
          { startup: { userId: input.targetUserId }, investor: { userId: viewer.id } },
        ],
      },
      select: { id: true },
    });

    if (!conexao) {
      throw HttpError.forbidden('so e possivel denunciar alguem com quem voce ja tem uma conexao');
    }
  }

  const chamado = await prisma.ticket.create({
    data: {
      protocol: gerarProtocolo(),
      category: input.category,
      subject: input.subject.trim(),
      description: encryptText(input.description.trim()),
      priority: input.priority ?? prioridadePadrao(input.category),
      reporterId: viewer.id,
      targetUserId: input.targetUserId ?? null,
      messages: {
        create: {
          senderId: viewer.id,
          content: encryptText(input.description.trim()),
        },
      },
    },
    include: {
      targetUser: { select: usuarioPublico },
      reporter: { select: usuarioPublico },
      messages: { include: mensagemInclude, orderBy: { createdAt: 'asc' } },
    },
  });

  return {
    ...chamado,
    description: decifrar(chamado.description),
    messages: chamado.messages.map(serializarMensagem),
  };
}

export async function listarMeusChamados(viewer: Viewer) {
  const chamados = await prisma.ticket.findMany({
    where: { reporterId: viewer.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      targetUser: { select: usuarioPublico },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, include: mensagemInclude },
      _count: {
        select: {
          messages: { where: { readAt: null, senderId: { not: viewer.id } } },
        },
      },
    },
  });

  return chamados.map((chamado) => ({
    ...chamado,
    description: decifrar(chamado.description),
    messages: chamado.messages.map(serializarMensagem),
    naoLidas: chamado._count.messages,
  }));
}

export async function detalharMeuChamado(ticketId: string, viewer: Viewer) {
  const chamado = await prisma.ticket.findFirst({
    where: { id: ticketId, reporterId: viewer.id },
    include: {
      targetUser: { select: usuarioPublico },
      reporter: { select: usuarioPublico },
      messages: { orderBy: { createdAt: 'asc' }, include: mensagemInclude },
    },
  });

  if (!chamado) {
    throw HttpError.notFound('chamado nao encontrado');
  }

  return {
    ...chamado,
    description: decifrar(chamado.description),
    resolution: chamado.resolution ? decifrar(chamado.resolution) : null,
    messages: chamado.messages.map(serializarMensagem),
  };
}

export async function enviarMensagemChamado(ticketId: string, viewer: Viewer, content: string) {
  const chamado = await buscarAcesso(ticketId, viewer);

  if (chamado.status === TicketStatus.ARQUIVADO) {
    throw HttpError.conflict('este chamado foi arquivado e nao aceita novas mensagens');
  }

  const mensagem = await prisma.ticketMessage.create({
    data: {
      ticketId,
      senderId: viewer.id,
      content: encryptText(content.trim()),
    },
    include: mensagemInclude,
  });

  const statusNovo =
    chamado.status === TicketStatus.ABERTO || chamado.status === TicketStatus.AGUARDANDO_USUARIO
      ? TicketStatus.EM_ANALISE
      : undefined;

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ...(statusNovo ? { status: statusNovo } : {}),
      updatedAt: new Date(),
    },
  });

  return serializarMensagem(mensagem);
}

export async function marcarChamadoLido(ticketId: string, viewer: Viewer) {
  await buscarAcesso(ticketId, viewer);

  const resultado = await prisma.ticketMessage.updateMany({
    where: {
      ticketId,
      readAt: null,
      senderId: { not: viewer.id },
    },
    data: { readAt: new Date() },
  });

  return { updated: resultado.count };
}

export async function contarNaoLidos(viewer: Viewer) {
  const total =
    viewer.role === UserRole.ADMIN
      ? await prisma.ticketMessage.count({
          where: { readAt: null, sender: { role: { not: UserRole.ADMIN } } },
        })
      : await prisma.ticketMessage.count({
          where: {
            readAt: null,
            sender: { role: UserRole.ADMIN },
            ticket: { reporterId: viewer.id },
          },
        });

  return { total };
}

export async function listarChamadosAdmin(filtros: FiltrosChamadosAdmin) {
  const { status, category, priority, busca, pagina, porPagina } = filtros;

  const where: Prisma.TicketWhereInput = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(priority ? { priority } : {}),
    ...(busca
      ? {
          OR: [
            { protocol: { contains: busca, mode: 'insensitive' } },
            { subject: { contains: busca, mode: 'insensitive' } },
            { reporter: { name: { contains: busca, mode: 'insensitive' } } },
            { targetUser: { name: { contains: busca, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [chamados, total, porStatus] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        reporter: { select: usuarioPublico },
        targetUser: { select: usuarioPublico },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: mensagemInclude },
        _count: {
          select: {
            messages: { where: { readAt: null, sender: { role: { not: UserRole.ADMIN } } } },
          },
        },
      },
    }),
    prisma.ticket.count({ where }),
    prisma.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  return {
    total,
    pagina,
    porPagina,
    resumo: {
      abertos: porStatus.find((item) => item.status === TicketStatus.ABERTO)?._count._all ?? 0,
      emAnalise: porStatus.find((item) => item.status === TicketStatus.EM_ANALISE)?._count._all ?? 0,
      aguardandoUsuario: porStatus.find((item) => item.status === TicketStatus.AGUARDANDO_USUARIO)?._count._all ?? 0,
      resolvidos: porStatus.find((item) => item.status === TicketStatus.RESOLVIDO)?._count._all ?? 0,
      arquivados: porStatus.find((item) => item.status === TicketStatus.ARQUIVADO)?._count._all ?? 0,
    },
    chamados: chamados.map((chamado) => ({
      ...chamado,
      description: decifrar(chamado.description),
      messages: chamado.messages.map(serializarMensagem),
      naoLidas: chamado._count.messages,
    })),
  };
}

async function contextoDoAlvo(targetUserId: string) {
  const alvo = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      ...usuarioPublico,
      trustReason: true,
      trustUpdatedAt: true,
      createdAt: true,
      lastLoginAt: true,
      suspendedAt: true,
      moderationReason: true,
      startupProfile: { include: { user: { select: usuarioPublico } } },
      investorProfile: { include: { user: { select: usuarioPublico } } },
    },
  });

  if (!alvo) {
    return null;
  }

  const [matches, appointments] = await Promise.all([
    prisma.match.findMany({
      where: {
        OR: [{ startup: { userId: targetUserId } }, { investor: { userId: targetUserId } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        startup: {
          select: { companyName: true, userId: true, user: { select: { name: true } } },
        },
        investor: {
          select: { companyName: true, userId: true, user: { select: { name: true } } },
        },
      },
    }),
    prisma.appointment.findMany({
      where: {
        OR: [
          { createdById: targetUserId },
          {
            match: {
              is: {
                OR: [{ startup: { userId: targetUserId } }, { investor: { userId: targetUserId } }],
              },
            },
          },
        ],
      },
      orderBy: { scheduledAt: 'desc' },
      take: 30,
      include: {
        createdBy: { select: { id: true, name: true } },
        match: {
          select: {
            id: true,
            score: true,
            status: true,
            startup: { select: { companyName: true } },
            investor: { select: { companyName: true } },
          },
        },
      },
    }),
  ]);

  return {
    alvo,
    matches: matches.map((match) => ({
      id: match.id,
      score: match.score,
      status: match.status,
      createdAt: match.createdAt,
      startup: match.startup.companyName || match.startup.user.name,
      investor: match.investor.companyName || match.investor.user.name,
    })),
    appointments: appointments.map((agendamento) => ({
      id: agendamento.id,
      title: agendamento.title,
      scheduledAt: agendamento.scheduledAt,
      durationMinutes: agendamento.durationMinutes,
      status: agendamento.status,
      createdAt: agendamento.createdAt,
      createdBy: agendamento.createdBy.name,
      match: agendamento.match
        ? {
            id: agendamento.match.id,
            score: agendamento.match.score,
            status: agendamento.match.status,
            startup: agendamento.match.startup.companyName,
            investor: agendamento.match.investor.companyName,
          }
        : null,
    })),
  };
}

export async function detalharChamadoAdmin(ticketId: string, admin: Viewer) {
  const chamado = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      reporter: { select: usuarioPublico },
      targetUser: { select: usuarioPublico },
      messages: { orderBy: { createdAt: 'asc' }, include: mensagemInclude },
      actions: {
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { id: true, name: true } } },
      },
    },
  });

  if (!chamado) {
    throw HttpError.notFound('chamado nao encontrado');
  }

  const [acessoRegistrado, contexto] = await Promise.all([
    prisma.ticketAction.findFirst({
      where: { ticketId, adminId: admin.id, action: TicketActionType.ACESSO_AUTORIZADO },
      select: { id: true },
    }),
    chamado.targetUserId ? contextoDoAlvo(chamado.targetUserId) : Promise.resolve(null),
  ]);

  if (!acessoRegistrado) {
    await prisma.ticketAction.create({
      data: {
        ticketId,
        adminId: admin.id,
        action: TicketActionType.ACESSO_AUTORIZADO,
        notes: encryptText('Acesso ao contexto do chamado registrado para auditoria.'),
      },
    });
  }

  return {
    ...chamado,
    description: decifrar(chamado.description),
    resolution: chamado.resolution ? decifrar(chamado.resolution) : null,
    messages: chamado.messages.map(serializarMensagem),
    actions: chamado.actions.map((acao) => ({
      ...acao,
      notes: acao.notes ? decifrar(acao.notes) : null,
    })),
    contexto,
  };
}

export async function atualizarStatusChamado(
  ticketId: string,
  admin: Viewer,
  status: TicketStatus,
  resolution?: string,
) {
  const chamado = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });

  if (!chamado) {
    throw HttpError.notFound('chamado nao encontrado');
  }

  const finalizado = status === TicketStatus.RESOLVIDO || status === TicketStatus.ARQUIVADO;

  await prisma.$transaction([
    prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status,
        resolvedAt: finalizado ? new Date() : null,
        ...(resolution ? { resolution: encryptText(resolution) } : {}),
      },
    }),
    prisma.ticketAction.create({
      data: {
        ticketId,
        adminId: admin.id,
        action: TicketActionType.OBSERVACAO,
        notes: encryptText(`Status alterado para ${status}${resolution ? `: ${resolution}` : ''}`),
      },
    }),
  ]);

  return detalharChamadoAdmin(ticketId, admin);
}

async function localizarPerfilDoAlvo(userId: string) {
  const [startup, investor] = await Promise.all([
    prisma.startupProfile.findUnique({ where: { userId }, select: { id: true, hiddenAt: true } }),
    prisma.investorProfile.findUnique({ where: { userId }, select: { id: true, hiddenAt: true } }),
  ]);

  if (startup) {
    return { tipo: 'STARTUP' as const, id: startup.id, hiddenAt: startup.hiddenAt };
  }

  if (investor) {
    return { tipo: 'INVESTOR' as const, id: investor.id, hiddenAt: investor.hiddenAt };
  }

  return null;
}

export async function executarAcaoChamado(ticketId: string, admin: Viewer, input: AcaoChamadoInput) {
  const chamado = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      targetUserId: true,
      targetUser: {
        select: { id: true, role: true, status: true, trustStatus: true },
      },
    },
  });

  if (!chamado) {
    throw HttpError.notFound('chamado nao encontrado');
  }

  const acao = input.acao;

  if (acao === TicketActionType.ACESSO_AUTORIZADO) {
    throw HttpError.badRequest('essa acao e registrada automaticamente pelo sistema');
  }

  if (acao !== TicketActionType.OBSERVACAO && !chamado.targetUserId) {
    throw HttpError.badRequest('este chamado nao tem uma pessoa denunciada para receber essa acao');
  }

  const alvo = chamado.targetUser;

  if (alvo?.role === UserRole.ADMIN) {
    throw HttpError.badRequest('contas administrativas nao podem ser moderadas por chamados');
  }

  if (alvo?.status === UserStatus.EXCLUIDO) {
    throw HttpError.badRequest('a conta denunciada foi excluida e nao pode ser moderada');
  }

  switch (acao) {
    case TicketActionType.USUARIO_SUSPENSO: {
      if (!alvo) {
        throw HttpError.notFound('pessoa denunciada nao encontrada');
      }

      if (alvo.status === UserStatus.SUSPENSO) {
        throw HttpError.conflict('esta conta ja esta suspensa');
      }

      await prisma.user.update({
        where: { id: alvo.id },
        data: {
          status: UserStatus.SUSPENSO,
          suspendedAt: new Date(),
          moderationReason: input.motivo,
        },
      });
      break;
    }

    case TicketActionType.USUARIO_REATIVADO: {
      if (!alvo) {
        throw HttpError.notFound('pessoa denunciada nao encontrada');
      }

      if (alvo.status === UserStatus.ATIVO) {
        throw HttpError.conflict('esta conta ja esta ativa');
      }

      await prisma.user.update({
        where: { id: alvo.id },
        data: {
          status: UserStatus.ATIVO,
          suspendedAt: null,
          moderationReason: null,
        },
      });
      break;
    }

    case TicketActionType.PERFIL_OCULTADO:
    case TicketActionType.PERFIL_RESTAURADO: {
      if (!alvo) {
        throw HttpError.notFound('pessoa denunciada nao encontrada');
      }

      const perfil = await localizarPerfilDoAlvo(alvo.id);

      if (!perfil) {
        throw HttpError.badRequest('esta pessoa nao tem perfil publico para ocultar ou restaurar');
      }

      const ocultar = acao === TicketActionType.PERFIL_OCULTADO;

      if (ocultar && perfil.hiddenAt) {
        throw HttpError.conflict('este perfil ja esta oculto');
      }

      if (!ocultar && !perfil.hiddenAt) {
        throw HttpError.conflict('este perfil ja esta visivel');
      }

      if (perfil.tipo === 'STARTUP') {
        await prisma.startupProfile.update({
          where: { id: perfil.id },
          data: { hiddenAt: ocultar ? new Date() : null },
        });
      } else {
        await prisma.investorProfile.update({
          where: { id: perfil.id },
          data: { hiddenAt: ocultar ? new Date() : null },
        });
      }
      break;
    }

    case TicketActionType.GOLPE_CONFIRMADO:
    case TicketActionType.SUSPEITA_MARCADA:
    case TicketActionType.GOLPE_DESCARTADO:
    case TicketActionType.SUSPEITA_REMOVIDA: {
      if (!alvo) {
        throw HttpError.notFound('pessoa denunciada nao encontrada');
      }

      const trustStatus =
        acao === TicketActionType.GOLPE_CONFIRMADO
          ? TrustStatus.GOLPE
          : acao === TicketActionType.SUSPEITA_MARCADA
            ? TrustStatus.SUSPEITO
            : TrustStatus.CONFIAVEL;

      await prisma.user.update({
        where: { id: alvo.id },
        data: {
          trustStatus,
          trustReason: trustStatus === TrustStatus.CONFIAVEL ? null : input.motivo,
          trustUpdatedAt: new Date(),
        },
      });
      break;
    }

    case TicketActionType.OBSERVACAO:
      break;

    default:
      throw HttpError.badRequest('acao de chamado nao suportada');
  }

  await prisma.ticketAction.create({
    data: {
      ticketId,
      adminId: admin.id,
      action: acao,
      notes: encryptText(input.observacao?.trim() || input.motivo),
    },
  });

  await prisma.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });

  return detalharChamadoAdmin(ticketId, admin);
}
