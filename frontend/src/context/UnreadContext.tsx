import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { messageService, ticketService } from '../services';
import { useAuth } from './AuthContext';

interface UnreadContextValue {
  unreadCount: number;
  ticketUnreadCount: number;
  refresh: () => Promise<void>;
}

const UnreadContext = createContext<UnreadContextValue>({
  unreadCount: 0,
  ticketUnreadCount: 0,
  refresh: async () => undefined,
});

const POLL_INTERVAL_MS = 15_000;

export function UnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [ticketUnreadCount, setTicketUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setTicketUnreadCount(0);
      return;
    }

    const [mensagens, chamados] = await Promise.allSettled([
      user.role === 'ADMIN' ? Promise.resolve({ total: 0 }) : messageService.unreadCount(),
      ticketService.unreadCount(),
    ]);

    if (mensagens.status === 'fulfilled') {
      setUnreadCount(mensagens.value.total);
    }

    if (chamados.status === 'fulfilled') {
      setTicketUnreadCount(chamados.value.total);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setTicketUnreadCount(0);
      return;
    }

    let ativo = true;

    async function atualizarSeVisivel() {
      if (!ativo || document.visibilityState !== 'visible') {
        return;
      }

      await refresh();
    }

    void atualizarSeVisivel();

    const timer = window.setInterval(() => {
      void atualizarSeVisivel();
    }, POLL_INTERVAL_MS);

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') {
        void atualizarSeVisivel();
      }
    };

    document.addEventListener('visibilitychange', aoMudarVisibilidade);

    return () => {
      ativo = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    };
  }, [user, refresh]);

  const valor = useMemo<UnreadContextValue>(
    () => ({ unreadCount, ticketUnreadCount, refresh }),
    [unreadCount, ticketUnreadCount, refresh],
  );

  return <UnreadContext.Provider value={valor}>{children}</UnreadContext.Provider>;
}

export function useUnread() {
  return useContext(UnreadContext);
}
