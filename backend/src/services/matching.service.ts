import type { InvestorProfile, Match, StartupProfile } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { MatchDetails } from './matching.rules';
import { calculaScore as calculaScorePuro } from './matching.rules';

export interface MatchResult {
  score: number;
  reason: string;
  details: MatchDetails;
}

export interface VerificacaoDosLados {
  startup: boolean;
  investidor: boolean;
}

export function calculaScore(
  startup: StartupProfile,
  investor: InvestorProfile,
  verificacao: VerificacaoDosLados = { startup: false, investidor: false },
): MatchResult {
  return calculaScorePuro(
    { ...startup, verificado: verificacao.startup },
    { ...investor, verificado: verificacao.investidor },
  );
}

function mesmosDetalhes(atual: unknown, novo: MatchDetails): boolean {
  if (!atual || typeof atual !== 'object' || Array.isArray(atual)) {
    return false;
  }

  const registro = atual as Record<string, unknown>;

  return (Object.keys(novo) as (keyof MatchDetails)[]).every((chave) => registro[chave] === novo[chave]);
}

// gera (e persiste) os matches de uma startup contra todos os investidores.
// le os matches existentes de uma vez e grava em lote: antes era um upsert por
// investidor dentro do loop (N+1). agora e 1 select + 1 insert em lote + 1
// transacao apenas com as linhas que realmente mudaram.
export async function gerarMatchesDaStartup(startupId: string): Promise<Match[]> {
  const startup = await prisma.startupProfile.findUnique({
    where: { id: startupId },
    include: { user: { select: { verifiedAt: true } } },
  });

  if (!startup) {
    return [];
  }

  if (startup.hiddenAt) {
    return [];
  }

  const [investors, existentes] = await Promise.all([
    prisma.investorProfile.findMany({
      where: { hiddenAt: null },
      include: { user: { select: { verifiedAt: true } } },
    }),
    prisma.match.findMany({
      where: { startupId },
      select: { investorId: true, score: true, reason: true, details: true },
    }),
  ]);

  const porInvestidor = new Map(existentes.map((match) => [match.investorId, match]));
  const startupVerificada = Boolean(startup.user.verifiedAt);

  const resultados = investors
    .map((investor) => ({
      investor,
      resultado: calculaScore(startup, investor, {
        startup: startupVerificada,
        investidor: Boolean(investor.user.verifiedAt),
      }),
    }))
    .filter(({ resultado }) => resultado.score > 0)
    .sort((a, b) => b.resultado.score - a.resultado.score);

  const criar = resultados.filter(({ investor }) => !porInvestidor.has(investor.id));
  const atualizar = resultados.filter(({ investor, resultado }) => {
    const atual = porInvestidor.get(investor.id);

    if (!atual) {
      return false;
    }

    // comparar tambem os detalhes: o score pode ficar igual (teto de 100) e o
    // bonus de verificacao ainda precisa aparecer na matriz de compatibilidade
    return (
      atual.score !== resultado.score ||
      atual.reason !== resultado.reason ||
      !mesmosDetalhes(atual.details, resultado.details)
    );
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
