import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { ConsentInput } from '../services/consent.rules';

type Db = PrismaClient | Prisma.TransactionClient;

export async function createMany(userId: string, registros: ConsentInput[], db: Db = prisma): Promise<number> {
  if (registros.length === 0) {
    return 0;
  }

  const resultado = await db.consentRecord.createMany({
    data: registros.map((registro) => ({
      userId,
      type: registro.type,
      granted: registro.granted,
      policyVersion: registro.policyVersion,
      policyHash: registro.policyHash,
      ip: registro.ip,
      userAgent: registro.userAgent,
      revokedAt: registro.revokedAt ?? null,
    })),
  });

  return resultado.count;
}

export async function listByUser(userId: string) {
  return prisma.consentRecord.findMany({
    where: { userId },
    orderBy: { acceptedAt: 'desc' },
  });
}

export async function countByUser(userId: string): Promise<number> {
  return prisma.consentRecord.count({ where: { userId } });
}
