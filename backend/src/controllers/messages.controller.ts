import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  contarNaoLidas,
  editarMensagem,
  enviarMensagem,
  listarConversas,
  listarMensagens,
  marcarConversaComoLida,
  removerMensagem,
} from '../services/conversation.service';

const createSchema = z.object({
  recipientId: z.string().uuid('recipientId invalido'),
  content: z.string().trim().min(1, 'a mensagem nao pode estar vazia').max(2000),
});

const editSchema = z.object({
  content: z.string().trim().min(1, 'a mensagem nao pode estar vazia').max(2000),
});

const listSchema = z.object({
  conversaCom: z.string().uuid().optional(),
  before: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

// "todos" apaga para os dois lados; "mim" esconde so para quem pediu
const deleteQuerySchema = z.object({
  escopo: z.enum(['todos', 'mim']).default('todos'),
});

const userParamsSchema = z.object({ userId: z.string().uuid() });
const idParamsSchema = z.object({ id: z.string().uuid() });

// POST /api/messages  (RF05)
export async function create(req: Request, res: Response) {
  const { recipientId, content } = createSchema.parse(req.body);
  const mensagem = await enviarMensagem(req.user!.id, recipientId, content);

  res.status(201).json(mensagem);
}

// GET /api/messages?conversaCom=<userId>&before=<iso>&limit=30
export async function list(req: Request, res: Response) {
  const { conversaCom, before, limit } = listSchema.parse(req.query);
  const pagina = await listarMensagens(req.user!.id, conversaCom, before, limit);

  res.json(pagina);
}

// GET /api/messages/conversas
export async function conversas(req: Request, res: Response) {
  res.json(await listarConversas(req.user!.id));
}

// GET /api/messages/nao-lidas
export async function unreadCount(req: Request, res: Response) {
  res.json(await contarNaoLidas(req.user!.id));
}

// POST /api/messages/conversas/:userId/read
export async function markRead(req: Request, res: Response) {
  const { userId } = userParamsSchema.parse(req.params);
  res.json(await marcarConversaComoLida(req.user!.id, userId));
}

// PATCH /api/messages/:id  (so o remetente edita; devolve editedAt)
export async function edit(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  const { content } = editSchema.parse(req.body);

  res.json(await editarMensagem(id, req.user!.id, content));
}

// DELETE /api/messages/:id?escopo=todos|mim
export async function remove(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  const { escopo } = deleteQuerySchema.parse(req.query);

  res.json(await removerMensagem(id, req.user!.id, escopo));
}
