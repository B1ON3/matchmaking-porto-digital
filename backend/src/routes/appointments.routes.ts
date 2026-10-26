import { Router } from 'express';
import { conflicts, create, list, remove, show, updateStatus } from '../controllers/appointments.controller';
import { authenticate } from '../middlewares/auth.middleware';

export const appointmentRoutes = Router();

appointmentRoutes.use(authenticate);
appointmentRoutes.get('/', list);
appointmentRoutes.get('/conflicts', conflicts);
appointmentRoutes.post('/', create);
appointmentRoutes.get('/:id', show);
appointmentRoutes.put('/:id/status', updateStatus);
appointmentRoutes.delete('/:id', remove);
