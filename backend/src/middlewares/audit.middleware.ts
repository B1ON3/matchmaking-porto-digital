import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';

interface AuditOptions {
  action: string;
  entity: string;
  getEntityId?: (req: Request, res: Response) => string | undefined;
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
        rota: req.originalUrl,
        status: res.statusCode,
      };

      void prisma.auditLog
        .create({
          data: {
            action: options.action,
            entity: options.entity,
            entityId: options.getEntityId?.(req, res),
            details: JSON.stringify(detalhes),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            userId: req.user?.id,
          },
        })
        .catch((erro) => console.error('falha ao gravar audit log', erro));
    });

    return next();
  };
}