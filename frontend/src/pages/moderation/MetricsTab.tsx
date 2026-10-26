import { useCallback, useEffect, useState } from 'react';
import { Alert } from '../../components/Alert';
import { EmptyState } from '../../components/EmptyState';
import { SectionHeader } from '../../components/SectionHeader';
import { Spinner } from '../../components/Spinner';
import { StatCard } from '../../components/StatCard';
import { adminService } from '../../services';
import { extractErrorMessage } from '../../services/api';
import type { AdminMetrics } from '../../types';
import { ListaDeBarras, SerieDeAtividade } from './charts';
import { intervaloDoPeriodo, resumoPorPapel } from './shared';

const PERIODOS = [
  { dias: 7, label: '7 dias' },
  { dias: 30, label: '30 dias' },
  { dias: 90, label: '90 dias' },
];

export function MetricsTab({ onAviso }: { onAviso: (mensagem: string) => void }) {
  const [periodo, setPeriodo] = useState(30);
  const [metricas, setMetricas] = useState<AdminMetrics | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [exportando, setExportando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      setMetricas(await adminService.getMetrics(intervaloDoPeriodo(periodo)));
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, [periodo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function exportar() {
    setExportando(true);
    setErro('');
    onAviso('');

    try {
      const { blob, filename } = await adminService.exportMetrics(intervaloDoPeriodo(periodo));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      onAviso('CSV exportado com BOM UTF-8, pronto para abrir no Excel.');
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setExportando(false);
    }
  }

  const taxaAceite =
    metricas && metricas.matches.created > 0
      ? Math.round((metricas.matches.accepted / metricas.matches.created) * 100)
      : 0;
  const funilMaximo = metricas ? Math.max(...metricas.funnel.map((etapa) => etapa.count), 1) : 1;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          title="Métricas de uso"
          description="Novos usuários, atividade, matches, mensagens, reuniões e funil de valor."
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-noite-800" role="group" aria-label="Período">
            {PERIODOS.map((item) => (
              <button
                key={item.dias}
                type="button"
                aria-pressed={periodo === item.dias}
                onClick={() => setPeriodo(item.dias)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  periodo === item.dias
                    ? 'bg-white text-laco-900 shadow-sm dark:bg-noite-700 dark:text-areia-100'
                    : 'text-slate-600 hover:text-laco-800 dark:text-slate-300 dark:hover:text-areia-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn-primary" onClick={() => void exportar()} disabled={exportando}>
            {exportando ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      {erro && <Alert mensagem={erro} />}

      {carregando ? (
        <Spinner texto="Calculando métricas..." />
      ) : !metricas ? (
        <EmptyState titulo="Não foi possível carregar as métricas" descricao="Tente novamente em instantes." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Novos usuários"
              value={metricas.users.newTotal}
              hint={resumoPorPapel(metricas.users.newByRole)}
            />
            <StatCard
              label="Usuários ativos"
              value={metricas.users.activeTotal}
              hint="login no período"
              accent="porto"
            />
            <StatCard
              label="Matches"
              value={metricas.matches.created}
              hint={`${metricas.matches.accepted} aceitos`}
              accent="barro"
            />
            <StatCard label="Mensagens" value={metricas.messages.sent} hint="enviadas no período" accent="areia" />
            <StatCard
              label="Reuniões"
              value={metricas.appointments.created}
              hint={`${metricas.appointments.completed} concluídas`}
            />
            <StatCard
              label="Taxa de aceite"
              value={`${taxaAceite}%`}
              hint="aceitos sobre matches criados"
              accent="porto"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card space-y-5">
              <SectionHeader
                title="Funil de valor"
                description="Do match à reunião, com a conversão entre cada etapa."
              />
              <div className="space-y-4">
                {metricas.funnel.map((etapa) => (
                  <div key={etapa.key} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{etapa.label}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {etapa.count} · {etapa.conversionFromPrevious}% da etapa anterior
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-noite-700">
                      <div
                        className="h-full rounded-full bg-laco-600 dark:bg-laco-400"
                        style={{ width: `${Math.max(2, Math.round((etapa.count / funilMaximo) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card space-y-5">
              <SectionHeader title="Atividade no período" description="Volume criado por bucket de tempo." />
              <SerieDeAtividade pontos={metricas.series} />
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="card space-y-5">
              <SectionHeader title="Top setores" description="Startups visíveis por setor." />
              <ListaDeBarras itens={metricas.topSectors} />
            </section>
            <section className="card space-y-5">
              <SectionHeader title="Top cidades" description="Concentração geográfica das startups." />
              <ListaDeBarras itens={metricas.topCities} />
            </section>
            <section className="card space-y-5">
              <SectionHeader title="Top estágios" description="Momento das startups na jornada." />
              <ListaDeBarras itens={metricas.topStages} />
            </section>
          </div>
        </>
      )}
    </section>
  );
}
