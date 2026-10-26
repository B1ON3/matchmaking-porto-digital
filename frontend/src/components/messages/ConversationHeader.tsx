import { Avatar } from '../Avatar';
import { ScoreBadge } from '../ScoreBadge';
import type { ConversationSummary, MatchStatus } from '../../types';

interface ConversationHeaderProps {
  conversa: ConversationSummary;
  onAbrirBriefing: () => void;
  onAgendar: () => void;
}

const STATUS: Record<MatchStatus, { label: string; className: string }> = {
  PENDENTE: {
    label: 'Conexão pendente',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  },
  ACEITO: {
    label: 'Conexão aceita',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  },
  RECUSADO: {
    label: 'Conexão recusada',
    className: 'bg-slate-200 text-slate-700 dark:bg-noite-700 dark:text-slate-200',
  },
};

export function ConversationHeader({ conversa, onAbrirBriefing, onAgendar }: ConversationHeaderProps) {
  const match = conversa.match;
  const status = match ? STATUS[match.status] : null;
  const podeAgendar = match?.status === 'ACEITO';

  return (
    <header className="border-b border-slate-100 p-4 dark:border-noite-700">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={conversa.usuario.name} size={44} />
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-semibold text-slate-900 dark:text-areia-100">
              {conversa.usuario.name}
            </h2>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{conversa.usuario.email}</p>
            {match && status ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <ScoreBadge score={match.score} />
                <span className={`badge ${status.className}`}>{status.label}</span>
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sem conexão vinculada</p>
            )}
          </div>
        </div>

        {match ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onAbrirBriefing} className="btn-secondary px-3 py-1.5 text-xs">
              Ver briefing
            </button>
            <button
              type="button"
              onClick={onAgendar}
              className="btn-primary px-3 py-1.5 text-xs"
              disabled={!podeAgendar}
              title={podeAgendar ? 'Agendar conversa' : 'Aceite a conexão para agendar'}
            >
              Agendar conversa
            </button>
          </div>
        ) : null}
      </div>

      {match?.reason ? (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-700 dark:text-slate-200">Por que vocês se conectaram: </span>
          {match.reason}
        </p>
      ) : null}
    </header>
  );
}
