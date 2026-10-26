import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';
import { Avatar } from '../components/Avatar';
import { CompatibilityDrawer } from '../components/CompatibilityDrawer';
import { ProfileModal } from '../components/ProfileModal';
import { ProgressRing } from '../components/ProgressRing';
import { Skeleton } from '../components/Skeleton';
import { StatCard } from '../components/StatCard';
import { matchService } from '../services';
import { extractErrorMessage } from '../services/api';
import type { InvestorProfile, Match, MatchStatus, StartupProfile } from '../types';

type TipoPerfil = 'startup' | 'investor';
type FiltroId = 'todos' | 'alta' | 'media' | 'baixa' | 'pendentes' | 'aceitos';
type Ordem = 'score' | 'recentes';

interface PerfilSelecionado {
  kind: TipoPerfil;
  profileId: string;
  matchId: string;
  matchStatus: MatchStatus;
  score: number;
}

const FILTROS: { id: FiltroId; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'alta', label: '70+' },
  { id: 'media', label: '40–69' },
  { id: 'baixa', label: 'Baixo' },
  { id: 'pendentes', label: 'Pendentes' },
  { id: 'aceitos', label: 'Aceitos' },
];

const STATUS: Record<MatchStatus, { label: string; classe: string }> = {
  PENDENTE: {
    label: 'Pendente',
    classe: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  },
  ACEITO: {
    label: 'Conectado',
    classe: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
  },
  RECUSADO: {
    label: 'Recusado',
    classe: 'bg-slate-100 text-slate-600 dark:bg-noite-700 dark:text-slate-300',
  },
};

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function nomeStartup(perfil?: StartupProfile | null): string {
  return perfil?.companyName || perfil?.user?.name || 'Startup';
}

function nomeInvestidor(perfil?: InvestorProfile | null): string {
  return perfil?.companyName || perfil?.user?.name || 'Investidor';
}

function lugar(cidade?: string | null, estado?: string | null): string {
  return [cidade, estado].filter(Boolean).join(', ');
}

function moeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor);
}

