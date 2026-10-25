import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/Alert';
import { Avatar } from '../../components/Avatar';
import { FactorBar } from '../../components/FactorBar';
import { Gauge } from '../../components/Gauge';
import { ProfileModal, type ProfileModalAba } from '../../components/ProfileModal';
import { ProgressRing } from '../../components/ProgressRing';
import { SectionHeader } from '../../components/SectionHeader';
import { Skeleton } from '../../components/Skeleton';
import { StatCard } from '../../components/StatCard';
import { appointmentService, matchService, messageService, startupService } from '../../services';
import { extractErrorMessage } from '../../services/api';
import type { Appointment, InvestorProfile, Match, MatchStatus, StartupInsights, StartupProfile } from '../../types';

interface ConversaResumo {
  naoLidas?: number;
}

interface ModalAberto {
  kind: 'startup' | 'investor';
  profileId: string;
  matchId?: string;
  matchStatus?: MatchStatus;
  score?: number;
  initialTab?: ProfileModalAba;
  hideActions?: boolean;
}

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function nomeInvestidor(perfil?: InvestorProfile | null): string {
  return perfil?.companyName || perfil?.user?.name || 'Investidor';
}

function local(cidade?: string | null, estado?: string | null): string {
  return [cidade, estado].filter(Boolean).join(', ');
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

function completudeDoPerfil(perfil?: StartupProfile | null): number {
  if (!perfil) {
    return 0;
  }

  const campos = [
    perfil.companyName,
    perfil.sector,
    perfil.description,
    perfil.stage,
    perfil.city,
    perfil.state,
    perfil.website,
    perfil.foundedAt,
    perfil.needs,
    perfil.pitchUrl,
  ];

  const preenchidos = campos.filter((valor) => typeof valor === 'string' && valor.trim().length > 0).length;

  return Math.round((preenchidos / campos.length) * 100);
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
              className="h-full rounded-full bg-laco-600 dark:bg-laco-400"
              style={{ width: `${Math.round((item.count / maximo) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StartupDashboard() {
  const { user } = useAuth();
  const startupId = user?.startupProfile?.id;

  const [insights, setInsights] = useState<StartupInsights | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [conversas, setConversas] = useState<ConversaResumo[]>([]);
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [modal, setModal] = useState<ModalAberto | null>(null);

  useEffect(() => {
    const id = startupId;

    if (!id) {
      setCarregando(false);
      return;
    }

    let ativo = true;

    async function carregar(startupIdAtual: string) {
      setCarregando(true);
      setAviso('');

      const falhas: string[] = [];

      const [dadosInsights, listaMatches, listaConversas, listaAgendamentos] = await Promise.all([
        startupService.getInsights(startupIdAtual).catch((e) => {
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
  }, [startupId]);

  const perfil = insights?.profile ?? user?.startupProfile;
  const proximos = useMemo(() => proximosAgendamentos(agendamentos), [agendamentos]);
  const proximaReuniao = proximos[0];
  const naoLidas = useMemo(
    () => conversas.reduce((total, conversa) => total + (conversa.naoLidas ?? 0), 0),
    [conversas],
  );
  const altaAfinidade = useMemo(() => matches.filter((match) => match.score >= 70).length, [matches]);
  const topMatches = useMemo(
    () =>
      matches
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
    [matches],
  );
  const radarSetores = useMemo(
    () => contarValores(matches.map((match) => match.investor?.sectorInterest)).slice(0, 5),
    [matches],
  );
  const radarEstagios = useMemo(
    () => contarValores(matches.map((match) => match.investor?.stageInterest)).slice(0, 5),
    [matches],
  );
  const completude = completudeDoPerfil(perfil);
  const potencial = insights?.marketPotential;
  const primeiroNome = user?.name.split(' ')[0] ?? 'empreendedor';

  function abrirBriefing(match: Match) {
    if (!match.investor) {
      return;
    }

    setModal({
      kind: 'investor',
      profileId: match.investor.id,
      matchId: match.id,
      matchStatus: match.status,
      score: match.score,
      initialTab: 'briefing',
    });
  }

  function abrirPotencial() {
    if (!perfil) {
      return;
    }

    setModal({
      kind: 'startup',
      profileId: perfil.id,
      initialTab: 'potencial',
      hideActions: true,
    });
  }

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
            <h1 className="mt-2 font-display text-3xl font-semibold text-areia-50">Olá, {primeiroNome}.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-areia-200/75">
              {perfil
                ? [perfil.companyName, perfil.sector, perfil.stage, local(perfil.city, perfil.state)]
                    .filter(Boolean)
                    .join(' · ')
                : 'Complete o perfil da sua startup para melhorar a qualidade das conexões.'}
            </p>

            <div className="mt-5 max-w-md">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="font-semibold uppercase tracking-[0.16em] text-areia-200/70">Perfil completo</span>
                <span className="font-semibold text-areia-100">{completude}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-barro-400 to-areia-200"
                  style={{ width: `${completude}%` }}
                />
              </div>
            </div>
          </div>

          <Link to="/conexoes" className="btn-primary shrink-0">
            Ver conexões
          </Link>
        </div>
      </section>

      {aviso ? <Alert mensagem={aviso} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Conexões"
          value={insights?.metrics.matches ?? matches.length}
          hint="investidores no seu radar"
        />
        <StatCard label="Alta afinidade" value={altaAfinidade} hint="score igual ou acima de 70" accent="barro" />
        <StatCard label="Não lidas" value={naoLidas} hint="mensagens aguardando você" accent="areia" />
        <StatCard
          label="Próxima reunião"
          value={proximaReuniao ? formatarDataHora(proximaReuniao.scheduledAt) : '—'}
          hint={proximaReuniao?.title ?? 'Nenhum encontro agendado'}
          accent="porto"
        />
      </div>

      <SectionHeader
        eyebrow="Curadoria"
        title="Seus investidores ideais"
        description="As conexões com maior aderência ao momento da sua startup."
        action={
          <Link to="/conexoes" className="link">
            Ver todas
          </Link>
        }
      />

      <section className="card">
        {topMatches.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Nenhuma conexão por aqui ainda. Complete seu perfil para liberar os primeiros matches.
            </p>
            <Link to="/perfil" className="btn-secondary mt-4 inline-block">
              Completar perfil
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {topMatches.map((match) => {
              const investidor = match.investor;
              const nome = nomeInvestidor(investidor);
              const detalhe = [
                investidor?.sectorInterest,
                investidor?.stageInterest,
                local(investidor?.city, investidor?.state),
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <li
                  key={match.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 dark:border-noite-700 sm:flex-row sm:items-center"
                >
                  <Avatar name={nome} size={52} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-areia-100">{nome}</p>
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
                      onClick={() => abrirBriefing(match)}
                      disabled={!investidor}
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
          <SectionHeader
            title="Potencial de mercado"
            description="Estimativa heurística a partir do perfil, setor, estágio, engajamento e região."
          />

          {potencial ? (
            <>
              <Gauge value={potencial.score} label={potencial.label} />

              <div className="space-y-4">
                {potencial.factors.slice(0, 3).map((fator) => (
                  <FactorBar key={fator.key} label={fator.label} value={fator.value} weight={fator.weight} />
                ))}
              </div>

              <button type="button" className="link" onClick={abrirPotencial}>
                Entender o cálculo
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-300">
              O potencial de mercado aparece quando os insights da startup estiverem disponíveis.
            </p>
          )}
        </section>

        <section className="card space-y-5">
          <SectionHeader
            title="Radar do ecossistema"
            description="Setores com mais investidores e estágios procurados nas suas conexões."
          />

          {radarSetores.length === 0 && radarEstagios.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">
              O radar é preenchido conforme suas conexões ganham forma.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-areia-100">Setores</h3>
                {radarSetores.length > 0 ? (
                  <ListaDeBarras itens={radarSetores} />
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ainda sem dados de setor.</p>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-areia-100">Estágios</h3>
                {radarEstagios.length > 0 ? (
                  <ListaDeBarras itens={radarEstagios} />
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ainda sem dados de estágio.</p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <SectionHeader title="Próximos passos" description="O que destrava novas conexões agora." />

          <ul className="mt-5 space-y-3">
            <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-noite-700">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-areia-100">Completar perfil</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Quanto mais contexto, melhores os matches.</p>
              </div>
              {completude >= 100 ? (
                <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                  Concluído
                </span>
              ) : (
                <Link to="/perfil" className="btn-secondary">
                  Completar
                </Link>
              )}
            </li>

            <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-noite-700">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-areia-100">Conectar</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Aceite uma conexão para abrir a conversa.</p>
              </div>
              {matches.some((match) => match.status === 'ACEITO') ? (
                <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                  Concluído
                </span>
              ) : (
                <Link to="/conexoes" className="btn-secondary">
                  Ver conexões
                </Link>
              )}
            </li>

            <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-noite-700">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-areia-100">Agendar</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Transforme a conexão em uma reunião.</p>
              </div>
              {proximos.length > 0 ? (
                <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                  Concluído
                </span>
              ) : (
                <Link to="/agendamentos" className="btn-secondary">
                  Agendar
                </Link>
              )}
            </li>
          </ul>
        </section>

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
            <ul className="mt-5 space-y-3">
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
      </div>

      {modal ? (
        <ProfileModal
          open
          onClose={() => setModal(null)}
          kind={modal.kind}
          profileId={modal.profileId}
          matchId={modal.matchId}
          matchStatus={modal.matchStatus}
          score={modal.score}
          initialTab={modal.initialTab}
          hideActions={modal.hideActions}
        />
      ) : null}
    </div>
  );
}
