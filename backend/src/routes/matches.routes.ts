import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { list, regenerate, show, updateStatus } from '../controllers/matches.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

export const matchRoutes = Router();

// ver os proprios matches exige estar logado (RF03 / RF04)
matchRoutes.use(authenticate);
matchRoutes.get('/', list);
matchRoutes.post('/gerar', authorize(UserRole.STARTUP, UserRole.ADMIN), regenerate);
matchRoutes.get('/:id', show);
matchRoutes.put('/:id/status', updateStatus);