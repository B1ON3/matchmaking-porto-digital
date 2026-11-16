import { useState } from 'react';
import type { RefObject } from 'react';
import type { Message } from '../../types';

interface MessageListProps {
  mensagens: Message[];
  usuarioId?: string;
  hasMore: boolean;
  carregandoAntigas: boolean;
  fimRef: RefObject<HTMLDivElement>;
  onCarregarAntigas: () => void;
  onEditar: (id: string, content: string) => Promise<void>;
  onApagar: (id: string, escopo: 'todos' | 'mim') => Promise<void>;
}

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function MessageList({
  mensagens,
  usuarioId,
  hasMore,
  carregandoAntigas,
  fimRef,
  onCarregarAntigas,
  onEditar,
  onApagar,
}: MessageListProps) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [apagandoId, setApagandoId] = useState<string | null>(null);

  function abrirEdicao(mensagem: Message) {
    setEditandoId(mensagem.id);
    setRascunho(mensagem.content);
  }

  function fecharEdicao() {
    setEditandoId(null);
    setRascunho('');
  }

  async function salvarEdicao(id: string) {
    const texto = rascunho.trim();

    if (!texto || salvando) {
      return;
    }

    setSalvando(true);

    try {
      await onEditar(id, texto);
      fecharEdicao();
    } catch {
      // o erro aparece no alerta da pagina; mantem o editor aberto para tentar de novo
    } finally {
      setSalvando(false);
    }
  }

  async function apagar(id: string, escopo: 'todos' | 'mim') {
    if (escopo === 'todos' && !window.confirm('Apagar esta mensagem para todos? Essa ação não pode ser desfeita.')) {
      return;
    }

    setApagandoId(id);

    try {
      await onApagar(id, escopo);
    } catch {
      // o erro aparece no alerta da pagina
    } finally {
      setApagandoId(null);
    }
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-label="Mensagens da conversa">
      {hasMore ? (
        <div className="text-center">
          <button
            type="button"
            onClick={onCarregarAntigas}
            className="btn-secondary px-3 py-1.5 text-xs"
            disabled={carregandoAntigas}
          >
            {carregandoAntigas ? 'Carregando...' : 'Carregar mensagens anteriores'}
          </button>
        </div>
      ) : null}

      {mensagens.length === 0 ? (
        <div className="flex h-full items-center justify-center px-6 text-center">
          <div>
            <p className="font-medium text-slate-900 dark:text-areia-100">Comece pela conexão de vocês.</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Retome o motivo do match e proponha o próximo passo.
            </p>
          </div>
        </div>
      ) : (
        mensagens.map((mensagem) => {
          const minha = mensagem.senderId === usuarioId;
          const editando = editandoId === mensagem.id;
          const ocupada = apagandoId === mensagem.id;
          const textoMeta = minha ? 'text-porto-100' : 'text-slate-400 dark:text-slate-400';
          const textoAcao = minha
            ? 'text-porto-100 hover:text-white'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100';

          return (
            <div key={mensagem.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`group max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  minha
                    ? 'bg-porto-600 text-white'
                    : 'bg-slate-100 text-slate-800 dark:bg-noite-700 dark:text-slate-100'
                }`}
              >
                {editando ? (
                  <div className="space-y-2">
                    <label htmlFor={`editar-${mensagem.id}`} className="sr-only">
                      Editar mensagem
                    </label>
                    <textarea
                      id={`editar-${mensagem.id}`}
                      className="input min-h-[72px] w-full resize-y bg-white text-slate-900"
                      value={rascunho}
                      maxLength={2000}
                      onChange={(evento) => setRascunho(evento.target.value)}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Escape') {
                          fecharEdicao();
                        }

                        if (evento.key === 'Enter' && !evento.shiftKey) {
                          evento.preventDefault();
                          void salvarEdicao(mensagem.id);
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex flex-wrap items-center gap-3 text-[11px]">
                      <button
                        type="button"
                        className="font-semibold underline-offset-2 hover:underline disabled:opacity-60"
                        onClick={() => void salvarEdicao(mensagem.id)}
                        disabled={salvando || !rascunho.trim()}
                      >
                        {salvando ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button type="button" className="hover:underline" onClick={fecharEdicao} disabled={salvando}>
                        Cancelar
                      </button>
                      <span className={textoMeta}>Enter salva · Esc cancela</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap break-words">{mensagem.content}</p>

                    <p className={`mt-1 text-[11px] ${textoMeta}`}>
                      <time dateTime={mensagem.createdAt} title={dataHora(mensagem.createdAt)}>
                        enviada às {hora(mensagem.createdAt)}
                      </time>
                      {mensagem.editedAt ? (
                        <>
                          {' · '}
                          <span title={`Editada em ${dataHora(mensagem.editedAt)}`}>
                            editada às {hora(mensagem.editedAt)}
                          </span>
                        </>
                      ) : null}
                    </p>

                    <div
                      className={`mt-1 flex flex-wrap items-center gap-3 text-[11px] opacity-80 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 ${
                        ocupada ? 'sm:opacity-100' : ''
                      }`}
                    >
                      {minha ? (
                        <button
                          type="button"
                          className={`${textoAcao} underline-offset-2 hover:underline disabled:opacity-50`}
                          onClick={() => abrirEdicao(mensagem)}
                          disabled={ocupada}
                        >
                          Editar
                        </button>
                      ) : null}

                      {minha ? (
                        <button
                          type="button"
                          className={`${textoAcao} underline-offset-2 hover:underline disabled:opacity-50`}
                          onClick={() => void apagar(mensagem.id, 'todos')}
                          disabled={ocupada}
                        >
                          {ocupada ? 'Apagando...' : 'Apagar para todos'}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className={`${textoAcao} underline-offset-2 hover:underline disabled:opacity-50`}
                        onClick={() => void apagar(mensagem.id, 'mim')}
                        disabled={ocupada}
                      >
                        Apagar só para mim
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
      <div ref={fimRef} />
    </div>
  );
}
