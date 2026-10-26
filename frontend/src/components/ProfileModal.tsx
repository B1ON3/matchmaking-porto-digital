import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgenda } from '../context/AgendaContext';
import { Alert } from '../components/Alert';
import { Avatar } from '../components/Avatar';
import { FactorBar } from '../components/FactorBar';
import { Gauge } from '../components/Gauge';
import { Modal } from '../components/Modal';
import { ProgressRing } from '../components/ProgressRing';
import { Skeleton } from '../components/Skeleton';
import { Tabs } from '../components/Tabs';
import { investorService, startupService } from '../services';
import { extractErrorMessage } from '../services/api';
import type { InvestorInsights, MatchStatus, ProjectStatus, StartupInsights } from '../types';

export type ProfileModalAba = 'briefing' | 'tese' | 'plataforma' | 'potencial';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  kind: 'startup' | 'investor';
  profileId: string;
  matchId?: string;
  matchStatus?: MatchStatus;
  score?: number;
  initialTab?: ProfileModalAba;
  hideActions?: boolean;
  onStatusChange?: (status: 'ACEITO' | 'RECUSADO') => Promise<void>;
  onCompare?: () => void;
}

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

const PROJETO_STATUS: Record<ProjectStatus, { label: string; classe: string }> = {
  PLANEJADO: {
    label: 'Planejado',
    classe: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  },
  EM_ANDAMENTO: {
    label: 'Em andamento',
    classe: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200',
  },
  CONCLUIDO: {
    label: 'Concluído',
    classe: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
  },
};

function urlExterna(valor?: string | null): string | null {
  if (!valor) {
    return null;
  }

  const bruto = /^https?:\/\//i.test(valor) ? valor : `https://${valor}`;

  try {
    const url = new URL(bruto);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatarData(valor?: string | null): string {
  if (!valor) {
    return 'Não informada';
  }

  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? 'Não informada' : data.toLocaleDateString('pt-BR');
}

function moeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor);
}

function faixaDeTicket(minimo: number, maximo: number): string {
  if (!minimo && !maximo) {
    return 'Não informado';
  }

  return minimo === maximo ? moeda(minimo) : `${moeda(minimo)} a ${moeda(maximo)}`;
}

function local(cidade?: string | null, estado?: string | null): string {
  return [cidade, estado].filter(Boolean).join(', ') || 'Local não informado';
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-areia-100">{titulo}</h4>
      {children}
    </section>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-noite-900/60">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {rotulo}
      </p>
      <div className="mt-1 text-sm font-medium text-slate-800 dark:text-areia-100">{children}</div>
    </div>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-noite-700">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {rotulo}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold text-slate-900 dark:text-areia-100">{valor}</p>
    </div>
  );
}

