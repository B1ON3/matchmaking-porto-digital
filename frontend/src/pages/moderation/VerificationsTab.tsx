import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert } from '../../components/Alert';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { SectionHeader } from '../../components/SectionHeader';
import { Spinner } from '../../components/Spinner';
import { verificationService } from '../../services';
import { extractErrorMessage } from '../../services/api';
import type { AdminVerification, VerificationStatus } from '../../types';
import { Pagination } from './Pagination';
import { dataHora, ROTULO_PAPEL } from './shared';

const POR_PAGINA = 10;

type StatusPedido = Exclude<VerificationStatus, 'NAO_SOLICITADA'>;
type FiltroStatus = '' | StatusPedido;

const ROTULO_PEDIDO: Record<StatusPedido, string> = {
  PENDENTE: 'Em análise',
  APROVADA: 'Aprovado',
  RECUSADA: 'Recusado',
};

const CLASSE_PEDIDO: Record<StatusPedido, string> = {
  PENDENTE: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  APROVADA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
  RECUSADA: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200',
};

function linkSeguro(valor?: string | null): string | null {
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
    return '—';
  }

  const data = new Date(valor);

  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('pt-BR');
}

function DetalhePedido({ pedido }: { pedido: AdminVerification }) {
  const perfil = pedido.usuario.startup ?? pedido.usuario.investidor;
  const links = [
    { rotulo: 'Site', valor: pedido.website },
    { rotulo: 'LinkedIn', valor: pedido.linkedin },
    { rotulo: 'Pitch', valor: pedido.pitchUrl },
  ].filter((item) => item.valor);

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-2xl border border-slate-200 p-4 dark:border-noite-700">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900 dark:text-areia-100">{pedido.usuario.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{pedido.usuario.email}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {ROTULO_PAPEL[pedido.usuario.role]} · conta desde {formatarData(pedido.usuario.criadoEm)}
            </p>
          </div>
          <span className={`badge ${CLASSE_PEDIDO[pedido.status]}`}>{ROTULO_PEDIDO[pedido.status]}</span>
        </div>

        {perfil ? (
          <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
            <p>
              <span className="font-semibold">Perfil: </span>
              {perfil.companyName || 'Sem nome público'}
            </p>
            <p>
              <span className="font-semibold">Setor: </span>
              {'sector' in perfil ? perfil.sector : perfil.sectorInterest}
            </p>
            <p>
              <span className="font-semibold">Local: </span>
              {[perfil.city, perfil.state].filter(Boolean).join(', ') || 'Não informado'}
            </p>
            <p>
              <span className="font-semibold">Visibilidade: </span>
              {perfil.hiddenAt ? 'Perfil oculto' : 'Perfil visível'}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">Usuário sem perfil de startup ou investidor.</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-noite-900/60">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Nome jurídico
          </p>
          <p className="mt-1 text-slate-800 dark:text-areia-100">{pedido.legalName || 'Não informado'}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-noite-900/60">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Documento (cifrado)
          </p>
          <p className="mt-1 text-slate-800 dark:text-areia-100">{pedido.document || 'Não informado'}</p>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Comprovações enviadas
        </p>
        <p className="mt-1 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-slate-700 dark:bg-noite-900/60 dark:text-slate-200">
          {pedido.evidence}
        </p>
      </div>

      {pedido.extraLinks ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Links adicionais
          </p>
          <p className="mt-1 whitespace-pre-line break-all text-slate-700 dark:text-slate-200">{pedido.extraLinks}</p>
        </div>
      ) : null}

      {links.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {links.map((item) => {
            const url = linkSeguro(item.valor);

            return url ? (
              <a key={item.rotulo} className="link" href={url} target="_blank" rel="noreferrer">
                {item.rotulo}
              </a>
            ) : null;
          })}
        </div>
      ) : null}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Enviado em {dataHora(pedido.submittedAt)}
        {pedido.reviewedAt ? ` · decidido em ${dataHora(pedido.reviewedAt)}` : ''}
        {pedido.revisadoPor ? ` por ${pedido.revisadoPor.name}` : ''}
      </p>

      {pedido.reviewNote ? (
        <p className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600 dark:border-noite-700 dark:text-slate-300">
          <span className="font-semibold">Decisão registrada: </span>
          {pedido.reviewNote}
        </p>
      ) : null}
    </div>
  );
}

