import { MatchStatus, TicketStatus, UserRole, VerificationStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/http-error';
import { calculaSetor, normalizarTexto } from './matching.rules';

type Viewer = {
  id: string;
  role: UserRole;
};

type InsightFactor = {
  key: string;
  label: string;
  value: number;
  weight: number;
};

type MarketPotential = {
  score: number;
  label: 'Baixo' | 'Moderado' | 'Alto' | 'Muito alto';
  factors: InsightFactor[];
  disclaimer: string;
};

const DISCLAIMER =
  'Estimativa heurística baseada nos dados da plataforma. Não é previsão de mercado nem recomendação de investimento.';

const ESTADOS_NORDESTE = ['PE', 'PB', 'RN', 'CE', 'AL', 'SE', 'BA', 'PI', 'MA'];

const MOMENTO_ESTAGIO: Record<string, number> = {
  ideacao: 40,
  'pre-seed': 60,
  seed: 80,
  'serie a': 90,
  'serie b': 100,
};

function arredondar(valor: number): number {
  return Math.round(valor);
}

function percentual(parte: number, total: number): number {
  return total > 0 ? arredondar((parte / total) * 100) : 0;
}

function rotuloPotencial(score: number): MarketPotential['label'] {
  if (score >= 80) {
    return 'Muito alto';
  }

  if (score >= 60) {
    return 'Alto';
  }

  if (score >= 40) {
    return 'Moderado';
  }

  return 'Baixo';
}

function momentoDoEstagio(stage: string): number {
  return MOMENTO_ESTAGIO[normalizarTexto(stage)] ?? 40;
}

function possuiValor(valor: unknown): boolean {
  if (valor === null || valor === undefined) {
    return false;
  }

  return typeof valor !== 'string' || valor.trim().length > 0;
}

export async function getStartupInsights(startupId: string, viewer: Viewer) {
  const startup = await prisma.startupProfile.findUnique({
    where: { id: startupId },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true, verifiedAt: true } },
      projects: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!startup) {
    throw HttpError.notFound('startup nao encontrada');
  }

  const [
    matches,
    acceptedMatches,
    pendingMatches,
    messages,
    appointments,
    distinctInvestors,
    investidores,
    viewerMatch,
  ] = await Promise.all([
    prisma.match.count({ where: { startupId } }),
    prisma.match.count({ where: { startupId, status: MatchStatus.ACEITO } }),
    prisma.match.count({ where: { startupId, status: MatchStatus.PENDENTE } }),
    prisma.message.count({
      where: { OR: [{ senderId: startup.userId }, { recipientId: startup.userId }] },
    }),
    prisma.appointment.count({
      where: { OR: [{ createdById: startup.userId }, { match: { is: { startupId } } }] },
    }),
    prisma.match.findMany({
      where: { startupId },
      distinct: ['investorId'],
      select: { investorId: true },
    }),
    prisma.investorProfile.findMany({ select: { sectorInterest: true, state: true } }),
    viewer.role === UserRole.INVESTOR
      ? prisma.match.findFirst({
          where: { startupId, investor: { userId: viewer.id } },
          select: { id: true, score: true, status: true, reason: true, details: true },
        })
      : Promise.resolve(null),
  ]);

  const totalInvestidores = investidores.length;
  const comInteresseNoSetor = investidores.filter(
    (investidor) =>
      calculaSetor(
        { sector: startup.sector, stage: startup.stage, state: startup.state },
        {
          sectorInterest: investidor.sectorInterest,
          stageInterest: '',
          ticketMin: 0,
          ticketMax: 0,
          state: investidor.state,
        },
      ) > 0,
  ).length;
  const naRegiao = investidores.filter(
    (investidor) =>
      investidor.state.trim().toUpperCase() === startup.state.trim().toUpperCase() ||
      ESTADOS_NORDESTE.includes(investidor.state.trim().toUpperCase()),
  ).length;

  const campos = [
    startup.companyName,
    startup.sector,
    startup.description,
    startup.stage,
    startup.city,
    startup.state,
    startup.website,
    startup.needs,
    startup.pitchUrl,
    startup.logoUrl,
    startup.foundedAt,
  ];
  const preenchidos = campos.filter(possuiValor).length;

  const fatores: InsightFactor[] = [
    {
      key: 'perfil',
      label: 'Perfil completo',
      value: percentual(preenchidos, campos.length),
      weight: 20,
    },
    {
      key: 'setor',
      label: 'Demanda do setor',
      value: percentual(comInteresseNoSetor, totalInvestidores),
      weight: 25,
    },
    {
      key: 'estagio',
      label: 'Momento do estágio',
      value: momentoDoEstagio(startup.stage),
      weight: 20,
    },
    {
      key: 'engajamento',
      label: 'Engajamento',
      value: Math.min(100, acceptedMatches * 30 + messages * 2 + appointments * 10),
      weight: 25,
    },
    {
      key: 'regiao',
      label: 'Região',
      value: percentual(naRegiao, totalInvestidores),
      weight: 10,
    },
  ];

  const score = arredondar(fatores.reduce((total, fator) => total + (fator.value * fator.weight) / 100, 0));

  const marketPotential: MarketPotential = {
    score,
    label: rotuloPotencial(score),
    factors: fatores,
    disclaimer: DISCLAIMER,
  };

  return {
    profile: startup,
    projects: startup.projects,
    metrics: {
      matches,
      acceptedMatches,
      pendingMatches,
      messages,
      appointments,
      projects: startup.projects.length,
      investorsReached: distinctInvestors.length,
    },
    marketPotential,
    viewerMatch,
  };
}

