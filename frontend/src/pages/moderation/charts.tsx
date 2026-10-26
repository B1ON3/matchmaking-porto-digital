import { dataCurta, maximoDe } from './shared';
import type { AdminMetricsSeriesPoint, AdminMetricsTopItem } from '../../types';

const CAMPOS_SERIE = ['users', 'matches', 'messages', 'appointments'] as const;

const ROTULO_SERIE: Record<(typeof CAMPOS_SERIE)[number], string> = {
  users: 'Novos usuários',
  matches: 'Matches',
  messages: 'Mensagens',
  appointments: 'Reuniões',
};

const COR_SERIE: Record<(typeof CAMPOS_SERIE)[number], string> = {
  users: 'bg-laco-600 dark:bg-laco-400',
  matches: 'bg-barro-500 dark:bg-barro-400',
  messages: 'bg-porto-600 dark:bg-porto-400',
  appointments: 'bg-areia-500 dark:bg-areia-400',
};

export function ListaDeBarras({ itens }: { itens: AdminMetricsTopItem[] }) {
  if (itens.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Sem dados no período.</p>;
  }

  const maximo = maximoDe(itens);

  return (
    <ul className="space-y-3">
      {itens.map((item) => (
        <li key={item.label} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
            <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
              {item.count} · {item.share}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-noite-700">
            <div
              className="h-full rounded-full bg-laco-600 dark:bg-laco-400"
              style={{ width: `${Math.round((item.count / maximo) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SerieDeAtividade({ pontos }: { pontos: AdminMetricsSeriesPoint[] }) {
  if (pontos.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Sem atividade no período.</p>;
  }

  const maximo = Math.max(...pontos.flatMap((ponto) => CAMPOS_SERIE.map((campo) => ponto[campo])), 1);
  const passoRotulo = Math.max(1, Math.ceil(pontos.length / 8));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-full items-end gap-1 px-4">
          {pontos.map((ponto, indice) => (
            <div key={ponto.bucket} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className="flex h-32 w-full items-end justify-center gap-[2px]"
                title={CAMPOS_SERIE.map((campo) => `${ROTULO_SERIE[campo]}: ${ponto[campo]}`).join(' · ')}
              >
                {CAMPOS_SERIE.map((campo) => (
                  <span
                    key={campo}
                    className={`w-1.5 rounded-t ${COR_SERIE[campo]}`}
                    style={{ height: `${Math.max(2, (ponto[campo] / maximo) * 100)}%` }}
                  />
                ))}
              </div>
              <span className="whitespace-nowrap text-[10px] text-slate-400 dark:text-slate-500">
                {indice % passoRotulo === 0 ? dataCurta(ponto.bucket) : '\u00A0'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
        {CAMPOS_SERIE.map((campo) => (
          <span key={campo} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${COR_SERIE[campo]}`} />
            {ROTULO_SERIE[campo]}
          </span>
        ))}
      </div>
    </div>
  );
}