export function VerificationsTab() {
  const [status, setStatus] = useState<FiltroStatus>('PENDENTE');
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [pagina, setPagina] = useState(1);
  const [pedidos, setPedidos] = useState<AdminVerification[]>([]);
  const [total, setTotal] = useState(0);
  const [contadores, setContadores] = useState({ pendentes: 0, aprovadas: 0, recusadas: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [selecionado, setSelecionado] = useState<AdminVerification | null>(null);
  const [detalhe, setDetalhe] = useState<AdminVerification | null>(null);
  const [detalheErro, setDetalheErro] = useState('');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      const dados = await verificationService.listAdmin({
        ...(status ? { status } : {}),
        ...(buscaAplicada ? { busca: buscaAplicada } : {}),
        pagina,
        porPagina: POR_PAGINA,
      });

      setPedidos(dados.pedidos);
      setTotal(dados.total);
      setContadores(dados.contadores);
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, [status, buscaAplicada, pagina]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!selecionado) {
      return;
    }

    let ativo = true;
    setDetalhe(null);
    setDetalheErro('');

    verificationService
      .getAdmin(selecionado.id)
      .then((dados) => {
        if (ativo) {
          setDetalhe(dados);
        }
      })
      .catch((e) => {
        if (ativo) {
          setDetalheErro(extractErrorMessage(e));
        }
      });

    return () => {
      ativo = false;
    };
  }, [selecionado]);

  function aplicarBusca(evento: FormEvent) {
    evento.preventDefault();
    setPagina(1);
    setBuscaAplicada(busca.trim());
  }

  function abrir(pedido: AdminVerification) {
    setSelecionado(pedido);
    setMotivo('');
    setAviso('');
  }

  function fechar() {
    setSelecionado(null);
    setDetalhe(null);
    setMotivo('');
    setDetalheErro('');
  }

  async function decidir(decisao: 'APROVAR' | 'RECUSAR') {
    if (!selecionado) {
      return;
    }

    if (motivo.trim().length < 10) {
      setDetalheErro('Explique a decisão com pelo menos 10 caracteres.');
      return;
    }

    setSalvando(true);
    setDetalheErro('');

    try {
      await verificationService.decide(selecionado.id, decisao, motivo.trim());
      fechar();
      setAviso(
        decisao === 'APROVAR'
          ? 'Selo aprovado. O perfil passa a valer mais nos matches e o usuário vê o selo na página de perfil.'
          : 'Pedido recusado. O usuário vê o motivo e pode enviar novas comprovações.',
      );
      await carregar();
    } catch (e) {
      setDetalheErro(extractErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pedidoAberto = detalhe ?? selecionado;

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Selos de perfil"
        description="Pedidos de verificação enviados pelas pessoas. Aprovar concede o selo e aumenta o peso do perfil nas conexões."
      />

      {aviso ? <Alert tipo="sucesso" mensagem={aviso} /> : null}
      {erro ? <Alert mensagem={erro} /> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-noite-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">Em análise</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-areia-100">{contadores.pendentes}</p>
        </div>
        <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-noite-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">Aprovados</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-areia-100">{contadores.aprovadas}</p>
        </div>
        <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-noite-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">Recusados</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-areia-100">{contadores.recusadas}</p>
        </div>
      </div>

      <form onSubmit={aplicarBusca} className="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="busca-validacoes" className="label">
            Buscar por nome ou e-mail
          </label>
          <input
            id="busca-validacoes"
            type="search"
            className="input"
            placeholder="Ex.: ana, startup@porto.digital"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
        </div>
        <div>
          <label htmlFor="filtro-validacoes" className="label">
            Situação
          </label>
          <select
            id="filtro-validacoes"
            className="input"
            value={status}
            onChange={(evento) => {
              setStatus(evento.target.value as FiltroStatus);
              setPagina(1);
            }}
          >
            <option value="">Todos</option>
            <option value="PENDENTE">Em análise</option>
            <option value="APROVADA">Aprovados</option>
            <option value="RECUSADA">Recusados</option>
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Buscar
        </button>
      </form>

      {carregando ? (
        <Spinner texto="Carregando pedidos de verificação..." />
      ) : pedidos.length === 0 ? (
        <EmptyState
          titulo="Nenhum pedido por aqui"
          descricao="Quando alguém enviar comprovações pela página de perfil, o pedido aparece nesta aba."
        />
      ) : (
        <>
          <ul className="space-y-3">
            {pedidos.map((pedido) => (
              <li key={pedido.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900 dark:text-areia-100">
                    {pedido.usuario.name}
                    <span className={`badge ${CLASSE_PEDIDO[pedido.status]}`}>{ROTULO_PEDIDO[pedido.status]}</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {pedido.usuario.email} · {ROTULO_PAPEL[pedido.usuario.role]} · enviado em{' '}
                    {dataHora(pedido.submittedAt)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{pedido.evidence}</p>
                </div>
                <button type="button" className="btn-secondary shrink-0" onClick={() => abrir(pedido)}>
                  {pedido.status === 'PENDENTE' ? 'Analisar' : 'Ver detalhes'}
                </button>
              </li>
            ))}
          </ul>

          <Pagination
            total={total}
            pagina={pagina}
            totalPaginas={totalPaginas}
            singular="pedido"
            plural="pedidos"
            onAnterior={() => setPagina((valor) => Math.max(1, valor - 1))}
            onProxima={() => setPagina((valor) => Math.min(totalPaginas, valor + 1))}
          />
        </>
      )}

      <Modal
        open={Boolean(selecionado)}
        onClose={fechar}
        title="Pedido de verificação"
        size="xl"
        footer={
          pedidoAberto?.status === 'PENDENTE' ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="motivo-validacao" className="label">
                  Motivo da decisão <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="motivo-validacao"
                  className="input min-h-[80px]"
                  value={motivo}
                  onChange={(evento) => setMotivo(evento.target.value)}
                  placeholder="Explique o que foi conferido ou o que faltou nas comprovações."
                  maxLength={600}
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Mínimo de 10 caracteres. O motivo é registrado na auditoria e enviado ao usuário.
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => decidir('RECUSAR')} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Recusar'}
                </button>
                <button type="button" className="btn-primary" onClick={() => decidir('APROVAR')} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Aprovar e conceder selo'}
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {detalheErro ? <Alert mensagem={detalheErro} /> : null}
        {pedidoAberto ? <DetalhePedido pedido={pedidoAberto} /> : <Spinner texto="Carregando pedido..." />}
      </Modal>
    </section>
  );
}
