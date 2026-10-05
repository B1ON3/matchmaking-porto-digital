import { Router } from 'express';
import { UserRole } from '@prisma/client';
import {
  create,
  list,
  remove,
  show,
  update,
} from '../controllers/startups.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

export const startupRoutes = Router();

startupRoutes.post('/', create);
startupRoutes.get('/', list);
startupRoutes.get('/:id', show);

// a partir daqui tudo exige token valido
startupRoutes.use(authenticate);
startupRoutes.put('/:id', authorize(UserRole.STARTUP, UserRole.ADMIN), update);
startupRoutes.delete('/:id', authorize(UserRole.STARTUP, UserRole.ADMIN), remove);