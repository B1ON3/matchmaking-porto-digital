import { useCallback, useEffect, useState } from 'react';
import { Alert } from '../../components/Alert';
import { EmptyState } from '../../components/EmptyState';
import { SectionHeader } from '../../components/SectionHeader';
import { Spinner } from '../../components/Spinner';
import { auditService } from '../../services';
import { extractErrorMessage } from '../../services/api';
import type { AuditLog } from '../../types';
import { Pagination } from './Pagination';
import { dataHora, formatarDetalhes } from './shared';

const POR_PAGINA = 20;

const ENTIDADES = ['User', 'StartupProfile', 'InvestorProfile', 'Profile', 'Metrics', 'AuditLog', 'Match'];

function TabelaDeAuditoria({ logs, onRemover }: { logs: AuditLog[]; onRemover: (id: string) => void }) {
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-noite-700 dark:bg-noite-850 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Ação</th>
            <th className="px-4 py-3">Entidade · alvo</th>
            <th className="px-4 py-3">Ator</th>
            <th className="px-4 py-3">Detalhes</th>
            <th className="px-4 py-3 text-right" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-noite-700">
          {logs.map((log) => {
            const detalhes = formatarDetalhes(log.details);

            return (
              <tr key={log.id}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                  {dataHora(log.createdAt)}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-areia-100">{log.action}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  <p>{log.entity}</p>
                  <p className="max-w-[10rem] truncate text-xs text-slate-400" title={log.entityId ?? undefined}>
                    {log.entityId ?? '—'}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {log.user?.name ?? 'Sistema'}
                  {log.user?.email ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500">{log.user.email}</p>
                  ) : null}
                </td>
                <td
                  className="max-w-[20rem] truncate px-4 py-3 text-xs text-slate-500 dark:text-slate-400"
                  title={detalhes}
                >
                  {detalhes}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onRemover(log.id)}
                    className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-300"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [entidade, setEntidade] = useState('');
  const [acao, setAcao] = useState('');
  const [acaoAplicada, setAcaoAplicada] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      const dados = await auditService.list({
        ...(entidade ? { entidade } : {}),
        ...(acaoAplicada ? { acao: acaoAplicada } : {}),
        pagina,
        porPagina: POR_PAGINA,
      });

      setLogs(dados.logs);
      setTotal(dados.total);
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, [entidade, acaoAplicada, pagina]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function remover(id: string) {
    if (!window.confirm('Remover este registro de auditoria? A ação não pode ser desfeita.')) {
      return;
    }

    try {
      await auditService.remove(id);
      await carregar();
    } catch (e) {
      setErro(extractErrorMessage(e));
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Auditoria"
        description="Atores, alvos, motivos e datas de cada ação administrativa, em ordem cronológica."
      />

      <div className="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label htmlFor="filtro-entidade" className="label">
            Entidade
          </label>
          <select
            id="filtro-entidade"
            className="input"
            value={entidade}
            onChange={(evento) => {
              setEntidade(evento.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todas</option>
            {ENTIDADES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="filtro-acao" className="label">
            Ação
          </label>
          <input
            id="filtro-acao"
            type="search"
            className="input"
            placeholder="Ex.: STATUS_USUARIO_ALTERADO"
            value={acao}
            onChange={(evento) => setAcao(evento.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setPagina(1);
            setAcaoAplicada(acao.trim());
          }}
        >
          Filtrar
        </button>
        <button type="button" className="btn-secondary" onClick={() => void carregar()}>
          Atualizar
        </button>
      </div>

      {erro && <Alert mensagem={erro} />}

      {carregando ? (
        <Spinner texto="Carregando a trilha de auditoria..." />
      ) : logs.length === 0 ? (
        <EmptyState
          titulo="Nenhum registro encontrado"
          descricao="Ajuste os filtros ou execute uma ação de moderação para gerar trilha."
        />
      ) : (
        <>
          <TabelaDeAuditoria logs={logs} onRemover={(id) => void remover(id)} />
          <Pagination
            total={total}
            pagina={pagina}
            totalPaginas={totalPaginas}
            singular="registro"
            plural="registros"
            onAnterior={() => setPagina((valor) => Math.max(1, valor - 1))}
            onProxima={() => setPagina((valor) => Math.min(totalPaginas, valor + 1))}
          />
        </>
      )}
    </section>
  );
}
