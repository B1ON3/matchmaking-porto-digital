import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { forgotPassword, login, me, register, resetPassword } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import {
  forgotPasswordLimiter,
  loginLimiter,
  registerLimiter,
  resetPasswordLimiter,
} from '../middlewares/rate-limit.middleware';

export const authRoutes = Router();

authRoutes.post('/register', registerLimiter, register);
authRoutes.post('/login', loginLimiter, login);
authRoutes.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
authRoutes.post('/reset-password', resetPasswordLimiter, resetPassword);

// so quem tem token valido acessa o proprio perfil (RF07)
authRoutes.get('/me', authenticate, me);

// rota de exemplo exigindo perfil admin (RF07 / RNF10)
authRoutes.get('/admin-check', authenticate, authorize(UserRole.ADMIN), (_req, res) => {
  res.json({ ok: true, message: 'você tem acesso de administrador' });
});
