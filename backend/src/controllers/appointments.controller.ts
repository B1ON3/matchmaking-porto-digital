import { Request, Response } from 'express';
import { AppointmentStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/http-error';

const createSchema = z.object({
  title: z.string().min(3, 'informe um titulo pro agendamento'),
  description: z.string().optional(),
  scheduledAt: z.coerce.date({ invalid_type_error: 'data invalida' }),
});

// POST /api/appointments  (RF05)
export async function create(req: Request, res: Response) {
  const dados = createSchema.parse(req.body);

  if (dados.scheduledAt.getTime() < Date.now()) {
    throw HttpError.badRequest('nao da pra agendar uma reuniao no passado');
  }

  const agendamento = await prisma.appointment.create({
    data: {
      ...dados,
      createdById: req.user!.id,
    },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  res.status(201).json(agendamento);
}

// GET /api/appointments
export async function list(req: Request, res: Response) {
  const filtros = z
    .object({
      status: z.nativeEnum(AppointmentStatus).optional(),
      futuros: z.coerce.boolean().default(true),
    })
    .parse(req.query);

  const agendamentos = await prisma.appointment.findMany({
    where: {
      ...(filtros.status ? { status: filtros.status } : {}),
      ...(filtros.futuros ? { scheduledAt: { gte: new Date() } } : {}),
    },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
    orderBy: { scheduledAt: 'asc' },
  });

  res.json(agendamentos);
}

// GET /api/appointments/:id
export async function show(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  const agendamento = await prisma.appointment.findUnique({
    where: { id },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  if (!agendamento) {
    throw HttpError.notFound('agendamento nao encontrado');
  }

  res.json(agendamento);
}

// PUT /api/appointments/:id/status
export async function updateStatus(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const { status } = z
    .object({ status: z.nativeEnum(AppointmentStatus) })
    .parse(req.body);

  const agendamento = await prisma.appointment.findUnique({
    where: { id },
    select: { createdById: true },
  });

  if (!agendamento) {
    throw HttpError.notFound('agendamento nao encontrado');
  }

  if (agendamento.createdById !== req.user!.id) {
    throw HttpError.forbidden('voce so pode mudar um agendamento que criou');
  }

  const atualizado = await prisma.appointment.update({ where: { id }, data: { status } });

  res.json(atualizado);
}

// DELETE /api/appointments/:id
export async function remove(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  const agendamento = await prisma.appointment.findUnique({
    where: { id },
    select: { createdById: true },
  });

  if (!agendamento) {
    throw HttpError.notFound('agendamento nao encontrado');
  }

  if (agendamento.createdById !== req.user!.id) {
    throw HttpError.forbidden('voce so pode remover um agendamento que criou');
  }

  await prisma.appointment.delete({ where: { id } });

  res.status(204).send();
}