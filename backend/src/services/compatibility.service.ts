import { UserRole, type InvestorProfile, type StartupProfile } from '@prisma/client';
import { findForCompatibility } from '../repositories/match.repository';
import { HttpError } from '../utils/http-error';
import type { MatchDetails } from './matching.rules';
import { calculaScore, estimaTicketDaRodada, PESOS } from './matching.rules';

export type CompatibilityStatus = 'ATENDE' | 'PARCIAL' | 'NAO_ATENDE';
export type CompatibilityDimensionKey = keyof MatchDetails;

export interface CompatibilityDimension {
  key: CompatibilityDimensionKey;
  label: string;
  weight: number;
  points: number;
  status: CompatibilityStatus;
  evidence: string;
}

export interface CompatibilityParty {
  id: string;
  name: string;
  contactName: string;
  sector: string;
  stage: string;
  city: string;
  state: string;
  description: string | null;
  logoUrl: string | null;
  ticketMin: number | null;
  ticketMax: number | null;
}

export interface CompatibilityMatrix {
  matchId: string;
  score: number;
  reason: string;
  dimensions: CompatibilityDimension[];
  summary: {
    strengths: string[];
    attention: string[];
  };
  startup: CompatibilityParty;
  investor: CompatibilityParty;
}

export interface CompatibilityViewer {
  id: string;
  role: UserRole;
}

type StartupCompat = Pick<
  StartupProfile,
  'id' | 'userId' | 'companyName' | 'sector' | 'stage' | 'city' | 'state' | 'description' | 'logoUrl'
> & { user: { name: string } };

type InvestorCompat = Pick<
  InvestorProfile,
  | 'id'
  | 'userId'
  | 'companyName'
  | 'sectorInterest'
  | 'stageInterest'
  | 'ticketMin'
  | 'ticketMax'
  | 'city'
  | 'state'
  | 'bio'
> & { user: { name: string } };

const LABELS: Record<CompatibilityDimensionKey, string> = {
  setor: 'Setor',
  estagio: 'Estágio',
  ticket: 'Ticket',
  regiao: 'Região',
};

const DIMENSOES: CompatibilityDimensionKey[] = ['setor', 'estagio', 'ticket', 'regiao'];

function moeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor);
}

function faixaDeTicket(minimo: number, maximo: number): string {
  const teto = Math.max(minimo, maximo);

  return minimo === teto ? moeda(minimo) : `${moeda(minimo)} a ${moeda(teto)}`;
}

function statusDaDimensao(pontos: number, peso: number): CompatibilityStatus {
  if (pontos >= peso) {
    return 'ATENDE';
  }

  return pontos > 0 ? 'PARCIAL' : 'NAO_ATENDE';
}

function evidenciaSetor(startup: StartupCompat, investidor: InvestorCompat, pontos: number): string {
  if (pontos >= PESOS.setor) {
    return `A startup atua em ${startup.sector}, que está entre os interesses da tese (${investidor.sectorInterest}).`;
  }

  return `A startup atua em ${startup.sector}; a tese atual busca ${investidor.sectorInterest}.`;
}

function evidenciaEstagio(startup: StartupCompat, investidor: InvestorCompat, pontos: number): string {
  if (pontos >= PESOS.estagio) {
    return `O estágio ${startup.stage} está na faixa de interesse do investidor (${investidor.stageInterest}).`;
  }

  if (pontos > 0) {
    return `O estágio ${startup.stage} está próximo da faixa buscada (${investidor.stageInterest}), mas não coincide.`;
  }

  return `O estágio ${startup.stage} está fora da faixa buscada (${investidor.stageInterest}).`;
}

function evidenciaTicket(startup: StartupCompat, investidor: InvestorCompat, pontos: number): string {
  if (investidor.ticketMin === 0 && investidor.ticketMax === 0) {
    return 'O investidor não informou faixa de ticket; este critério não pontua.';
  }

  const estimado = estimaTicketDaRodada(startup.stage);
  const faixa = faixaDeTicket(investidor.ticketMin, investidor.ticketMax);

  if (pontos >= PESOS.ticket) {
    return `A rodada estimada de ${moeda(estimado)} está dentro da faixa de ${faixa}.`;
  }

  if (pontos > 0) {
    return `A rodada estimada de ${moeda(estimado)} está fora da faixa de ${faixa}, mas há proximidade parcial.`;
  }

  return `A rodada estimada de ${moeda(estimado)} está distante da faixa de ${faixa}.`;
}

