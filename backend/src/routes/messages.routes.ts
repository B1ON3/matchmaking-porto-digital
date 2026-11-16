import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { conversas, create, edit, list, markRead, remove, unreadCount } from '../controllers/messages.controller';
import { garantirSchemaDeMensagens } from '../config/ensure-schema';
import { authenticate, authorize } from '../middlewares/auth.middleware';

export const messageRoutes = Router();

// todas as rotas de mensagem sao restritas ao usuario logado (RF05).
// admin nao le conversas privadas: ele conversa com o denunciante em /tickets.
messageRoutes.use(authenticate, authorize(UserRole.STARTUP, UserRole.INVESTOR, UserRole.MENTOR));

// garante as colunas de edicao/exclusao antes de consultar mensagens (ver config/ensure-schema)
messageRoutes.use(async (_req, _res, next) => {
  try {
    await garantirSchemaDeMensagens();
    next();
  } catch (erro) {
    next(erro);
  }
});

messageRoutes.get('/', list);
messageRoutes.get('/conversas', conversas);
messageRoutes.get('/nao-lidas', unreadCount);
messageRoutes.post('/conversas/:userId/read', markRead);
messageRoutes.post('/', create);
messageRoutes.patch('/:id', edit);
messageRoutes.delete('/:id', remove);
