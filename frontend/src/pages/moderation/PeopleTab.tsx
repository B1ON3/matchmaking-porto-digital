import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/Alert';
import { EmptyState } from '../../components/EmptyState';
import { SectionHeader } from '../../components/SectionHeader';
import { Spinner } from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services';
import { extractErrorMessage } from '../../services/api';
import type { AdminUser, TrustStatus, UserRole, UserStatus } from '../../types';
import { Pagination } from './Pagination';
import { CLASSE_STATUS, dataHora, perfilDoUsuario, ROTULO_PAPEL, ROTULO_STATUS } from './shared';

const POR_PAGINA = 12;

const ROTULO_CONFIANCA: Record<TrustStatus, string> = {
  NAO_AVALIADO: 'Não avaliado',
  CONFIAVEL: 'Confiável',
  SUSPEITO: 'Suspeito',
  GOLPE: 'Golpe confirmado',
};

const CLASSE_CONFIANCA: Record<TrustStatus, string> = {
  NAO_AVALIADO: 'bg-slate-100 text-slate-600 dark:bg-noite-700 dark:text-slate-300',
  CONFIAVEL: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  SUSPEITO: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  GOLPE: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

interface TabelaDePessoasProps {
  usuarios: AdminUser[];
  usuarioAtualId?: string;
}

function TabelaDePessoas({ usuarios, usuarioAtualId }: TabelaDePessoasProps) {
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-noite-700 dark:bg-noite-850 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3">Pessoa</th>
            <th className="px-4 py-3">Papel</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Reputação</th>
            <th className="px-4 py-3">Último acesso</th>
            <th className="px-4 py-3">Perfil público</th>
            <th className="px-4 py-3 text-right">Moderação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-noite-700">
          {usuarios.map((usuario) => {
            const perfil = perfilDoUsuario(usuario);
            const ehVoce = usuario.id === usuarioAtualId;

            return (
              <tr key={usuario.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900 dark:text-areia-100">
                    {usuario.name}
                    {ehVoce ? <span className="ml-2 text-xs text-laco-700 dark:text-laco-300">(você)</span> : null}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{usuario.email}</p>
                  {usuario.moderationReason && usuario.status === 'SUSPENSO' ? (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">Motivo: {usuario.moderationReason}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{ROTULO_PAPEL[usuario.role]}</td>
                <td className="px-4 py-3">
                  <span className={CLASSE_STATUS[usuario.status]}>{ROTULO_STATUS[usuario.status]}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${CLASSE_CONFIANCA[usuario.trustStatus]}`}>
                    {ROTULO_CONFIANCA[usuario.trustStatus]}
                  </span>
                  {usuario.trustReason ? (
                    <p className="mt-1 max-w-[14rem] text-xs text-slate-500 dark:text-slate-400">
                      {usuario.trustReason}
                    </p>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                  {dataHora(usuario.lastLoginAt)}
                </td>
                <td className="px-4 py-3">
                  {perfil ? (
                    <div>
                      <p className="max-w-[12rem] truncate text-slate-700 dark:text-slate-200">{perfil.nome}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {perfil.oculto ? 'Oculto nas listagens' : 'Visível nas listagens'}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Sem perfil</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to="/chamados"
                    className="text-xs font-semibold text-laco-700 hover:underline dark:text-laco-300"
                    title="Suspensões, ocultações e reputação só são aplicadas a partir de um chamado"
                  >
                    Ver chamados
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PeopleTab() {
  const { user: usuarioAtual } = useAuth();
  const [usuarios, setUsuarios] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'' | UserStatus>('');
  const [papelFiltro, setPapelFiltro] = useState<'' | UserRole>('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      const dados = await adminService.listUsers({
        ...(buscaAplicada ? { busca: buscaAplicada } : {}),
        ...(statusFiltro ? { status: statusFiltro } : {}),
        ...(papelFiltro ? { papel: papelFiltro } : {}),
        pagina,
        porPagina: POR_PAGINA,
      });

      setUsuarios(dados.users);
      setTotal(dados.total);
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, [buscaAplicada, statusFiltro, papelFiltro, pagina]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function aplicarBusca(evento: FormEvent) {
    evento.preventDefault();
    setPagina(1);
    setBuscaAplicada(busca.trim());
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Pessoas"
        description="Consulta de contas e reputação. Suspensões, ocultações e validação de golpe só acontecem dentro de um chamado."
      />

      <Alert
        tipo="info"
        mensagem="Para moderar alguém, abra o chamado correspondente. O acesso às conexões e reuniões da pessoa denunciada fica registrado na auditoria."
      />

      <form onSubmit={aplicarBusca} className="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="busca-pessoas" className="label">
            Buscar por nome ou e-mail
          </label>
          <input
            id="busca-pessoas"
            type="search"
            className="input"
            placeholder="Ex.: ana, investidor@porto.digital"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
        </div>
        <div>
          <label htmlFor="filtro-status" className="label">
            Status
          </label>
          <select
            id="filtro-status"
            className="input"
            value={statusFiltro}
            onChange={(evento) => {
              setStatusFiltro(evento.target.value as '' | UserStatus);
              setPagina(1);
            }}
          >
            <option value="">Todos</option>
            <option value="ATIVO">Ativo</option>
            <option value="SUSPENSO">Suspenso</option>
            <option value="EXCLUIDO">Excluído</option>
          </select>
        </div>
        <div>
          <label htmlFor="filtro-papel" className="label">
            Papel
          </label>
          <select
            id="filtro-papel"
            className="input"
            value={papelFiltro}
            onChange={(evento) => {
              setPapelFiltro(evento.target.value as '' | UserRole);
              setPagina(1);
            }}
          >
            <option value="">Todos</option>
            <option value="STARTUP">Startup</option>
            <option value="INVESTOR">Investidor</option>
            <option value="MENTOR">Mentor</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Buscar
        </button>
      </form>

      {erro && <Alert mensagem={erro} />}

      {carregando ? (
        <Spinner texto="Carregando pessoas..." />
      ) : usuarios.length === 0 ? (
        <EmptyState
          titulo="Nenhuma pessoa encontrada"
          descricao="Ajuste a busca ou os filtros para ver outras contas."
        />
      ) : (
        <>
          <TabelaDePessoas usuarios={usuarios} usuarioAtualId={usuarioAtual?.id} />
          <Pagination
            total={total}
            pagina={pagina}
            totalPaginas={totalPaginas}
            singular="pessoa"
            plural="pessoas"
            onAnterior={() => setPagina((valor) => Math.max(1, valor - 1))}
            onProxima={() => setPagina((valor) => Math.min(totalPaginas, valor + 1))}
          />
        </>
      )}
    </section>
  );
}
