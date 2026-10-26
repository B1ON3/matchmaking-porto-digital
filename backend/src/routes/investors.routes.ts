import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { create, list, remove, show, update } from '../controllers/investors.controller';
import { investorInsights } from '../controllers/insights.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

export const investorRoutes = Router();

investorRoutes.post('/', create);
investorRoutes.get('/', list);
investorRoutes.get(
  '/:id/insights',
  authenticate,
  authorize(UserRole.INVESTOR, UserRole.STARTUP, UserRole.MENTOR),
  investorInsights,
);
investorRoutes.get('/:id', show);

investorRoutes.use(authenticate);
investorRoutes.put('/:id', authorize(UserRole.INVESTOR, UserRole.MENTOR), update);
investorRoutes.delete('/:id', authorize(UserRole.INVESTOR, UserRole.MENTOR), remove);
