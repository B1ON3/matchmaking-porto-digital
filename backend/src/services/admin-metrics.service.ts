import { AppointmentStatus, MatchStatus, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/http-error';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

export type MetricsGranularity = 'day' | 'week';

export interface MetricsRange {
  from: Date;
  to: Date;
  days: number;
  granularity: MetricsGranularity;
}

export interface MetricsByRole {
  role: UserRole;
  count: number;
}

export interface MetricsTopItem {
  label: string;
  count: number;
  share: number;
}

export interface MetricsFunnelStep {
  key: string;
  label: string;
  count: number;
  conversionFromPrevious: number;
}

export interface MetricsSeriesPoint {
  bucket: string;
  users: number;
  matches: number;
  messages: number;
  appointments: number;
}

export interface AdminMetrics {
  range: {
    from: string;
    to: string;
    days: number;
    granularity: MetricsGranularity;
  };
  users: {
    newTotal: number;
    activeTotal: number;
    newByRole: MetricsByRole[];
    activeByRole: MetricsByRole[];
  };
  matches: {
    created: number;
    accepted: number;
    declined: number;
    pending: number;
  };
  messages: {
    sent: number;
  };
  appointments: {
    created: number;
    scheduled: number;
    completed: number;
    cancelled: number;
  };
  funnel: MetricsFunnelStep[];
  topSectors: MetricsTopItem[];
  topCities: MetricsTopItem[];
  topStages: MetricsTopItem[];
  series: MetricsSeriesPoint[];
}

function normalizarGranularidade(valor?: string): MetricsGranularity {
  if (!valor || valor === 'day' || valor === 'dia') {
    return 'day';
  }

  if (valor === 'week' || valor === 'semana') {
    return 'week';
  }

  throw HttpError.badRequest('granularity invalida, use day ou week');
}

function parseLimite(valor: string, fimDoDia: boolean): Date {
  const data = /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ? new Date(`${valor}T${fimDoDia ? '23:59:59.999' : '00:00:00.000'}Z`)
    : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    throw HttpError.badRequest(`data invalida: ${valor}`);
  }

  return data;
}

export function resolveMetricsRange(
  entrada: { from?: string; to?: string; granularity?: string },
  agora = new Date(),
): MetricsRange {
  const granularity = normalizarGranularidade(entrada.granularity);
  const to = entrada.to ? parseLimite(entrada.to, true) : agora;
  const from = entrada.from ? parseLimite(entrada.from, false) : new Date(to.getTime() - 29 * DAY_MS);

  if (from.getTime() > to.getTime()) {
    throw HttpError.badRequest('from nao pode ser posterior a to');
  }

  const days = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1;

  if (days > MAX_RANGE_DAYS) {
    throw HttpError.badRequest(`periodo maximo de ${MAX_RANGE_DAYS} dias`);
  }

  return { from, to, days, granularity };
}

export function bucketKey(data: Date, granularity: MetricsGranularity): string {
  const dia = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));

  if (granularity === 'week') {
    const deslocamento = (dia.getUTCDay() + 6) % 7;
    dia.setUTCDate(dia.getUTCDate() - deslocamento);
  }

  return dia.toISOString().slice(0, 10);
}

export function listBucketKeys(from: Date, to: Date, granularity: MetricsGranularity): string[] {
  const chaves: string[] = [];
  const passo = (granularity === 'week' ? 7 : 1) * DAY_MS;
  let cursor = new Date(`${bucketKey(from, granularity)}T00:00:00.000Z`);

  while (cursor.getTime() <= to.getTime()) {
    chaves.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + passo);
  }

  return chaves.length > 0 ? chaves : [bucketKey(to, granularity)];
}