function TextoVazio({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-500 dark:text-slate-300">{children}</p>;
}

function abaInicial(kind: 'startup' | 'investor', initialTab?: ProfileModalAba): ProfileModalAba {
  if (kind === 'startup') {
    return initialTab === 'plataforma' || initialTab === 'potencial' ? initialTab : 'briefing';
  }

  return initialTab === 'plataforma' ? 'plataforma' : 'tese';
}

export function ProfileModal({
  open,
  onClose,
  kind,
  profileId,
  matchId,
  matchStatus,
  score,
  initialTab,
  hideActions = false,
  onStatusChange,
  onCompare,
}: ProfileModalProps) {
  const navigate = useNavigate();
  const { open: abrirAgenda } = useAgenda();

  const [startup, setStartup] = useState<StartupInsights | null>(null);
  const [investidor, setInvestidor] = useState<InvestorInsights | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [aba, setAba] = useState<ProfileModalAba>(abaInicial(kind, initialTab));
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [erroStatus, setErroStatus] = useState('');

  useEffect(() => {
    setAba(abaInicial(kind, initialTab));
    setErroStatus('');
  }, [open, kind, profileId, initialTab]);

  useEffect(() => {
    if (!open || !profileId) {
      return;
    }

    let ativo = true;
    setCarregando(true);
    setErro('');
    setStartup(null);
    setInvestidor(null);

    const requisicao =
      kind === 'startup'
        ? startupService.getInsights(profileId).then((dados) => {
            if (ativo) {
              setStartup(dados);
            }
          })
        : investorService.getInsights(profileId).then((dados) => {
            if (ativo) {
              setInvestidor(dados);
            }
          });

    requisicao
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
  }, [open, kind, profileId, tentativa]);

  const perfil = kind === 'startup' ? startup?.profile : investidor?.profile;
  const usuario = perfil?.user;
  const nome =
    kind === 'startup'
      ? startup?.profile.companyName || startup?.profile.user.name || 'Startup'
      : investidor?.profile.companyName || investidor?.profile.user.name || 'Investidor';
  const scoreExibido = score ?? (kind === 'startup' ? startup?.viewerMatch?.score : investidor?.viewerMatch?.score);
  const pronto = Boolean(perfil);

  const abas = useMemo(
    () =>
      kind === 'startup'
        ? [
            { id: 'briefing', label: 'Briefing' },
            { id: 'plataforma', label: 'Na plataforma' },
            { id: 'potencial', label: 'Potencial' },
          ]
        : [
            { id: 'tese', label: 'Tese' },
            { id: 'plataforma', label: 'Na plataforma' },
          ],
    [kind],
  );

  function conversar() {
    if (!usuario) {
      return;
    }

    onClose();
    navigate(`/mensagens?com=${encodeURIComponent(usuario.id)}&nome=${encodeURIComponent(nome)}`);
  }

  function agendar() {
    onClose();
    abrirAgenda(matchId ? { matchId } : undefined);
  }

  async function aceitar() {
    if (!matchId || !onStatusChange) {
      return;
    }

    setSalvandoStatus(true);
    setErroStatus('');

    try {
      await onStatusChange('ACEITO');
    } catch (e) {
      setErroStatus(extractErrorMessage(e));
    } finally {
      setSalvandoStatus(false);
    }
  }

  const rodape = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {onCompare && matchId ? (
        <button type="button" className="btn-secondary" onClick={onCompare}>
          Comparar perfis
        </button>
      ) : null}
      <button type="button" className="btn-secondary" onClick={conversar} disabled={!usuario}>
        Conversar
      </button>
      <button type="button" className="btn-secondary" onClick={agendar} disabled={!pronto}>
        Agendar
      </button>
      {matchStatus === 'PENDENTE' && matchId && onStatusChange ? (
        <button type="button" className="btn-primary" onClick={aceitar} disabled={salvandoStatus}>
          {salvandoStatus ? 'Aceitando...' : 'Aceitar conexão'}
        </button>
      ) : null}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={kind === 'startup' ? 'Perfil da startup' : 'Perfil do investidor'}
      footer={hideActions ? undefined : rodape}
    >
      {carregando ? (
        <div className="space-y-5" aria-busy="true" aria-live="polite">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
            <Skeleton className="h-20 w-20 rounded-full" />
          </div>
          <Skeleton className="h-12 w-72 max-w-full rounded-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, indice) => (
              <Skeleton key={indice} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      ) : erro ? (
        <div className="space-y-4">
          <Alert mensagem={erro} />
          <button type="button" className="btn-secondary" onClick={() => setTentativa((valor) => valor + 1)}>
            Tentar novamente
          </button>
        </div>
      ) : !perfil ? (
        <TextoVazio>Não foi possível carregar este perfil.</TextoVazio>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-noite-700 sm:flex-row sm:items-start">
            <Avatar name={nome} src={kind === 'startup' ? startup?.profile.logoUrl : null} size={64} />

            <div className="min-w-0 flex-1">
              <p className="eyebrow">{kind === 'startup' ? 'Startup' : 'Investidor'}</p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-slate-900 dark:text-areia-100">{nome}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {kind === 'startup'
                  ? [
                      startup?.profile.sector,
                      startup?.profile.stage,
                      local(startup?.profile.city, startup?.profile.state),
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : [
                      investidor?.profile.sectorInterest,
                      investidor?.profile.stageInterest,
                      local(investidor?.profile.city, investidor?.profile.state),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
              </p>
              {usuario?.name && usuario.name !== nome ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Responsável: {usuario.name}
                  {usuario.email ? ` · ${usuario.email}` : ''}
                </p>
              ) : null}
              {matchStatus ? (
                <span className={`badge mt-3 ${STATUS[matchStatus].classe}`}>{STATUS[matchStatus].label}</span>
              ) : null}
            </div>

            {typeof scoreExibido === 'number' ? (
              <div className="shrink-0 self-start">
                <ProgressRing value={scoreExibido} size={78} stroke={8} label="afinidade" />
              </div>
            ) : null}
          </div>

          <Tabs tabs={abas} active={aba} onChange={(id) => setAba(id as ProfileModalAba)} />

          {kind === 'startup' && startup ? (
            aba === 'briefing' ? (
              <div className="space-y-5" role="tabpanel">
                <Bloco titulo="Sobre a startup">
                  <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                    {startup.profile.description || 'Descrição ainda não informada.'}
                  </p>
                </Bloco>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo rotulo="Setor">{startup.profile.sector || 'Não informado'}</Campo>
                  <Campo rotulo="Estágio">{startup.profile.stage || 'Não informado'}</Campo>
                  <Campo rotulo="Localização">{local(startup.profile.city, startup.profile.state)}</Campo>
                  <Campo rotulo="Fundação">{formatarData(startup.profile.foundedAt)}</Campo>
                  <Campo rotulo="Modelo de negócio">{startup.profile.businessModel || 'Não informado'}</Campo>
                  <Campo rotulo="Tamanho do time">
                    {startup.profile.teamSize ? `${startup.profile.teamSize} pessoa(s)` : 'Não informado'}
                  </Campo>
                  <Campo rotulo="Receita ou tração">{startup.profile.revenue || 'Não informado'}</Campo>
                  <Campo rotulo="Contato">
                    {startup.profile.contactEmail || startup.profile.phone ? (
                      <span className="space-y-1">
                        {startup.profile.contactEmail ? (
                          <span className="block">{startup.profile.contactEmail}</span>
                        ) : null}
                        {startup.profile.phone ? <span className="block">{startup.profile.phone}</span> : null}
                      </span>
                    ) : (
                      'Não informado'
                    )}
                  </Campo>
                </div>

                <Bloco titulo="O que a startup precisa">
                  <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                    {startup.profile.needs || 'Necessidades ainda não informadas.'}
                  </p>
                </Bloco>

                <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-4 dark:border-noite-700">
                  {urlExterna(startup.profile.website) ? (
                    <a
                      className="link"
                      href={urlExterna(startup.profile.website) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Site da startup
                    </a>
                  ) : null}
                  {urlExterna(startup.profile.pitchUrl) ? (
                    <a
                      className="link"
                      href={urlExterna(startup.profile.pitchUrl) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Assistir ao pitch
                    </a>
                  ) : null}
                  {urlExterna(startup.profile.linkedin) ? (
                    <a
                      className="link"
                      href={urlExterna(startup.profile.linkedin) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      LinkedIn
                    </a>
                  ) : null}
                  {!urlExterna(startup.profile.website) &&
                  !urlExterna(startup.profile.pitchUrl) &&
                  !urlExterna(startup.profile.linkedin) ? (
                    <TextoVazio>Nenhum link público cadastrado.</TextoVazio>
                  ) : null}
                </div>
              </div>
            ) : aba === 'plataforma' ? (
              <div className="space-y-5" role="tabpanel">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metrica rotulo="Matches" valor={startup.metrics.matches} />
                  <Metrica rotulo="Aceitos" valor={startup.metrics.acceptedMatches} />
                  <Metrica rotulo="Mensagens" valor={startup.metrics.messages} />
                  <Metrica rotulo="Agendamentos" valor={startup.metrics.appointments} />
                  <Metrica rotulo="Investidores" valor={startup.metrics.investorsReached} />
                </div>

                <Bloco titulo="Projetos">
                  {startup.projects.length === 0 ? (
                    <TextoVazio>Nenhum projeto cadastrado ainda.</TextoVazio>
                  ) : (
                    <ul className="space-y-2">
                      {startup.projects.map((projeto) => (
                        <li
                          key={projeto.id}
                          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-noite-700"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-areia-100">{projeto.title}</p>
                            {projeto.summary ? (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{projeto.summary}</p>
                            ) : null}
                          </div>
                          <span className={`badge ${PROJETO_STATUS[projeto.status].classe}`}>
                            {PROJETO_STATUS[projeto.status].label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Bloco>
              </div>
            ) : (
              <div className="space-y-5" role="tabpanel">
                <div className="rounded-2xl bg-areia-100/70 p-5 dark:bg-noite-900/60">
                  <Gauge value={startup.marketPotential.score} label={startup.marketPotential.label} />
                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                    Índice calculado a partir do perfil da startup, setor, estágio, engajamento e presença regional.
                  </p>
                </div>

                <div className="space-y-4">
                  {startup.marketPotential.factors.map((fator) => (
                    <FactorBar key={fator.key} label={fator.label} value={fator.value} weight={fator.weight} />
                  ))}
                </div>

                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-noite-700 dark:bg-noite-900/60 dark:text-slate-400">
                  {startup.marketPotential.disclaimer}
                </p>
              </div>
            )
          ) : null}

          {kind === 'investor' && investidor ? (
            aba === 'tese' ? (
              <div className="space-y-5" role="tabpanel">
                <Bloco titulo="Tese de investimento">
                  <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                    {investidor.profile.investmentThesis || investidor.profile.bio || 'Tese ainda não detalhada.'}
                  </p>
                </Bloco>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo rotulo="Setores de interesse">{investidor.profile.sectorInterest || 'Não informado'}</Campo>
                  <Campo rotulo="Estágios de interesse">{investidor.profile.stageInterest || 'Não informado'}</Campo>
                  <Campo rotulo="Ticket">
                    {faixaDeTicket(investidor.profile.ticketMin, investidor.profile.ticketMax)}
                  </Campo>
                  <Campo rotulo="Base">{local(investidor.profile.city, investidor.profile.state)}</Campo>
                  <Campo rotulo="Tipo de investidor">{investidor.profile.investorType || 'Não informado'}</Campo>
                  <Campo rotulo="Geografia preferida">{investidor.profile.preferredGeography || 'Não informado'}</Campo>
                  <Campo rotulo="Contato">
                    {investidor.profile.contactEmail || investidor.profile.phone ? (
                      <span className="space-y-1">
                        {investidor.profile.contactEmail ? (
                          <span className="block">{investidor.profile.contactEmail}</span>
                        ) : null}
                        {investidor.profile.phone ? <span className="block">{investidor.profile.phone}</span> : null}
                      </span>
                    ) : (
                      'Não informado'
                    )}
                  </Campo>
                  <Campo rotulo="Empresa">{investidor.profile.companyName || 'Não informado'}</Campo>
                </div>

                <Bloco titulo="Experiência">
                  <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                    {investidor.profile.experience || 'Experiência ainda não informada.'}
                  </p>
                </Bloco>

                {investidor.profile.bio && investidor.profile.investmentThesis ? (
                  <Bloco titulo="Sobre o investidor">
                    <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                      {investidor.profile.bio}
                    </p>
                  </Bloco>
                ) : null}

                <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-4 dark:border-noite-700">
                  {urlExterna(investidor.profile.website) ? (
                    <a
                      className="link"
                      href={urlExterna(investidor.profile.website) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Site
                    </a>
                  ) : null}
                  {urlExterna(investidor.profile.linkedin) ? (
                    <a
                      className="link"
                      href={urlExterna(investidor.profile.linkedin) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      LinkedIn
                    </a>
                  ) : null}
                  {urlExterna(investidor.profile.portfolioUrl) ? (
                    <a
                      className="link"
                      href={urlExterna(investidor.profile.portfolioUrl) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Portfólio
                    </a>
                  ) : null}
                  {!urlExterna(investidor.profile.website) &&
                  !urlExterna(investidor.profile.linkedin) &&
                  !urlExterna(investidor.profile.portfolioUrl) ? (
                    <TextoVazio>Nenhum link público cadastrado.</TextoVazio>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-5" role="tabpanel">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metrica rotulo="Matches" valor={investidor.metrics.matches} />
                  <Metrica rotulo="Aceitos" valor={investidor.metrics.acceptedMatches} />
                  <Metrica rotulo="Mensagens" valor={investidor.metrics.messages} />
                  <Metrica rotulo="Agendamentos" valor={investidor.metrics.appointments} />
                  <Metrica rotulo="Startups" valor={investidor.metrics.startupsReached} />
                </div>

                <Bloco titulo="Atividade na plataforma">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {investidor.metrics.startupsReached > 0
                      ? `Este investidor já alcançou ${investidor.metrics.startupsReached} startup(s) por meio dos matches da plataforma.`
                      : 'Este investidor ainda não alcançou startups por meio dos matches.'}
                  </p>
                </Bloco>
              </div>
            )
          ) : null}

          {erroStatus ? <Alert mensagem={erroStatus} /> : null}
        </div>
      )}
    </Modal>
  );
}
