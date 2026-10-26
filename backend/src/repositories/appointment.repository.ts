import type { AppointmentStatus, Prisma, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';

const matchInclude = {
  startup: { include: { user: { select: { id: true, name: true, email: true } } } },
  investor: { include: { user: { select: { id: true, name: true, email: true } } } },
} satisfies Prisma.MatchInclude;

export const appointmentInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  match: { include: matchInclude },
} satisfies Prisma.AppointmentInclude;

export type AppointmentRecord = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

export type AppointmentViewer = { id: string; role: UserRole };

function escopoDoUsuario(usuario: AppointmentViewer): Prisma.AppointmentWhereInput {
  if (usuario.role === 'ADMIN') {
    return {};
  }

  return {
    OR: [
      { createdById: usuario.id },
      {
        match: {
          is: {
            OR: [{ startup: { is: { userId: usuario.id } } }, { investor: { is: { userId: usuario.id } } }],
          },
        },
      },
    ],
  };
}

export async function list(usuario: AppointmentViewer, status?: AppointmentStatus, futuros = true) {
  return prisma.appointment.findMany({
    where: {
      ...escopoDoUsuario(usuario),
      ...(status ? { status } : {}),
      ...(futuros ? { scheduledAt: { gte: new Date() } } : {}),
    },
    include: appointmentInclude,
    orderBy: { scheduledAt: 'asc' },
  });
}

export async function findVisible(id: string, usuario: AppointmentViewer) {
  return prisma.appointment.findFirst({
    where: { id, ...escopoDoUsuario(usuario) },
    include: appointmentInclude,
  });
}

export async function findAccess(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    select: {
      status: true,
      createdById: true,
      match: { select: { startup: { select: { userId: true } }, investor: { select: { userId: true } } } },
    },
  });
}

export async function findMatchForAppointment(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    select: {
      status: true,
      startup: { select: { userId: true } },
      investor: { select: { userId: true } },
    },
  });
}

export async function findConflictCandidates(participantUserIds: string[], earliest: Date, end: Date) {
  return prisma.appointment.findMany({
    where: {
      status: 'AGENDADO',
      scheduledAt: { gte: earliest, lt: end },
      OR: [
        { createdById: { in: participantUserIds } },
        { match: { is: { startup: { is: { userId: { in: participantUserIds } } } } } },
        { match: { is: { investor: { is: { userId: { in: participantUserIds } } } } } },
      ],
    },
    select: { id: true, title: true, scheduledAt: true, durationMinutes: true },
    orderBy: { scheduledAt: 'asc' },
  });
}

export async function create(data: Prisma.AppointmentUncheckedCreateInput) {
  return prisma.appointment.create({
    data,
    include: appointmentInclude,
  });
}

export async function updateStatus(id: string, status: AppointmentStatus) {
  return prisma.appointment.update({
    where: { id },
    data: { status },
    include: appointmentInclude,
  });
}

export async function remove(id: string) {
  await prisma.appointment.delete({ where: { id } });
}
