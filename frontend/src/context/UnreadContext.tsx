import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { messageService } from '../services';
import { useAuth } from './AuthContext';

interface UnreadContextValue {
  unreadCount: number;
  refresh: () => Promise<void>;
}

const UnreadContext = createContext<UnreadContextValue>({ unreadCount: 0, refresh: async () => undefined });

const POLL_INTERVAL_MS = 15_000;

export function UnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const { total } = await messageService.unreadCount();
      setUnreadCount(total);
    } catch {
      // mantem o ultimo valor conhecido em falhas transitorias
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
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

  const valor = useMemo<UnreadContextValue>(() => ({ unreadCount, refresh }), [unreadCount, refresh]);

  return <UnreadContext.Provider value={valor}>{children}</UnreadContext.Provider>;
}

export function useUnread() {
  return useContext(UnreadContext);
}
