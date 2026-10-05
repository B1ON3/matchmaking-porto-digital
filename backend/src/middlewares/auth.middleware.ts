import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { verifyToken } from '../services/token.service';
import { HttpError } from '../utils/http-error';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        name: string;
      };
    }
  }
}

// le o token JWT devolvido pela API no header Authorization (RF07)
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;

    if (!header) {
      throw HttpError.unauthorized('Header Authorization nao enviado');
    }

    const [scheme, token] = header.split(' ');

    if (!/^Bearer$/i.test(scheme) || !token) {
      throw HttpError.unauthorized('Formato invalido, use: Bearer <token>');
    }

    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      throw HttpError.unauthorized('Usuario do token nao existe mais');
    }

    req.user = user;

    return next();
  } catch (erro) {
    if (erro instanceof HttpError) {
      return next(erro);
    }

    return next(HttpError.unauthorized('Token expirado ou invalido'));
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(HttpError.unauthorized());
    }

    if (!roles.includes(req.user.role)) {
      return next(HttpError.forbidden());
    }

    return next();
  };
}