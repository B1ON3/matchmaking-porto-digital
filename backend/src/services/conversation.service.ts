import type { MessageRecord } from '../repositories/message.repository';
import {
  countUnread,
  createMessage,
  deleteMessage,
  findMatchBetweenUsers,
  findMatchesForUser,
  findMessageParticipants,
  findPage,
  findRecentMessages,
  findUser,
  hideMessageFor,
  markConversationRead,
  updateMessageContent,
} from '../repositories/message.repository';
import {
  decryptText,
  encryptText,
  EncryptionError,
  getEncryptionKid,
  isEncrypted,
  statusDoKeyring,
} from './encryption.service';
import { HttpError } from '../utils/http-error';

// mensagens cifradas com um kid que saiu do keyring nao podem mais ser lidas.
// mostrar um aviso no lugar do texto evita que uma unica mensagem antiga
// derrube a lista inteira de conversas com 503.
export const CONTEUDO_INDISPONIVEL = '[mensagem indisponivel: cifrada com uma chave que nao esta mais configurada]';

const kidsSemChave = new Set<string>();

let keyringDisponivel: boolean | undefined;

// o keyring e lido uma vez por processo; na Vercel isso vale por instancia
function temKeyring(): boolean {
  keyringDisponivel ??= statusDoKeyring().configurada;
  return keyringDisponivel;
}

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
  // texto legado em claro nao precisa de keyring pra ser lido
  if (!isEncrypted(mensagem.content)) {
    return mensagem;
  }

  try {
    return { ...mensagem, content: decryptText(mensagem.content) };
  } catch (erro) {
    // keyring ausente/invalido continua sendo erro de configuracao (503):
    // o /health ja expoe o que falta, nao escondemos isso atras de um aviso
    if (!(erro instanceof EncryptionError) || !temKeyring()) {
      throw erro;
    }

    const kid = getEncryptionKid(mensagem.content) ?? 'desconhecido';

    if (!kidsSemChave.has(kid)) {
      kidsSemChave.add(kid);
      console.warn(`[mensagens] conteudo cifrado com o kid "${kid}", que nao esta no keyring atual`, {
        mensagemId: mensagem.id,
      });
    }

    return { ...mensagem, content: CONTEUDO_INDISPONIVEL };
  }
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

export type EscopoExclusao = 'todos' | 'mim';
export type LadoDaMensagem = 'REMETENTE' | 'DESTINATARIO';

// quem participa da conversa pode esconder a mensagem "so pra mim";
// editar ou apagar "pra todos" e exclusivo de quem enviou.
export function ladoDoUsuario(mensagem: { senderId: string; recipientId: string }, usuarioId: string): LadoDaMensagem {
  if (mensagem.senderId === usuarioId) {
    return 'REMETENTE';
  }

  if (mensagem.recipientId === usuarioId) {
    return 'DESTINATARIO';
  }

  throw HttpError.forbidden('voce nao participa dessa conversa');
}

export async function editarMensagem(id: string, usuarioId: string, content: string): Promise<MessageRecord> {
  const mensagem = await findMessageParticipants(id);

  if (!mensagem) {
    throw HttpError.notFound('mensagem nao encontrada');
  }

  if (ladoDoUsuario(mensagem, usuarioId) !== 'REMETENTE') {
    throw HttpError.forbidden('voce so pode editar mensagens que enviou');
  }

  const atualizada = await updateMessageContent(id, encryptText(content), new Date());

  return decifrarMensagem(atualizada);
}

export async function removerMensagem(
  id: string,
  usuarioId: string,
  escopo: EscopoExclusao,
): Promise<{ id: string; escopo: EscopoExclusao }> {
  const mensagem = await findMessageParticipants(id);

  if (!mensagem) {
    throw HttpError.notFound('mensagem nao encontrada');
  }

  const lado = ladoDoUsuario(mensagem, usuarioId);

  if (escopo === 'todos') {
    if (lado !== 'REMETENTE') {
      throw HttpError.forbidden('so quem enviou pode apagar a mensagem para todos');
    }

    await deleteMessage(id);

    return { id, escopo };
  }

  // "so pra mim": marca o lado de quem pediu e mantem a mensagem para o outro
  await hideMessageFor(id, lado);

  return { id, escopo };
}
