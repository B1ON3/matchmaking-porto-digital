import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { generateToken } from '../services/token.service';
import { hashPassword } from '../utils/password';
import { HttpError } from '../utils/http-error';
import { emailSchema } from '../utils/email';

const startupSchema = z.object({
  name: z.string().min(3, 'nome muito curto'),
  email: emailSchema,
  password: z.string().min(6, 'a senha precisa de pelo menos 6 caracteres'),
  companyName: z.string().min(2, 'informe o nome da startup'),
  sector: z.string().min(2, 'informe o setor'),
  description: z.string().min(10, 'describe a startup com pelo menos 10 caracteres'),
  stage: z.string().min(2, 'informe o estagio'),
  city: z.string().min(2, 'informe a cidade'),
  state: z.string().length(2, 'use a sigla do estado, ex: PE'),
  website: z.string().url('url invalida').optional(),
  needs: z.string().optional(),
  pitchUrl: z.string().url('url invalida').optional(),
  logoUrl: z.string().url('url invalida').optional(),
});

const updateSchema = startupSchema.partial().omit({ email: true, password: true });

// POST /api/startups  (RF01 / RF02)
export async function create(req: Request, res: Response) {
  const dados = startupSchema.parse(req.body);

  const emailExistente = await prisma.user.findUnique({ where: { email: dados.email } });

  if (emailExistente) {
    throw HttpError.conflict('ja existe um cadastro com esse email');
  }

  const { name, email, password, ...perfil } = dados;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: UserRole.STARTUP,
      startupProfile: { create: perfil },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      startupProfile: true,
    },
  });

  const token = generateToken({ sub: user.id, email: user.email, role: user.role });

  res.status(201).json({ token, user });
}

// GET /api/startups?setor=&estagio=&cidade=
export async function list(req: Request, res: Response) {
  const filtros = z
    .object({
      setor: z.string().optional(),
      estagio: z.string().optional(),
      cidade: z.string().optional(),
      pagina: z.coerce.number().int().positive().default(1),
      porPagina: z.coerce.number().int().positive().max(50).default(20),
    })
    .parse(req.query);

  const { setor, estagio, cidade, pagina, porPagina } = filtros;

  const startups = await prisma.startupProfile.findMany({
    where: {
      ...(setor ? { sector: { contains: setor, mode: 'insensitive' } } : {}),
      ...(estagio ? { stage: { contains: estagio, mode: 'insensitive' } } : {}),
      ...(cidade ? { city: { contains: cidade, mode: 'insensitive' } } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { matches: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (pagina - 1) * porPagina,
    take: porPagina,
  });

  const total = await prisma.startupProfile.count();

  res.json({ total, pagina, porPagina, startups });
}

// GET /api/startups/:id
export async function show(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  const startup = await prisma.startupProfile.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
  });

  if (!startup) {
    throw HttpError.notFound('startup nao encontrada');
  }

  res.json(startup);
}

// PUT /api/startups/:id  (so o dono ou admin altera)
export async function update(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const dados = updateSchema.parse(req.body);

  const startup = await prisma.startupProfile.findUnique({
    where: { id },
    select: { id: true, userId: true, user: { select: { name: true } } },
  });

  if (!startup) {
    throw HttpError.notFound('startup nao encontrada');
  }

  const ehDono = startup.userId === req.user!.id;
  const ehAdmin = req.user!.role === UserRole.ADMIN;

  if (!ehDono && !ehAdmin) {
    throw HttpError.forbidden('voce so pode editar a sua propria startup');
  }

  const { name, ...perfil } = dados as { name?: string } & Record<string, unknown>;

  const atualizado = await prisma.startupProfile.update({
    where: { id },
    data: perfil,
  });

  if (name) {
    await prisma.user.update({ where: { id: startup.userId }, data: { name } });
  }

  res.json(atualizado);
}

// DELETE /api/startups/:id
export async function remove(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  const startup = await prisma.startupProfile.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!startup) {
    throw HttpError.notFound('startup nao encontrada');
  }

  if (startup.userId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
    throw HttpError.forbidden('voce so pode remover a sua propria startup');
  }

  await prisma.startupProfile.delete({ where: { id } });

  res.status(204).send();
}