function textoDoMatch(match: Match): string {
  const startup = match.startup;
  const investidor = match.investor;

  return normalizar(
    [
      startup?.companyName,
      startup?.user?.name,
      startup?.sector,
      startup?.stage,
      startup?.city,
      startup?.state,
      investidor?.companyName,
      investidor?.user?.name,
      investidor?.sectorInterest,
      investidor?.stageInterest,
      investidor?.city,
      investidor?.state,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

function combinaFiltro(match: Match, filtro: FiltroId): boolean {
  if (filtro === 'alta') {
    return match.score >= 70;
  }

  if (filtro === 'media') {
    return match.score >= 40 && match.score < 70;
  }

  if (filtro === 'baixa') {
    return match.score < 40;
  }

  if (filtro === 'pendentes') {
    return match.status === 'PENDENTE';
  }

  if (filtro === 'aceitos') {
    return match.status === 'ACEITO';
  }

  return true;
}

function BadgeStatus({ status }: { status: MatchStatus }) {
  const configuracao = STATUS[status];

  return <span className={`badge ${configuracao.classe}`}>{configuracao.label}</span>;
}

export function Connections() {
  const { user, isStartup, isInvestor } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [filtro, setFiltro] = useState<FiltroId>('todos');
  const [ordem, setOrdem] = useState<Ordem>('score');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [recalculando, setRecalculando] = useState(false);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<PerfilSelecionado | null>(null);
  const [comparando, setComparando] = useState<Match | null>(null);

  const ehStaff = Boolean(user && !isStartup && !isInvestor);

  const buscar = useCallback(async (silencioso = false) => {
    if (!silencioso) {
      setCarregando(true);
    }

    setErro('');

    try {
      const { matches: lista } = await matchService.list({ minimo: 0, porPagina: 50 });
      setMatches(lista);
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      if (!silencioso) {
        setCarregando(false);
      }
    }
  }, []);

  useEffect(() => {
    void buscar();
  }, [buscar]);

  const resumo = useMemo(() => {
    const total = matches.length;
    const alta = matches.filter((match) => match.score >= 70).length;
    const aceitos = matches.filter((match) => match.status === 'ACEITO').length;
    const media = total > 0 ? Math.round(matches.reduce((soma, match) => soma + match.score, 0) / total) : 0;

    return { total, alta, aceitos, media };
  }, [matches]);

  const contagens = useMemo(() => {
    return Object.fromEntries(
      FILTROS.map((item) => [item.id, matches.filter((match) => combinaFiltro(match, item.id)).length]),
    ) as Record<FiltroId, number>;
  }, [matches]);

  const visiveis = useMemo(() => {
    const termo = normalizar(busca);

    return matches
      .filter((match) => combinaFiltro(match, filtro))
      .filter((match) => (termo ? textoDoMatch(match).includes(termo) : true))
      .slice()
      .sort((a, b) => {
        if (ordem === 'score') {
          return b.score - a.score;
        }

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [matches, filtro, busca, ordem]);

  async function recalcular() {
    const startupId = user?.startupProfile?.id;

    if (!startupId) {
      setErro('Só é possível recalcular se você tiver um perfil de startup.');
      return;
    }

    setRecalculando(true);
    setErro('');

    try {
      await matchService.regenerate(startupId);
      await buscar(true);
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setRecalculando(false);
    }
  }

  async function aceitar(match: Match) {
    setProcessandoId(match.id);
    setErro('');

    try {
      await matchService.updateStatus(match.id, 'ACEITO');
      await buscar(true);
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setProcessandoId(null);
    }
  }

  function abrirBriefing(match: Match, kind: TipoPerfil, profileId: string) {
    setSelecionado({
      kind,
      profileId,
      matchId: match.id,
      matchStatus: match.status,
      score: match.score,
    });
  }

  async function atualizarSelecionado(status: 'ACEITO' | 'RECUSADO') {
    if (!selecionado) {
      return;
    }

    await matchService.updateStatus(selecionado.matchId, status);
    setSelecionado((atual) => (atual ? { ...atual, matchStatus: status } : atual));
    await buscar(true);
  }

  const subtitulo = isStartup
    ? 'Investidores ordenados pela afinidade com o seu negócio. Abra o briefing para entender cada conexão.'
    : isInvestor
      ? 'Startups ordenadas pela aderência à sua tese. Abra o briefing para entender cada match.'
      : 'Visão completa das conexões do ecossistema, com score, status e explicação de cada match.';

  const cartaVazia = ehStaff
    ? {
        titulo: 'Nenhuma conexão no ecossistema ainda',
        texto: 'Quando startups e investidores gerarem matches, eles aparecem aqui.',
        destino: '/dashboard',
        rotulo: 'Voltar ao ecossistema',
      }
    : {
        titulo: 'Suas conexões vão aparecer aqui',
        texto: 'Complete seu perfil para melhorar a qualidade dos matches e liberar novas conexões.',
        destino: '/perfil',
        rotulo: isStartup ? 'Completar perfil da startup' : 'Completar perfil de investidor',
      };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Curadoria</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-slate-900 dark:text-areia-100">Conexões</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-300">{subtitulo}</p>
        </div>

        {isStartup ? (
          <button type="button" onClick={recalcular} className="btn-secondary" disabled={recalculando}>
            {recalculando ? 'Recalculando...' : 'Recalcular conexões'}
          </button>
        ) : null}
      </div>

      {erro ? <Alert mensagem={erro} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {carregando ? (
          Array.from({ length: 4 }).map((_, indice) => <Skeleton key={indice} className="h-28" />)
        ) : (
          <>
            <StatCard label="Conexões" value={resumo.total} hint="matches no seu radar" />
            <StatCard label="Alta afinidade" value={resumo.alta} hint="score igual ou acima de 70" accent="barro" />
            <StatCard label="Score médio" value={`${resumo.media}%`} hint="média das conexões" accent="areia" />
            <StatCard label="Aceitos" value={resumo.aceitos} hint="conexões já confirmadas" accent="porto" />
          </>
        )}
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full lg:max-w-md">
            <label htmlFor="conexoes-busca" className="label">
              Buscar conexão
            </label>
            <input
              id="conexoes-busca"
              type="search"
              className="input"
              placeholder="Nome, setor, estágio ou cidade"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
          </div>

          <div className="w-full sm:w-52">
            <label htmlFor="conexoes-ordem" className="label">
              Ordenar por
            </label>
            <select
              id="conexoes-ordem"
              className="input"
              value={ordem}
              onChange={(evento) => setOrdem(evento.target.value as Ordem)}
            >
              <option value="score">Maior score</option>
              <option value="recentes">Mais recente</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros de conexão">
          {FILTROS.map((item) => {
            const ativo = filtro === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFiltro(item.id)}
                aria-pressed={ativo}
                className={ativo ? 'btn-primary' : 'btn-secondary'}
              >
                {item.label}
                <span
                  className={`rounded-full px-1.5 text-[11px] ${
                    ativo ? 'bg-white/20' : 'bg-slate-100 dark:bg-noite-700'
                  }`}
                >
                  {contagens[item.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {carregando ? (
        <ul className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, indice) => (
            <li key={indice} className="card space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-9 w-full" />
            </li>
          ))}
        </ul>
      ) : matches.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="font-display text-xl font-semibold text-slate-900 dark:text-areia-100">{cartaVazia.titulo}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-300">{cartaVazia.texto}</p>
          <Link to={cartaVazia.destino} className="btn-primary mt-5 inline-flex">
            {cartaVazia.rotulo}
          </Link>
        </div>
      ) : visiveis.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="font-display text-xl font-semibold text-slate-900 dark:text-areia-100">
            Nenhuma conexão com esse filtro
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Ajuste a busca ou volte para todas as conexões.
          </p>
          <button
            type="button"
            className="btn-secondary mt-4"
            onClick={() => {
              setFiltro('todos');
              setBusca('');
            }}
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {visiveis.map((match) => {
            const startup = match.startup;
            const investidor = match.investor;
            const startupId = startup?.id;
            const investidorId = investidor?.id;
            const podeAceitar = match.status === 'PENDENTE';

            if (ehStaff) {
              return (
                <li key={match.id} className="card flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={nomeStartup(startup)} src={startup?.logoUrl} size={44} />
                        <div className="min-w-0">
                          <p className="eyebrow">Startup</p>
                          <p className="truncate font-semibold text-slate-900 dark:text-areia-100">
                            {nomeStartup(startup)}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {[startup?.sector, startup?.stage, lugar(startup?.city, startup?.state)]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      </div>

                      <span aria-hidden="true" className="hidden text-lg text-slate-400 sm:inline">
                        ×
                      </span>

                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={nomeInvestidor(investidor)} size={44} />
                        <div className="min-w-0">
                          <p className="eyebrow">Investidor</p>
                          <p className="truncate font-semibold text-slate-900 dark:text-areia-100">
                            {nomeInvestidor(investidor)}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {[
                              investidor?.sectorInterest,
                              investidor?.stageInterest,
                              lugar(investidor?.city, investidor?.state),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <ProgressRing value={match.score} size={68} stroke={7} />
                  </div>

                  {match.reason ? <p className="text-sm text-slate-600 dark:text-slate-300">{match.reason}</p> : null}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-noite-700">
                    <BadgeStatus status={match.status} />

                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-secondary" onClick={() => setComparando(match)}>
                        Comparar perfis
                      </button>
                      {startupId ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => abrirBriefing(match, 'startup', startupId)}
                        >
                          Briefing startup
                        </button>
                      ) : null}
                      {investidorId ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => abrirBriefing(match, 'investor', investidorId)}
                        >
                          Briefing investidor
                        </button>
                      ) : null}
                      {podeAceitar ? (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => aceitar(match)}
                          disabled={processandoId === match.id}
                        >
                          {processandoId === match.id ? 'Aceitando...' : 'Aceitar'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            }

            const vendoStartup = isInvestor;
            const perfilId = vendoStartup ? startupId : investidorId;
            const nome = vendoStartup ? nomeStartup(startup) : nomeInvestidor(investidor);
            const empresa = vendoStartup ? startup?.user?.name : investidor?.companyName;
            const local = vendoStartup
              ? lugar(startup?.city, startup?.state)
              : lugar(investidor?.city, investidor?.state);
            const setor = vendoStartup ? startup?.sector : investidor?.sectorInterest;
            const estagio = vendoStartup ? startup?.stage : investidor?.stageInterest;
            const avatar = vendoStartup ? startup?.logoUrl : null;
            const tags = vendoStartup
              ? [
                  startup?.sector,
                  startup?.stage,
                  startup?.foundedAt ? `Desde ${new Date(startup.foundedAt).getFullYear()}` : undefined,
                ]
              : [
                  investidor?.sectorInterest,
                  investidor?.stageInterest,
                  investidor ? `${moeda(investidor.ticketMin)}–${moeda(investidor.ticketMax)}` : undefined,
                ];

            return (
              <li key={match.id} className="card flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <Avatar name={nome} src={avatar} size={48} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-display text-lg font-semibold text-slate-900 dark:text-areia-100">
                          {nome}
                        </h2>
                        {empresa && empresa !== nome ? (
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{empresa}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 sm:hidden">
                        <ProgressRing value={match.score} size={60} stroke={6} />
                      </div>
                    </div>

                    <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">
                      {[setor, estagio, local].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <div className="hidden shrink-0 sm:block">
                    <ProgressRing value={match.score} size={72} stroke={7} />
                  </div>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {match.reason || 'Afinidade calculada a partir de setor, estágio, ticket e região.'}
                </p>

                <div className="flex flex-wrap gap-2">
                  {tags.filter(Boolean).map((tag) => (
                    <span
                      key={String(tag)}
                      className="badge bg-areia-100 text-laco-900 dark:bg-noite-700 dark:text-areia-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-noite-700">
                  <BadgeStatus status={match.status} />

                  <div className="flex flex-wrap gap-2">
                    {perfilId ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => abrirBriefing(match, vendoStartup ? 'startup' : 'investor', perfilId)}
                      >
                        Ver briefing
                      </button>
                    ) : null}
                    <button type="button" className="btn-secondary" onClick={() => setComparando(match)}>
                      Comparar perfis
                    </button>
                    {podeAceitar ? (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => aceitar(match)}
                        disabled={processandoId === match.id}
                      >
                        {processandoId === match.id ? 'Aceitando...' : 'Aceitar'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ProfileModal
        open={Boolean(selecionado)}
        onClose={() => setSelecionado(null)}
        kind={selecionado?.kind ?? 'startup'}
        profileId={selecionado?.profileId ?? ''}
        matchId={selecionado?.matchId}
        matchStatus={selecionado?.matchStatus}
        score={selecionado?.score}
        onStatusChange={atualizarSelecionado}
        onCompare={() => {
          if (!selecionado) {
            return;
          }

          const match = matches.find((item) => item.id === selecionado.matchId);

          if (match) {
            setComparando(match);
            setSelecionado(null);
          }
        }}
      />

      <CompatibilityDrawer
        open={Boolean(comparando)}
        matchId={comparando?.id ?? ''}
        onClose={() => setComparando(null)}
        onOpenBriefing={(kind, profileId) => {
          if (!comparando) {
            return;
          }

          setSelecionado({
            kind,
            profileId,
            matchId: comparando.id,
            matchStatus: comparando.status,
            score: comparando.score,
          });
          setComparando(null);
        }}
      />
    </div>
  );
}
