import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';
import { Spinner } from '../components/Spinner';
import { appointmentService, matchService, messageService } from '../services';
import { ScoreBadge } from '../components/ScoreBadge';
import type { Appointment, Match } from '../types';

export function Dashboard() {
  const { user, isAdmin } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);

      try {
        const [listaMatches, listaAgendamentos, listaConversas] = await Promise.all([
          matchService.list({ minimo: 0, porPagina: 5 }).catch(() => ({ matches: [] })),
          appointmentService.list().catch(() => []),
          messageService.conversas().catch(() => []),
        ]);

        if (!ativo) {
          return;
        }

        setMatches(listaMatches.matches ?? []);
        setAgendamentos(listaAgendamentos);
        setNaoLidas(
          (listaConversas as { naoLidas?: number }[]).reduce((total, conversa) => total + (conversa.naoLidas ?? 0), 0),
        );
      } catch (e) {
        if (ativo) {
          setErro(e instanceof Error ? e.message : 'Falha ao carregar o dashboard');
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

  if (carregando) {
    return <Spinner texto="Carregando seu painel..." />;
  }

  const perfil = user?.startupProfile ?? user?.investorProfile;

  return (
    <div className="space-y-6">
      <section className="bg-renda relative overflow-hidden rounded-3xl bg-laco-950 px-6 py-7 text-areia-100 shadow-laco sm:px-8">
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-barro-500/25 blur-3xl" />

        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-areia-200/60">
            {isAdmin ? 'Visão do ecossistema' : 'Seu painel'}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-areia-50">Olá, {user?.name.split(' ')[0]}.</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-areia-200/75">
            {isAdmin
              ? 'Acompanhe os matches, as conversas e a auditoria de todo o ecossistema.'
              : 'O laço entre quem cria e quem investe começa aqui: veja seus matches, conversas e próximos encontros.'}
          </p>
        </div>
      </section>

      {erro && <Alert mensagem={erro} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Matches encontrados</p>
          <p className="mt-1 font-display text-3xl font-semibold text-slate-900">{matches.length}</p>
          <Link to="/matchmaking" className="mt-2 inline-block text-sm text-porto-600 hover:underline">
            ver todos
          </Link>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">Mensagens não lidas</p>
          <p className="mt-1 font-display text-3xl font-semibold text-slate-900">{naoLidas}</p>
          <Link to="/mensagens" className="mt-2 inline-block text-sm text-porto-600 hover:underline">
            abrir conversas
          </Link>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">Próximos agendamentos</p>
          <p className="mt-1 font-display text-3xl font-semibold text-slate-900">{agendamentos.length}</p>
          <Link to="/agendamentos" className="mt-2 inline-block text-sm text-porto-600 hover:underline">
            ver agenda
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">{isAdmin ? 'Matches do ecossistema' : 'Melhores matches'}</h2>
            <Link to="/matchmaking" className="text-sm text-porto-600 hover:underline">
              ver todos
            </Link>
          </div>

          {matches.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Nenhum match por aqui ainda. Completa seu perfil que a gente faz a conta.
            </p>
          ) : (
            <ul className="space-y-3">
              {matches.map((match) => {
                const outro = user?.role === 'STARTUP' ? match.investor : match.startup;
                const nome =
                  outro && 'companyName' in outro
                    ? (outro.companyName ?? match.investorUser?.name ?? match.startupUser?.name)
                    : undefined;

                return (
                  <li
                    key={match.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{nome ?? 'Perfil do ecossistema'}</p>
                      <p className="truncate text-xs text-slate-500">
                        {match.startup?.sector ?? match.investor?.sectorInterest}
                      </p>
                    </div>
                    <ScoreBadge score={match.score} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {isAdmin ? (
          <section className="card">
            <h2 className="mb-2 font-semibold text-slate-900">Área administrativa</h2>
            <p className="text-sm text-slate-500">
              Como administrador, você acompanha os matches de todo o ecossistema e os registros de auditoria da
              plataforma.
            </p>
            <Link to="/moderacao" className="btn-secondary mt-4 inline-block">
              Abrir moderação
            </Link>
          </section>
        ) : (
          <section className="card">
            <h2 className="mb-4 font-semibold text-slate-900">Meu perfil</h2>

            {!perfil ? (
              <p className="text-sm text-slate-500">
                Seu perfil ainda não foi preenchido.{' '}
                <Link to="/perfil" className="text-porto-600 hover:underline">
                  Completar agora
                </Link>
              </p>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Nome</dt>
                  <dd className="truncate font-medium text-slate-900">
                    {'companyName' in perfil ? perfil.companyName : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">{user?.role === 'STARTUP' ? 'Setor' : 'Setores de interesse'}</dt>
                  <dd className="truncate font-medium text-slate-900">
                    {'sector' in perfil ? perfil.sector : perfil.sectorInterest}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">{user?.role === 'STARTUP' ? 'Estágio' : 'Estágios'}</dt>
                  <dd className="truncate font-medium text-slate-900">
                    {'stage' in perfil ? perfil.stage : perfil.stageInterest}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Local</dt>
                  <dd className="truncate font-medium text-slate-900">
                    {perfil.city ?? '—'}, {perfil.state}
                  </dd>
                </div>
              </dl>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
