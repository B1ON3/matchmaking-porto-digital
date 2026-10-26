import { Router } from 'express';
import { conversas, create, list, markRead, remove, unreadCount } from '../controllers/messages.controller';
import { authenticate } from '../middlewares/auth.middleware';

export const messageRoutes = Router();

// todas as rotas de mensagem sao restritas ao usuario logado (RF05)
messageRoutes.use(authenticate);
messageRoutes.get('/', list);
messageRoutes.get('/conversas', conversas);
messageRoutes.get('/nao-lidas', unreadCount);
messageRoutes.post('/conversas/:userId/read', markRead);
messageRoutes.post('/', create);
messageRoutes.delete('/:id', remove);
