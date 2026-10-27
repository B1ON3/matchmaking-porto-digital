import jwt from 'jsonwebtoken';
import { JsonWebTokenError, NotBeforeError, TokenExpiredError } from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { env } from '../config/env';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
}

// So erros do proprio JWT viram 401. Falha de banco, por exemplo, nao pode ser
// confundida com token invalido: o frontend apagaria a sessao do usuario.
export function isTokenError(error: unknown): boolean {
  return error instanceof JsonWebTokenError || error instanceof TokenExpiredError || error instanceof NotBeforeError;
}