function evidenciaRegiao(startup: StartupCompat, investidor: InvestorCompat, pontos: number): string {
  const ufStartup = startup.state.trim().toUpperCase();
  const ufInvestidor = investidor.state.trim().toUpperCase();

  if (pontos >= PESOS.regiao) {
    return `Startup e investidor estão em ${ufStartup}.`;
  }

  if (pontos > 0) {
    return `Startup (${ufStartup}) e investidor (${ufInvestidor}) estão no Nordeste, mas em UFs diferentes.`;
  }

  return `Startup (${ufStartup}) e investidor (${ufInvestidor}) estão em regiões diferentes.`;
}

function evidencia(
  chave: CompatibilityDimensionKey,
  startup: StartupCompat,
  investidor: InvestorCompat,
  pontos: number,
): string {
  if (chave === 'setor') {
    return evidenciaSetor(startup, investidor, pontos);
  }

  if (chave === 'estagio') {
    return evidenciaEstagio(startup, investidor, pontos);
  }

  if (chave === 'ticket') {
    return evidenciaTicket(startup, investidor, pontos);
  }

  return evidenciaRegiao(startup, investidor, pontos);
}

function partidoDaStartup(startup: StartupCompat): CompatibilityParty {
  return {
    id: startup.id,
    name: startup.companyName || startup.user.name,
    contactName: startup.user.name,
    sector: startup.sector,
    stage: startup.stage,
    city: startup.city,
    state: startup.state,
    description: startup.description,
    logoUrl: startup.logoUrl,
    ticketMin: null,
    ticketMax: null,
  };
}

function partidoDoInvestidor(investidor: InvestorCompat): CompatibilityParty {
  return {
    id: investidor.id,
    name: investidor.companyName || investidor.user.name,
    contactName: investidor.user.name,
    sector: investidor.sectorInterest,
    stage: investidor.stageInterest,
    city: investidor.city ?? '',
    state: investidor.state,
    description: investidor.bio,
    logoUrl: null,
    ticketMin: investidor.ticketMin,
    ticketMax: investidor.ticketMax,
  };
}

function normalizarDetalhes(valor: unknown): MatchDetails | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return null;
  }

  const registro = valor as Record<string, unknown>;
  const detalhes = {} as MatchDetails;

  for (const chave of DIMENSOES) {
    const pontos = registro[chave];

    if (typeof pontos !== 'number' || !Number.isFinite(pontos) || pontos < 0 || pontos > PESOS[chave]) {
      return null;
    }

    detalhes[chave] = pontos;
  }

  return detalhes;
}

export function montarMatrizCompatibilidade(entrada: {
  matchId: string;
  score: number;
  reason: string | null;
  details: MatchDetails;
  startup: StartupCompat;
  investor: InvestorCompat;
}): CompatibilityMatrix {
  const { matchId, score, reason, details, startup, investor } = entrada;

  const dimensions = DIMENSOES.map((chave) => {
    const weight = PESOS[chave];
    const points = details[chave];

    return {
      key: chave,
      label: LABELS[chave],
      weight,
      points,
      status: statusDaDimensao(points, weight),
      evidence: evidencia(chave, startup, investor, points),
    };
  });

  return {
    matchId,
    score,
    reason: reason ?? 'Afinidade calculada a partir de setor, estágio, ticket e região.',
    dimensions,
    summary: {
      strengths: dimensions
        .filter((dimensao) => dimensao.status === 'ATENDE')
        .map((dimensao) => `${dimensao.label}: ${dimensao.evidence}`),
      attention: dimensions
        .filter((dimensao) => dimensao.status !== 'ATENDE')
        .map((dimensao) => `${dimensao.label}: ${dimensao.evidence}`),
    },
    startup: partidoDaStartup(startup),
    investor: partidoDoInvestidor(investor),
  };
}

export function podeVerCompatibilidade(
  viewer: CompatibilityViewer,
  startupUserId: string,
  investorUserId: string,
): boolean {
  return viewer.role === UserRole.ADMIN || viewer.id === startupUserId || viewer.id === investorUserId;
}

export async function obterCompatibilidade(matchId: string, viewer: CompatibilityViewer): Promise<CompatibilityMatrix> {
  const match = await findForCompatibility(matchId);

  if (!match) {
    throw HttpError.notFound('match nao encontrado');
  }

  if (!podeVerCompatibilidade(viewer, match.startup.userId, match.investor.userId)) {
    throw HttpError.forbidden('voce nao faz parte desse match');
  }

  let details = normalizarDetalhes(match.details);
  let score = match.score;
  let reason = match.reason;

  if (!details) {
    const calculado = calculaScore(match.startup, match.investor);
    details = calculado.details;
    score = calculado.score;
    reason = calculado.reason;
  }

  return montarMatrizCompatibilidade({
    matchId: match.id,
    score,
    reason,
    details,
    startup: match.startup,
    investor: match.investor,
  });
}
