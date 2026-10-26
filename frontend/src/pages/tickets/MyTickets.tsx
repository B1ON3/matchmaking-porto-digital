import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from '../../components/Alert';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { ReportModal } from '../../components/ReportModal';
import { SectionHeader } from '../../components/SectionHeader';
import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useUnread } from '../../context/UnreadContext';
import { ticketService } from '../../services';
import { extractErrorMessage } from '../../services/api';
import type { Ticket, TicketStatus, TicketSummary } from '../../types';
import { TicketConversation } from './TicketConversation';
import {
  CLASSE_PRIORIDADE,
  CLASSE_STATUS_CHAMADO,
  dataHora,
  descricaoCurta,
  ROTULO_CATEGORIA,
  ROTULO_PRIORIDADE,
  ROTULO_STATUS_CHAMADO,
} from './shared';

const FILTROS: { id: '' | TicketStatus; label: string }[] = [
  { id: '', label: 'Todos' },
  { id: 'ABERTO', label: 'Abertos' },
  { id: 'EM_ANALISE', label: 'Em análise' },
  { id: 'AGUARDANDO_USUARIO', label: 'Aguardando você' },
  { id: 'RESOLVIDO', label: 'Resolvidos' },
];

export function MyTickets() {
  const { user } = useAuth();
  const { refresh: refreshUnread } = useUnread();
  const [chamados, setChamados] = useState<TicketSummary[]>([]);
  const [filtro, setFiltro] = useState<'' | TicketStatus>('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [novoAberto, setNovoAberto] = useState(false);
  const [detalhe, setDetalhe] = useState<Ticket | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      setChamados(await ticketService.listMine());
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(
    () => (filtro ? chamados.filter((chamado) => chamado.status === filtro) : chamados),
    [chamados, filtro],
  );

  async function abrirChamado(id: string) {
    setCarregandoDetalhe(true);
    setErroDetalhe('');
    setDetalhe(null);

    try {
      const completo = await ticketService.get(id);
      setDetalhe(completo);
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
      const mensagem = await ticketService.sendMessage(detalhe.id, conteudo);
      setDetalhe((atual) => (atual ? { ...atual, messages: [...atual.messages, mensagem] } : atual));
      await Promise.all([carregar(), refreshUnread()]);
    } catch (e) {
      setErroDetalhe(extractErrorMessage(e));
    } finally {
      setEnviando(false);
    }
  }

  function aoCriar(ticket: Ticket) {
    setChamados((atual) => [ticket, ...atual]);
    setDetalhe(ticket);
    void refreshUnread();
  }

  if (carregando && chamados.length === 0) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Apoio e segurança</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-slate-900 dark:text-areia-100">Chamados</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Denúncias e pedidos de suporte ficam registrados com protocolo. A conversa acontece só entre você e a
            administração.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setNovoAberto(true)}>
          Abrir chamado
        </button>
      </div>

      {erro && <Alert mensagem={erro} />}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader title="Seus chamados" description={`${chamados.length} registro(s) no total.`} />
          <div>
            <label htmlFor="filtro-chamados" className="sr-only">
              Filtrar chamados
            </label>
            <select
              id="filtro-chamados"
              className="input py-2"
              value={filtro}
              onChange={(evento) => setFiltro(evento.target.value as '' | TicketStatus)}
            >
              {FILTROS.map((item) => (
                <option key={item.id || 'todos'} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtrados.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              titulo="Nenhum chamado neste filtro"
              descricao="Abra um chamado para falar com a administração sobre uma conexão ou sobre a plataforma."
            >
              <button type="button" className="btn-secondary" onClick={() => setNovoAberto(true)}>
                Abrir chamado
              </button>
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {filtrados.map((chamado) => (
              <li key={chamado.id}>
                <button
                  type="button"
                  onClick={() => void abrirChamado(chamado.id)}
                  className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-laco-300 hover:bg-laco-50/30 dark:border-noite-700 dark:hover:border-laco-700 dark:hover:bg-laco-950/20"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {chamado.protocol}
                      </p>
                      <p className="mt-1 truncate font-semibold text-slate-900 dark:text-areia-100">
                        {chamado.subject}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {ROTULO_CATEGORIA[chamado.category]} · Atualizado em {dataHora(chamado.updatedAt)}
                        {chamado.targetUser ? ` · Sobre ${chamado.targetUser.name}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {chamado.naoLidas ? (
                        <span className="badge bg-barro-100 text-barro-800 dark:bg-barro-900/40 dark:text-barro-200">
                          {chamado.naoLidas} nova(s)
                        </span>
                      ) : null}
                      <span className={`badge ${CLASSE_STATUS_CHAMADO[chamado.status]}`}>
                        {ROTULO_STATUS_CHAMADO[chamado.status]}
                      </span>
                      <span className={`badge ${CLASSE_PRIORIDADE[chamado.priority]}`}>
                        {ROTULO_PRIORIDADE[chamado.priority]}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {descricaoCurta(chamado.description)}
                  </p>
                  {chamado.messages[0] ? (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Última mensagem de {chamado.messages[0].sender.name}:{' '}
                      {descricaoCurta(chamado.messages[0].content, 90)}
                    </p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={Boolean(detalhe) || carregandoDetalhe}
        onClose={() => {
          if (!enviando) {
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
          <div className="space-y-4">
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
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-noite-700 dark:bg-noite-900/60">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Relato original
              </p>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">
                {detalhe.description}
              </p>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Aberto em {dataHora(detalhe.createdAt)}
                {detalhe.targetUser ? ` · Pessoa denunciada: ${detalhe.targetUser.name}` : ''}
              </p>
            </div>

            {detalhe.resolution ? (
              <Alert tipo="sucesso" mensagem={`Resolução da administração: ${detalhe.resolution}`} />
            ) : null}

            <div className="flex h-[46vh] min-h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-noite-700">
              <TicketConversation
                messages={detalhe.messages}
                currentUserId={user?.id}
                enviando={enviando}
                disabled={detalhe.status === 'ARQUIVADO'}
                disabledMessage="Este chamado foi arquivado. Abra um novo chamado se ainda precisar de ajuda."
                onSend={enviarMensagem}
              />
            </div>
          </div>
        ) : (
          <Alert mensagem={erroDetalhe || 'Não foi possível abrir o chamado.'} />
        )}
      </Modal>

      <ReportModal open={novoAberto} onClose={() => setNovoAberto(false)} onCreated={aoCriar} />
    </div>
  );
}
