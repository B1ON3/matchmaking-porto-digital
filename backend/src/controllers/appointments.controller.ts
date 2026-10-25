import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { AppointmentStatus, UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/http-error';

const createSchema = z.object({
  title: z.string().min(3, 'informe um titulo pro agendamento'),
  description: z.string().optional(),
  scheduledAt: z.coerce.date({ invalid_type_error: 'data invalida' }),
  matchId: z.string().uuid().optional(),
});

const matchInclude = {
  startup: { include: { user: { select: { id: true, name: true, email: true } } } },
  investor: { include: { user: { select: { id: true, name: true, email: true } } } },
} satisfies Prisma.MatchInclude;

const appointmentInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  match: { include: matchInclude },
} satisfies Prisma.AppointmentInclude;

type Usuario = { id: string; role: UserRole };

function escopoDoUsuario(usuario: Usuario): Prisma.AppointmentWhereInput {
  if (usuario.role === UserRole.ADMIN) {
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

function podeGerenciar(
  agendamento: { createdById: string; match: { startup: { userId: string }; investor: { userId: string } } | null },
  usuario: Usuario,
): boolean {
  if (usuario.role === UserRole.ADMIN || agendamento.createdById === usuario.id) {
    return true;
  }

  if (!agendamento.match) {
    return false;
  }

  return agendamento.match.startup.userId === usuario.id || agendamento.match.investor.userId === usuario.id;
}

// POST /api/appointments  (RF05)
export async function create(req: Request, res: Response) {
  const dados = createSchema.parse(req.body);

  if (dados.scheduledAt.getTime() < Date.now()) {
    throw HttpError.badRequest('nao da pra agendar uma reuniao no passado');
  }

  if (dados.matchId) {
    const match = await prisma.match.findUnique({
      where: { id: dados.matchId },
      select: {
        startup: { select: { userId: true } },
        investor: { select: { userId: true } },
      },
    });

    if (!match) {
      throw HttpError.notFound('match nao encontrado');
    }

    const participa = match.startup.userId === req.user!.id || match.investor.userId === req.user!.id;

    if (!participa && req.user!.role !== UserRole.ADMIN) {
      throw HttpError.forbidden('voce nao faz parte desse match');
    }
  }

  const agendamento = await prisma.appointment.create({
    data: {
      ...dados,
      createdById: req.user!.id,
    },
    include: appointmentInclude,
  });

  res.status(201).json(agendamento);
}

// GET /api/appointments
export async function list(req: Request, res: Response) {
  const filtros = z
    .object({
      status: z.nativeEnum(AppointmentStatus).optional(),
      futuros: z
        .enum(['true', 'false'])
        .default('true')
        .transform((valor) => valor === 'true'),
    })
    .parse(req.query);

  const agendamentos = await prisma.appointment.findMany({
    where: {
      ...escopoDoUsuario(req.user!),
      ...(filtros.status ? { status: filtros.status } : {}),
      ...(filtros.futuros ? { scheduledAt: { gte: new Date() } } : {}),
    },
    include: appointmentInclude,
    orderBy: { scheduledAt: 'asc' },
  });

  res.json(agendamentos);
}

// GET /api/appointments/:id
export async function show(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  const agendamento = await prisma.appointment.findFirst({
    where: { id, ...escopoDoUsuario(req.user!) },
    include: appointmentInclude,
  });

  if (!agendamento) {
    throw HttpError.notFound('agendamento nao encontrado');
  }

  res.json(agendamento);
}

// PUT /api/appointments/:id/status
export async function updateStatus(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const { status } = z.object({ status: z.nativeEnum(AppointmentStatus) }).parse(req.body);

  const agendamento = await prisma.appointment.findUnique({
    where: { id },
    select: {
      createdById: true,
      match: { select: { startup: { select: { userId: true } }, investor: { select: { userId: true } } } },
    },
  });

  if (!agendamento) {
    throw HttpError.notFound('agendamento nao encontrado');
  }

  if (!podeGerenciar(agendamento, req.user!)) {
    throw HttpError.forbidden('voce nao pode mudar esse agendamento');
  }

  const atualizado = await prisma.appointment.update({
    where: { id },
    data: { status },
    include: appointmentInclude,
  });

  res.json(atualizado);
}

// DELETE /api/appointments/:id
export async function remove(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  const agendamento = await prisma.appointment.findUnique({
    where: { id },
    select: {
      createdById: true,
      match: { select: { startup: { select: { userId: true } }, investor: { select: { userId: true } } } },
    },
  });

  if (!agendamento) {
    throw HttpError.notFound('agendamento nao encontrado');
  }

  if (!podeGerenciar(agendamento, req.user!)) {
    throw HttpError.forbidden('voce nao pode remover esse agendamento');
  }

  await prisma.appointment.delete({ where: { id } });

  res.status(204).send();
}
