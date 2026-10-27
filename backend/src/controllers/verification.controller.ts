import type { Request, Response } from 'express';
import { VerificationStatus } from '@prisma/client';
import { z } from 'zod';
import {
  decidirPedidoVerificacao,
  detalharPedidoVerificacao,
  listarPedidosAdmin,
  meuStatusDeVerificacao,
  solicitarVerificacao,
} from '../services/verification.service';
import { textoOpcional, urlOpcional } from '../utils/zod-fields';

const solicitarSchema = z.object({
  legalName: textoOpcional(160),
  document: textoOpcional(40),
  website: urlOpcional(),
  linkedin: urlOpcional(),
  pitchUrl: urlOpcional(),
  evidence: z
    .string()
    .trim()
    .min(40, 'descreva as comprovacoes com pelo menos 40 caracteres')
    .max(4000, 'limite de 4000 caracteres'),
  extraLinks: textoOpcional(1000),
});

const listarSchema = z.object({
  status: z.nativeEnum(VerificationStatus).optional(),
  busca: z.string().trim().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(100).default(20),
});

const decisaoSchema = z.object({
  decisao: z.enum(['APROVAR', 'RECUSAR']),
  motivo: z.string().trim().min(10, 'explique a decisao com pelo menos 10 caracteres').max(600),
});

const idSchema = z.object({ id: z.string().uuid('identificador invalido') });

// GET /v1/me/verification
export async function meuStatus(req: Request, res: Response) {
  res.json(await meuStatusDeVerificacao(req.user!.id));
}

// POST /v1/me/verification
export async function solicitar(req: Request, res: Response) {
  const dados = solicitarSchema.parse(req.body);
  const pedido = await solicitarVerificacao(req.user!.id, dados);

  res.locals.auditEntity = 'ProfileVerification';
  res.locals.auditDetails = { pedidoId: pedido.id };

  res.status(201).json(pedido);
}

// GET /v1/admin/verifications
export async function listar(req: Request, res: Response) {
  const filtros = listarSchema.parse(req.query);

  res.json(await listarPedidosAdmin(filtros));
}

// GET /v1/admin/verifications/:id
export async function detalhar(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);

  res.json(await detalharPedidoVerificacao(id));
}

// POST /v1/admin/verifications/:id/decision
export async function decidir(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);
  const { decisao, motivo } = decisaoSchema.parse(req.body);

  const pedido = await decidirPedidoVerificacao(id, req.user!.id, { decisao, motivo });

  res.locals.auditEntity = 'ProfileVerification';
  res.locals.auditDetails = {
    decisao,
    motivo,
    usuarioId: pedido.usuario.id,
    papel: pedido.usuario.role,
  };

  res.json(pedido);
}
