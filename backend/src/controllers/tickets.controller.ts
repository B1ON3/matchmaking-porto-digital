import type { Request, Response } from 'express';
import { TicketActionType, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { z } from 'zod';
import {
  atualizarStatusChamado,
  contarNaoLidos,
  criarChamado,
  detalharChamadoAdmin,
  detalharMeuChamado,
  enviarMensagemChamado,
  executarAcaoChamado,
  listarChamadosAdmin,
  listarMeusChamados,
  marcarChamadoLido,
} from '../services/ticket.service';

const criarSchema = z.object({
  categoria: z.nativeEnum(TicketCategory),
  assunto: z.string().trim().min(5, 'descreva o assunto com pelo menos 5 caracteres').max(160),
  descricao: z.string().trim().min(20, 'conte o que aconteceu com pelo menos 20 caracteres').max(4000),
  alvoId: z.string().uuid('pessoa denunciada invalida').optional(),
  prioridade: z.nativeEnum(TicketPriority).optional(),
});

const mensagemSchema = z.object({
  conteudo: z.string().trim().min(1, 'a mensagem nao pode estar vazia').max(2000),
});

const statusSchema = z.object({
  status: z.nativeEnum(TicketStatus),
  resolucao: z.string().trim().max(1000).optional(),
});

const acaoSchema = z.object({
  acao: z.nativeEnum(TicketActionType),
  motivo: z.string().trim().min(5, 'informe o motivo com pelo menos 5 caracteres').max(500),
  observacao: z.string().trim().max(1000).optional(),
});

const idSchema = z.object({ id: z.string().uuid('chamado invalido') });

const listaAdminSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  categoria: z.nativeEnum(TicketCategory).optional(),
  prioridade: z.nativeEnum(TicketPriority).optional(),
  busca: z.string().trim().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(50).default(20),
});

// POST /api/v1/tickets
export async function create(req: Request, res: Response) {
  const dados = criarSchema.parse(req.body);
  const chamado = await criarChamado(req.user!, {
    category: dados.categoria,
    subject: dados.assunto,
    description: dados.descricao,
    targetUserId: dados.alvoId ?? null,
    priority: dados.prioridade,
  });

  res.locals.auditEntity = 'Ticket';
  res.locals.auditEntityId = chamado.id;
  res.locals.auditDetails = { protocolo: chamado.protocol, categoria: chamado.category };

  res.status(201).json(chamado);
}

// GET /api/v1/tickets
export async function listMine(req: Request, res: Response) {
  res.json(await listarMeusChamados(req.user!));
}

// GET /api/v1/tickets/nao-lidos
export async function unreadCount(req: Request, res: Response) {
  res.json(await contarNaoLidos(req.user!));
}

// GET /api/v1/tickets/:id
export async function showMine(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);
  const chamado = await detalharMeuChamado(id, req.user!);

  await marcarChamadoLido(id, req.user!);

  res.json(chamado);
}

// POST /api/v1/tickets/:id/messages
export async function sendMessage(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);
  const { conteudo } = mensagemSchema.parse(req.body);

  res.status(201).json(await enviarMensagemChamado(id, req.user!, conteudo));
}

// POST /api/v1/tickets/:id/read
export async function markRead(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);
  res.json(await marcarChamadoLido(id, req.user!));
}

// GET /api/v1/admin/tickets
export async function listAdmin(req: Request, res: Response) {
  const filtros = listaAdminSchema.parse(req.query);

  res.json(
    await listarChamadosAdmin({
      status: filtros.status,
      category: filtros.categoria,
      priority: filtros.prioridade,
      busca: filtros.busca,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
    }),
  );
}

// GET /api/v1/admin/tickets/:id
export async function showAdmin(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);
  const chamado = await detalharChamadoAdmin(id, req.user!);

  await marcarChamadoLido(id, req.user!);

  res.locals.auditEntity = 'Ticket';
  res.locals.auditEntityId = chamado.id;
  res.locals.auditDetails = { protocolo: chamado.protocol, contextoAcessado: Boolean(chamado.contexto) };

  res.json(chamado);
}

// POST /api/v1/admin/tickets/:id/messages
export async function sendAdminMessage(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);
  const { conteudo } = mensagemSchema.parse(req.body);

  res.status(201).json(await enviarMensagemChamado(id, req.user!, conteudo));
}

// PATCH /api/v1/admin/tickets/:id/status
export async function updateStatus(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);
  const { status, resolucao } = statusSchema.parse(req.body);
  const chamado = await atualizarStatusChamado(id, req.user!, status, resolucao);

  res.locals.auditEntity = 'Ticket';
  res.locals.auditEntityId = chamado.id;
  res.locals.auditDetails = { protocolo: chamado.protocol, status, resolucao: resolucao ?? null };

  res.json(chamado);
}

// POST /api/v1/admin/tickets/:id/actions
export async function executeAction(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);
  const dados = acaoSchema.parse(req.body);
  const chamado = await executarAcaoChamado(id, req.user!, {
    acao: dados.acao,
    motivo: dados.motivo,
    observacao: dados.observacao,
  });

  res.locals.auditEntity = 'Ticket';
  res.locals.auditEntityId = chamado.id;
  res.locals.auditDetails = {
    protocolo: chamado.protocol,
    acao: dados.acao,
    motivo: dados.motivo,
    alvo: chamado.targetUser?.email ?? null,
  };

  res.json(chamado);
}
