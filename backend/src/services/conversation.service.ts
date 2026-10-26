import type { MessageRecord } from '../repositories/message.repository';
import {
  countUnread,
  createMessage,
  deleteMessage,
  findMatchBetweenUsers,
  findMatchesForUser,
  findMessageSender,
  findPage,
  findRecentMessages,
  findUser,
  markConversationRead,
} from '../repositories/message.repository';
import { decryptText, encryptText } from './encryption.service';
import { HttpError } from '../utils/http-error';

export interface ConversationMatch {
  id: string;
  status: string;
  score: number;
  reason: string | null;
}

export interface ConversationSummary {
  usuario: { id: string; name: string; email: string };
  ultimaMensagem: MessageRecord;
  naoLidas: number;
  match: ConversationMatch | null;
}

export interface MessagePage {
  messages: MessageRecord[];
  hasMore: boolean;
}

export function validarMatchParaMensagem(match: { status: string } | null): void {
  if (!match) {
    throw HttpError.forbidden('so e possivel conversar com conexoes do matchmaking');
  }

  if (match.status === 'RECUSADO') {
    throw HttpError.forbidden('essa conexao foi recusada e nao permite novas mensagens');
  }
}

function decifrarMensagem(mensagem: MessageRecord): MessageRecord {
  return { ...mensagem, content: decryptText(mensagem.content) };
}

export async function enviarMensagem(
  remetenteId: string,
  destinatarioId: string,
  content: string,
): Promise<MessageRecord> {
  if (remetenteId === destinatarioId) {
    throw HttpError.badRequest('nao da pra mandar mensagem pra si mesmo');
  }

  const destinatario = await findUser(destinatarioId);

  if (!destinatario) {
    throw HttpError.notFound('destinatario nao encontrado');
  }

  const match = await findMatchBetweenUsers(remetenteId, destinatarioId);
  validarMatchParaMensagem(match);

  const mensagem = await createMessage({
    content: encryptText(content),
    senderId: remetenteId,
    recipientId: destinatarioId,
  });

  return decifrarMensagem(mensagem);
}

export async function listarMensagens(
  usuarioId: string,
  conversaCom: string | undefined,
  before: Date | undefined,
  limit: number,
): Promise<MessagePage> {
  const registros = await findPage({ userId: usuarioId, conversaCom, before, limit });
  const hasMore = registros.length > limit;
  const pagina = registros.slice(0, limit).reverse();

  return {
    messages: pagina.map(decifrarMensagem),
    hasMore,
  };
}

export async function listarConversas(usuarioId: string): Promise<ConversationSummary[]> {
  const [mensagens, matches] = await Promise.all([findRecentMessages(usuarioId, 500), findMatchesForUser(usuarioId)]);

  const contextos = new Map<string, ConversationMatch>();

  for (const match of matches) {
    const outroId = match.startup.userId === usuarioId ? match.investor.userId : match.startup.userId;

    contextos.set(outroId, {
      id: match.id,
      status: match.status,
      score: match.score,
      reason: match.reason,
    });
  }

  const mapa = new Map<string, ConversationSummary>();

  for (const registro of mensagens) {
    const mensagem = decifrarMensagem(registro);
    const outroId = mensagem.senderId === usuarioId ? mensagem.recipientId : mensagem.senderId;
    const outro = mensagem.senderId === usuarioId ? mensagem.recipient : mensagem.sender;
    const existente = mapa.get(outroId);

    if (!existente) {
      mapa.set(outroId, {
        usuario: outro,
        ultimaMensagem: mensagem,
        naoLidas: mensagem.recipientId === usuarioId && !mensagem.readAt ? 1 : 0,
        match: contextos.get(outroId) ?? null,
      });
    } else if (mensagem.recipientId === usuarioId && !mensagem.readAt) {
      existente.naoLidas += 1;
    }
  }

  return [...mapa.values()].sort(
    (a, b) => new Date(b.ultimaMensagem.createdAt).getTime() - new Date(a.ultimaMensagem.createdAt).getTime(),
  );
}

export async function contarNaoLidas(usuarioId: string): Promise<{ total: number }> {
  return { total: await countUnread(usuarioId) };
}

export async function marcarConversaComoLida(usuarioId: string, outroUsuarioId: string): Promise<{ updated: number }> {
  const resultado = await markConversationRead(outroUsuarioId, usuarioId);

  return { updated: resultado.count };
}

export async function removerMensagem(id: string, usuarioId: string): Promise<void> {
  const mensagem = await findMessageSender(id);

  if (!mensagem) {
    throw HttpError.notFound('mensagem nao encontrada');
  }

  if (mensagem.senderId !== usuarioId) {
    throw HttpError.forbidden('voce so pode apagar mensagens que enviou');
  }

  await deleteMessage(id);
}
