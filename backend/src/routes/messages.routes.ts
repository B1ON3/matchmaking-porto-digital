import { Router } from 'express';
import { conversas, create, list, remove } from '../controllers/messages.controller';
import { authenticate } from '../middlewares/auth.middleware';

export const messageRoutes = Router();

// todas as rotas de mensagem sao restritas ao usuario logado (RF05)
messageRoutes.use(authenticate);
messageRoutes.get('/', list);
messageRoutes.get('/conversas', conversas);
messageRoutes.post('/', create);
messageRoutes.delete('/:id', remove);