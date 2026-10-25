import { Request, Response } from 'express';
import { ProjectStatus, UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/http-error';

const projectSchema = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().max(500).optional(),
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.EM_ANDAMENTO),
});

const updateSchema = projectSchema.partial();

const paramsSchema = z.object({ id: z.string().uuid() });
const projectParamsSchema = z.object({ id: z.string().uuid(), projectId: z.string().uuid() });

async function assertStartupOwner(startupId: string, user: { id: string; role: UserRole }) {
  const startup = await prisma.startupProfile.findUnique({
    where: { id: startupId },
    select: { userId: true },
  });

  if (!startup) {
    throw HttpError.notFound('startup nao encontrada');
  }

  if (startup.userId !== user.id && user.role !== UserRole.ADMIN) {
    throw HttpError.forbidden('voce so pode alterar os projetos da sua propria startup');
  }
}

export async function listProjects(req: Request, res: Response) {
  const { id } = paramsSchema.parse(req.params);

  const startup = await prisma.startupProfile.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!startup) {
    throw HttpError.notFound('startup nao encontrada');
  }

  const projects = await prisma.project.findMany({
    where: { startupId: id },
    orderBy: { createdAt: 'desc' },
  });

  res.json(projects);
}

export async function createProject(req: Request, res: Response) {
  const { id } = paramsSchema.parse(req.params);
  const dados = projectSchema.parse(req.body);

  await assertStartupOwner(id, req.user!);

  const project = await prisma.project.create({
    data: { ...dados, startupId: id },
  });

  res.status(201).json(project);
}

export async function updateProject(req: Request, res: Response) {
  const { id, projectId } = projectParamsSchema.parse(req.params);
  const dados = updateSchema.parse(req.body);

  await assertStartupOwner(id, req.user!);

  const project = await prisma.project.findFirst({
    where: { id: projectId, startupId: id },
    select: { id: true },
  });

  if (!project) {
    throw HttpError.notFound('projeto nao encontrado');
  }

  const atualizado = await prisma.project.update({
    where: { id: projectId },
    data: dados,
  });

  res.json(atualizado);
}

export async function removeProject(req: Request, res: Response) {
  const { id, projectId } = projectParamsSchema.parse(req.params);

  await assertStartupOwner(id, req.user!);

  const project = await prisma.project.findFirst({
    where: { id: projectId, startupId: id },
    select: { id: true },
  });

  if (!project) {
    throw HttpError.notFound('projeto nao encontrado');
  }

  await prisma.project.delete({ where: { id: projectId } });

  res.status(204).send();
}
