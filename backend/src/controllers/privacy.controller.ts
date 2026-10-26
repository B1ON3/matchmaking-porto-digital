import type { Request, Response } from 'express';
import { ConsentType } from '@prisma/client';
import { z } from 'zod';
import {
  excluirConta,
  exportarDados,
  obterCentralDePrivacidade,
  policyPayload,
  registrarConsentimento,
} from '../services/privacy.service';
import { getRequestContext } from '../utils/request-context';

const consentimentoSchema = z.object({
  type: z.nativeEnum(ConsentType),
  granted: z.boolean(),
});

const exclusaoSchema = z.object({
  password: z.string().min(1, 'informe sua senha'),
  confirmation: z.literal('EXCLUIR', {
    errorMap: () => ({ message: 'digite EXCLUIR para confirmar' }),
  }),
});

// GET /api/v1/privacy/policy
export function policy(_req: Request, res: Response) {
  res.json(policyPayload());
}

// GET /api/v1/me/privacy
export async function overview(req: Request, res: Response) {
  const dados = await obterCentralDePrivacidade(req.user!.id);

  res.json(dados);
}

// POST /api/v1/me/privacy/consents
export async function recordConsent(req: Request, res: Response) {
  const entrada = consentimentoSchema.parse(req.body);
  const consentimento = await registrarConsentimento(req.user!.id, entrada, getRequestContext(req));

  res.status(201).json({
    mensagem:
      consentimento.status === 'CONCEDIDO'
        ? 'Consentimento registrado com recibo.'
        : 'Consentimento revogado. O histórico foi preservado.',
    consentimento,
  });
}

// GET /api/v1/me/privacy/export
export async function exportData(req: Request, res: Response) {
  const dados = await exportarDados(req.user!.id);
  const nome = `laco-portabilidade-${new Date().toISOString().slice(0, 10)}.json`;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
  res.send(JSON.stringify(dados, null, 2));
}

// DELETE /api/v1/me/privacy/account
export async function deleteAccount(req: Request, res: Response) {
  const entrada = exclusaoSchema.parse(req.body);
  const resultado = await excluirConta(req.user!.id, entrada.password, getRequestContext(req));

  res.json(resultado);
}
