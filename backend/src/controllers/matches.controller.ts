import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { gerarMatchesDaStartup } from '../services/matching.service';
import { HttpError } from '../utils/http-error';

const querySchema = z.object({
  minimo: z.coerce.number().min(0).max(100).default(0),
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(50).default(10),
});

// GET /api/matches?minimo=60  (RF03 / RF04)
// startup logada -> ve as startups mais compativeis
// investidor logado -> ve os investidores mais compativeis
export async function list(req: Request, res: Response) {
  const { minimo, pagina, porPagina } = querySchema.parse(req.query);
  const { role, id: userId } = req.user!;

  if (role === UserRole.STARTUP) {
    const perfil = await prisma.startupProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!perfil) {
      throw HttpError.notFound('perfil de startup nao encontrado pra esse usuario');
    }

    // recalcula pra garantir que o score reflects mudancas no perfil
    await gerarMatchesDaStartup(perfil.id);

    const matches = await prisma.match.findMany({
      where: { startupId: perfil.id, score: { gte: minimo } },
      include: {
        investor: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { score: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    });

    const total = await prisma.match.count({
      where: { startupId: perfil.id, score: { gte: minimo } },
    });

    return res.json({ total, pagina, porPagina, perfil: 'startup', matches });
  }

  if (role === UserRole.INVESTOR) {
    const perfil = await prisma.investorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!perfil) {
      throw HttpError.notFound('perfil de investidor nao encontrado pra esse usuario');
    }

    const matches = await prisma.match.findMany({
      where: { investorId: perfil.id, score: { gte: minimo } },
      include: {
        startup: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { score: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    });

    const total = await prisma.match.count({
      where: { investorId: perfil.id, score: { gte: minimo } },
    });

    return res.json({ total, pagina, porPagina, perfil: 'investor', matches });
  }

  // admin ve tudo que existe
  const matches = await prisma.match.findMany({
    where: { score: { gte: minimo } },
    include: {
      startup: { include: { user: { select: { id: true, name: true } } } },
      investor: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { score: 'desc' },
    skip: (pagina - 1) * porPagina,
    take: porPagina,
  });

  const total = await prisma.match.count({ where: { score: { gte: minimo } } });

  return res.json({ total, pagina, porPagina, perfil: 'admin', matches });
}

// GET /api/matches/:id
export async function show(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      startup: { include: { user: { select: { id: true, name: true } } } },
      investor: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  if (!match) {
    throw HttpError.notFound('match nao encontrado');
  }

  res.json(match);
}

// PUT /api/matches/:id/status  -> aceitar ou recusar uma conexao
export async function updateStatus(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const { status } = z
    .object({ status: z.enum(['ACEITO', 'RECUSADO', 'PENDENTE']) })
    .parse(req.body);

  const match = await prisma.match.findUnique({
    where: { id },
    include: { startup: true, investor: true },
  });

  if (!match) {
    throw HttpError.notFound('match nao encontrado');
  }

  const ehEnvolvido =
    match.startup.userId === req.user!.id || match.investor.userId === req.user!.id;

  if (!ehEnvolvido && req.user!.role !== UserRole.ADMIN) {
    throw HttpError.forbidden('voce nao faz parte desse match');
  }

  const atualizado = await prisma.match.update({ where: { id }, data: { status } });

  res.json(atualizado);
}

// POST /api/matches/gerar  -> recalcula os matches de uma startup
export async function regenerate(req: Request, res: Response) {
  const { startupId } = z.object({ startupId: z.string().uuid() }).parse(req.body);

  const startup = await prisma.startupProfile.findUnique({
    where: { id: startupId },
    select: { userId: true },
  });

  if (!startup) {
    throw HttpError.notFound('startup nao encontrada');
  }

  if (startup.userId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
    throw HttpError.forbidden('voce so pode recalcular os matches da sua startup');
  }

  const gerados = await gerarMatchesDaStartup(startupId);

  res.json({
    mensagem: `${gerados.length} match(es) recalculado(s)`,
    quantidade: gerados.length,
  });
}