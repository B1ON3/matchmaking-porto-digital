import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { login, me, register } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

export const authRoutes = Router();

authRoutes.post('/register', register);
authRoutes.post('/login', login);

// so quem tem token valido acessa o proprio perfil (RF07)
authRoutes.get('/me', authenticate, me);

// rota de exemplo exigindo perfil admin (RF07 / RNF10)
authRoutes.get('/admin-check', authenticate, authorize(UserRole.ADMIN), (_req, res) => {
  res.json({ ok: true, message: 'você tem acesso de administrador' });
});