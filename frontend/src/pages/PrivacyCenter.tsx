import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Modal } from '../components/Modal';
import { SectionHeader } from '../components/SectionHeader';
import { Spinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { privacyService } from '../services';
import { extractErrorMessage } from '../services/api';
import type { ConsentStatus, ConsentType, PrivacyOverview } from '../types';

const TIPOS: Record<ConsentType, { titulo: string; descricao: string; obrigatorio: boolean }> = {
  TERMOS_USO: {
    titulo: 'Termos de uso',
    descricao: 'Regras de convivência, veracidade das informações e limites do serviço.',
    obrigatorio: true,
  },
  DADOS_PESSOAIS: {
    titulo: 'Tratamento de dados',
    descricao: 'Uso dos dados de conta, perfil e conexões para operar o matchmaking.',
    obrigatorio: true,
  },
  COMUNICACOES: {
    titulo: 'Comunicações',
    descricao: 'Avisos de produto, novidades e convites. Este consentimento é opcional.',
    obrigatorio: false,
  },
};

const ROTULO_STATUS: Record<ConsentStatus, string> = {
  CONCEDIDO: 'Ativo',
  REVOGADO: 'Revogado',
};

const formatarDataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const formatarData = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

function classeStatus(status: ConsentStatus) {
  return status === 'CONCEDIDO'
    ? 'badge bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    : 'badge bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
}

export function PrivacyCenter() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [dados, setDados] = useState<PrivacyOverview | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [processando, setProcessando] = useState<ConsentType | 'export' | null>(null);
  const [exclusaoAberta, setExclusaoAberta] = useState(false);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erroExclusao, setErroExclusao] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      setDados(await privacyService.overview());
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const atuais = useMemo(() => new Map(dados?.consents.map((item) => [item.type, item]) ?? []), [dados]);

  async function alterarConsentimento(type: ConsentType, granted: boolean) {
    setProcessando(type);
    setErro('');
    setAviso('');

    try {
      const resposta = await privacyService.recordConsent(type, granted);
      setAviso(resposta.mensagem);
      await carregar();
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setProcessando(null);
    }
  }

  async function exportar() {
    setProcessando('export');
    setErro('');
    setAviso('');

    try {
      const { blob, filename } = await privacyService.exportData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setAviso('Exportação gerada em JSON. O arquivo foi baixado neste dispositivo.');
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setProcessando(null);
    }
  }

  async function excluirConta() {
    setExcluindo(true);
    setErroExclusao('');

    try {
      const resposta = await privacyService.deleteAccount(senha, confirmacao.trim());
      sessionStorage.setItem('laco:aviso', resposta.mensagem);
      logout();
      navigate('/login', { replace: true });
    } catch (e) {
      setErroExclusao(extractErrorMessage(e));
    } finally {
      setExcluindo(false);
    }
  }

  if (carregando && !dados) {
    return <Spinner texto="Reunindo seus consentimentos..." />;
  }

  if (!dados) {
    return (
      <div className="space-y-4">
        <Alert mensagem={erro || 'Não foi possível abrir a central de privacidade.'} />
        <button type="button" onClick={() => void carregar()} className="btn-secondary">
          Tentar novamente
        </button>
      </div>
    );
  }

  const ativos = dados.consents.filter((item) => item.status === 'CONCEDIDO').length;
  const comunicacoes = atuais.get('COMUNICACOES');
  const comunicacoesAtivas = comunicacoes?.status === 'CONCEDIDO';

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Privacidade</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-slate-900">Sua privacidade, em um só lugar</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Consulte recibos, revogue comunicações, baixe seus dados ou encerre a conta. Nenhuma escolha vem
            pré-marcada.
          </p>
        </div>
        <Link to="/privacidade" className="btn-secondary shrink-0">
          Ler política vigente
        </Link>
      </div>

      {erro && <Alert mensagem={erro} />}
      {aviso && <Alert tipo="sucesso" mensagem={aviso} />}

      <section className="relative overflow-hidden rounded-3xl border border-laco-200 bg-laco-950 px-6 py-7 text-areia-100 shadow-laco">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-porto-500/20 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[1.5fr_1fr] md:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-areia-200/60">
              Versão vigente · {dados.policy.version}
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-areia-50">Recibo com data, versão e origem</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-areia-200/75">
              Cada aceite ou revogação vira uma linha no histórico. O hash SHA-256 identifica exatamente o texto que
              você aceitou, mesmo depois de uma atualização.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs">
            <div>
              <dt className="text-areia-200/55">Vigência</dt>
              <dd className="mt-1 font-semibold text-areia-50">{formatarData(dados.policy.effectiveAt)}</dd>
            </div>
            <div>
              <dt className="text-areia-200/55">Consentimentos ativos</dt>
              <dd className="mt-1 font-semibold text-areia-50">
                {ativos} de {dados.consents.length}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-areia-200/55">Hash da política</dt>
              <dd className="mt-1 break-all font-mono text-[10px] leading-relaxed text-areia-200/80">
                {dados.policy.hash}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Consentimentos"
          title="O que você autorizou"
          description="Termos e dados são condições da conta. Comunicações podem ser revogadas sem perder o acesso."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {(Object.keys(TIPOS) as ConsentType[]).map((type) => {
            const definicao = TIPOS[type];
            const registro = atuais.get(type);
            const status: ConsentStatus = registro?.status ?? 'REVOGADO';
            const desatualizado = registro ? registro.version !== dados.policy.version : true;
            const ocupado = processando === type;

            return (
              <article key={type} className="card flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-laco-50 font-display text-sm font-semibold text-laco-800 dark:bg-laco-900/50 dark:text-laco-200"
                    >
                      {type === 'TERMOS_USO' ? 'TU' : type === 'DADOS_PESSOAIS' ? 'DP' : 'CO'}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{definicao.titulo}</h3>
                      <p className="text-[11px] text-slate-500">
                        {definicao.obrigatorio ? 'Condição da conta' : 'Opcional'}
                      </p>
                    </div>
                  </div>
                  <span className={classeStatus(status)}>{ROTULO_STATUS[status]}</span>
                </div>

                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{definicao.descricao}</p>

                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <p>
                    Versão do recibo: <strong className="text-slate-700">{registro?.version ?? 'sem recibo'}</strong>
                  </p>
                  <p>
                    {registro
                      ? `${registro.revokedAt ? 'Revogado' : 'Aceito'} em ${formatarDataHora(registro.revokedAt ?? registro.acceptedAt)}`
                      : 'Nenhum registro para este tipo.'}
                  </p>
                  {desatualizado && registro ? (
                    <p className="font-medium text-amber-700 dark:text-amber-300">Existe uma versão mais recente.</p>
                  ) : null}
                </div>

                <div className="mt-4">
                  {definicao.obrigatorio ? (
                    desatualizado ? (
                      <button
                        type="button"
                        className="btn-primary w-full"
                        disabled={ocupado}
                        onClick={() => void alterarConsentimento(type, true)}
                      >
                        {ocupado ? 'Registrando...' : `Reaceitar versão ${dados.policy.version}`}
                      </button>
                    ) : (
                      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                        Recibo válido para a versão vigente
                      </p>
                    )
                  ) : (
                    <button
                      type="button"
                      className={comunicacoesAtivas ? 'btn-secondary w-full' : 'btn-primary w-full'}
                      disabled={ocupado}
                      onClick={() => void alterarConsentimento(type, !comunicacoesAtivas)}
                    >
                      {ocupado ? 'Atualizando...' : comunicacoesAtivas ? 'Revogar comunicações' : 'Ativar comunicações'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="meus-dados" className="scroll-mt-24 space-y-3">
        <SectionHeader
          title="Meus dados"
          description="Resumo do que está armazenado na plataforma. O download completo fica logo abaixo."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { rotulo: 'Mensagens', valor: dados.dataSummary.messages },
            { rotulo: 'Conexões', valor: dados.dataSummary.matches },
            { rotulo: 'Reuniões', valor: dados.dataSummary.appointments },
            { rotulo: 'Eventos de auditoria', valor: dados.dataSummary.auditEvents },
          ].map((item) => (
            <div key={item.rotulo} className="card">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.rotulo}</p>
              <p className="mt-1 font-display text-3xl font-semibold text-slate-900">{item.valor}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden p-0">
        <div className="flex flex-col gap-1 border-b border-slate-200/80 px-5 py-4 dark:border-noite-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-900">Histórico de recibos</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              O histórico não é apagado quando você revoga um consentimento.
            </p>
          </div>
          <span className="text-xs text-slate-500">{dados.history.length} registro(s)</span>
        </div>

        {dados.history.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Nenhum recibo encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-noite-850">
                <tr>
                  <th className="px-4 py-3">Quando</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Versão</th>
                  <th className="px-4 py-3">Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dados.history.map((registro) => (
                  <tr key={registro.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {formatarDataHora(registro.revokedAt ?? registro.acceptedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{TIPOS[registro.type].titulo}</td>
                    <td className="px-4 py-3">
                      <span className={classeStatus(registro.granted ? 'CONCEDIDO' : 'REVOGADO')}>
                        {registro.granted ? 'Aceite' : 'Revogação'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{registro.policyVersion}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <span title={registro.userAgent ?? undefined}>{registro.ip ?? 'não informado'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <p className="eyebrow">Portabilidade</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-slate-900">Leve seus dados com você</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Baixe um JSON com conta, perfis, projetos, conexões, mensagens, reuniões, auditoria e recibos. O arquivo é
            gerado só para o seu usuário e não inclui senha nem token.
          </p>
          <button
            type="button"
            className="btn-secondary mt-4"
            disabled={processando === 'export'}
            onClick={() => void exportar()}
          >
            {processando === 'export' ? 'Gerando arquivo...' : 'Baixar meus dados (JSON)'}
          </button>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 dark:border-rose-900/60 dark:bg-rose-950/20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-700 dark:text-rose-300">
            Zona de exclusão
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-slate-900">Encerrar minha conta</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Removemos ou anonimizamos perfil, conexões, mensagens e reuniões. Recibos e auditoria permanecem sem vínculo
            direto com você. Esta ação não pode ser desfeita.
          </p>
          <button type="button" className="btn-danger mt-4" onClick={() => setExclusaoAberta(true)}>
            Quero excluir minha conta
          </button>
        </div>
      </section>

      <Modal
        open={exclusaoAberta}
        onClose={() => {
          if (!excluindo) {
            setExclusaoAberta(false);
            setErroExclusao('');
          }
        }}
        title="Confirmar exclusão da conta"
        size="md"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={excluindo}
              onClick={() => {
                setExclusaoAberta(false);
                setErroExclusao('');
              }}
            >
              Manter minha conta
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={excluindo || !senha || confirmacao.trim() !== 'EXCLUIR'}
              onClick={() => void excluirConta()}
            >
              {excluindo ? 'Excluindo...' : 'Excluir definitivamente'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Alert
            tipo="erro"
            mensagem="A exclusão encerra o acesso imediatamente. Baixe sua portabilidade antes de continuar."
          />
          {erroExclusao && <Alert mensagem={erroExclusao} />}

          <div>
            <label htmlFor="senha-exclusao" className="label">
              Senha atual
            </label>
            <input
              id="senha-exclusao"
              type="password"
              className="input"
              autoComplete="current-password"
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
            />
          </div>

          <div>
            <label htmlFor="confirmacao-exclusao" className="label">
              Digite <span className="font-mono font-bold">EXCLUIR</span> para confirmar
            </label>
            <input
              id="confirmacao-exclusao"
              className="input font-mono uppercase"
              value={confirmacao}
              onChange={(evento) => setConfirmacao(evento.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
