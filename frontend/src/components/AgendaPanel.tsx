import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert } from './Alert';
import { EmptyState } from './EmptyState';
import { Spinner } from './Spinner';
import { Tabs } from './Tabs';
import { useAuth } from '../context/AuthContext';
import { appointmentService, matchService } from '../services';
import { extractErrorMessage } from '../services/api';
import type { Appointment, AppointmentConflictPreview, AppointmentStatus, Match } from '../types';

type AbaAgenda = 'proximos' | 'concluidos' | 'cancelados';

interface AgendaPanelProps {
  presetMatchId?: string;
  presetTitle?: string;
  onChanged?: () => void;
  idPrefix?: string;
}

const ABAS = [
  { id: 'proximos', label: 'Próximos' },
  { id: 'concluidos', label: 'Concluídos' },
  { id: 'cancelados', label: 'Cancelados' },
];

const COR_STATUS: Record<AppointmentStatus, string> = {
  AGENDADO: 'bg-porto-50 text-porto-700 dark:bg-porto-900/40 dark:text-porto-200',
  CONCLUIDO: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  CANCELADO: 'bg-slate-100 text-slate-600 dark:bg-noite-700 dark:text-slate-300',
};

const ROTULO_STATUS: Record<AppointmentStatus, string> = {
  AGENDADO: 'Agendado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function diaDoGrupo(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function minimoParaInput(): string {
  const agora = new Date();
  agora.setSeconds(0, 0);
  agora.setMinutes(agora.getMinutes() + 1 - agora.getTimezoneOffset());
  return agora.toISOString().slice(0, 16);
}

function nomeDoMatch(match: Match, papel?: string): string {
  const startup = match.startup?.companyName ?? match.startup?.user?.name ?? 'Startup';
  const investidor = match.investor?.companyName ?? match.investor?.user?.name ?? 'Investidor';

  if (papel === 'STARTUP') {
    return investidor;
  }

  if (papel === 'INVESTOR') {
    return startup;
  }

  return `${startup} × ${investidor}`;
}

