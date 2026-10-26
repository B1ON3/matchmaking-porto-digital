import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { encryptText } from '../services/encryption.service';

interface AuditOptions {
  action: string;
  entity: string;
  getEntityId?: (req: Request, res: Response) => string | undefined;
  getDetails?: (req: Request, res: Response) => Record<string, unknown> | undefined;
}

// registra acoes administrativas no banco pra auditoria (RF08 / RNF10)
export function auditLog(options: AuditOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (res.statusCode >= 400) {
        return;
      }

      const detalhes = {
        metodo: req.method,
        rota: req.originalUrl.split('?')[0],
        status: res.statusCode,
        ...(options.getDetails?.(req, res) ?? {}),
        ...((res.locals.auditDetails as Record<string, unknown> | undefined) ?? {}),
      };
      const userAgent = req.headers['user-agent'];
      const entity = (res.locals.auditEntity as string | undefined) ?? options.entity;

      void prisma.auditLog
        .create({
          data: {
            action: options.action,
            entity,
            entityId: options.getEntityId?.(req, res),
            details: encryptText(JSON.stringify(detalhes)),
            ip: req.ip ? encryptText(req.ip) : null,
            userAgent: userAgent ? encryptText(userAgent) : null,
            userId: req.user?.id,
          },
        })
        .catch((erro) => console.error('falha ao gravar audit log', erro));
    });

    return next();
  };
}
