import type { InvestorProfile, Match, StartupProfile } from '@prisma/client';
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

// gera (e persiste) os matches de uma startup contra todos os investidores.
// le os matches existentes de uma vez e grava em lote: antes era um upsert por
// investidor dentro do loop (N+1). agora e 1 select + 1 insert em lote + 1
// transacao apenas com as linhas que realmente mudaram.
export async function gerarMatchesDaStartup(startupId: string): Promise<Match[]> {
  const startup = await prisma.startupProfile.findUnique({ where: { id: startupId } });

  if (!startup) {
    return [];
  }

  if (startup.hiddenAt) {
    return [];
  }

  const [investors, existentes] = await Promise.all([
    prisma.investorProfile.findMany({ where: { hiddenAt: null } }),
    prisma.match.findMany({
      where: { startupId },
      select: { investorId: true, score: true, reason: true },
    }),
  ]);

  const porInvestidor = new Map(existentes.map((match) => [match.investorId, match]));

  const resultados = investors
    .map((investor) => ({ investor, resultado: calculaScore(startup, investor) }))
    .filter(({ resultado }) => resultado.score > 0)
    .sort((a, b) => b.resultado.score - a.resultado.score);

  const criar = resultados.filter(({ investor }) => !porInvestidor.has(investor.id));
  const atualizar = resultados.filter(({ investor, resultado }) => {
    const atual = porInvestidor.get(investor.id);

    return Boolean(atual && (atual.score !== resultado.score || atual.reason !== resultado.reason));
  });

  if (criar.length > 0) {
    await prisma.match.createMany({
      data: criar.map(({ investor, resultado }) => ({
        startupId,
        investorId: investor.id,
        score: resultado.score,
        reason: resultado.reason,
        details: resultado.details,
      })),
      skipDuplicates: true,
    });
  }

  if (atualizar.length > 0) {
    await prisma.$transaction(
      atualizar.map(({ investor, resultado }) =>
        prisma.match.update({
          where: { startupId_investorId: { startupId, investorId: investor.id } },
          data: {
            score: resultado.score,
            reason: resultado.reason,
            details: resultado.details,
          },
        }),
      ),
    );
  }

  if (resultados.length === 0) {
    return [];
  }

  return prisma.match.findMany({
    where: { startupId, investorId: { in: resultados.map(({ investor }) => investor.id) } },
    orderBy: { score: 'desc' },
  });
}