export async function getInvestorInsights(investorId: string, viewer: Viewer) {
  const investor = await prisma.investorProfile.findUnique({
    where: { id: investorId },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true, verifiedAt: true } },
    },
  });

  if (!investor) {
    throw HttpError.notFound('investidor nao encontrado');
  }

  const [matches, acceptedMatches, pendingMatches, messages, appointments, distinctStartups, viewerMatch] =
    await Promise.all([
      prisma.match.count({ where: { investorId } }),
      prisma.match.count({ where: { investorId, status: MatchStatus.ACEITO } }),
      prisma.match.count({ where: { investorId, status: MatchStatus.PENDENTE } }),
      prisma.message.count({
        where: { OR: [{ senderId: investor.userId }, { recipientId: investor.userId }] },
      }),
      prisma.appointment.count({
        where: { OR: [{ createdById: investor.userId }, { match: { is: { investorId } } }] },
      }),
      prisma.match.findMany({
        where: { investorId },
        distinct: ['startupId'],
        select: { startupId: true },
      }),
      viewer.role === UserRole.STARTUP
        ? prisma.match.findFirst({
            where: { investorId, startup: { userId: viewer.id } },
            select: { id: true, score: true, status: true, reason: true, details: true },
          })
        : Promise.resolve(null),
    ]);

  return {
    profile: investor,
    metrics: {
      matches,
      acceptedMatches,
      pendingMatches,
      messages,
      appointments,
      startupsReached: distinctStartups.length,
    },
    viewerMatch,
  };
}

export async function getAdminOverview() {
  const [
    startups,
    roles,
    statuses,
    setores,
    estagios,
    messages,
    appointments,
    projects,
    recentAudit,
    recentUsers,
    ticketCounts,
    recentTickets,
    verificationCounts,
    verifiedProfiles,
  ] = await Promise.all([
    prisma.startupProfile.count(),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.match.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.startupProfile.groupBy({ by: ['sector'], _count: { _all: true } }),
    prisma.startupProfile.groupBy({ by: ['stage'], _count: { _all: true } }),
    prisma.message.count(),
    prisma.appointment.count(),
    prisma.project.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { user: { select: { name: true } } },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, name: true, role: true, createdAt: true },
    }),
    prisma.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        protocol: true,
        category: true,
        subject: true,
        status: true,
        priority: true,
        createdAt: true,
        reporter: { select: { name: true } },
        targetUser: { select: { name: true } },
        _count: {
          select: {
            messages: { where: { readAt: null, sender: { role: { not: UserRole.ADMIN } } } },
          },
        },
      },
    }),
    prisma.profileVerification.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.user.count({ where: { verifiedAt: { not: null } } }),
  ]);

  const porPapel = new Map(roles.map((item) => [item.role, item._count._all]));
  const porStatus = new Map(statuses.map((item) => [item.status, item._count._all]));

  const accepted = porStatus.get(MatchStatus.ACEITO) ?? 0;
  const pending = porStatus.get(MatchStatus.PENDENTE) ?? 0;
  const declined = porStatus.get(MatchStatus.RECUSADO) ?? 0;
  const totalMatches = accepted + pending + declined;

  return {
    totals: {
      startups,
      investors: porPapel.get(UserRole.INVESTOR) ?? 0,
      mentors: porPapel.get(UserRole.MENTOR) ?? 0,
      matches: totalMatches,
      accepted,
      pending,
      declined,
      messages,
      appointments,
      projects,
    },
    acceptanceRate: totalMatches > 0 ? Math.round((accepted / totalMatches) * 100) / 100 : 0,
    sectors: setores
      .map((item) => ({
        sector: item.sector,
        count: item._count._all,
        share: startups > 0 ? Math.round((item._count._all / startups) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.count - a.count),
    stages: estagios.map((item) => ({ stage: item.stage, count: item._count._all })).sort((a, b) => b.count - a.count),
    recentAudit: recentAudit.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      createdAt: log.createdAt,
      user: log.user?.name ?? 'Sistema',
    })),
    recentUsers,
    tickets: {
      byStatus: Object.fromEntries(ticketCounts.map((item) => [item.status, item._count._all])),
      open: ticketCounts.find((item) => item.status === TicketStatus.ABERTO)?._count._all ?? 0,
      inReview: ticketCounts.find((item) => item.status === TicketStatus.EM_ANALISE)?._count._all ?? 0,
      waitingUser: ticketCounts.find((item) => item.status === TicketStatus.AGUARDANDO_USUARIO)?._count._all ?? 0,
      resolved: ticketCounts.find((item) => item.status === TicketStatus.RESOLVIDO)?._count._all ?? 0,
      archived: ticketCounts.find((item) => item.status === TicketStatus.ARQUIVADO)?._count._all ?? 0,
    },
    recentTickets: recentTickets.map((ticket) => ({
      ...ticket,
      naoLidas: ticket._count.messages,
    })),
    verifications: {
      pending: verificationCounts.find((item) => item.status === VerificationStatus.PENDENTE)?._count._all ?? 0,
      approved: verificationCounts.find((item) => item.status === VerificationStatus.APROVADA)?._count._all ?? 0,
      rejected: verificationCounts.find((item) => item.status === VerificationStatus.RECUSADA)?._count._all ?? 0,
      verifiedProfiles,
    },
  };
}