function AvisoDeConflito({
  preview,
  verificando,
}: {
  preview: AppointmentConflictPreview | null;
  verificando: boolean;
}) {
  if (verificando) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
        Verificando disponibilidade...
      </p>
    );
  }

  if (!preview?.conflict) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-700/60 dark:bg-amber-900/20">
      <p className="font-medium text-amber-900 dark:text-amber-100">Este horário já está ocupado</p>
      <ul className="mt-1 space-y-1 text-xs text-amber-800 dark:text-amber-200">
        {preview.conflitos.map((conflito) => (
          <li key={conflito.id}>
            {conflito.title} · {dataHora(conflito.scheduledAt)} · {conflito.durationMinutes} min
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
        Escolha outro horário ou ajuste a duração para evitar sobreposição.
      </p>
    </div>
  );
}

export function AgendaPanel({ presetMatchId, presetTitle, onChanged, idPrefix = 'agenda' }: AgendaPanelProps) {
  const { user } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [aba, setAba] = useState<AbaAgenda>('proximos');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [verificandoConflito, setVerificandoConflito] = useState(false);
  const [conflito, setConflito] = useState<AppointmentConflictPreview | null>(null);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState<{
    title: string;
    description: string;
    scheduledAt: string;
    durationMinutes: 30 | 60;
    matchId: string;
  }>({
    title: '',
    description: '',
    scheduledAt: '',
    durationMinutes: 60,
    matchId: '',
  });

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro('');

      try {
        const [listaAgendamentos, listaMatches] = await Promise.all([
          appointmentService.list({ futuros: 'false' }),
          matchService.list({ minimo: 0, porPagina: 50 }),
        ]);

        if (ativo) {
          setAgendamentos(listaAgendamentos);
          setMatches(listaMatches.matches);
        }
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

    void carregar();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!presetMatchId && !presetTitle) {
      return;
    }

    setForm((atual) => ({
      ...atual,
      ...(presetMatchId ? { matchId: presetMatchId } : {}),
      ...(presetTitle ? { title: presetTitle } : {}),
    }));
  }, [presetMatchId, presetTitle]);

  useEffect(() => {
    if (!form.scheduledAt) {
      setConflito(null);
      setVerificandoConflito(false);
      return;
    }

    const data = new Date(form.scheduledAt);

    if (Number.isNaN(data.getTime())) {
      setConflito(null);
      return;
    }

    let ativo = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        setVerificandoConflito(true);

        try {
          const preview = await appointmentService.conflicts({
            scheduledAt: data.toISOString(),
            durationMinutes: form.durationMinutes,
            matchId: form.matchId || undefined,
          });

          if (ativo) {
            setConflito(preview);
          }
        } catch {
          if (ativo) {
            setConflito(null);
          }
        } finally {
          if (ativo) {
            setVerificandoConflito(false);
          }
        }
      })();
    }, 350);

    return () => {
      ativo = false;
      window.clearTimeout(timer);
    };
  }, [form.scheduledAt, form.durationMinutes, form.matchId]);

  const matchesAceitos = useMemo(() => matches.filter((match) => match.status === 'ACEITO'), [matches]);

  const visiveis = useMemo(() => {
    const filtrados = agendamentos.filter((agendamento) => {
      if (aba === 'proximos') {
        return agendamento.status === 'AGENDADO';
      }

      if (aba === 'concluidos') {
        return agendamento.status === 'CONCLUIDO';
      }

      return agendamento.status === 'CANCELADO';
    });

    return [...filtrados].sort((a, b) => {
      const diferenca = new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      return aba === 'proximos' ? diferenca : -diferenca;
    });
  }, [agendamentos, aba]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, Appointment[]>();

    for (const agendamento of visiveis) {
      const dia = diaDoGrupo(agendamento.scheduledAt);
      const itens = mapa.get(dia) ?? [];
      itens.push(agendamento);
      mapa.set(dia, itens);
    }

    return Array.from(mapa.entries());
  }, [visiveis]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro('');
    setSalvando(true);

    try {
      const criado = await appointmentService.create({
        title: form.title,
        description: form.description.trim() || undefined,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: form.durationMinutes,
        matchId: form.matchId || undefined,
      });

      setAgendamentos((atual) =>
        [...atual, criado].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
      );
      setForm({ title: '', description: '', scheduledAt: '', durationMinutes: 60, matchId: '' });
      setAba('proximos');
      onChanged?.();
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(id: string, status: AppointmentStatus) {
    setErro('');

    try {
      const atualizado = await appointmentService.updateStatus(id, status);
      setAgendamentos((atual) => atual.map((item) => (item.id === id ? atualizado : item)));
      onChanged?.();
    } catch (e) {
      setErro(extractErrorMessage(e));
    }
  }

  async function remover(id: string) {
    setErro('');

    try {
      await appointmentService.remove(id);
      setAgendamentos((atual) => atual.filter((item) => item.id !== id));
      onChanged?.();
    } catch (e) {
      setErro(extractErrorMessage(e));
    }
  }

  return (
    <div className="space-y-5">
      {erro && <Alert mensagem={erro} />}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <p className="eyebrow">Novo compromisso</p>
          <h3 className="mt-1 font-display text-lg font-semibold text-slate-900 dark:text-areia-100">
            Marcar conversa
          </h3>
        </div>

        <div>
          <label htmlFor={`${idPrefix}-titulo`} className="label">
            Título
          </label>
          <input
            id={`${idPrefix}-titulo`}
            className="input"
            value={form.title}
            onChange={(evento) => setForm((atual) => ({ ...atual, title: evento.target.value }))}
            placeholder="Conversa sobre a rodada seed"
            required
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <div>
            <label htmlFor={`${idPrefix}-data`} className="label">
              Data e hora
            </label>
            <input
              id={`${idPrefix}-data`}
              type="datetime-local"
              className="input"
              min={minimoParaInput()}
              value={form.scheduledAt}
              onChange={(evento) => setForm((atual) => ({ ...atual, scheduledAt: evento.target.value }))}
              required
            />
          </div>

          <div>
            <label htmlFor={`${idPrefix}-duracao`} className="label">
              Duração
            </label>
            <select
              id={`${idPrefix}-duracao`}
              className="input"
              value={form.durationMinutes}
              onChange={(evento) =>
                setForm((atual) => ({
                  ...atual,
                  durationMinutes: evento.target.value === '30' ? 30 : 60,
                }))
              }
            >
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor={`${idPrefix}-conexao`} className="label">
            Conexão (opcional)
          </label>
          <select
            id={`${idPrefix}-conexao`}
            className="input"
            value={form.matchId}
            onChange={(evento) => setForm((atual) => ({ ...atual, matchId: evento.target.value }))}
          >
            <option value="">Sem vínculo</option>
            {matchesAceitos.map((match) => (
              <option key={match.id} value={match.id}>
                {nomeDoMatch(match, user?.role)}
              </option>
            ))}
          </select>
        </div>

        <AvisoDeConflito preview={conflito} verificando={verificandoConflito} />

        <div>
          <label htmlFor={`${idPrefix}-descricao`} className="label">
            Descrição
          </label>
          <textarea
            id={`${idPrefix}-descricao`}
            className="input min-h-[72px]"
            value={form.description}
            onChange={(evento) => setForm((atual) => ({ ...atual, description: evento.target.value }))}
            placeholder="Pauta, local ou link da call"
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={salvando || conflito?.conflict}>
          {salvando ? 'Agendando...' : 'Agendar'}
        </button>
      </form>

      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-areia-100">Sua agenda</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">{agendamentos.length} no total</span>
      </div>

      <Tabs tabs={ABAS} active={aba} onChange={(id) => setAba(id as AbaAgenda)} />

      {carregando ? (
        <Spinner texto="Carregando sua agenda..." />
      ) : grupos.length === 0 ? (
        <EmptyState
          titulo={
            aba === 'proximos'
              ? 'Nenhum compromisso próximo'
              : aba === 'concluidos'
                ? 'Nenhum compromisso concluído'
                : 'Nenhum compromisso cancelado'
          }
          descricao="Marque uma conversa no formulário acima."
        />
      ) : (
        <div className="space-y-5">
          {grupos.map(([dia, itens]) => (
            <section key={dia} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 first-letter:uppercase dark:text-slate-400">
                {dia}
              </h4>

              <ul className="space-y-2">
                {itens.map((agendamento) => (
                  <li key={agendamento.id} className="card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-areia-100">{agendamento.title}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {dataHora(agendamento.scheduledAt)} · {agendamento.durationMinutes} min
                        </p>
                      </div>
                      <span className={`badge ${COR_STATUS[agendamento.status]}`}>
                        {ROTULO_STATUS[agendamento.status]}
                      </span>
                    </div>

                    {agendamento.match ? (
                      <p className="mt-2 text-xs text-laco-700 dark:text-laco-300">
                        Conexão: {nomeDoMatch(agendamento.match, user?.role)}
                      </p>
                    ) : null}

                    {agendamento.description ? (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{agendamento.description}</p>
                    ) : null}

                    {agendamento.status === 'AGENDADO' ? (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-noite-700">
                        <button
                          type="button"
                          onClick={() => void mudarStatus(agendamento.id, 'CONCLUIDO')}
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          Concluir
                        </button>
                        <button
                          type="button"
                          onClick={() => void mudarStatus(agendamento.id, 'CANCELADO')}
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void remover(agendamento.id)}
                      className="mt-2 text-xs font-medium text-rose-600 hover:underline dark:text-rose-300"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
