import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { generateToken } from '../services/token.service';
import { comparePassword, hashPassword } from '../utils/password';
import { HttpError } from '../utils/http-error';
import { emailSchema } from '../utils/email';

const cadastroSchema = z.object({
  name: z.string().min(3, 'nome muito curto'),
  email: emailSchema,
  password: z.string().min(6, 'a senha precisa de pelo menos 6 caracteres'),
  role: z.enum([UserRole.STARTUP, UserRole.INVESTOR, UserRole.MENTOR]).default(UserRole.STARTUP),
  startup: z
    .object({
      companyName: z.string().min(2),
      sector: z.string().min(2),
      description: z.string().min(10),
      stage: z.string().min(2),
      city: z.string().min(2),
      state: z.string().length(2, 'use a sigla do estado, ex: PE'),
    })
    .optional(),
  investor: z
    .object({
      companyName: z.string().optional(),
      sectorInterest: z.string().min(2),
      stageInterest: z.string().min(2),
      ticketMin: z.number().int().nonnegative(),
      ticketMax: z.number().int().nonnegative(),
      city: z.string().optional(),
      state: z.string().length(2),
    })
    .optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'informe a senha'),
});

// POST /api/auth/register
export async function register(req: Request, res: Response) {
  const dados = cadastroSchema.parse(req.body);

  if (dados.role === UserRole.STARTUP && !dados.startup) {
    throw HttpError.badRequest('startup e obrigatorio quando role = STARTUP');
  }

  if (dados.role === UserRole.INVESTOR && !dados.investor) {
    throw HttpError.badRequest('investor e obrigatorio quando role = INVESTOR');
  }

  if (dados.role === UserRole.MENTOR && !dados.investor) {
    throw HttpError.badRequest('investor (perfil de mentoria) e obrigatorio quando role = MENTOR');
  }

  if (dados.investor && dados.investor.ticketMax < dados.investor.ticketMin) {
    throw HttpError.badRequest('ticketMax nao pode ser menor que ticketMin');
  }

  const emailExistente = await prisma.user.findUnique({ where: { email: dados.email } });

  if (emailExistente) {
    throw HttpError.conflict('ja existe um cadastro com esse email');
  }

  const user = await prisma.user.create({
    data: {
      name: dados.name,
      email: dados.email,
      passwordHash: await hashPassword(dados.password),
      role: dados.role,
      startupProfile: dados.startup ? { create: dados.startup } : undefined,
      investorProfile: dados.investor ? { create: dados.investor } : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      startupProfile: true,
      investorProfile: true,
    },
  });

  const token = generateToken({ sub: user.id, email: user.email, role: user.role });

  res.status(201).json({ token, user });
}

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw HttpError.unauthorized('email ou senha invalidos');
  }

  const senhaConfere = await comparePassword(password, user.passwordHash);

  if (!senhaConfere) {
    throw HttpError.unauthorized('email ou senha invalidos');
  }

  const token = generateToken({ sub: user.id, email: user.email, role: user.role });

  const { passwordHash, ...userSemSenha } = user;

  res.json({ token, user: userSemSenha });
}

// GET /api/auth/me
export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      startupProfile: true,
      investorProfile: true,
    },
  });

  if (!user) {
    throw HttpError.notFound('usuario nao encontrado');
  }

  res.json(user);
}