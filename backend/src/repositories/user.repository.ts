import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { ConsentInput } from '../services/consent.rules';
import { createMany as criarConsentimentos } from './consent.repository';

export async function createWithConsents(
  data: Prisma.UserCreateInput,
  consentimentos: ConsentInput[],
  select: Prisma.UserSelect,
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data, select });

    await criarConsentimentos(user.id, consentimentos, tx);

    return user;
  });
}

export async function findCredentialsByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, status: true },
  });
}

export async function registerLogin(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}
