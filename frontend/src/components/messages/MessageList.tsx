import type { RefObject } from 'react';
import type { Message } from '../../types';

interface MessageListProps {
  mensagens: Message[];
  usuarioId?: string;
  hasMore: boolean;
  carregandoAntigas: boolean;
  fimRef: RefObject<HTMLDivElement>;
  onCarregarAntigas: () => void;
}

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function MessageList({
  mensagens,
  usuarioId,
  hasMore,
  carregandoAntigas,
  fimRef,
  onCarregarAntigas,
}: MessageListProps) {
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

          return (
            <div key={mensagem.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  minha
                    ? 'bg-porto-600 text-white'
                    : 'bg-slate-100 text-slate-800 dark:bg-noite-700 dark:text-slate-100'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{mensagem.content}</p>
                <p className={`mt-1 text-[11px] ${minha ? 'text-porto-100' : 'text-slate-400 dark:text-slate-400'}`}>
                  <time dateTime={mensagem.createdAt}>{dataHora(mensagem.createdAt)}</time>
                </p>
              </div>
            </div>
          );
        })
      )}
      <div ref={fimRef} />
    </div>
  );
}
