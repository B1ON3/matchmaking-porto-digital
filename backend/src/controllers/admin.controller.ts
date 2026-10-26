import type { Request, Response } from 'express';
import { UserRole, UserStatus, type Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/http-error';
import { buildMetricsCsv, getAdminMetrics, resolveMetricsRange } from '../services/admin-metrics.service';

const listUsersSchema = z.object({
  busca: z.string().trim().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  papel: z.nativeEnum(UserRole).optional(),
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(100).default(20),
});

const statusSchema = z.object({
  status: z.enum(['ATIVO', 'SUSPENSO']),
  motivo: z.string().trim().min(5, 'informe o motivo com pelo menos 5 caracteres').max(300),
});

const profileBodySchema = z.object({
  motivo: z.string().trim().max(300).optional(),
});

const idSchema = z.object({ id: z.string().uuid('identificador invalido') });

const metricsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  granularity: z.string().optional(),
});

const selectUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  lastLoginAt: true,
  suspendedAt: true,
  moderationReason: true,
  deletedAt: true,
  createdAt: true,
  startupProfile: {
    select: { id: true, companyName: true, sector: true, city: true, state: true, hiddenAt: true },
  },
  investorProfile: {
    select: { id: true, companyName: true, sectorInterest: true, city: true, state: true, hiddenAt: true },
  },
} satisfies Prisma.UserSelect;

// GET /v1/admin/users?busca=&status=&papel=&pagina=&porPagina=
export async function listUsers(req: Request, res: Response) {
  const { busca, status, papel, pagina, porPagina } = listUsersSchema.parse(req.query);

  const where: Prisma.UserWhereInput = {
    ...(status ? { status } : {}),
    ...(papel ? { role: papel } : {}),
    ...(busca
      ? {
          OR: [{ name: { contains: busca, mode: 'insensitive' } }, { email: { contains: busca, mode: 'insensitive' } }],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: selectUser,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ total, pagina, porPagina, users });
}

// PATCH /v1/admin/users/:id/status
export async function updateUserStatus(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);
  const { status, motivo } = statusSchema.parse(req.body);

  const alvo = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  if (!alvo) {
    throw HttpError.notFound('usuario nao encontrado');
  }

  if (alvo.status === UserStatus.EXCLUIDO) {
    throw HttpError.badRequest('conta excluida nao pode ser modificada pela moderacao');
  }

  if (id === req.user!.id && status === UserStatus.SUSPENSO) {
    throw HttpError.badRequest('voce nao pode suspender a propria conta');
  }

  if (alvo.status === status) {
    throw HttpError.conflict(status === UserStatus.ATIVO ? 'esta conta ja esta ativa' : 'esta conta ja esta suspensa');
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      status,
      suspendedAt: status === UserStatus.SUSPENSO ? new Date() : null,
      moderationReason: status === UserStatus.SUSPENSO ? motivo : null,
    },
    select: selectUser,
  });

  res.locals.auditDetails = {
    alvo: alvo.email,
    papel: alvo.role,
    statusAnterior: alvo.status,
    statusNovo: status,
    motivo,
  };

  res.json(user);
}

async function localizarPerfil(id: string) {
  const [startup, investor] = await Promise.all([
    prisma.startupProfile.findUnique({
      where: { id },
      select: { id: true, companyName: true, hiddenAt: true },
    }),
    prisma.investorProfile.findUnique({
      where: { id },
      select: { id: true, companyName: true, hiddenAt: true },
    }),
  ]);

  if (startup) {
    return { tipo: 'STARTUP' as const, perfil: startup, entity: 'StartupProfile' };
  }

  if (investor) {
    return { tipo: 'INVESTOR' as const, perfil: investor, entity: 'InvestorProfile' };
  }

  throw HttpError.notFound('perfil nao encontrado');
}

// POST /v1/admin/profiles/:id/hide
export async function hideProfile(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);
  const { motivo } = profileBodySchema.parse(req.body ?? {});
  const alvo = await localizarPerfil(id);

  if (alvo.perfil.hiddenAt) {
    throw HttpError.conflict('este perfil ja esta oculto');
  }

  const hiddenAt = new Date();

  if (alvo.tipo === 'STARTUP') {
    await prisma.startupProfile.update({ where: { id }, data: { hiddenAt } });
  } else {
    await prisma.investorProfile.update({ where: { id }, data: { hiddenAt } });
  }

  res.locals.auditEntity = alvo.entity;
  res.locals.auditDetails = { tipo: alvo.tipo, motivo: motivo ?? null };

  res.json({ id, tipo: alvo.tipo, hiddenAt: hiddenAt.toISOString() });
}

// POST /v1/admin/profiles/:id/restore
export async function restoreProfile(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);
  const { motivo } = profileBodySchema.parse(req.body ?? {});
  const alvo = await localizarPerfil(id);

  if (!alvo.perfil.hiddenAt) {
    throw HttpError.conflict('este perfil ja esta visivel');
  }

  if (alvo.tipo === 'STARTUP') {
    await prisma.startupProfile.update({ where: { id }, data: { hiddenAt: null } });
  } else {
    await prisma.investorProfile.update({ where: { id }, data: { hiddenAt: null } });
  }

  res.locals.auditEntity = alvo.entity;
  res.locals.auditDetails = { tipo: alvo.tipo, motivo: motivo ?? null };

  res.json({ id, tipo: alvo.tipo, hiddenAt: null });
}

// GET /v1/admin/metrics?from=&to=&granularity=
export async function metrics(req: Request, res: Response) {
  const query = metricsQuerySchema.parse(req.query);
  const range = resolveMetricsRange(query);

  res.json(await getAdminMetrics(range));
}

// GET /v1/admin/metrics/export.csv
export async function exportMetricsCsv(req: Request, res: Response) {
  const query = metricsQuerySchema.parse(req.query);
  const range = resolveMetricsRange(query);
  const dados = await getAdminMetrics(range);
  const csv = buildMetricsCsv(dados);
  const arquivo = `laco-metricas-${dados.range.from.slice(0, 10)}-${dados.range.to.slice(0, 10)}.csv`;

  res.locals.auditDetails = {
    from: dados.range.from,
    to: dados.range.to,
    granularity: dados.range.granularity,
  };

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${arquivo}"`);
  res.status(200).send(csv);
}
