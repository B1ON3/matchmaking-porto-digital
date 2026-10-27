import { prisma } from '../config/prisma';

export async function findForCompatibility(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      startup: {
        include: { user: { select: { id: true, name: true, verifiedAt: true } } },
      },
      investor: {
        include: { user: { select: { id: true, name: true, verifiedAt: true } } },
      },
    },
  });
}

export type MatchCompatibilityRecord = NonNullable<Awaited<ReturnType<typeof findForCompatibility>>>;
