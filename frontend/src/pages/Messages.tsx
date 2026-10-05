import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import { messageService } from '../services';
import { extractErrorMessage } from '../services/api';
import type { Message } from '../types';

interface Conversa {
  usuario: { id: string; name: string; email: string };
  ultimaMensagem: Message;
  naoLidas: number;
}

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function Messages() {
  const { user } = useAuth();

  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Message[]>([]);
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const fimConversa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ativo = true;

    async function carregarConversas() {
      setCarregando(true);

      try {
        const lista = (await messageService.conversas()) as Conversa[];

        if (!ativo) {
          return;
        }

        setConversas(lista);
        setSelecionada((atual) => atual ?? lista[0]?.usuario.id ?? null);
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
    const conversaId = selecionada;

    if (!conversaId) {
      setMensagens([]);
      return;
    }

    let ativo = true;

    const carregarMensagens = async () => {
      try {
        const lista = await messageService.list(conversaId);

        if (ativo) {
          setMensagens(lista);
        }
      } catch (e) {
        if (ativo) {
          setErro(extractErrorMessage(e));
        }
      }
    };

    void carregarMensagens();
  }, [selecionada]);

  useEffect(() => {
    fimConversa.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!texto.trim() || !selecionada) {
      return;
    }

    setEnviando(true);
    setErro('');

    try {
      const enviada = await messageService.send(selecionada, texto.trim());
      setMensagens((atual) => [...atual, enviada]);
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
        <h1 className="text-2xl font-semibold text-slate-900">Mensagens</h1>
        <p className="text-sm text-slate-500">Converse direto com quem deu match com você.</p>
      </div>

      {erro && <Alert mensagem={erro} />}

      {conversas.length === 0 ? (
        <EmptyState
          titulo="Nenhuma conversa ainda"
          descricao="Quando você conectar com alguém pelo matchmaking, a conversa aparece aqui."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-[280px_1fr]">
          <aside className="card max-h-[60vh] overflow-y-auto p-2">
            <ul className="space-y-1">
              {conversas.map((conversa) => (
                <li key={conversa.usuario.id}>
                  <button
                    type="button"
                    onClick={() => setSelecionada(conversa.usuario.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition ${
                      selecionada === conversa.usuario.id
                        ? 'bg-porto-50 text-porto-800'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{conversa.usuario.name}</span>
                      {conversa.naoLidas > 0 && (
                        <span className="badge bg-porto-600 text-white">{conversa.naoLidas}</span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-500">
                      {conversa.ultimaMensagem.content}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="card flex max-h-[60vh] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto pb-4">
              {mensagens.map((mensagem) => {
                const minha = mensagem.senderId === user?.id;

                return (
                  <div
                    key={mensagem.id}
                    className={`flex ${minha ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        minha
                          ? 'bg-porto-600 text-white'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <p>{mensagem.content}</p>
                      <p
                        className={`mt-1 text-[11px] ${
                          minha ? 'text-porto-100' : 'text-slate-400'
                        }`}
                      >
                        {dataHora(mensagem.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={fimConversa} />
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-100 pt-3">
              <input
                className="input"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escreva sua mensagem..."
              />
              <button type="submit" className="btn-primary" disabled={enviando || !texto.trim()}>
                Enviar
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}