function percentual(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

function contarPorPapel(linhas: { role: UserRole }[]): MetricsByRole[] {
  const contagem = new Map<UserRole, number>();

  for (const linha of linhas) {
    contagem.set(linha.role, (contagem.get(linha.role) ?? 0) + 1);
  }

  return [UserRole.STARTUP, UserRole.INVESTOR, UserRole.MENTOR, UserRole.ADMIN].map((role) => ({
    role,
    count: contagem.get(role) ?? 0,
  }));
}

function montarTop(linhas: { label: string | null | undefined }[], total: number, limite = 8): MetricsTopItem[] {
  const contagem = new Map<string, number>();

  for (const linha of linhas) {
    const label = linha.label?.trim();

    if (!label) {
      continue;
    }

    contagem.set(label, (contagem.get(label) ?? 0) + 1);
  }

  return [...contagem.entries()]
    .map(([label, count]) => ({ label, count, share: percentual(count, total) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limite);
}

function chaveDoPar(primeiro: string, segundo: string): string {
  return [primeiro, segundo].sort().join('|');
}

export function contarConversasDeMatchesAceitos(
  matches: { status: MatchStatus; startup: { userId: string }; investor: { userId: string } }[],
  mensagens: { senderId: string; recipientId: string }[],
): number {
  const paresAceitos = new Set(
    matches
      .filter((match) => match.status === MatchStatus.ACEITO)
      .map((match) => chaveDoPar(match.startup.userId, match.investor.userId)),
  );

  return new Set(
    mensagens
      .filter((mensagem) => mensagem.senderId !== mensagem.recipientId)
      .map((mensagem) => chaveDoPar(mensagem.senderId, mensagem.recipientId))
      .filter((par) => paresAceitos.has(par)),
  ).size;
}

export function montarFunil(
  matches: number,
  aceitos: number,
  conversas: number,
  reunioes: number,
): MetricsFunnelStep[] {
  return [
    {
      key: 'matches',
      label: 'Matches criados',
      count: matches,
      conversionFromPrevious: 100,
    },
    {
      key: 'accepted',
      label: 'Matches aceitos',
      count: aceitos,
      conversionFromPrevious: percentual(aceitos, matches),
    },
    {
      key: 'conversations',
      label: 'Conversas iniciadas',
      count: conversas,
      conversionFromPrevious: percentual(conversas, aceitos),
    },
    {
      key: 'appointments',
      label: 'Reuniões criadas',
      count: reunioes,
      conversionFromPrevious: percentual(reunioes, conversas),
    },
  ];
}

export async function getAdminMetrics(range: MetricsRange): Promise<AdminMetrics> {
  const { from, to, days, granularity } = range;
  const periodo = { gte: from, lte: to };

  const [users, matches, messages, appointments, setores, cidades, estagios] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [{ createdAt: periodo }, { lastLoginAt: periodo }],
      },
      select: { role: true, createdAt: true, lastLoginAt: true },
    }),
    prisma.match.findMany({
      where: { createdAt: periodo },
      select: {
        status: true,
        createdAt: true,
        startup: { select: { userId: true } },
        investor: { select: { userId: true } },
      },
    }),
    prisma.message.findMany({
      where: { createdAt: periodo },
      select: { senderId: true, recipientId: true, createdAt: true },
    }),
    prisma.appointment.findMany({
      where: { createdAt: periodo },
      select: { status: true, createdAt: true },
    }),
    prisma.startupProfile.groupBy({
      by: ['sector'],
      where: { hiddenAt: null },
      _count: { _all: true },
    }),
    prisma.startupProfile.groupBy({
      by: ['city'],
      where: { hiddenAt: null },
      _count: { _all: true },
    }),
    prisma.startupProfile.groupBy({
      by: ['stage'],
      where: { hiddenAt: null },
      _count: { _all: true },
    }),
  ]);

  const novos = users.filter(
    (user) => user.createdAt.getTime() >= from.getTime() && user.createdAt.getTime() <= to.getTime(),
  );
  const ativos = users.filter(
    (user) =>
      user.lastLoginAt && user.lastLoginAt.getTime() >= from.getTime() && user.lastLoginAt.getTime() <= to.getTime(),
  );

  const aceitos = matches.filter((match) => match.status === MatchStatus.ACEITO).length;
  const recusados = matches.filter((match) => match.status === MatchStatus.RECUSADO).length;
  const pendentes = matches.filter((match) => match.status === MatchStatus.PENDENTE).length;

  const conversas = contarConversasDeMatchesAceitos(matches, messages);

  const concluidos = appointments.filter((item) => item.status === AppointmentStatus.CONCLUIDO).length;
  const cancelados = appointments.filter((item) => item.status === AppointmentStatus.CANCELADO).length;
  const agendados = appointments.filter((item) => item.status === AppointmentStatus.AGENDADO).length;

  const totalStartups = setores.reduce((total, item) => total + item._count._all, 0);
  const topSectors = montarTop(
    setores.flatMap((item) => Array.from({ length: item._count._all }, () => ({ label: item.sector }))),
    totalStartups,
  );
  const topCities = montarTop(
    cidades.flatMap((item) => Array.from({ length: item._count._all }, () => ({ label: item.city }))),
    totalStartups,
  );
  const topStages = montarTop(
    estagios.flatMap((item) => Array.from({ length: item._count._all }, () => ({ label: item.stage }))),
    totalStartups,
  );

  const series = new Map<string, MetricsSeriesPoint>(
    listBucketKeys(from, to, granularity).map((bucket) => [
      bucket,
      { bucket, users: 0, matches: 0, messages: 0, appointments: 0 },
    ]),
  );

  const somarNaSerie = (data: Date, campo: 'users' | 'matches' | 'messages' | 'appointments') => {
    const ponto = series.get(bucketKey(data, granularity));

    if (ponto) {
      ponto[campo] += 1;
    }
  };

  novos.forEach((user) => somarNaSerie(user.createdAt, 'users'));
  matches.forEach((match) => somarNaSerie(match.createdAt, 'matches'));
  messages.forEach((mensagem) => somarNaSerie(mensagem.createdAt, 'messages'));
  appointments.forEach((item) => somarNaSerie(item.createdAt, 'appointments'));

  return {
    range: {
      from: from.toISOString(),
      to: to.toISOString(),
      days,
      granularity,
    },
    users: {
      newTotal: novos.length,
      activeTotal: ativos.length,
      newByRole: contarPorPapel(novos),
      activeByRole: contarPorPapel(ativos),
    },
    matches: {
      created: matches.length,
      accepted: aceitos,
      declined: recusados,
      pending: pendentes,
    },
    messages: {
      sent: messages.length,
    },
    appointments: {
      created: appointments.length,
      scheduled: agendados,
      completed: concluidos,
      cancelled: cancelados,
    },
    funnel: montarFunil(matches.length, aceitos, conversas, appointments.length),
    topSectors,
    topCities,
    topStages,
    series: [...series.values()],
  };
}

