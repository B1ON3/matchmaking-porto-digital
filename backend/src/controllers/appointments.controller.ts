import type { Request, Response } from 'express';
import { AppointmentStatus } from '@prisma/client';
import { z } from 'zod';
import {
  alterarStatus,
  criarAgendamento,
  listarAgendamentos,
  obterAgendamento,
  removerAgendamento,
  verificarConflito,
} from '../services/appointment.service';

const durationSchema = z.union([z.literal(30), z.literal(60)]);

const createSchema = z.object({
  title: z.string().min(3, 'informe um titulo pro agendamento'),
  description: z.string().optional(),
  scheduledAt: z.coerce.date({ invalid_type_error: 'data invalida' }),
  durationMinutes: durationSchema.default(60),
  matchId: z.string().uuid().optional(),
});

const conflictSchema = z.object({
  scheduledAt: z.coerce.date({ invalid_type_error: 'data invalida' }),
  durationMinutes: z.coerce.number().refine((valor): valor is 30 | 60 => valor === 30 || valor === 60, {
    message: 'a duracao deve ser de 30 ou 60 minutos',
  }),
  matchId: z.string().uuid().optional(),
});

// POST /api/appointments  (RF05)
export async function create(req: Request, res: Response) {
  const dados = createSchema.parse(req.body);
  const agendamento = await criarAgendamento(req.user!, dados);

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

  const agendamentos = await listarAgendamentos(req.user!, filtros.status, filtros.futuros);

  res.json(agendamentos);
}

// GET /api/appointments/conflicts
export async function conflicts(req: Request, res: Response) {
  const { scheduledAt, durationMinutes, matchId } = conflictSchema.parse(req.query);
  const resultado = await verificarConflito(req.user!, scheduledAt, durationMinutes, matchId);

  res.json(resultado);
}

// GET /api/appointments/:id
export async function show(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const agendamento = await obterAgendamento(id, req.user!);

  res.json(agendamento);
}

// PUT /api/appointments/:id/status
export async function updateStatus(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const { status } = z.object({ status: z.nativeEnum(AppointmentStatus) }).parse(req.body);
  const atualizado = await alterarStatus(id, status, req.user!);

  res.json(atualizado);
}

// DELETE /api/appointments/:id
export async function remove(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  await removerAgendamento(id, req.user!);

  res.status(204).send();
}
