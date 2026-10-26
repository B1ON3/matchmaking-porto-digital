import type { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { createWithConsents, findCredentialsByEmail, registerLogin } from '../repositories/user.repository';
import { consentimentosDeCadastro } from '../services/privacy.service';
import { redefinirSenha, solicitarRedefinicao } from '../services/password-reset.service';
import { generateToken } from '../services/token.service';
import { comparePassword, hashPassword } from '../utils/password';
import { HttpError } from '../utils/http-error';
import { emailSchema } from '../utils/email';
import { enviarEmailRedefinicao } from '../utils/mailer';
import { getRequestContext } from '../utils/request-context';

const cadastroSchema = z.object({
  name: z.string().min(3, 'nome muito curto'),
  email: emailSchema,
  password: z.string().min(6, 'a senha precisa de pelo menos 6 caracteres'),
  role: z.enum([UserRole.STARTUP, UserRole.INVESTOR]).default(UserRole.STARTUP),
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
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'é necessário aceitar os termos de uso' }),
  }),
  acceptedPrivacy: z.literal(true, {
    errorMap: () => ({ message: 'é necessário aceitar a política de privacidade' }),
  }),
  termsVersion: z.string().trim().min(1, 'versão dos termos ausente'),
  privacyVersion: z.string().trim().min(1, 'versão da política ausente'),
  communicationsOptIn: z.boolean().default(false),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'informe a senha'),
});

const solicitarResetSchema = z.object({
  email: emailSchema,
});

const redefinirSenhaSchema = z.object({
  token: z.string().trim().min(32, 'codigo invalido').max(128, 'codigo invalido'),
  password: z.string().min(6, 'a senha precisa de pelo menos 6 caracteres'),
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

  if (dados.investor && dados.investor.ticketMax < dados.investor.ticketMin) {
    throw HttpError.badRequest('ticketMax nao pode ser menor que ticketMin');
  }

  const emailExistente = await prisma.user.findUnique({ where: { email: dados.email } });

  if (emailExistente) {
    throw HttpError.conflict('ja existe um cadastro com esse email');
  }

  const consentimentos = consentimentosDeCadastro(
    {
      termsVersion: dados.termsVersion,
      privacyVersion: dados.privacyVersion,
      communicationsOptIn: dados.communicationsOptIn,
    },
    getRequestContext(req),
  );

  const user = await createWithConsents(
    {
      name: dados.name,
      email: dados.email,
      passwordHash: await hashPassword(dados.password),
      role: dados.role,
      lastLoginAt: new Date(),
      startupProfile: dados.startup ? { create: dados.startup } : undefined,
      investorProfile: dados.investor ? { create: dados.investor } : undefined,
    },
    consentimentos,
    {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      startupProfile: true,
      investorProfile: true,
    },
  );

  const token = generateToken({ sub: user.id, email: user.email, role: user.role });

  res.status(201).json({ token, user });
}

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);

  const credenciais = await findCredentialsByEmail(email);

  if (!credenciais) {
    throw HttpError.unauthorized('email ou senha invalidos');
  }

  if (credenciais.status !== 'ATIVO') {
    throw credenciais.status === 'SUSPENSO'
      ? HttpError.forbidden('Conta suspensa. Fale com a administração para revisar o acesso.')
      : HttpError.unauthorized('email ou senha invalidos');
  }

  const senhaConfere = await comparePassword(password, credenciais.passwordHash);

  if (!senhaConfere) {
    throw HttpError.unauthorized('email ou senha invalidos');
  }

  const user = await prisma.user.findUnique({
    where: { id: credenciais.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      startupProfile: true,
      investorProfile: true,
    },
  });

  if (!user) {
    throw HttpError.unauthorized('email ou senha invalidos');
  }

  await registerLogin(user.id);

  const token = generateToken({ sub: user.id, email: user.email, role: user.role });

  res.json({ token, user });
}

// POST /api/auth/forgot-password
// resposta e sempre a mesma, exista ou nao a conta, para nao vazar quais e-mails
// estao cadastrados. em desenvolvimento o token volta no corpo para testar o fluxo.
export async function forgotPassword(req: Request, res: Response) {
  const { email } = solicitarResetSchema.parse(req.body);
  const solicitacao = await solicitarRedefinicao(email);

  if (solicitacao) {
    await enviarEmailRedefinicao(email, solicitacao.token, solicitacao.expiraEm);
  }

  res.json({
    mensagem: 'Se existir uma conta com esse e-mail, enviamos as instrucoes de redefinicao.',
    ...(solicitacao && !env.isProduction
      ? { token: solicitacao.token, expiraEm: solicitacao.expiraEm.toISOString() }
      : {}),
  });
}

// POST /api/auth/reset-password
export async function resetPassword(req: Request, res: Response) {
  const { token, password } = redefinirSenhaSchema.parse(req.body);

  await redefinirSenha(token, password);

  res.json({ mensagem: 'senha atualizada, ja pode entrar com a nova senha' });
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
      status: true,
      createdAt: true,
      lastLoginAt: true,
      startupProfile: true,
      investorProfile: true,
    },
  });

  if (!user) {
    throw HttpError.notFound('usuario nao encontrado');
  }

  res.json(user);
}
