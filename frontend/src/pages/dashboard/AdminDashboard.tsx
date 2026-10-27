import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/Alert';
import { SectionHeader } from '../../components/SectionHeader';
import { Skeleton } from '../../components/Skeleton';
import { StatCard } from '../../components/StatCard';
import { adminService } from '../../services';
import { extractErrorMessage } from '../../services/api';
import type { AdminOverview, MatchStatus, TicketStatus } from '../../types';

const ROTULO_STATUS: Record<MatchStatus, string> = {
  PENDENTE: 'Pendentes',
  ACEITO: 'Aceitos',
  RECUSADO: 'Recusados',
};

const COR_STATUS: Record<MatchStatus, string> = {
  PENDENTE: 'bg-amber-400',
  ACEITO: 'bg-emerald-500',
  RECUSADO: 'bg-rose-400',
};

const ROTULO_CHAMADO: Record<TicketStatus, string> = {
  ABERTO: 'Abertos',
  EM_ANALISE: 'Em análise',
  AGUARDANDO_USUARIO: 'Aguardando usuário',
  RESOLVIDO: 'Resolvidos',
  ARQUIVADO: 'Arquivados',
};

function formatarDataHora(valor: string): string {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return 'Data a confirmar';
  }

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ListaDeBarras({ itens }: { itens: { label: string; count: number; detalhe?: string }[] }) {
  const maximo = Math.max(...itens.map((item) => item.count), 1);

  return (
    <ul className="space-y-3">
      {itens.map((item) => (
        <li key={item.label} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
            <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
              {item.count}
              {item.detalhe ? ` · ${item.detalhe}` : ''}
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

export function AdminDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro('');

      try {
        const dados = await adminService.getOverview();

        if (ativo) {
          setOverview(dados);
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

  const primeiroNome = user?.name.split(' ')[0] ?? 'administrador';

  if (carregando) {
    return (
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        <Skeleton className="h-48 rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, indice) => (
            <Skeleton key={indice} className="h-28" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="space-y-6">
        <Alert mensagem={erro || 'Não foi possível carregar a visão do ecossistema.'} />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setCarregando(true);
            setErro('');
            adminService
              .getOverview()
              .then((dados) => setOverview(dados))
              .catch((e) => setErro(extractErrorMessage(e)))
              .finally(() => setCarregando(false));
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const totalStatus = overview.totals.accepted + overview.totals.pending + overview.totals.declined;
  const taxaAceite = Math.round(overview.acceptanceRate * 100);
  const status: MatchStatus[] = ['PENDENTE', 'ACEITO', 'RECUSADO'];
  const quantidadePorStatus: Record<MatchStatus, number> = {
    PENDENTE: overview.totals.pending,
    ACEITO: overview.totals.accepted,
    RECUSADO: overview.totals.declined,
  };

  return (
    <div className="space-y-6">
      <section className="bg-renda relative overflow-hidden rounded-3xl bg-laco-950 px-6 py-7 text-areia-100 shadow-laco sm:px-8">
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-barro-500/25 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-areia-200/60">
              Visão do ecossistema
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-areia-50">Olá, {primeiroNome}.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-areia-200/75">
              {overview.totals.startups} startups, {overview.totals.investors} investidores e {overview.totals.matches}{' '}
              conexões movimentando a rede.
            </p>
            <p className="mt-2 text-xs text-areia-200/60">
              {overview.totals.projects} projetos publicados · {overview.totals.mentors}{' '}
              {overview.totals.mentors === 1 ? 'mentor' : 'mentores'}
            </p>
          </div>

          <Link to="/moderacao" className="btn-primary shrink-0">
            Abrir Sala de Controle
          </Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Startups" value={overview.totals.startups} hint="perfis ativos" />
        <StatCard label="Investidores" value={overview.totals.investors} hint="perfis ativos" accent="barro" />
        <StatCard label="Conexões" value={overview.totals.matches} hint={`${overview.totals.pending} pendentes`} />
        <StatCard label="Taxa de aceite" value={`${taxaAceite}%`} hint="sobre o total de matches" accent="porto" />
        <StatCard label="Mensagens" value={overview.totals.messages} hint="trocadas na plataforma" accent="areia" />
        <StatCard label="Reuniões" value={overview.totals.appointments} hint="agendamentos registrados" />
      </div>

      <section className="card space-y-5">
        <SectionHeader
          title="Selos de perfil"
          description="Perfis verificados pela administração ganham peso extra nas conexões. Aprovar exige motivo e fica na auditoria."
          action={
            <Link to="/moderacao?aba=validacoes" className="link">
              Analisar pedidos
            </Link>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="text-xs text-amber-800 dark:text-amber-200">Em análise</p>
            <p className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-100">
              {overview.verifications.pending}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <p className="text-xs text-emerald-800 dark:text-emerald-200">Aprovados</p>
            <p className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-100">
              {overview.verifications.approved}
            </p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10">
            <p className="text-xs text-rose-800 dark:text-rose-200">Recusados</p>
            <p className="mt-1 text-xl font-semibold text-rose-900 dark:text-rose-100">
              {overview.verifications.rejected}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-noite-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">Perfis com selo</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-areia-100">
              {overview.verifications.verifiedProfiles}
            </p>
          </div>
        </div>
      </section>

      <section className="card space-y-5">
        <SectionHeader
          title="Chamados e denúncias"
          description="O acesso a conexões e reuniões de outras pessoas só acontece a partir de um chamado aberto."
          action={
            <Link to="/chamados" className="link">
              Abrir help desk
            </Link>
          }
        />

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(Object.keys(ROTULO_CHAMADO) as TicketStatus[]).map((status) => (
            <div key={status} className="rounded-xl border border-slate-200 px-4 py-3 dark:border-noite-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">{ROTULO_CHAMADO[status]}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-areia-100">
                {overview.tickets.byStatus[status] ?? 0}
              </p>
            </div>
          ))}
        </div>

        {overview.recentTickets.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-300">Nenhum chamado registrado ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-noite-700">
            {overview.recentTickets.map((chamado) => (
              <li key={chamado.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{chamado.subject}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {chamado.protocol} · {chamado.reporter?.name ?? 'Usuário'}
                    {chamado.targetUser ? ` → ${chamado.targetUser.name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {chamado.naoLidas ? (
                    <span className="badge bg-barro-100 text-barro-800 dark:bg-barro-900/40 dark:text-barro-200">
                      {chamado.naoLidas} nova(s)
                    </span>
                  ) : null}
                  <span className="badge bg-slate-100 text-slate-600 dark:bg-noite-700 dark:text-slate-300">
                    {ROTULO_CHAMADO[chamado.status]}
                  </span>
                  <Link to="/chamados" className="link text-xs">
                    Analisar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-5">
          <SectionHeader
            title="Setores do ecossistema"
            description="Distribuição das startups cadastradas por setor."
          />

          {overview.sectors.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">Ainda não há startups cadastradas.</p>
          ) : (
            <ListaDeBarras
              itens={overview.sectors.slice(0, 8).map((item) => ({
                label: item.sector,
                count: item.count,
                detalhe: `${Math.round(item.share * 100)}%`,
              }))}
            />
          )}
        </section>

        <section className="card space-y-5">
          <SectionHeader title="Funil de estágios" description="Em que momento do funil as startups estão." />

          {overview.stages.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">Ainda não há estágios registrados.</p>
          ) : (
            <ListaDeBarras
              itens={overview.stages.map((item) => ({
                label: item.stage,
                count: item.count,
              }))}
            />
          )}
        </section>
      </div>

      <section className="card space-y-5">
        <SectionHeader
          title="Status das conexões"
          description="Como os matches se distribuem entre pendentes, aceitos e recusados."
        />

        {totalStatus === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-300">Ainda não há conexões registradas.</p>
        ) : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-noite-700">
              {status.map((item) => {
                const quantidade = quantidadePorStatus[item];
                const largura = Math.round((quantidade / totalStatus) * 100);

                return (
                  <div
                    key={item}
                    className={COR_STATUS[item]}
                    style={{ width: `${largura}%` }}
                    title={`${ROTULO_STATUS[item]}: ${quantidade}`}
                  />
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {status.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-noite-700"
                >
                  <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <span className={`h-2.5 w-2.5 rounded-full ${COR_STATUS[item]}`} />
                    {ROTULO_STATUS[item]}
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-areia-100">
                    {quantidadePorStatus[item]}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-5">
          <SectionHeader
            title="Privacidade por padrão"
            description="O painel mostra apenas números agregados do ecossistema."
          />

          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <li className="rounded-xl border border-slate-200 p-3 dark:border-noite-700">
              Conexões, mensagens e reuniões de uma pessoa só ficam visíveis dentro do chamado em que ela é denunciada.
            </li>
            <li className="rounded-xl border border-slate-200 p-3 dark:border-noite-700">
              Cada acesso ao contexto é registrado na auditoria com administrador, chamado e horário.
            </li>
            <li className="rounded-xl border border-slate-200 p-3 dark:border-noite-700">
              Suspensões, ocultações e mudanças de reputação exigem motivo e ficam na trilha do chamado.
            </li>
          </ul>

          <Link to="/chamados" className="btn-secondary">
            Ir para os chamados
          </Link>
        </section>

        <section className="card space-y-5">
          <SectionHeader
            title="Trilha de auditoria"
            description="As ações mais recentes registradas na plataforma."
            action={
              <Link to="/moderacao" className="link">
                Abrir Sala de Controle
              </Link>
            }
          />

          {overview.recentAudit.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">Nenhuma ação registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-noite-700">
              {overview.recentAudit.map((registro) => (
                <li key={registro.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {registro.action} <span className="text-xs font-normal text-slate-500">{registro.entity}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{registro.user}</p>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {formatarDataHora(registro.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
