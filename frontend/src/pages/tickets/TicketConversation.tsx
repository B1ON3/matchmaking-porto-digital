import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { TicketMessage } from '../../types';
import { dataHora } from './shared';

interface TicketConversationProps {
  messages: TicketMessage[];
  currentUserId?: string;
  disabled?: boolean;
  disabledMessage?: string;
  enviando?: boolean;
  onSend: (conteudo: string) => Promise<void>;
}

export function TicketConversation({
  messages,
  currentUserId,
  disabled = false,
  disabledMessage,
  enviando = false,
  onSend,
}: TicketConversationProps) {
  const [texto, setTexto] = useState('');
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();

    if (!texto.trim() || disabled) {
      return;
    }

    await onSend(texto.trim());
    setTexto('');
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-[220px] flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4 dark:bg-noite-900/40">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhuma mensagem neste chamado ainda.
          </p>
        ) : (
          messages.map((mensagem) => {
            const minha = mensagem.senderId === currentUserId;

            return (
              <div key={mensagem.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    minha
                      ? 'bg-laco-700 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 dark:border-noite-700 dark:bg-noite-800 dark:text-slate-200'
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
                    {minha ? 'Você' : mensagem.sender.name}
                  </p>
                  <p className="mt-1 whitespace-pre-line leading-relaxed">{mensagem.content}</p>
                  <p className={`mt-1 text-right text-[10px] ${minha ? 'text-white/65' : 'text-slate-400'}`}>
                    {dataHora(mensagem.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={fimRef} />
      </div>

      {disabled ? (
        <p className="border-t border-slate-200 p-4 text-sm text-slate-500 dark:border-noite-700 dark:text-slate-400">
          {disabledMessage ?? 'Este chamado não aceita novas mensagens.'}
        </p>
      ) : (
        <form onSubmit={enviar} className="flex gap-2 border-t border-slate-200 p-4 dark:border-noite-700">
          <label htmlFor="ticket-mensagem" className="sr-only">
            Escreva uma mensagem no chamado
          </label>
          <input
            id="ticket-mensagem"
            className="input"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Escreva para a administração..."
            maxLength={2000}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={enviando || !texto.trim()}>
            {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      )}
    </div>
  );
}
