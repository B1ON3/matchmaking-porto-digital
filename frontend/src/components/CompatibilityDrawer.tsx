import { useEffect, useState } from 'react';
import { Alert } from './Alert';
import { Avatar } from './Avatar';
import { Drawer } from './Drawer';
import { ProgressRing } from './ProgressRing';
import { Skeleton } from './Skeleton';
import { matchService } from '../services';
import { extractErrorMessage } from '../services/api';
import type { CompatibilityParty, CompatibilityStatus, MatchCompatibility } from '../types';

interface CompatibilityDrawerProps {
  open: boolean;
  matchId: string;
  onClose: () => void;
  onOpenBriefing?: (kind: 'startup' | 'investor', profileId: string) => void;
}

const STATUS: Record<CompatibilityStatus, { label: string; className: string; bar: string }> = {
  ATENDE: {
    label: 'Atende',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
    bar: 'bg-emerald-500',
  },
  PARCIAL: {
    label: 'Parcial',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
    bar: 'bg-amber-500',
  },
  NAO_ATENDE: {
    label: 'Não atende',
    className: 'bg-slate-100 text-slate-600 dark:bg-noite-700 dark:text-slate-300',
    bar: 'bg-slate-400',
  },
};

function local(cidade?: string | null, estado?: string | null): string {
  return [cidade, estado].filter(Boolean).join(', ') || 'Local não informado';
}

function moeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor);
}

function faixaDeTicket(minimo?: number | null, maximo?: number | null): string {
  if (minimo == null || maximo == null || (!minimo && !maximo)) {
    return 'Ticket não informado';
  }

  return minimo === maximo ? moeda(minimo) : `${moeda(minimo)} a ${moeda(maximo)}`;
}

function Partido({
  partido,
  tipo,
  onBriefing,
}: {
  partido: CompatibilityParty;
  tipo: 'startup' | 'investor';
  onBriefing?: () => void;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 p-4 dark:border-noite-700">
      <div className="flex items-start gap-3">
        <Avatar name={partido.name} src={partido.logoUrl} size={48} />
        <div className="min-w-0">
          <p className="eyebrow">{tipo === 'startup' ? 'Startup' : 'Investidor'}</p>
          <h3 className="truncate font-display text-lg font-semibold text-slate-900 dark:text-areia-100">
            {partido.name}
          </h3>
          {partido.contactName && partido.contactName !== partido.name ? (
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">Responsável: {partido.contactName}</p>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Setor
          </dt>
          <dd className="text-slate-700 dark:text-areia-100">{partido.sector || 'Não informado'}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Estágio
          </dt>
          <dd className="text-slate-700 dark:text-areia-100">{partido.stage || 'Não informado'}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Base
          </dt>
          <dd className="text-slate-700 dark:text-areia-100">{local(partido.city, partido.state)}</dd>
        </div>
        {tipo === 'investor' ? (
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Ticket
            </dt>
            <dd className="text-slate-700 dark:text-areia-100">
              {faixaDeTicket(partido.ticketMin, partido.ticketMax)}
            </dd>
          </div>
        ) : null}
      </dl>

      {onBriefing ? (
        <button type="button" className="btn-secondary mt-4 w-full" onClick={onBriefing}>
          Abrir briefing
        </button>
      ) : null}
    </article>
  );
}

export function CompatibilityDrawer({ open, matchId, onClose, onOpenBriefing }: CompatibilityDrawerProps) {
  const [dados, setDados] = useState<MatchCompatibility | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!open || !matchId) {
      return;
    }

    let ativo = true;
    setCarregando(true);
    setErro('');
    setDados(null);

    matchService
      .compatibility(matchId)
      .then((resultado) => {
        if (ativo) {
          setDados(resultado);
        }
      })
      .catch((e) => {
        if (ativo) {
          setErro(extractErrorMessage(e));
        }
      })
      .finally(() => {
        if (ativo) {
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, [open, matchId, tentativa]);

  return (
    <Drawer open={open} onClose={onClose} title="Mapa de compatibilidade" size="xl">
      {carregando ? (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          <Skeleton className="h-28 w-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : erro ? (
        <div className="space-y-4">
          <Alert mensagem={erro} />
          <button type="button" className="btn-secondary" onClick={() => setTentativa((valor) => valor + 1)}>
            Tentar novamente
          </button>
        </div>
      ) : !dados ? (
        <p className="text-sm text-slate-500 dark:text-slate-300">Não foi possível carregar esta comparação.</p>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-areia-50/60 p-4 dark:border-noite-700 dark:bg-noite-900/50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="shrink-0 self-start">
                <ProgressRing value={dados.score} size={92} stroke={9} label="compatibilidade" />
              </div>
              <div>
                <p className="eyebrow">Leitura da matriz</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-slate-900 dark:text-areia-100">
                  {dados.score} de 100 pontos
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{dados.reason}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  A pontuação é a soma dos quatro critérios. Cada evidência abaixo mostra o que pesou a favor ou contra.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="compat-perfis">
            <h3 id="compat-perfis" className="font-display text-lg font-semibold text-slate-900 dark:text-areia-100">
              Perfis comparados
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Partido
                partido={dados.startup}
                tipo="startup"
                onBriefing={onOpenBriefing ? () => onOpenBriefing('startup', dados.startup.id) : undefined}
              />
              <Partido
                partido={dados.investor}
                tipo="investor"
                onBriefing={onOpenBriefing ? () => onOpenBriefing('investor', dados.investor.id) : undefined}
              />
            </div>
          </section>

          <section aria-labelledby="compat-dimensoes">
            <h3 id="compat-dimensoes" className="font-display text-lg font-semibold text-slate-900 dark:text-areia-100">
              Como a matriz pontua
            </h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {dados.dimensions.map((dimensao) => {
                const status = STATUS[dimensao.status];
                const percentual = dimensao.weight > 0 ? (dimensao.points / dimensao.weight) * 100 : 0;

                return (
                  <article key={dimensao.key} className="rounded-2xl border border-slate-200 p-4 dark:border-noite-700">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-areia-100">{dimensao.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {dimensao.points} de {dimensao.weight} pontos
                        </p>
                      </div>
                      <span className={`badge ${status.className}`}>{status.label}</span>
                    </div>

                    <div
                      className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-noite-700"
                      role="progressbar"
                      aria-label={`${dimensao.label}: ${dimensao.points} de ${dimensao.weight} pontos`}
                      aria-valuemin={0}
                      aria-valuemax={dimensao.weight}
                      aria-valuenow={dimensao.points}
                    >
                      <div className={`h-full rounded-full ${status.bar}`} style={{ width: `${percentual}%` }} />
                    </div>

                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{dimensao.evidence}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2" aria-label="Resumo da compatibilidade">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">O que aproxima</h3>
              {dados.summary.strengths.length === 0 ? (
                <p className="mt-2 text-sm text-emerald-800/80 dark:text-emerald-200/80">
                  Nenhum critério atende integralmente.
                </p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm text-emerald-900/90 dark:text-emerald-100/90">
                  {dados.summary.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">O que distancia</h3>
              {dados.summary.attention.length === 0 ? (
                <p className="mt-2 text-sm text-amber-800/80 dark:text-amber-200/80">
                  Nenhum ponto de atenção: todos os critérios foram atendidos.
                </p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm text-amber-900/90 dark:text-amber-100/90">
                  {dados.summary.attention.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </Drawer>
  );
}
