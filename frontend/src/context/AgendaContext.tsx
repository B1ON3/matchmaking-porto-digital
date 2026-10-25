import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { appointmentService } from '../services';
import { useAuth } from './AuthContext';
import { AgendaDrawer } from '../components/AgendaDrawer';

interface AgendaOpenOptions {
  matchId?: string;
}

interface AgendaContextValue {
  open: (options?: AgendaOpenOptions) => void;
  close: () => void;
  isOpen: boolean;
  upcomingCount: number;
  presetMatchId?: string;
  refresh: () => Promise<void>;
}

const AgendaContext = createContext<AgendaContextValue>({} as AgendaContextValue);

export function AgendaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [presetMatchId, setPresetMatchId] = useState<string>();
  const [upcomingCount, setUpcomingCount] = useState(0);

  const open = useCallback((options?: AgendaOpenOptions) => {
    setPresetMatchId(options?.matchId);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setPresetMatchId(undefined);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setUpcomingCount(0);
      return;
    }

    try {
      const agendamentos = await appointmentService.list({ futuros: 'false' });
      const agora = Date.now();

      setUpcomingCount(
        agendamentos.filter(
          (agendamento) => agendamento.status === 'AGENDADO' && new Date(agendamento.scheduledAt).getTime() >= agora,
        ).length,
      );
    } catch {
      setUpcomingCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUpcomingCount(0);
      close();
      return;
    }

    void refresh();
  }, [user, refresh, close]);

  const valor = useMemo<AgendaContextValue>(
    () => ({ open, close, isOpen, upcomingCount, presetMatchId, refresh }),
    [open, close, isOpen, upcomingCount, presetMatchId, refresh],
  );

  return (
    <AgendaContext.Provider value={valor}>
      {children}
      <AgendaDrawer
        open={isOpen}
        presetMatchId={presetMatchId}
        onClose={close}
        onChanged={() => {
          void refresh();
        }}
      />
    </AgendaContext.Provider>
  );
}

export function useAgenda() {
  return useContext(AgendaContext);
}
