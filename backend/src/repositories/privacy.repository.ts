import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { encryptText } from '../services/encryption.service';
import type { RequestContext } from '../utils/request-context';

const exportSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  startupProfile: {
    include: {
      projects: { orderBy: { createdAt: 'desc' } },
    },
  },
  investorProfile: true,
  consents: { orderBy: { acceptedAt: 'desc' } },
  sentMessages: {
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      content: true,
      readAt: true,
      createdAt: true,
      recipient: { select: { id: true, name: true } },
    },
  },
  receivedMessages: {
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      content: true,
      readAt: true,
      createdAt: true,
      sender: { select: { id: true, name: true } },
    },
  },
  appointmentsMade: {
    orderBy: { scheduledAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      scheduledAt: true,
      status: true,
      createdAt: true,
      match: {
        select: {
          id: true,
          score: true,
          status: true,
          reason: true,
          startup: { select: { companyName: true } },
          investor: { select: { companyName: true } },
        },
      },
    },
  },
  auditLogs: {
    orderBy: { createdAt: 'desc' },
    select: { id: true, action: true, entity: true, entityId: true, createdAt: true },
  },
} satisfies Prisma.UserSelect;

export async function findPrivacyOverview(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      _count: {
        select: {
          sentMessages: true,
          receivedMessages: true,
          appointmentsMade: true,
          auditLogs: true,
        },
      },
    },
  });
}

export async function findExportData(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: exportSelect,
  });
}

export async function findPasswordHash(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  return user?.passwordHash ?? null;
}

export async function countMatches(userId: string): Promise<number> {
  return prisma.match.count({
    where: {
      OR: [{ startup: { userId } }, { investor: { userId } }],
    },
  });
}

interface AnonymizeInput {
  userId: string;
  passwordHash: string;
  context: RequestContext;
}

export async function anonymizeAccount({ userId, passwordHash, context }: AnonymizeInput) {
  return prisma.$transaction(async (tx) => {
    const matches = await tx.match.findMany({
      where: { OR: [{ startup: { userId } }, { investor: { userId } }] },
      select: { id: true },
    });

    const matchIds = matches.map((match) => match.id);

    const messages = await tx.message.deleteMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    });

    const appointments = await tx.appointment.deleteMany({
      where: {
        OR: [{ createdById: userId }, ...(matchIds.length > 0 ? [{ matchId: { in: matchIds } }] : [])],
      },
    });

    await tx.passwordResetToken.deleteMany({ where: { userId } });

    const startups = await tx.startupProfile.deleteMany({ where: { userId } });
    const investors = await tx.investorProfile.deleteMany({ where: { userId } });

    await tx.auditLog.updateMany({
      where: { userId },
      data: { userId: null },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        name: 'Conta removida',
        email: `conta-removida+${randomUUID()}@laco.invalid`,
        passwordHash,
        status: 'EXCLUIDO',
        deletedAt: new Date(),
        lastLoginAt: null,
        moderationReason: 'EXCLUSAO_SOLICITADA_PELO_TITULAR',
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'PRIVACIDADE_EXCLUSAO',
        entity: 'User',
        entityId: null,
        details: encryptText(
          JSON.stringify({
            mensagensRemovidas: messages.count,
            reunioesRemovidas: appointments.count,
            perfisRemovidos: startups.count + investors.count,
            matchesDesvinculados: matchIds.length,
          }),
        ),
        ip: context.ip ? encryptText(context.ip) : null,
        userAgent: context.userAgent ? encryptText(context.userAgent) : null,
        userId: null,
      },
    });

    return {
      mensagensRemovidas: messages.count,
      reunioesRemovidas: appointments.count,
      perfisRemovidos: startups.count + investors.count,
      matchesDesvinculados: matchIds.length,
    };
  });
}
