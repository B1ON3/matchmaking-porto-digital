import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { compatibility, list, regenerate, show, updateStatus } from '../controllers/matches.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

export const matchRoutes = Router();

// ver os proprios matches exige estar logado (RF03 / RF04).
// administracao nao entra aqui: o acesso a conexoes de alguem so existe
// dentro de um chamado aberto por startup/investidor.
matchRoutes.use(authenticate, authorize(UserRole.STARTUP, UserRole.INVESTOR, UserRole.MENTOR));
matchRoutes.get('/', list);
matchRoutes.post('/gerar', authorize(UserRole.STARTUP), regenerate);
matchRoutes.get('/:id/compatibility', compatibility);
matchRoutes.get('/:id', show);
matchRoutes.put('/:id/status', updateStatus);
