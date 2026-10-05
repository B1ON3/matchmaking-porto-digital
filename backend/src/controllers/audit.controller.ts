import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/http-error';

const querySchema = z.object({
  entidade: z.string().optional(),
  acao: z.string().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(100).default(50),
});

// GET /api/audit  (RF08 / RNF10) - somente admin
export async function list(req: Request, res: Response) {
  const { entidade, acao, pagina, porPagina } = querySchema.parse(req.query);

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(entidade ? { entity: entidade } : {}),
      ...(acao ? { action: { contains: acao, mode: 'insensitive' } } : {}),
    },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (pagina - 1) * porPagina,
    take: porPagina,
  });

  const total = await prisma.auditLog.count();

  res.json({ total, pagina, porPagina, logs });
}

// GET /api/audit/:id
export async function show(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  if (!log) {
    throw HttpError.notFound('log nao encontrado');
  }

  res.json(log);
}

// DELETE /api/audit/:id  (so admin pode limpar um registro)
export async function remove(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  const log = await prisma.auditLog.findUnique({ where: { id } });

  if (!log) {
    throw HttpError.notFound('log nao encontrado');
  }

  await prisma.auditLog.delete({ where: { id } });

  res.status(204).send();
}