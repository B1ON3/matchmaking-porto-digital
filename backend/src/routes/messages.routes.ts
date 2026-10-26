import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { conversas, create, list, markRead, remove, unreadCount } from '../controllers/messages.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

export const messageRoutes = Router();

// todas as rotas de mensagem sao restritas ao usuario logado (RF05).
// admin nao le conversas privadas: ele conversa com o denunciante em /tickets.
messageRoutes.use(authenticate, authorize(UserRole.STARTUP, UserRole.INVESTOR, UserRole.MENTOR));
messageRoutes.get('/', list);
messageRoutes.get('/conversas', conversas);
messageRoutes.get('/nao-lidas', unreadCount);
messageRoutes.post('/conversas/:userId/read', markRead);
messageRoutes.post('/', create);
messageRoutes.delete('/:id', remove);
