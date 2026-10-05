import { Request, Response, Router } from 'express';
import { prisma } from '../config/prisma';

export const routes = Router();

routes.get('/health', async (_req: Request, res: Response) => {
  let database = 'offline';

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'online';
  } catch {
    database = 'offline';
  }

  res.json({
    status: 'ok',
    servico: 'matchmaking-porto-digital-api',
    version: '0.1.0',
    banco: database,
    timestamp: new Date().toISOString(),
  });
});