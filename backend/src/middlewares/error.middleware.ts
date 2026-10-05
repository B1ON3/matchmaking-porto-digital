import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { HttpError } from '../utils/http-error';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Rota nao encontrada',
    path: req.originalUrl,
  });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados invalidos',
      details: err.issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensagem: issue.message,
      })),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ja existe um registro com esse dado' });
    }

    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Recurso nao encontrado' });
    }
  }

  console.error('[erro nao tratado]', err);

  return res.status(500).json({ error: 'Erro interno do servidor' });
}