import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { adminOverview } from '../controllers/insights.controller';
import {
  exportMetricsCsv,
  hideProfile,
  listUsers,
  metrics,
  restoreProfile,
  updateUserStatus,
} from '../controllers/admin.controller';
import { executeAction, listAdmin, sendAdminMessage, showAdmin, updateStatus } from '../controllers/tickets.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

export const adminRoutes = Router();

// toda a Sala de Controle exige um administrador autenticado
adminRoutes.use(authenticate, authorize(UserRole.ADMIN));

adminRoutes.get('/overview', adminOverview);

adminRoutes.get('/users', listUsers);
adminRoutes.patch(
  '/users/:id/status',
  auditLog({
    action: 'STATUS_USUARIO_ALTERADO',
    entity: 'User',
    getEntityId: (req) => req.params.id,
  }),
  updateUserStatus,
);

adminRoutes.post(
  '/profiles/:id/hide',
  auditLog({
    action: 'PERFIL_OCULTADO',
    entity: 'Profile',
    getEntityId: (req) => req.params.id,
  }),
  hideProfile,
);
adminRoutes.post(
  '/profiles/:id/restore',
  auditLog({
    action: 'PERFIL_RESTAURADO',
    entity: 'Profile',
    getEntityId: (req) => req.params.id,
  }),
  restoreProfile,
);

adminRoutes.get(
  '/metrics/export.csv',
  auditLog({
    action: 'METRICAS_EXPORTADAS',
    entity: 'Metrics',
    getEntityId: () => 'export.csv',
  }),
  exportMetricsCsv,
);
adminRoutes.get('/metrics', metrics);

// help desk: o contexto de conexoes e agendamentos do denunciado so e
// carregado a partir de um chamado aberto por startup/investidor.
adminRoutes.get('/tickets', listAdmin);
adminRoutes.get(
  '/tickets/:id',
  auditLog({
    action: 'CHAMADO_CONTEXTO_ACESSADO',
    entity: 'Ticket',
    getEntityId: (_req, res) => res.locals.auditEntityId as string | undefined,
  }),
  showAdmin,
);
adminRoutes.post('/tickets/:id/messages', sendAdminMessage);
adminRoutes.patch(
  '/tickets/:id/status',
  auditLog({
    action: 'CHAMADO_STATUS_ALTERADO',
    entity: 'Ticket',
    getEntityId: (_req, res) => res.locals.auditEntityId as string | undefined,
  }),
  updateStatus,
);
adminRoutes.post(
  '/tickets/:id/actions',
  auditLog({
    action: 'CHAMADO_ACAO_ADMINISTRATIVA',
    entity: 'Ticket',
    getEntityId: (_req, res) => res.locals.auditEntityId as string | undefined,
  }),
  executeAction,
);
