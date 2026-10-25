import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const desabilitado = env.nodeEnv === 'test';
const mensagem = { error: 'Muitas tentativas. Tente de novo em alguns minutos.' };

// login: conta apenas falhas, para nao punir quem acerta a senha varias vezes
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => desabilitado,
  message: mensagem,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => desabilitado,
  message: mensagem,
});

// pedido de codigo: limita por IP para evitar spam de e-mails
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => desabilitado,
  message: mensagem,
});

// tentativa de troca: limita forca bruta contra o token
export const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => desabilitado,
  message: mensagem,
});
