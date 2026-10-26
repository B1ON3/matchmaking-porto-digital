import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

const publicUser = { select: { id: true, name: true, email: true } } as const;

export const messageInclude = {
  sender: publicUser,
  recipient: publicUser,
} satisfies Prisma.MessageInclude;

export type MessageRecord = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

export async function findUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
}

export async function findMatchBetweenUsers(userA: string, userB: string) {
  return prisma.match.findFirst({
    where: {
      OR: [
        {
          startup: { is: { userId: userA } },
          investor: { is: { userId: userB } },
        },
        {
          startup: { is: { userId: userB } },
          investor: { is: { userId: userA } },
        },
      ],
    },
    select: { id: true, status: true, score: true, reason: true },
  });
}

export async function findMatchesForUser(userId: string) {
  return prisma.match.findMany({
    where: {
      OR: [{ startup: { is: { userId } } }, { investor: { is: { userId } } }],
    },
    select: {
      id: true,
      status: true,
      score: true,
      reason: true,
      startup: { select: { userId: true } },
      investor: { select: { userId: true } },
    },
  });
}

export async function createMessage(data: Prisma.MessageUncheckedCreateInput) {
  return prisma.message.create({
    data,
    include: messageInclude,
  });
}

export async function findPage(input: { userId: string; conversaCom?: string; before?: Date; limit: number }) {
  const { userId, conversaCom, before, limit } = input;

  return prisma.message.findMany({
    where: {
      ...(conversaCom
        ? {
            OR: [
              { senderId: userId, recipientId: conversaCom },
              { senderId: conversaCom, recipientId: userId },
            ],
          }
        : { OR: [{ senderId: userId }, { recipientId: userId }] }),
      ...(before ? { createdAt: { lt: before } } : {}),
    },
    include: messageInclude,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });
}

export async function findRecentMessages(userId: string, take: number) {
  return prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    include: messageInclude,
    orderBy: { createdAt: 'desc' },
    take,
  });
}

export async function countUnread(recipientId: string) {
  return prisma.message.count({
    where: { recipientId, readAt: null },
  });
}

export async function markConversationRead(senderId: string, recipientId: string) {
  return prisma.message.updateMany({
    where: { senderId, recipientId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function findMessageSender(id: string) {
  return prisma.message.findUnique({
    where: { id },
    select: { senderId: true },
  });
}

export async function deleteMessage(id: string) {
  await prisma.message.delete({ where: { id } });
}
