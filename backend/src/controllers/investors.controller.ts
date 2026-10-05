import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { generateToken } from '../services/token.service';
import { hashPassword } from '../utils/password';
import { HttpError } from '../utils/http-error';

const investorSchema = z.object({
  name: z.string().min(3, 'nome muito curto'),
  email: z.string().email('email invalido'),
  password: z.string().min(6, 'a senha precisa de pelo menos 6 caracteres'),
  companyName: z.string().optional(),
  sectorInterest: z.string().min(2, 'informe os setores de interesse'),
  stageInterest: z.string().min(2, 'informe os estagios de interesse'),
  ticketMin: z.number().int().nonnegative(),
  ticketMax: z.number().int().nonnegative(),
  city: z.string().optional(),
  state: z.string().length(2, 'use a sigla do estado, ex: PE'),
  bio: z.string().optional(),
});

const updateSchema = investorSchema.partial().omit({ email: true, password: true });

// POST /api/investors  (RF01 / RF02)
export async function create(req: Request, res: Response) {
  const dados = investorSchema.parse(req.body);

  if (dados.ticketMax < dados.ticketMin) {
    throw HttpError.badRequest('ticketMax nao pode ser menor que ticketMin');
  }

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
      role: UserRole.INVESTOR,
      investorProfile: { create: perfil },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      investorProfile: true,
    },
  });

  const token = generateToken({ sub: user.id, email: user.email, role: user.role });

  res.status(201).json({ token, user });
}

// GET /api/investors?setor=&estado=
export async function list(req: Request, res: Response) {
  const filtros = z
    .object({
      setor: z.string().optional(),
      estado: z.string().length(2).optional(),
      pagina: z.coerce.number().int().positive().default(1),
      porPagina: z.coerce.number().int().positive().max(50).default(20),
    })
    .parse(req.query);

  const { setor, estado, pagina, porPagina } = filtros;

  const investors = await prisma.investorProfile.findMany({
    where: {
      ...(setor
        ? { sectorInterest: { contains: setor, mode: 'insensitive' as const } }
        : {}),
      ...(estado ? { state: estado } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { matches: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (pagina - 1) * porPagina,
    take: porPagina,
  });

  const total = await prisma.investorProfile.count();

  res.json({ total, pagina, porPagina, investors });
}

// GET /api/investors/:id
export async function show(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  const investor = await prisma.investorProfile.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
  });

  if (!investor) {
    throw HttpError.notFound('investidor nao encontrado');
  }

  res.json(investor);
}

// PUT /api/investors/:id
export async function update(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const dados = updateSchema.parse(req.body);

  const investor = await prisma.investorProfile.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!investor) {
    throw HttpError.notFound('investidor nao encontrado');
  }

  if (investor.userId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
    throw HttpError.forbidden('voce so pode editar o seu proprio perfil');
  }

  const { name, ...perfil } = dados as { name?: string } & Record<string, unknown>;

  const atualizado = await prisma.investorProfile.update({
    where: { id },
    data: perfil,
  });

  if (name) {
    await prisma.user.update({ where: { id: investor.userId }, data: { name } });
  }

  res.json(atualizado);
}

// DELETE /api/investors/:id
export async function remove(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  const investor = await prisma.investorProfile.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!investor) {
    throw HttpError.notFound('investidor nao encontrado');
  }

  if (investor.userId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
    throw HttpError.forbidden('voce so pode remover o seu proprio perfil');
  }

  await prisma.investorProfile.delete({ where: { id } });

  res.status(204).send();
}