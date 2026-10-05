import { Request, Response, Router } from 'express';
import { prisma } from '../config/prisma';
import { authRoutes } from './auth.routes';
import { startupRoutes } from './startups.routes';
import { investorRoutes } from './investors.routes';
import { matchRoutes } from './matches.routes';
import { messageRoutes } from './messages.routes';
import { appointmentRoutes } from './appointments.routes';
import { auditRoutes } from './audit.routes';

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

// versionamento em /api/v1 pra deixar a REST fachada mais organizada
routes.use('/v1/auth', authRoutes);
routes.use('/v1/startups', startupRoutes);
routes.use('/v1/investors', investorRoutes);
routes.use('/v1/matches', matchRoutes);
routes.use('/v1/messages', messageRoutes);
routes.use('/v1/appointments', appointmentRoutes);
routes.use('/v1/audit', auditRoutes);