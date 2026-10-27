import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/Alert';
import { Avatar } from '../../components/Avatar';
import { ProfileModal } from '../../components/ProfileModal';
import { ProgressRing } from '../../components/ProgressRing';
import { SectionHeader } from '../../components/SectionHeader';
import { Skeleton } from '../../components/Skeleton';
import { StatCard } from '../../components/StatCard';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { appointmentService, investorService, matchService, messageService } from '../../services';
import { extractErrorMessage } from '../../services/api';
import type { Appointment, InvestorInsights, InvestorProfile, Match } from '../../types';

interface ConversaResumo {
  naoLidas?: number;
}

function local(cidade?: string | null, estado?: string | null): string {
  return [cidade, estado].filter(Boolean).join(', ');
}

function formatarTicket(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(valor);
}

function faixaDeTicket(perfil?: InvestorProfile | null): string {
  if (!perfil) {
    return 'A definir';
  }

  if (perfil.ticketMin === perfil.ticketMax) {
    return formatarTicket(perfil.ticketMin);
  }

  return `${formatarTicket(perfil.ticketMin)} a ${formatarTicket(perfil.ticketMax)}`;
}

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

function proximosAgendamentos(agendamentos: Appointment[]): Appointment[] {
  const agora = Date.now();

  return agendamentos
    .filter((agendamento) => agendamento.status === 'AGENDADO')
    .filter((agendamento) => new Date(agendamento.scheduledAt).getTime() >= agora)
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function contarValores(valores: (string | null | undefined)[]): { label: string; count: number }[] {
  const contagem = new Map<string, { label: string; count: number }>();

  for (const valor of valores) {
    if (!valor) {
      continue;
    }

    for (const parte of valor.split(/[,;]/)) {
      const label = parte.trim();

      if (!label) {
        continue;
      }

      const chave = normalizar(label);
      const atual = contagem.get(chave);
      contagem.set(chave, { label: atual?.label ?? label, count: (atual?.count ?? 0) + 1 });
    }
  }

  return Array.from(contagem.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function dividirTermos(valor?: string | null): string[] {
  return (valor ?? '')
    .split(/[,;]/)
    .map((parte) => parte.trim())
    .filter(Boolean);
}

function ListaDeBarras({ itens }: { itens: { label: string; count: number }[] }) {
  const maximo = Math.max(...itens.map((item) => item.count), 1);

  return (
    <ul className="space-y-3">
      {itens.map((item) => (
        <li key={item.label} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
            <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{item.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-noite-700">
            <div
              className="h-full rounded-full bg-barro-500 dark:bg-barro-400"
              style={{ width: `${Math.round((item.count / maximo) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Chip({ children }: { children: string }) {
  return <span className="badge bg-slate-100 text-slate-700 dark:bg-noite-800 dark:text-slate-200">{children}</span>;
}

export function InvestorDashboard() {
  const { user } = useAuth();
  const investorId = user?.investorProfile?.id;

  const [insights, setInsights] = useState<InvestorInsights | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [conversas, setConversas] = useState<ConversaResumo[]>([]);
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [startupAberta, setStartupAberta] = useState<{ profileId: string; matchId?: string; score?: number } | null>(
    null,
  );

  useEffect(() => {
    const id = investorId;

    if (!id) {
      setCarregando(false);
      return;
    }

    let ativo = true;

    async function carregar(investorIdAtual: string) {
      setCarregando(true);
      setAviso('');

      const falhas: string[] = [];

      const [dadosInsights, listaMatches, listaConversas, listaAgendamentos] = await Promise.all([
        investorService.getInsights(investorIdAtual).catch((e) => {
          falhas.push(extractErrorMessage(e));
          return null;
        }),
        matchService
          .list({ minimo: 0, porPagina: 50 })
          .then((resultado) => resultado.matches ?? [])
          .catch((e) => {
            falhas.push(extractErrorMessage(e));
            return [] as Match[];
          }),
        messageService
          .conversas()
          .then((resultado) => resultado as ConversaResumo[])
          .catch((e) => {
            falhas.push(extractErrorMessage(e));
            return [] as ConversaResumo[];
          }),
        appointmentService.list().catch((e) => {
          falhas.push(extractErrorMessage(e));
          return [] as Appointment[];
        }),
      ]);

      if (!ativo) {
        return;
      }

      setInsights(dadosInsights);
      setMatches(listaMatches);
      setConversas(listaConversas);
      setAgendamentos(listaAgendamentos);
      setAviso(falhas.length > 0 ? 'Alguns dados não puderam ser carregados agora.' : '');
      setCarregando(false);
    }

    void carregar(id);

    return () => {
      ativo = false;
    };
  }, [investorId]);

  const perfil = insights?.profile ?? user?.investorProfile;
  const nome = perfil?.companyName || user?.name.split(' ')[0] || 'investidor';
  const proximos = useMemo(() => proximosAgendamentos(agendamentos), [agendamentos]);
  const proximaReuniao = proximos[0];
  const naoLidas = useMemo(
    () => conversas.reduce((total, conversa) => total + (conversa.naoLidas ?? 0), 0),
    [conversas],
  );
  const altaAfinidade = useMemo(() => matches.filter((match) => match.score >= 70).length, [matches]);
  const topStartups = useMemo(
    () =>
      matches
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
    [matches],
  );
  const setoresEmAlta = useMemo(
    () => contarValores(matches.map((match) => match.startup?.sector)).slice(0, 5),
    [matches],
  );
  const estagiosDisponiveis = useMemo(
    () => contarValores(matches.map((match) => match.startup?.stage)).slice(0, 5),
    [matches],
  );
  const setoresDaTese = dividirTermos(perfil?.sectorInterest);
  const estagiosDaTese = dividirTermos(perfil?.stageInterest);

  if (carregando) {
    return (
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        <Skeleton className="h-48 rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, indice) => (
            <Skeleton key={indice} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-renda relative overflow-hidden rounded-3xl bg-laco-950 px-6 py-7 text-areia-100 shadow-laco sm:px-8">
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-barro-500/25 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-areia-200/60">Seu painel</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-areia-50">Olá, {nome}.</h1>
            <div className="mt-2">
              <VerifiedBadge verifiedAt={user?.verifiedAt} />
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-areia-200/75">
              {perfil
                ? `Tese em ${setoresDaTese.join(', ') || 'diversos setores'} · ${estagiosDaTese.join(', ') || 'diversos estágios'} · ${faixaDeTicket(perfil)}`
                : 'Complete seu perfil de investidor para calibrar as conexões.'}
            </p>
            <p className="mt-2 text-xs text-areia-200/60">
              {perfil ? local(perfil.city, perfil.state) || 'Base a definir' : 'Cadastre sua tese para começar'}
            </p>
          </div>

          <Link to="/conexoes" className="btn-primary shrink-0">
            Explorar conexões
          </Link>
        </div>
      </section>

      {aviso ? <Alert mensagem={aviso} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Oportunidades"
          value={insights?.metrics.matches ?? matches.length}
          hint="startups no seu radar"
        />
        <StatCard label="Alta afinidade" value={altaAfinidade} hint="score igual ou acima de 70" accent="barro" />
        <StatCard label="Conversas" value={conversas.length} hint={`${naoLidas} não lidas`} accent="areia" />
        <StatCard
          label="Reuniões"
          value={agendamentos.length}
          hint={proximaReuniao ? `Próxima em ${formatarDataHora(proximaReuniao.scheduledAt)}` : 'Nenhuma agendada'}
          accent="porto"
        />
      </div>

      <SectionHeader
        eyebrow="Curadoria"
        title="Startups para conhecer"
        description="As oportunidades com maior aderência à sua tese de investimento."
        action={
          <Link to="/conexoes" className="link">
            Ver todas
          </Link>
        }
      />

      <section className="card">
        {topStartups.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Nenhuma startup no seu radar ainda. Ajuste sua tese para ampliar as conexões.
            </p>
            <Link to="/perfil" className="btn-secondary mt-4 inline-block">
              Revisar tese
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {topStartups.map((match) => {
              const startup = match.startup;
              const nomeStartup = startup?.companyName ?? 'Startup';
              const detalhe = [startup?.sector, startup?.stage, local(startup?.city, startup?.state)]
                .filter(Boolean)
                .join(' · ');

              return (
                <li
                  key={match.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 dark:border-noite-700 sm:flex-row sm:items-center"
                >
                  <Avatar name={nomeStartup} size={52} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-areia-100">{nomeStartup}</p>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      {detalhe || 'Perfil do ecossistema'}
                    </p>
                    {match.reason ? (
                      <p className="mt-2 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{match.reason}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <ProgressRing value={match.score} size={64} stroke={7} />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        startup
                          ? setStartupAberta({ profileId: startup.id, matchId: match.id, score: match.score })
                          : undefined
                      }
                      disabled={!startup}
                    >
                      Ver briefing
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-5">
          <SectionHeader title="Sua tese" description="O retrato que orienta a curadoria de oportunidades." />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-noite-700">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Setores
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {setoresDaTese.length > 0 ? (
                  setoresDaTese.map((setor) => <Chip key={setor}>{setor}</Chip>)
                ) : (
                  <span className="text-sm text-slate-500 dark:text-slate-400">A definir</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 dark:border-noite-700">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Estágios
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {estagiosDaTese.length > 0 ? (
                  estagiosDaTese.map((estagio) => <Chip key={estagio}>{estagio}</Chip>)
                ) : (
                  <span className="text-sm text-slate-500 dark:text-slate-400">A definir</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 dark:border-noite-700">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Ticket
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-areia-100">{faixaDeTicket(perfil)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 dark:border-noite-700">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Base
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-areia-100">
                {local(perfil?.city, perfil?.state) || 'A definir'}
              </p>
            </div>
          </div>

          <Link to="/perfil" className="link inline-block">
            Revisar tese
          </Link>
        </section>

        <section className="card space-y-5">
          <SectionHeader
            title="O que está no seu radar"
            description="Setores e estágios presentes nas suas conexões atuais."
          />

          {setoresEmAlta.length === 0 && estagiosDisponiveis.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">
              O radar é preenchido conforme as conexões com startups ganham forma.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-areia-100">Setores em alta</h3>
                {setoresEmAlta.length > 0 ? (
                  <ListaDeBarras itens={setoresEmAlta} />
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ainda sem dados de setor.</p>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-areia-100">Estágios disponíveis</h3>
                {estagiosDisponiveis.length > 0 ? (
                  <ListaDeBarras itens={estagiosDisponiveis} />
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ainda sem dados de estágio.</p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <SectionHeader
          title="Próximos encontros"
          description="Os dois compromissos mais próximos da sua agenda."
          action={
            <Link to="/agendamentos" className="link">
              Ver agenda
            </Link>
          }
        />

        {proximos.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500 dark:text-slate-300">
            Nenhuma reunião agendada. Aceite uma conexão e proponha um encontro.
          </p>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {proximos.slice(0, 2).map((agendamento) => (
              <li key={agendamento.id} className="rounded-xl border border-slate-200 p-3 dark:border-noite-700">
                <p className="text-sm font-semibold text-slate-900 dark:text-areia-100">{agendamento.title}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formatarDataHora(agendamento.scheduledAt)}
                  {agendamento.description ? ` · ${agendamento.description}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {startupAberta ? (
        <ProfileModal
          open
          onClose={() => setStartupAberta(null)}
          kind="startup"
          profileId={startupAberta.profileId}
          matchId={startupAberta.matchId}
          score={startupAberta.score}
          initialTab="briefing"
        />
      ) : null}
    </div>
  );
}
