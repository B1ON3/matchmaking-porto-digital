import { Avatar } from '../Avatar';
import type { ConversationSummary } from '../../types';

interface ConversationSidebarProps {
  conversas: ConversationSummary[];
  selecionadaId: string | null;
  busca: string;
  onBusca: (valor: string) => void;
  onSelecionar: (id: string) => void;
}

export function ConversationSidebar({
  conversas,
  selecionadaId,
  busca,
  onBusca,
  onSelecionar,
}: ConversationSidebarProps) {
  return (
    <aside className="card flex max-h-[70vh] flex-col p-2 md:max-h-[65vh]">
      <label htmlFor="busca-conversas" className="sr-only">
        Buscar conversas
      </label>
      <input
        id="busca-conversas"
        className="input mb-2"
        type="search"
        placeholder="Buscar conversa..."
        value={busca}
        onChange={(evento) => onBusca(evento.target.value)}
      />

      {conversas.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Nenhuma conversa encontrada.</p>
      ) : (
        <nav aria-label="Conversas" className="min-h-0 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {conversas.map((conversa) => {
              const ativa = selecionadaId === conversa.usuario.id;

              return (
                <li key={conversa.usuario.id}>
                  <button
                    type="button"
                    onClick={() => onSelecionar(conversa.usuario.id)}
                    aria-current={ativa ? 'true' : undefined}
                    className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition ${
                      ativa
                        ? 'bg-porto-50 text-porto-800 dark:bg-porto-900/40 dark:text-porto-100'
                        : 'hover:bg-slate-50 dark:hover:bg-noite-800'
                    }`}
                  >
                    <Avatar name={conversa.usuario.name} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{conversa.usuario.name}</span>
                        {conversa.naoLidas > 0 && (
                          <span
                            className="badge bg-porto-600 text-white"
                            title={`${conversa.naoLidas} mensagens não lidas`}
                          >
                            {conversa.naoLidas > 9 ? '9+' : conversa.naoLidas}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                        {conversa.ultimaMensagem.content}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </aside>
  );
}
