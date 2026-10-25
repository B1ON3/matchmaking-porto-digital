import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { adminOverview } from '../controllers/insights.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

export const adminRoutes = Router();

adminRoutes.get('/overview', authenticate, authorize(UserRole.ADMIN), adminOverview);
