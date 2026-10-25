import type { InvestorProfile, StartupProfile } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { MatchDetails } from './matching.rules';
import { calculaScore as calculaScorePuro } from './matching.rules';

export interface MatchResult {
  score: number;
  reason: string;
  details: MatchDetails;
}

export function calculaScore(startup: StartupProfile, investor: InvestorProfile): MatchResult {
  return calculaScorePuro(startup, investor);
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
      update: {
        score: resultado.score,
        reason: resultado.reason,
        details: resultado.details,
      },
      create: {
        startupId,
        investorId: investor.id,
        score: resultado.score,
        reason: resultado.reason,
        details: resultado.details,
      },
    });

    salvos.push({ match, details: resultado.details });
  }

  return salvos;
}
