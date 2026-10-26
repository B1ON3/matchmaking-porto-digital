import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { conflicts, create, list, remove, show, updateStatus } from '../controllers/appointments.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

export const appointmentRoutes = Router();

// agenda e exclusiva dos papeis que participam de conexoes. admin so ve
// reunioes de uma pessoa denunciada dentro do chamado correspondente.
appointmentRoutes.use(authenticate, authorize(UserRole.STARTUP, UserRole.INVESTOR, UserRole.MENTOR));
appointmentRoutes.get('/', list);
appointmentRoutes.get('/conflicts', conflicts);
appointmentRoutes.post('/', create);
appointmentRoutes.get('/:id', show);
appointmentRoutes.put('/:id/status', updateStatus);
appointmentRoutes.delete('/:id', remove);
