import { Router } from 'express';
import { UserRole } from '@prisma/client';
import {
  create,
  list,
  remove,
  show,
  update,
} from '../controllers/investors.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

export const investorRoutes = Router();

investorRoutes.post('/', create);
investorRoutes.get('/', list);
investorRoutes.get('/:id', show);

investorRoutes.use(authenticate);
investorRoutes.put('/:id', authorize(UserRole.INVESTOR, UserRole.ADMIN), update);
investorRoutes.delete('/:id', authorize(UserRole.INVESTOR, UserRole.ADMIN), remove);