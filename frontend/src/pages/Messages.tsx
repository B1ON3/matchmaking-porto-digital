import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAgenda } from '../context/AgendaContext';
import { useUnread } from '../context/UnreadContext';
import { Alert } from '../components/Alert';
import { CompatibilityDrawer } from '../components/CompatibilityDrawer';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import { ConversationHeader } from '../components/messages/ConversationHeader';
import { ConversationSidebar } from '../components/messages/ConversationSidebar';
import { MessageList } from '../components/messages/MessageList';
import { messageService } from '../services';
import { extractErrorMessage } from '../services/api';
import type { ConversationSummary, Message } from '../types';

const PAGE_SIZE = 30;

export function Messages() {
  const { user } = useAuth();
  const { refresh: refreshUnread } = useUnread();
  const { open: abrirAgenda } = useAgenda();

  const [conversas, setConversas] = useState<ConversationSummary[]>([]);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [busca, setBusca] = useState('');
  const [texto, setTexto] = useState('');
  const [briefingMatchId, setBriefingMatchId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [carregandoAntigas, setCarregandoAntigas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const fimConversa = useRef<HTMLDivElement>(null);
  const deveRolar = useRef(true);

  useEffect(() => {
    let ativo = true;

    async function carregarConversas() {
      setCarregando(true);

      try {
        const lista = await messageService.conversas();

        if (!ativo) {
          return;
        }

        setConversas(lista);
        setSelecionadaId((atual) =>
          atual && lista.some((item) => item.usuario.id === atual) ? atual : (lista[0]?.usuario.id ?? null),
        );
      } catch (e) {
        if (ativo) {
          setErro(extractErrorMessage(e));
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregarConversas();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!selecionadaId) {
      setMensagens([]);
      setHasMore(false);
      return;
    }

    const conversaId = selecionadaId;
    let ativo = true;

    async function carregarMensagens() {
      setErro('');
      deveRolar.current = true;

      try {
        const pagina = await messageService.list(conversaId, { limit: PAGE_SIZE });

        if (!ativo) {
          return;
        }

        setMensagens(pagina.messages);
        setHasMore(pagina.hasMore);

        await messageService.markRead(conversaId);

        if (ativo) {
          setConversas((atual) =>
            atual.map((conversa) => (conversa.usuario.id === conversaId ? { ...conversa, naoLidas: 0 } : conversa)),
          );
          void refreshUnread();
        }
      } catch (e) {
        if (ativo) {
          setErro(extractErrorMessage(e));
        }
      }
    }

    void carregarMensagens();

    return () => {
      ativo = false;
    };
  }, [selecionadaId, refreshUnread]);

  useEffect(() => {
    if (!deveRolar.current) {
      return;
    }

    fimConversa.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    deveRolar.current = false;
  }, [mensagens]);

  const conversasFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');

    if (!termo) {
      return conversas;
    }

    return conversas.filter(
      (conversa) =>
        conversa.usuario.name.toLocaleLowerCase('pt-BR').includes(termo) ||
        conversa.usuario.email.toLocaleLowerCase('pt-BR').includes(termo),
    );
  }, [busca, conversas]);

  const conversa = conversas.find((item) => item.usuario.id === selecionadaId) ?? null;
  const podeEnviar = Boolean(conversa?.match && conversa.match.status !== 'RECUSADO');

  function selecionarConversa(id: string) {
    setSelecionadaId(id);
    deveRolar.current = true;
  }

  async function carregarAntigas() {
    if (!selecionadaId || mensagens.length === 0) {
      return;
    }

    setCarregandoAntigas(true);
    setErro('');

    try {
      const pagina = await messageService.list(selecionadaId, {
        before: mensagens[0].createdAt,
        limit: PAGE_SIZE,
      });

      deveRolar.current = false;
      setMensagens((atual) => [...pagina.messages, ...atual]);
      setHasMore(pagina.hasMore);
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setCarregandoAntigas(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!texto.trim() || !selecionadaId || !podeEnviar) {
      return;
    }

    setEnviando(true);
    setErro('');

    try {
      const enviada = await messageService.send(selecionadaId, texto.trim());
      deveRolar.current = true;
      setMensagens((atual) => [...atual, enviada]);
      setConversas((atual) =>
        atual
          .map((item) => (item.usuario.id === selecionadaId ? { ...item, ultimaMensagem: enviada, naoLidas: 0 } : item))
          .sort(
            (a, b) => new Date(b.ultimaMensagem.createdAt).getTime() - new Date(a.ultimaMensagem.createdAt).getTime(),
          ),
      );
      setTexto('');
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return <Spinner texto="Carregando suas conversas..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Conexões</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-slate-900 dark:text-areia-100">Mensagens</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Converse com contexto e transforme o match em próximo passo.
        </p>
      </div>

      {erro && <Alert mensagem={erro} />}

      {conversas.length === 0 ? (
        <EmptyState
          titulo="Nenhuma conversa ainda"
          descricao="Quando você conectar com alguém pelo matchmaking, a conversa aparece aqui."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-[300px_1fr] md:items-start">
          <ConversationSidebar
            conversas={conversasFiltradas}
            selecionadaId={selecionadaId}
            busca={busca}
            onBusca={setBusca}
            onSelecionar={selecionarConversa}
          />

          <section className="card flex h-[65vh] min-h-[420px] flex-col overflow-hidden p-0">
            {conversa ? (
              <>
                <ConversationHeader
                  conversa={conversa}
                  onAbrirBriefing={() => {
                    if (conversa.match) {
                      setBriefingMatchId(conversa.match.id);
                    }
                  }}
                  onAgendar={() => {
                    if (conversa.match) {
                      abrirAgenda({
                        matchId: conversa.match.id,
                        title: `Conversa com ${conversa.usuario.name}`,
                      });
                    }
                  }}
                />

                <MessageList
                  mensagens={mensagens}
                  usuarioId={user?.id}
                  hasMore={hasMore}
                  carregandoAntigas={carregandoAntigas}
                  fimRef={fimConversa}
                  onCarregarAntigas={() => void carregarAntigas()}
                />

                {podeEnviar ? (
                  <form
                    onSubmit={handleSubmit}
                    className="flex gap-2 border-t border-slate-100 p-4 dark:border-noite-700"
                  >
                    <label htmlFor="nova-mensagem" className="sr-only">
                      Escreva sua mensagem
                    </label>
                    <input
                      id="nova-mensagem"
                      className="input"
                      value={texto}
                      onChange={(evento) => setTexto(evento.target.value)}
                      placeholder="Escreva sua mensagem..."
                      maxLength={2000}
                    />
                    <button type="submit" className="btn-primary shrink-0" disabled={enviando || !texto.trim()}>
                      {enviando ? 'Enviando...' : 'Enviar'}
                    </button>
                  </form>
                ) : (
                  <p className="border-t border-slate-100 p-4 text-sm text-slate-500 dark:border-noite-700 dark:text-slate-400">
                    {conversa.match
                      ? 'Esta conexão foi recusada. Novas mensagens estão bloqueadas.'
                      : 'Esta conversa não tem uma conexão válida para novas mensagens.'}
                  </p>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Selecione uma conversa para começar.
              </div>
            )}
          </section>
        </div>
      )}

      {briefingMatchId ? (
        <CompatibilityDrawer open matchId={briefingMatchId} onClose={() => setBriefingMatchId(null)} />
      ) : null}
    </div>
  );
}
