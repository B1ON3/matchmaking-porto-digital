import type { Request, Response } from 'express';
import { Router } from 'express';
import { prisma } from '../config/prisma';
import { statusDoKeyring } from '../services/encryption.service';
import { authRoutes } from './auth.routes';
import { startupRoutes } from './startups.routes';
import { investorRoutes } from './investors.routes';
import { matchRoutes } from './matches.routes';
import { messageRoutes } from './messages.routes';
import { appointmentRoutes } from './appointments.routes';
import { auditRoutes } from './audit.routes';
import { adminRoutes } from './admin.routes';
import { mePrivacyRoutes, privacyRoutes } from './privacy.routes';
import { ticketRoutes } from './tickets.routes';
import { meVerificationRoutes } from './verification.routes';

export const routes = Router();

// sem essa rota, abrir a url base da api no navegador devolvia 404 e nao
// dizia nada do que existia ali
routes.get('/', (_req: Request, res: Response) => {
  res.json({
    servico: 'laco-api',
    version: '0.1.0',
    descricao: 'API REST de matchmaking entre startups e investidores anjo do Porto Digital',
    status: 'ok',
    health: '/api/health',
    grupos: {
      auth: '/api/v1/auth',
      startups: '/api/v1/startups',
      investors: '/api/v1/investors',
      matches: '/api/v1/matches',
      mensagens: '/api/v1/messages',
      agendamentos: '/api/v1/appointments',
      auditoria: '/api/v1/audit',
      admin: '/api/v1/admin',
      chamados: '/api/v1/tickets',
      privacidade: '/api/v1/privacy/policy',
      minhaPrivacidade: '/api/v1/me/privacy',
      seloDePerfil: '/api/v1/me/verification',
    },
    autenticacao: 'Bearer token em /api/v1/auth/login. As rotas marcadas como privadas exigem o header Authorization.',
  });
});

routes.get('/health', async (_req: Request, res: Response) => {
  let database = 'offline';

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'online';
  } catch {
    // banco indisponivel: mantem o valor inicial
  }

  res.json({
    status: 'ok',
    servico: 'laco-api',
    version: '0.1.0',
    banco: database,
    criptografia: statusDoKeyring(),
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
routes.use('/v1/admin', adminRoutes);
routes.use('/v1/tickets', ticketRoutes);
routes.use('/v1/privacy', privacyRoutes);
routes.use('/v1/me/privacy', mePrivacyRoutes);
routes.use('/v1/me/verification', meVerificationRoutes);
