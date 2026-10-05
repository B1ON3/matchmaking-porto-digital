import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';
import { EmptyState } from '../components/EmptyState';
import { ScoreBadge } from '../components/ScoreBadge';
import { Spinner } from '../components/Spinner';
import { matchService } from '../services';
import { extractErrorMessage } from '../services/api';
import type { Match } from '../types';

const MINIMOS = [0, 40, 60, 70];

export function Matchmaking() {
  const { user } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [minimo, setMinimo] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [recalculando, setRecalculando] = useState(false);

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      const { matches: lista } = await matchService.list({ minimo, porPagina: 20 });
      setMatches(lista);
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, [minimo]);

  useEffect(() => {
    void buscar();
  }, [buscar]);

  async function recalcular() {
    const startupId = user?.startupProfile?.id;

    if (!startupId) {
      setErro('Só dá pra recalcular se você tiver um perfil de startup.');
      return;
    }

    setRecalculando(true);
    setErro('');

    try {
      await matchService.regenerate(startupId);
      await buscar();
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setRecalculando(false);
    }
  }

  async function responder(matchId: string, status: 'ACEITO' | 'RECUSADO') {
    try {
      await matchService.updateStatus(matchId, status);
      await buscar();
    } catch (e) {
      setErro(extractErrorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Matchmaking</h1>
          <p className="text-sm text-slate-500">
            Perfis ordenados por afinidade de setor, estágio, faixa de investimento e região.
          </p>
        </div>

        {user?.role === 'STARTUP' && (
          <button
            type="button"
            onClick={recalcular}
            className="btn-secondary"
            disabled={recalculando}
          >
            {recalculando ? 'Recalculando...' : 'Recalcular matches'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Pontuação mínima:</span>
        {MINIMOS.map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => setMinimo(valor)}
            className={minimo === valor ? 'btn-primary' : 'btn-secondary'}
          >
            {valor === 0 ? 'Todos' : `${valor}%`}
          </button>
        ))}
      </div>

      {erro && <Alert mensagem={erro} />}

      {carregando ? (
        <Spinner texto="Calculando afinidades..." />
      ) : matches.length === 0 ? (
        <EmptyState
          titulo="Nenhum match com esse filtro"
          descricao="Tenta baixar a pontuação mínima ou completa melhor o seu perfil."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {matches.map((match) => {
            ehPerfilDoUsuario(match);

            const ehStartupVendo = user?.role === 'STARTUP';
            const perfil = ehStartupVendo ? match.investor : match.startup;

            const nomeContato = ehStartupVendo
              ? match.investorUser?.name
              : match.startupUser?.name;

            const titulo =
              perfil && 'companyName' in perfil && perfil.companyName
                ? perfil.companyName
                : nomeContato ?? 'Perfil do ecossistema';

            const subtitulo =
              perfil && 'sector' in perfil
                ? `${perfil.sector} · ${perfil.stage}`
                : perfil && 'sectorInterest' in perfil
                  ? `Interesse: ${perfil.sectorInterest}`
                  : '';

            return (
              <li key={match.id} className="card flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-slate-900">{titulo}</h2>
                    {subtitulo && <p className="truncate text-sm text-slate-500">{subtitulo}</p>}
                  </div>
                  <ScoreBadge score={match.score} />
                </div>

                {match.reason && (
                  <p className="text-sm text-slate-600">{match.reason}</p>
                )}

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="badge bg-slate-100 text-slate-600">{match.status}</span>

                  {match.status === 'PENDENTE' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => responder(match.id, 'RECUSADO')}
                        className="btn-secondary"
                      >
                        Recusar
                      </button>
                      <button
                        type="button"
                        onClick={() => responder(match.id, 'ACEITO')}
                        className="btn-primary"
                      >
                        Conectar
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ehPerfilDoUsuario(match: Match) {
  return Boolean(match.startup || match.investor);
}