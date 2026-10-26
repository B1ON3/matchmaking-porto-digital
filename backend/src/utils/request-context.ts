import type { Request } from 'express';

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

const LIMITE_USER_AGENT = 512;
const LIMITE_IP = 64;

function limpar(valor: string | undefined, limite: number): string | null {
  if (!valor) {
    return null;
  }

  return valor.trim().slice(0, limite) || null;
}

export function getRequestContext(req: Request): RequestContext {
  return {
    ip: limpar(req.ip, LIMITE_IP),
    userAgent: limpar(req.headers['user-agent'], LIMITE_USER_AGENT),
  };
}
