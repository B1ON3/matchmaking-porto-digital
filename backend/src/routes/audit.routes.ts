import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { list, remove, show } from '../controllers/audit.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

export const auditRoutes = Router();

// so administrador enxerga e mexe nos logs (RF08 / RNF10)
auditRoutes.use(authenticate, authorize(UserRole.ADMIN));

auditRoutes.get('/', list);
auditRoutes.delete(
  '/:id',
  auditLog({ action: 'AUDIT_LOG_REMOVIDO', entity: 'AuditLog', getEntityId: (req) => req.params.id }),
  remove,
);

auditRoutes.get(
  '/:id',
  auditLog({ action: 'AUDIT_LOG_CONSULTADO', entity: 'AuditLog', getEntityId: (req) => req.params.id }),
  show,
);