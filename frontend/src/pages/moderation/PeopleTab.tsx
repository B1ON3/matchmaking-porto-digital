import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/Alert';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { SectionHeader } from '../../components/SectionHeader';
import { Spinner } from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services';
import { extractErrorMessage } from '../../services/api';
import type { AdminUser, UserRole, UserStatus } from '../../types';
import { Pagination } from './Pagination';
import { CLASSE_STATUS, dataHora, perfilDoUsuario, ROTULO_PAPEL, ROTULO_STATUS } from './shared';

type AcaoModeracao = 'suspender' | 'reativar' | 'ocultar' | 'restaurar';

const POR_PAGINA = 12;

const TITULO_ACAO: Record<AcaoModeracao, string> = {
  suspender: 'Suspender conta',
  reativar: 'Reativar conta',
  ocultar: 'Ocultar perfil das listagens',
  restaurar: 'Restaurar perfil nas listagens',
};

const ROTULO_CONFIRMAR: Record<AcaoModeracao, string> = {
  suspender: 'Suspender conta',
  reativar: 'Reativar acesso',
  ocultar: 'Ocultar perfil',
  restaurar: 'Restaurar perfil',
};

function descricaoAcao(acao: AcaoModeracao, nome: string): string {
  if (acao === 'suspender') {
    return `A conta de ${nome} perde o acesso imediatamente. Reativar depois devolve o acesso.`;
  }

  if (acao === 'reativar') {
    return `A conta de ${nome} volta a autenticar e usar as rotas privadas.`;
  }

  if (acao === 'ocultar') {
    return `O perfil público de ${nome} deixa de aparecer nas listagens de startups e investidores.`;
  }

  return `O perfil público de ${nome} volta a aparecer nas listagens.`;
}

interface TabelaDePessoasProps {
  usuarios: AdminUser[];
  usuarioAtualId?: string;
  onAcao: (usuario: AdminUser, acao: AcaoModeracao) => void;
}

function TabelaDePessoas({ usuarios, usuarioAtualId, onAcao }: TabelaDePessoasProps) {
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-noite-700 dark:bg-noite-850 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3">Pessoa</th>
            <th className="px-4 py-3">Papel</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Último acesso</th>
            <th className="px-4 py-3">Perfil público</th>
            <th className="px-4 py-3 text-right">Ações</th>
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
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {usuario.status === 'ATIVO' ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-300"
                        disabled={ehVoce}
                        title={ehVoce ? 'Você não pode suspender a própria conta' : undefined}
                        onClick={() => onAcao(usuario, 'suspender')}
                      >
                        Suspender
                      </button>
                    ) : null}

                    {usuario.status === 'SUSPENSO' ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                        onClick={() => onAcao(usuario, 'reativar')}
                      >
                        Reativar
                      </button>
                    ) : null}

                    {perfil ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-laco-700 hover:underline dark:text-laco-300"
                        onClick={() => onAcao(usuario, perfil.oculto ? 'restaurar' : 'ocultar')}
                      >
                        {perfil.oculto ? 'Restaurar perfil' : 'Ocultar perfil'}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface DialogoModeracaoProps {
  alvo: AdminUser | null;
  acao: AcaoModeracao | null;
  motivo: string;
  erro: string;
  processando: boolean;
  onMotivo: (valor: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function DialogoModeracao({
  alvo,
  acao,
  motivo,
  erro,
  processando,
  onMotivo,
  onClose,
  onConfirm,
}: DialogoModeracaoProps) {
  return (
    <Modal
      open={Boolean(alvo && acao)}
      onClose={onClose}
      title={acao ? TITULO_ACAO[acao] : 'Moderação'}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={processando}>
            Cancelar
          </button>
          <button
            type="button"
            className={acao === 'suspender' || acao === 'ocultar' ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={processando || motivo.trim().length < 5}
          >
            {processando ? 'Aplicando...' : acao ? ROTULO_CONFIRMAR[acao] : 'Confirmar'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {acao && alvo ? descricaoAcao(acao, alvo.name) : ''}
        </p>

        <div>
          <label htmlFor="motivo-moderacao" className="label">
            Motivo (obrigatório)
          </label>
          <textarea
            id="motivo-moderacao"
            className="input min-h-[96px] resize-y"
            value={motivo}
            maxLength={300}
            onChange={(evento) => onMotivo(evento.target.value)}
            placeholder="Descreva o motivo. Ele será gravado na auditoria."
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {motivo.trim().length}/300 caracteres · o motivo e o ator ficam registrados na auditoria.
          </p>
        </div>

        {erro && <Alert mensagem={erro} />}
      </div>
    </Modal>
  );
}

export function PeopleTab({ onAviso }: { onAviso: (mensagem: string) => void }) {
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
  const [alvo, setAlvo] = useState<AdminUser | null>(null);
  const [acao, setAcao] = useState<AcaoModeracao | null>(null);
  const [motivo, setMotivo] = useState('');
  const [erroModal, setErroModal] = useState('');
  const [processando, setProcessando] = useState(false);

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

  function abrirAcao(usuario: AdminUser, tipo: AcaoModeracao) {
    setAlvo(usuario);
    setAcao(tipo);
    setMotivo('');
    setErroModal('');
    onAviso('');
  }

  function fecharModal() {
    if (processando) {
      return;
    }

    setAlvo(null);
    setAcao(null);
    setMotivo('');
    setErroModal('');
  }

  async function executarAcao() {
    if (!alvo || !acao) {
      return;
    }

    if (motivo.trim().length < 5) {
      setErroModal('Informe um motivo com pelo menos 5 caracteres. Ele fica registrado na auditoria.');
      return;
    }

    const perfil = perfilDoUsuario(alvo);

    if ((acao === 'ocultar' || acao === 'restaurar') && !perfil) {
      setErroModal('Este usuário não tem perfil público para ocultar.');
      return;
    }

    setProcessando(true);
    setErroModal('');

    try {
      if (acao === 'suspender') {
        await adminService.updateUserStatus(alvo.id, 'SUSPENSO', motivo.trim());
        onAviso(`Conta de ${alvo.name} suspensa. O acesso foi bloqueado e a ação está na auditoria.`);
      } else if (acao === 'reativar') {
        await adminService.updateUserStatus(alvo.id, 'ATIVO', motivo.trim());
        onAviso(`Conta de ${alvo.name} reativada. O acesso foi restabelecido.`);
      } else if (perfil && acao === 'ocultar') {
        await adminService.hideProfile(perfil.id, motivo.trim());
        onAviso(`Perfil ${perfil.nome} oculto das listagens públicas.`);
      } else if (perfil && acao === 'restaurar') {
        await adminService.restoreProfile(perfil.id, motivo.trim());
        onAviso(`Perfil ${perfil.nome} restaurado nas listagens públicas.`);
      }

      setAlvo(null);
      setAcao(null);
      setMotivo('');
      await carregar();
    } catch (e) {
      setErroModal(extractErrorMessage(e));
    } finally {
      setProcessando(false);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Pessoas"
        description="Busque contas, suspenda acessos e oculte perfis das listagens públicas."
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
          <TabelaDePessoas usuarios={usuarios} usuarioAtualId={usuarioAtual?.id} onAcao={abrirAcao} />
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

      <DialogoModeracao
        alvo={alvo}
        acao={acao}
        motivo={motivo}
        erro={erroModal}
        processando={processando}
        onMotivo={setMotivo}
        onClose={fecharModal}
        onConfirm={() => void executarAcao()}
      />
    </section>
  );
}