export function escapeCsvField(valor: unknown): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  const precisaAspas = /[;"\r\n]/.test(texto) || texto !== texto.trim();

  if (!precisaAspas) {
    return texto;
  }

  return `"${texto.replace(/"/g, '""')}"`;
}

export function buildCsv(linhas: (string | number | null | undefined)[][]): string {
  const corpo = linhas.map((linha) => linha.map(escapeCsvField).join(';')).join('\r\n');
  return `\uFEFF${corpo}\r\n`;
}

export function buildMetricsCsv(metrics: AdminMetrics): string {
  const linhas: (string | number | null | undefined)[][] = [
    ['Secao', 'Indicador', 'Valor'],
    ['Periodo', 'De', metrics.range.from],
    ['Periodo', 'Ate', metrics.range.to],
    ['Periodo', 'Dias', metrics.range.days],
    ['Periodo', 'Granularidade', metrics.range.granularity],
    ['Resumo', 'Novos usuarios', metrics.users.newTotal],
    ['Resumo', 'Usuarios ativos', metrics.users.activeTotal],
    ['Resumo', 'Matches criados', metrics.matches.created],
    ['Resumo', 'Matches aceitos', metrics.matches.accepted],
    ['Resumo', 'Matches recusados', metrics.matches.declined],
    ['Resumo', 'Matches pendentes', metrics.matches.pending],
    ['Resumo', 'Mensagens enviadas', metrics.messages.sent],
    ['Resumo', 'Reunioes criadas', metrics.appointments.created],
    ['Resumo', 'Reunioes concluidas', metrics.appointments.completed],
    ['Resumo', 'Reunioes canceladas', metrics.appointments.cancelled],
  ];

  for (const item of metrics.users.newByRole) {
    linhas.push(['Novos usuarios por papel', item.role, item.count]);
  }

  for (const item of metrics.users.activeByRole) {
    linhas.push(['Usuarios ativos por papel', item.role, item.count]);
  }

  for (const item of metrics.funnel) {
    linhas.push(['Funil', item.label, item.count]);
    linhas.push(['Funil', `${item.label} - conversao`, `${item.conversionFromPrevious}%`]);
  }

  for (const item of metrics.topSectors) {
    linhas.push(['Top setores', item.label, item.count]);
  }

  for (const item of metrics.topCities) {
    linhas.push(['Top cidades', item.label, item.count]);
  }

  for (const item of metrics.topStages) {
    linhas.push(['Top estagios', item.label, item.count]);
  }

  linhas.push(['Serie', 'Periodo', 'Novos usuarios', 'Matches', 'Mensagens', 'Reunioes']);

  for (const ponto of metrics.series) {
    linhas.push(['Serie', ponto.bucket, ponto.users, ponto.matches, ponto.messages, ponto.appointments]);
  }

  return buildCsv(linhas);
}
