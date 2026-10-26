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
