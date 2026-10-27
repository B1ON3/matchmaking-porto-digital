import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { meuStatus, solicitar } from '../controllers/verification.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

// selo de perfil: o proprio usuario consulta a situacao e envia as comprovacoes
export const meVerificationRoutes = Router();

meVerificationRoutes.use(authenticate, authorize(UserRole.STARTUP, UserRole.INVESTOR, UserRole.MENTOR));
meVerificationRoutes.get('/', meuStatus);
meVerificationRoutes.post(
  '/',
  auditLog({
    action: 'VERIFICACAO_SOLICITADA',
    entity: 'ProfileVerification',
  }),
  solicitar,
);
