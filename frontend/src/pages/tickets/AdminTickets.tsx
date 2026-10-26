import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/Alert';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { Skeleton } from '../../components/Skeleton';
import { StatCard } from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { useUnread } from '../../context/UnreadContext';
import { ticketService } from '../../services';
import { extractErrorMessage } from '../../services/api';
import type {
  AdminTicketsPage,
  Ticket,
  TicketActionType,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../types';
import { TicketConversation } from './TicketConversation';
import {
  CLASSE_CONFIANCA,
  CLASSE_PRIORIDADE,
  CLASSE_STATUS_CHAMADO,
  dataHora,
  descricaoCurta,
  ROTULO_ACAO,
  ROTULO_CATEGORIA,
  ROTULO_CONFIANCA,
  ROTULO_PRIORIDADE,
  ROTULO_STATUS_CHAMADO,
} from './shared';

const POR_PAGINA = 20;

const CATEGORIAS: TicketCategory[] = [
  'GOLPE',
  'PERFIL_FALSO',
  'ASSEDIO',
  'SPAM',
  'DADOS_INCORRETOS',
  'SUPORTE',
  'OUTRO',
];

const PRIORIDADES: TicketPriority[] = ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'];
const STATUS: TicketStatus[] = ['ABERTO', 'EM_ANALISE', 'AGUARDANDO_USUARIO', 'RESOLVIDO', 'ARQUIVADO'];

const ACOES_POR_STATUS: Record<TicketStatus, string> = {
  ABERTO: 'Chamado aberto e aguardando triagem.',
  EM_ANALISE: 'A administração está analisando o caso.',
  AGUARDANDO_USUARIO: 'A administração pediu mais informações a quem abriu o chamado.',
  RESOLVIDO: 'Caso resolvido. O histórico permanece disponível.',
  ARQUIVADO: 'Chamado encerrado sem novas mensagens.',
};

function acoesDisponiveis(detalhe: Ticket): { acao: TicketActionType; label: string; perigo?: boolean }[] {
  const alvo = detalhe.targetUser;
  const confianca = alvo?.trustStatus ?? 'NAO_AVALIADO';
  const perfil = detalhe.contexto?.alvo.startupProfile ?? detalhe.contexto?.alvo.investorProfile ?? null;
  const oculto = Boolean(perfil?.hiddenAt);
  const lista: { acao: TicketActionType; label: string; perigo?: boolean }[] = [
    { acao: 'OBSERVACAO', label: 'Registrar observação' },
  ];

  if (!alvo) {
    return lista;
  }

  if (alvo.status === 'SUSPENSO') {
    lista.push({ acao: 'USUARIO_REATIVADO', label: 'Reativar conta' });
  } else {
    lista.push({ acao: 'USUARIO_SUSPENSO', label: 'Suspender conta', perigo: true });
  }

  if (perfil) {
    lista.push(
      oculto
        ? { acao: 'PERFIL_RESTAURADO', label: 'Restaurar perfil nas listagens' }
        : { acao: 'PERFIL_OCULTADO', label: 'Ocultar perfil das listagens', perigo: true },
    );
  }

  if (confianca !== 'GOLPE') {
    lista.push({ acao: 'GOLPE_CONFIRMADO', label: 'Confirmar golpe', perigo: true });
  }

  if (confianca === 'SUSPEITO') {
    lista.push({ acao: 'SUSPEITA_REMOVIDA', label: 'Remover marcação de suspeita' });
  } else if (confianca !== 'GOLPE') {
    lista.push({ acao: 'SUSPEITA_MARCADA', label: 'Marcar como suspeito' });
  }

  if (confianca === 'GOLPE' || confianca === 'SUSPEITO') {
    lista.push({ acao: 'GOLPE_DESCARTADO', label: 'Descartar denúncia e validar perfil' });
  }

  return lista;
}

export function AdminTickets() {
  const { user } = useAuth();
  const { refresh: refreshUnread } = useUnread();
  const [dados, setDados] = useState<AdminTicketsPage | null>(null);
  const [pagina, setPagina] = useState(1);
  const [status, setStatus] = useState<'' | TicketStatus>('');
  const [categoria, setCategoria] = useState<'' | TicketCategory>('');
  const [prioridade, setPrioridade] = useState<'' | TicketPriority>('');
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [detalhe, setDetalhe] = useState<Ticket | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [acaoSelecionada, setAcaoSelecionada] = useState<{ acao: TicketActionType; label: string } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [erroAcao, setErroAcao] = useState('');
  const [executandoAcao, setExecutandoAcao] = useState(false);
  const [statusAberto, setStatusAberto] = useState(false);
  const [novoStatus, setNovoStatus] = useState<TicketStatus>('EM_ANALISE');
  const [resolucao, setResolucao] = useState('');
  const [erroStatus, setErroStatus] = useState('');
  const [salvandoStatus, setSalvandoStatus] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      const resposta = await ticketService.listAdmin({
        pagina,
        porPagina: POR_PAGINA,
        ...(status ? { status } : {}),
        ...(categoria ? { categoria } : {}),
        ...(prioridade ? { prioridade } : {}),
        ...(buscaAplicada ? { busca: buscaAplicada } : {}),
      });

      setDados(resposta);
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, [pagina, status, categoria, prioridade, buscaAplicada]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function abrirChamado(id: string) {
    setCarregandoDetalhe(true);
    setErroDetalhe('');
    setAviso('');
    setDetalhe(null);

    try {
      setDetalhe(await ticketService.getAdmin(id));
      await Promise.all([carregar(), refreshUnread()]);
    } catch (e) {
      setErroDetalhe(extractErrorMessage(e));
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  async function enviarMensagem(conteudo: string) {
    if (!detalhe) {
      return;
    }

    setEnviando(true);
    setErroDetalhe('');

    try {
      const mensagem = await ticketService.sendAdminMessage(detalhe.id, conteudo);
      setDetalhe((atual) => (atual ? { ...atual, messages: [...atual.messages, mensagem] } : atual));
      await carregar();
    } catch (e) {
      setErroDetalhe(extractErrorMessage(e));
      throw e;
    } finally {
      setEnviando(false);
    }
  }

  function abrirAcao(acao: TicketActionType, label: string) {
    setAcaoSelecionada({ acao, label });
    setMotivo('');
    setObservacao('');
    setErroAcao('');
  }

  async function executarAcao(evento: FormEvent) {
    evento.preventDefault();

    if (!detalhe || !acaoSelecionada || motivo.trim().length < 5) {
      return;
    }

    setExecutandoAcao(true);
    setErroAcao('');

    try {
      const atualizado = await ticketService.executeAction(detalhe.id, {
        acao: acaoSelecionada.acao,
        motivo: motivo.trim(),
        ...(observacao.trim() ? { observacao: observacao.trim() } : {}),
      });

      setDetalhe(atualizado);
      setAcaoSelecionada(null);
      setAviso(`${acaoSelecionada.label} registrado. A ação e o responsável estão na trilha do chamado.`);
      await carregar();
    } catch (e) {
      setErroAcao(extractErrorMessage(e));
    } finally {
      setExecutandoAcao(false);
    }
  }

  function abrirStatus() {
    if (!detalhe) {
      return;
    }

    setNovoStatus(detalhe.status);
    setResolucao(detalhe.resolution ?? '');
    setErroStatus('');
    setStatusAberto(true);
  }

  async function salvarStatus(evento: FormEvent) {
    evento.preventDefault();

    if (!detalhe) {
      return;
    }

    setSalvandoStatus(true);
    setErroStatus('');

    try {
      const atualizado = await ticketService.updateStatus(detalhe.id, novoStatus, resolucao.trim() || undefined);

      setDetalhe(atualizado);
      setStatusAberto(false);
      setAviso('Status do chamado atualizado.');
      await carregar();
    } catch (e) {
      setErroStatus(extractErrorMessage(e));
    } finally {
      setSalvandoStatus(false);
    }
  }

  function aplicarBusca(evento: FormEvent) {
    evento.preventDefault();
    setPagina(1);
    setBuscaAplicada(busca.trim());
  }

  const totalPaginas = Math.max(1, Math.ceil((dados?.total ?? 0) / POR_PAGINA));
  const resumo = dados?.resumo;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Help desk</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-slate-900 dark:text-areia-100">Chamados</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            A administração só acessa conexões e reuniões de uma pessoa quando existe uma denúncia aberta. Cada acesso
            fica registrado.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => void carregar()}>
          Atualizar
        </button>
      </div>

      {erro && <Alert mensagem={erro} />}
      {aviso && <Alert tipo="sucesso" mensagem={aviso} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Abertos" value={resumo?.abertos ?? 0} hint="aguardando triagem" />
        <StatCard label="Em análise" value={resumo?.emAnalise ?? 0} hint="com a equipe" accent="barro" />
        <StatCard label="Aguardando usuário" value={resumo?.aguardandoUsuario ?? 0} hint="resposta pendente" />
        <StatCard label="Resolvidos" value={resumo?.resolvidos ?? 0} hint="histórico" accent="porto" />
        <StatCard label="Arquivados" value={resumo?.arquivados ?? 0} hint="sem novas mensagens" accent="areia" />
      </div>

      <form
        onSubmit={aplicarBusca}
        className="card grid gap-3 lg:grid-cols-[1fr_repeat(3,minmax(0,11rem))_auto] lg:items-end"
      >
        <div>
          <label htmlFor="busca-chamados" className="label">
            Buscar
          </label>
          <input
            id="busca-chamados"
            type="search"
            className="input"
            placeholder="Protocolo, assunto ou pessoa"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
        </div>
        <div>
          <label htmlFor="filtro-status-chamados" className="label">
            Status
          </label>
          <select
            id="filtro-status-chamados"
            className="input"
            value={status}
            onChange={(evento) => {
              setStatus(evento.target.value as '' | TicketStatus);
              setPagina(1);
            }}
          >
            <option value="">Todos</option>
            {STATUS.map((item) => (
              <option key={item} value={item}>
                {ROTULO_STATUS_CHAMADO[item]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filtro-categoria-chamados" className="label">
            Categoria
          </label>
          <select
            id="filtro-categoria-chamados"
            className="input"
            value={categoria}
            onChange={(evento) => {
              setCategoria(evento.target.value as '' | TicketCategory);
              setPagina(1);
            }}
          >
            <option value="">Todas</option>
            {CATEGORIAS.map((item) => (
              <option key={item} value={item}>
                {ROTULO_CATEGORIA[item]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filtro-prioridade-chamados" className="label">
            Prioridade
          </label>
          <select
            id="filtro-prioridade-chamados"
            className="input"
            value={prioridade}
            onChange={(evento) => {
              setPrioridade(evento.target.value as '' | TicketPriority);
              setPagina(1);
            }}
          >
            <option value="">Todas</option>
            {PRIORIDADES.map((item) => (
              <option key={item} value={item}>
                {ROTULO_PRIORIDADE[item]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Buscar
        </button>
      </form>

      {carregando && !dados ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : !dados || dados.chamados.length === 0 ? (
        <EmptyState
          titulo="Nenhum chamado neste filtro"
          descricao="Quando uma startup, investidor ou mentor abrir uma denúncia, ela aparece aqui."
        />
      ) : (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-noite-700 dark:bg-noite-850 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Chamado</th>
                  <th className="px-4 py-3">Quem abriu</th>
                  <th className="px-4 py-3">Denunciado</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Prioridade</th>
                  <th className="px-4 py-3">Atualizado</th>
                  <th className="px-4 py-3 text-right">Abrir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-noite-700">
                {dados.chamados.map((chamado) => (
                  <tr key={chamado.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-mono text-[11px] font-semibold text-slate-500">{chamado.protocol}</p>
                      <p className="mt-1 max-w-[18rem] truncate font-medium text-slate-900 dark:text-areia-100">
                        {chamado.subject}
                      </p>
                      <p className="mt-1 max-w-[18rem] truncate text-xs text-slate-500 dark:text-slate-400">
                        {ROTULO_CATEGORIA[chamado.category]} · {descricaoCurta(chamado.description, 80)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700 dark:text-slate-200">{chamado.reporter?.name ?? '—'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{chamado.reporter?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {chamado.targetUser ? (
                        <>
                          <p className="text-slate-700 dark:text-slate-200">{chamado.targetUser.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {ROTULO_CONFIANCA[chamado.targetUser.trustStatus]}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">Sem alvo</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${CLASSE_STATUS_CHAMADO[chamado.status]}`}>
                        {ROTULO_STATUS_CHAMADO[chamado.status]}
                      </span>
                      {chamado.naoLidas ? (
                        <p className="mt-1 text-xs font-semibold text-barro-700 dark:text-barro-300">
                          {chamado.naoLidas} nova(s)
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${CLASSE_PRIORIDADE[chamado.priority]}`}>
                        {ROTULO_PRIORIDADE[chamado.priority]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {dataHora(chamado.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="text-xs font-semibold text-laco-700 hover:underline dark:text-laco-300"
                        onClick={() => void abrirChamado(chamado.id)}
                      >
                        Analisar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span>
              {dados.total} chamado(s) · página {pagina} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary px-3 py-1.5"
                disabled={pagina <= 1}
                onClick={() => setPagina((valor) => Math.max(1, valor - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn-secondary px-3 py-1.5"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((valor) => Math.min(totalPaginas, valor + 1))}
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={Boolean(detalhe) || carregandoDetalhe}
        onClose={() => {
          if (!enviando && !executandoAcao) {
            setDetalhe(null);
            setErroDetalhe('');
          }
        }}
        title={detalhe ? `${detalhe.protocol} · ${detalhe.subject}` : 'Abrindo chamado'}
        size="xl"
      >
        {carregandoDetalhe ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-20" />
            <Skeleton className="h-48" />
          </div>
        ) : detalhe ? (
          <div className="space-y-5">
            {erroDetalhe && <Alert mensagem={erroDetalhe} />}

            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${CLASSE_STATUS_CHAMADO[detalhe.status]}`}>
                {ROTULO_STATUS_CHAMADO[detalhe.status]}
              </span>
              <span className={`badge ${CLASSE_PRIORIDADE[detalhe.priority]}`}>
                {ROTULO_PRIORIDADE[detalhe.priority]}
              </span>
              <span className="badge bg-slate-100 text-slate-600 dark:bg-noite-700 dark:text-slate-300">
                {ROTULO_CATEGORIA[detalhe.category]}
              </span>
              <button type="button" className="btn-secondary ml-auto px-3 py-1.5 text-xs" onClick={abrirStatus}>
                Atualizar status
              </button>
            </div>

            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-noite-900/60 dark:text-slate-300">
              {ACOES_POR_STATUS[detalhe.status]}
            </p>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-noite-700">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Relato de {detalhe.reporter.name}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">
                  {detalhe.description}
                </p>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {detalhe.reporter.email} · aberto em {dataHora(detalhe.createdAt)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-noite-700">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Pessoa denunciada
                </p>
                {detalhe.targetUser ? (
                  <>
                    <p className="mt-2 font-semibold text-slate-900 dark:text-areia-100">{detalhe.targetUser.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {detalhe.targetUser.email} · {ROTULO_CATEGORIA[detalhe.category]}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`badge ${CLASSE_CONFIANCA[detalhe.targetUser.trustStatus]}`}>
                        {ROTULO_CONFIANCA[detalhe.targetUser.trustStatus]}
                      </span>
                      <span
                        className={`badge ${
                          detalhe.targetUser.status === 'ATIVO'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                        }`}
                      >
                        {detalhe.targetUser.status === 'ATIVO' ? 'Conta ativa' : 'Conta suspensa'}
                      </span>
                    </div>
                    {detalhe.targetUser.trustReason ? (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                        Motivo da reputação: {detalhe.targetUser.trustReason}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Este chamado é de suporte e não aponta para uma pessoa.
                  </p>
                )}
              </div>
            </div>

            {detalhe.targetUser ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">
                      Contexto autorizado pela denúncia
                    </p>
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      Conexões e reuniões da pessoa denunciada. Este acesso fica na auditoria.
                    </p>
                  </div>
                  <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    {detalhe.contexto?.matches.length ?? 0} conexões · {detalhe.contexto?.appointments.length ?? 0}{' '}
                    reuniões
                  </span>
                </div>

                {detalhe.contexto ? (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-areia-100">Conexões recentes</p>
                      {detalhe.contexto.matches.length === 0 ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Nenhuma conexão registrada.</p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {detalhe.contexto.matches.slice(0, 6).map((match) => (
                            <li
                              key={match.id}
                              className="rounded-xl border border-amber-200/80 bg-white px-3 py-2 text-xs dark:border-amber-900/60 dark:bg-noite-900/60"
                            >
                              <p className="font-medium text-slate-800 dark:text-slate-100">
                                {match.startup} × {match.investor}
                              </p>
                              <p className="text-slate-500 dark:text-slate-400">
                                {match.score}% · {match.status} · {dataHora(match.createdAt)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-areia-100">Reuniões recentes</p>
                      {detalhe.contexto.appointments.length === 0 ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Nenhuma reunião registrada.</p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {detalhe.contexto.appointments.slice(0, 6).map((agendamento) => (
                            <li
                              key={agendamento.id}
                              className="rounded-xl border border-amber-200/80 bg-white px-3 py-2 text-xs dark:border-amber-900/60 dark:bg-noite-900/60"
                            >
                              <p className="font-medium text-slate-800 dark:text-slate-100">{agendamento.title}</p>
                              <p className="text-slate-500 dark:text-slate-400">
                                {dataHora(agendamento.scheduledAt)} · {agendamento.status} · criado por{' '}
                                {agendamento.createdBy}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Não foi possível carregar o contexto desta pessoa.
                  </p>
                )}
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-noite-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-areia-100">Ações administrativas</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Toda ação exige motivo e entra na trilha do chamado.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {acoesDisponiveis(detalhe).map((item) => (
                  <button
                    key={item.acao}
                    type="button"
                    className={item.perigo ? 'btn-danger px-3 py-1.5 text-xs' : 'btn-secondary px-3 py-1.5 text-xs'}
                    onClick={() => abrirAcao(item.acao, item.label)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {detalhe.actions && detalhe.actions.length > 0 ? (
                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3 dark:border-noite-700">
                  {detalhe.actions.map((acao) => (
                    <li key={acao.id} className="text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">{ROTULO_ACAO[acao.action]}</span> · {acao.admin.name} ·{' '}
                      {dataHora(acao.createdAt)}
                      {acao.notes ? <p className="mt-0.5 text-slate-500 dark:text-slate-400">{acao.notes}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <div className="flex h-[46vh] min-h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-noite-700">
              <TicketConversation
                messages={detalhe.messages}
                currentUserId={user?.id}
                enviando={enviando}
                disabled={detalhe.status === 'ARQUIVADO'}
                disabledMessage="Chamado arquivado. Reabra o status se ainda for necessário conversar."
                onSend={enviarMensagem}
              />
            </div>
          </div>
        ) : (
          <Alert mensagem={erroDetalhe || 'Não foi possível abrir o chamado.'} />
        )}
      </Modal>

      <Modal
        open={Boolean(acaoSelecionada)}
        onClose={() => {
          if (!executandoAcao) {
            setAcaoSelecionada(null);
          }
        }}
        title={acaoSelecionada?.label ?? 'Ação administrativa'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setAcaoSelecionada(null)}
              disabled={executandoAcao}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-acao-chamado"
              className="btn-primary"
              disabled={executandoAcao || motivo.trim().length < 5}
            >
              {executandoAcao ? 'Aplicando...' : 'Confirmar ação'}
            </button>
          </div>
        }
      >
        <form id="form-acao-chamado" onSubmit={executarAcao} className="space-y-4">
          {erroAcao && <Alert mensagem={erroAcao} />}

          <div>
            <label htmlFor="motivo-acao" className="label">
              Motivo (obrigatório)
            </label>
            <textarea
              id="motivo-acao"
              className="input min-h-[100px]"
              maxLength={500}
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              placeholder="Explique a decisão. O motivo fica registrado na auditoria."
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{motivo.trim().length}/500</p>
          </div>

          <div>
            <label htmlFor="observacao-acao" className="label">
              Observação interna (opcional)
            </label>
            <textarea
              id="observacao-acao"
              className="input min-h-[70px]"
              maxLength={1000}
              value={observacao}
              onChange={(evento) => setObservacao(evento.target.value)}
              placeholder="Contexto adicional para a equipe."
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={statusAberto}
        onClose={() => {
          if (!salvandoStatus) {
            setStatusAberto(false);
          }
        }}
        title="Atualizar status do chamado"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStatusAberto(false)}
              disabled={salvandoStatus}
            >
              Cancelar
            </button>
            <button type="submit" form="form-status-chamado" className="btn-primary" disabled={salvandoStatus}>
              {salvandoStatus ? 'Salvando...' : 'Salvar status'}
            </button>
          </div>
        }
      >
        <form id="form-status-chamado" onSubmit={salvarStatus} className="space-y-4">
          {erroStatus && <Alert mensagem={erroStatus} />}

          <div>
            <label htmlFor="novo-status-chamado" className="label">
              Status
            </label>
            <select
              id="novo-status-chamado"
              className="input"
              value={novoStatus}
              onChange={(evento) => setNovoStatus(evento.target.value as TicketStatus)}
            >
              {STATUS.map((item) => (
                <option key={item} value={item}>
                  {ROTULO_STATUS_CHAMADO[item]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="resolucao-chamado" className="label">
              Resolução ou resposta final
            </label>
            <textarea
              id="resolucao-chamado"
              className="input min-h-[100px]"
              maxLength={1000}
              value={resolucao}
              onChange={(evento) => setResolucao(evento.target.value)}
              placeholder="O que foi decidido e qual orientação fica para quem abriu o chamado."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
