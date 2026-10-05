import { InvestorProfile, StartupProfile } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface MatchResult {
  score: number;
  reason: string;
  detalhes: {
    setor: number;
    estagio: number;
    ticket: number;
    regiao: number;
  };
}

// pesos de cada criterio na pontuacao final
const PESOS = {
  setor: 35,
  estagio: 25,
  ticket: 25,
  regiao: 15,
} as const;

function normalizar(valor: string): string[] {
  return valor
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function calculaSetor(startup: StartupProfile, investor: InvestorProfile): number {
  const interesses = normalizar(investor.sectorInterest);

  if (interesses.length === 0) {
    return 0;
  }

  const setorStartup = startup.sector.trim().toLowerCase();

  const acertou = interesses.some((interesse) => setorStartup.includes(interesse));

  return acertou ? PESOS.setor : 0;
}

function calculaEstagio(startup: StartupProfile, investor: InvestorProfile): number {
  const estagios = normalizar(investor.stageInterest);

  if (estagios.length === 0) {
    return 0;
  }

  const estagioStartup = startup.stage.trim().toLowerCase();

  const acertou = estagios.some((estagio) => {
    const e = estagio.toLowerCase();
    return estagioStartup.includes(e) || e.includes(estagioStartup);
  });

  return acertou ? PESOS.estagio : 0;
}

// estimativa de rodada a partir do estagio da startup
function estimaTicketDaRodada(stage: string): number {
  const estagio = stage.trim().toLowerCase();

  if (estagio.includes('pre-seed') || estagio.includes('ideacao') || estagio.includes('pré-seed')) {
    return 30000;
  }

  if (estagio.includes('seed')) {
    return 150000;
  }

  if (estagio.includes('serie a') || estagio.includes('série a')) {
    return 500000;
  }

  return 100000;
}

// o startup precisa estar dentro da faixa de ticket do investidor
function calculaTicket(startup: StartupProfile, investor: InvestorProfile): number {
  const { ticketMin, ticketMax } = investor;

  if (ticketMax === 0 && ticketMin === 0) {
    return 0;
  }

  const rodadaEstimada = estimaTicketDaRodada(startup.stage);
  const teto = Math.max(ticketMax, ticketMin);

  if (rodadaEstimada >= ticketMin && rodadaEstimada <= teto) {
    return PESOS.ticket;
  }

  // fora da faixa: da credito parcial conforme o quanto ta perto do limite
  const distancia =
    rodadaEstimada < ticketMin ? ticketMin - rodadaEstimada : rodadaEstimada - teto;

  const proximidade = 1 - Math.min(distancia / teto, 1);

  return Math.round(PESOS.ticket * proximidade * 0.5);
}

function calculaRegiao(startup: StartupProfile, investor: InvestorProfile): number {
  if (startup.state === investor.state) {
    return PESOS.regiao;
  }

  // nordeste vale meio a mais que fora da regiao
  const estadosNordeste = ['PE', 'PB', 'RN', 'CE', 'AL', 'SE', 'BA', 'PI', 'MA'];
  const startupNordeste = estadosNordeste.includes(startup.state);
  const investidorNordeste = estadosNordeste.includes(investor.state);

  if (startupNordeste && investidorNordeste) {
    return Math.round(PESOS.regiao * 0.5);
  }

  return 0;
}

function montaReason(
  score: number,
  detalhes: MatchResult['detalhes'],
): string {
  if (score >= 70) {
    return 'Alta afinidade: setor, estagio e faixa de investimento batem com o perfil do investidor.';
  }

  if (score >= 40) {
    return 'Afinidade media: alguns criterios batem, vale entrar em contato pra conversar.';
  }

  return 'Afinidade baixa, porem a plataforma deja a conversa acontecer se fizer sentido pros dois.';
}

export function calculaScore(
  startup: StartupProfile,
  investor: InvestorProfile,
): MatchResult {
  const detalhes = {
    setor: calculaSetor(startup, investor),
    estagio: calculaEstagio(startup, investor),
    ticket: calculaTicket(startup, investor),
    regiao: calculaRegiao(startup, investor),
  };

  const score = Number(
    (detalhes.setor + detalhes.estagio + detalhes.ticket + detalhes.regiao).toFixed(1),
  );

  return {
    score,
    reason: montaReason(score, detalhes),
    detalhes,
  };
}

// gera (e persiste) os matches de uma startup contra todos os investidores ativos
export async function gerarMatchesDaStartup(startupId: string) {
  const startup = await prisma.startupProfile.findUnique({ where: { id: startupId } });

  if (!startup) {
    return [];
  }

  const investors = await prisma.investorProfile.findMany();

  const resultados = investors
    .map((investor) => ({ investor, resultado: calculaScore(startup, investor) }))
    .filter(({ resultado }) => resultado.score > 0)
    .sort((a, b) => b.resultado.score - a.resultado.score);

  const salvos = [];

  for (const { investor, resultado } of resultados) {
    const match = await prisma.match.upsert({
      where: { startupId_investorId: { startupId, investorId: investor.id } },
      update: { score: resultado.score, reason: resultado.reason },
      create: {
        startupId,
        investorId: investor.id,
        score: resultado.score,
        reason: resultado.reason,
      },
    });

    salvos.push({ match, detalhes: resultado.detalhes });
  }

  return salvos;
}