import { useCallback, useEffect, useState } from 'react';
import { Alert } from '../components/Alert';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import { auditService } from '../services';
import { extractErrorMessage } from '../services/api';
import type { AuditLog } from '../types';

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function Moderation() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [entidade, setEntidade] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      const { logs: lista, total: quantidade } = await auditService.list({
        ...(entidade ? { entidade } : {}),
        porPagina: 50,
      });

      setLogs(lista);
      setTotal(quantidade);
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, [entidade]);

  useEffect(() => {
    void buscar();
  }, [buscar]);

  async function remover(id: string) {
    try {
      await auditService.remove(id);
      await buscar();
    } catch (e) {
      setErro(extractErrorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Moderação e auditoria</h1>
        <p className="text-sm text-slate-500">
          Tudo que um administrador faz na plataforma fica registrado aqui (RNF10).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="f-entidade" className="label">
            Filtrar por entidade
          </label>
          <select
            id="f-entidade"
            className="input"
            value={entidade}
            onChange={(e) => setEntidade(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="AuditLog">AuditLog</option>
            <option value="StartupProfile">StartupProfile</option>
            <option value="InvestorProfile">InvestorProfile</option>
            <option value="Match">Match</option>
          </select>
        </div>
        <button type="button" onClick={() => void buscar()} className="btn-secondary">
          Atualizar
        </button>
        <span className="text-sm text-slate-500">{total} registro(s)</span>
      </div>

      {erro && <Alert mensagem={erro} />}

      {carregando ? (
        <Spinner texto="Carregando os logs..." />
      ) : logs.length === 0 ? (
        <EmptyState
          titulo="Nenhum log encontrado"
          descricao="Assim que houver ação administrativa, ela aparece nesta lista."
        />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {dataHora(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{log.action}</td>
                  <td className="px-4 py-3 text-slate-600">{log.entity}</td>
                  <td className="px-4 py-3 text-slate-600">{log.user?.name ?? 'anônimo'}</td>
                  <td className="px-4 py-3 text-slate-500">{log.ip ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remover(log.id)}
                      className="text-sm text-rose-600 hover:underline"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}