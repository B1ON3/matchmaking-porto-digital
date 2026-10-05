import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/http-error';

const createSchema = z.object({
  recipientId: z.string().uuid('recipientId invalido'),
  content: z.string().min(1, 'a mensagem nao pode estar vazia').max(2000),
});

// POST /api/messages  (RF05)
export async function create(req: Request, res: Response) {
  const { recipientId, content } = createSchema.parse(req.body);

  if (recipientId === req.user!.id) {
    throw HttpError.badRequest('nao da pra mandar mensagem pra si mesmo');
  }

  const destinatario = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true },
  });

  if (!destinatario) {
    throw HttpError.notFound('destinatario nao encontrado');
  }

  const mensagem = await prisma.message.create({
    data: {
      content,
      senderId: req.user!.id,
      recipientId,
    },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json(mensagem);
}

// GET /api/messages?conversaCom=<userId>
export async function list(req: Request, res: Response) {
  const { conversaCom } = z
    .object({ conversaCom: z.string().uuid().optional() })
    .parse(req.query);

  const mensagens = await prisma.message.findMany({
    where: {
      ...(conversaCom
        ? {
            OR: [
              { senderId: req.user!.id, recipientId: conversaCom },
              { senderId: conversaCom, recipientId: req.user!.id },
            ],
          }
        : { OR: [{ senderId: req.user!.id }, { recipientId: req.user!.id }] }),
    },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  // marca como lidas as mensagens recebidas na conversa consultada
  if (conversaCom) {
    await prisma.message.updateMany({
      where: {
        senderId: conversaCom,
        recipientId: req.user!.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  res.json(mensagens);
}

// GET /api/messages/conversas
export async function conversas(req: Request, res: Response) {
  const mensagens = await prisma.message.findMany({
    where: { OR: [{ senderId: req.user!.id }, { recipientId: req.user!.id }] },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const mapa = new Map<
    string,
    { usuario: { id: string; name: string; email: string }; ultimaMensagem: unknown; naoLidas: number }
  >();

  for (const mensagem of mensagens) {
    const outroId =
      mensagem.senderId === req.user!.id ? mensagem.recipientId : mensagem.senderId;

    const outro =
      mensagem.senderId === req.user!.id ? mensagem.recipient : mensagem.sender;

    const existente = mapa.get(outroId);

    if (!existente) {
      mapa.set(outroId, {
        usuario: outro,
        ultimaMensagem: mensagem,
        naoLidas: mensagem.recipientId === req.user!.id && !mensagem.readAt ? 1 : 0,
      });
    } else if (mensagem.recipientId === req.user!.id && !mensagem.readAt) {
      existente.naoLidas += 1;
    }
  }

  res.json([...mapa.values()]);
}

// DELETE /api/messages/:id  (quem enviou pode apagar)
export async function remove(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  const mensagem = await prisma.message.findUnique({
    where: { id },
    select: { senderId: true },
  });

  if (!mensagem) {
    throw HttpError.notFound('mensagem nao encontrada');
  }

  if (mensagem.senderId !== req.user!.id) {
    throw HttpError.forbidden('voce so pode apagar mensagens que enviou');
  }

  await prisma.message.delete({ where: { id } });

  res.status(204).send();
}