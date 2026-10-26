import { Router } from 'express';
import { create, listMine, markRead, sendMessage, showMine, unreadCount } from '../controllers/tickets.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

export const ticketRoutes = Router();

ticketRoutes.use(authenticate);

ticketRoutes.get('/', listMine);
ticketRoutes.get('/nao-lidos', unreadCount);
ticketRoutes.post(
  '/',
  auditLog({
    action: 'CHAMADO_ABERTO',
    entity: 'Ticket',
    getEntityId: (_req, res) => res.locals.auditEntityId as string | undefined,
  }),
  create,
);
ticketRoutes.get('/:id', showMine);
ticketRoutes.post('/:id/messages', sendMessage);
ticketRoutes.post('/:id/read', markRead);
