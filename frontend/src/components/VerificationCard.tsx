import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from './Alert';
import { VerifiedBadge } from './VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { verificationService } from '../services';
import { extractErrorMessage } from '../services/api';
import type { MyVerification } from '../types';

const ROTULO_STATUS: Record<MyVerification['status'], string> = {
  NAO_SOLICITADA: 'Ainda não solicitado',
  PENDENTE: 'Em análise pela administração',
  APROVADA: 'Aprovado',
  RECUSADA: 'Recusado',
};

const CLASSE_STATUS: Record<MyVerification['status'], string> = {
  NAO_SOLICITADA: 'bg-slate-100 text-slate-600 dark:bg-noite-700 dark:text-slate-300',
  PENDENTE: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  APROVADA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
  RECUSADA: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200',
};

function formatarData(valor?: string | null): string {
  if (!valor) {
    return '';
  }

  const data = new Date(valor);

  return Number.isNaN(data.getTime()) ? '' : data.toLocaleDateString('pt-BR');
}

function comProtocolo(valor: string): string | undefined {
  const limpo = valor.trim();

  if (!limpo) {
    return undefined;
  }

  return /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`;
}

export function VerificationCard() {
  const { user } = useAuth();
  const [situacao, setSituacao] = useState<MyVerification | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [avisos, setAvisos] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);

  const [form, setForm] = useState({
    legalName: '',
    document: '',
    website: '',
    linkedin: '',
    pitchUrl: '',
    evidence: '',
    extraLinks: '',
  });

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro('');

    verificationService
      .me()
      .then((dados) => {
        if (ativo) {
          setSituacao(dados);
        }
      })
      .catch((e) => {
        if (ativo) {
          setErro(extractErrorMessage(e));
        }
      })
      .finally(() => {
        if (ativo) {
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    const startup = user?.role === 'STARTUP' ? user.startupProfile : null;
    const investidor = user?.role === 'STARTUP' ? null : user?.investorProfile;

    setForm({
      legalName: startup?.legalName ?? investidor?.companyName ?? '',
      document: '',
      website: startup?.website ?? investidor?.website ?? '',
      linkedin: startup?.linkedin ?? investidor?.linkedin ?? '',
      pitchUrl: startup?.pitchUrl ?? '',
      evidence: '',
      extraLinks: '',
    });
  }, [user?.id, user?.role, user?.startupProfile, user?.investorProfile]);

  function atualizar(campo: keyof typeof form, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setAvisos(null);
    setEnviando(true);

    try {
      const pedido = await verificationService.request({
        legalName: form.legalName || undefined,
        document: form.document || undefined,
        website: comProtocolo(form.website),
        linkedin: comProtocolo(form.linkedin),
        pitchUrl: comProtocolo(form.pitchUrl),
        evidence: form.evidence,
        extraLinks: form.extraLinks || undefined,
      });

      setSituacao({
        verificado: false,
        status: 'PENDENTE',
        podeSolicitar: false,
        solicitacao: pedido,
      });
      setFormAberto(false);
      setAvisos({
        tipo: 'sucesso',
        texto: 'Pedido enviado. A administração analisa as comprovações e responde por aqui.',
      });
    } catch (e) {
      setAvisos({ tipo: 'erro', texto: extractErrorMessage(e) });
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <section className="card max-w-4xl" aria-busy="true" aria-live="polite">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-200 dark:bg-noite-700" />
        <div className="mt-3 h-3 w-full max-w-md animate-pulse rounded bg-slate-100 dark:bg-noite-800" />
      </section>
    );
  }

  if (erro || !situacao) {
    return <Alert mensagem={erro || 'Não foi possível consultar a situação do selo de perfil.'} />;
  }

  const pedido = situacao.solicitacao;
  const verificado = situacao.verificado;

  return (
    <section id="selo" className="card max-w-4xl scroll-mt-24 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Confiança</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-slate-900 dark:text-areia-100">
            Selo de perfil verificado
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            A administração confere documentos e provas de atividade. Perfis verificados ganham até 10 pontos extras nas
            conexões e transmitem mais segurança para o outro lado.
          </p>
        </div>
        <span className={`badge ${CLASSE_STATUS[situacao.status]}`}>{ROTULO_STATUS[situacao.status]}</span>
      </div>

      {avisos ? <Alert tipo={avisos.tipo} mensagem={avisos.texto} /> : null}

      {verificado ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <div className="flex flex-wrap items-center gap-2">
            <VerifiedBadge verifiedAt={situacao.verificadoEm} size="md" />
            {situacao.verificadoEm ? (
              <span className="text-xs text-emerald-800 dark:text-emerald-200">
                desde {formatarData(situacao.verificadoEm)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
            Seu perfil já foi validado. Mantenha os dados atualizados: qualquer mudança relevante pode ser revisada.
          </p>
        </div>
      ) : null}

      {situacao.status === 'PENDENTE' && pedido ? (
        <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            Pedido enviado em {formatarData(pedido.submittedAt)}. Enquanto estiver em análise você não pode abrir outro.
          </p>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            {pedido.legalName ? (
              <div>
                <dt className="font-semibold uppercase tracking-wide text-amber-800/80 dark:text-amber-200/80">
                  Nome jurídico
                </dt>
                <dd className="text-amber-900 dark:text-amber-100">{pedido.legalName}</dd>
              </div>
            ) : null}
            {pedido.document ? (
              <div>
                <dt className="font-semibold uppercase tracking-wide text-amber-800/80 dark:text-amber-200/80">
                  Documento
                </dt>
                <dd className="text-amber-900 dark:text-amber-100">{pedido.document}</dd>
              </div>
            ) : null}
            {pedido.website ? (
              <div>
                <dt className="font-semibold uppercase tracking-wide text-amber-800/80 dark:text-amber-200/80">Site</dt>
                <dd className="break-all text-amber-900 dark:text-amber-100">{pedido.website}</dd>
              </div>
            ) : null}
            {pedido.linkedin ? (
              <div>
                <dt className="font-semibold uppercase tracking-wide text-amber-800/80 dark:text-amber-200/80">
                  LinkedIn
                </dt>
                <dd className="break-all text-amber-900 dark:text-amber-100">{pedido.linkedin}</dd>
              </div>
            ) : null}
          </dl>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/80 dark:text-amber-200/80">
              Comprovações
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-amber-900 dark:text-amber-100">{pedido.evidence}</p>
          </div>
        </div>
      ) : null}

      {situacao.status === 'RECUSADA' && pedido ? (
        <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
          <p className="text-sm text-rose-900 dark:text-rose-100">
            O pedido enviado em {formatarData(pedido.submittedAt)} foi recusado
            {pedido.reviewedAt ? ` em ${formatarData(pedido.reviewedAt)}` : ''}.
          </p>
          {pedido.reviewNote ? (
            <p className="text-sm text-rose-900/90 dark:text-rose-100/90">
              <span className="font-semibold">Motivo: </span>
              {pedido.reviewNote}
            </p>
          ) : null}
          <p className="text-xs text-rose-800/80 dark:text-rose-200/80">
            Você pode corrigir as informações e enviar um novo pedido com mais provas.
          </p>
        </div>
      ) : null}

      {!verificado && situacao.podeSolicitar ? (
        formAberto ? (
          <form onSubmit={enviar} className="space-y-4 border-t border-slate-100 pt-4 dark:border-noite-700">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="v-legal" className="label">
                  Nome jurídico ou razão social
                </label>
                <input
                  id="v-legal"
                  className="input"
                  value={form.legalName}
                  onChange={(e) => atualizar('legalName', e.target.value)}
                  placeholder="Ex.: Maré Tecnologia LTDA"
                />
              </div>
              <div>
                <label htmlFor="v-doc" className="label">
                  CNPJ ou documento
                </label>
                <input
                  id="v-doc"
                  className="input"
                  value={form.document}
                  onChange={(e) => atualizar('document', e.target.value)}
                  placeholder="Ex.: 12.345.678/0001-90"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Fica cifrado e visível apenas para a administração.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="v-site" className="label">
                  Site oficial
                </label>
                <input
                  id="v-site"
                  className="input"
                  inputMode="url"
                  placeholder="https://"
                  value={form.website}
                  onChange={(e) => atualizar('website', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="v-linkedin" className="label">
                  LinkedIn
                </label>
                <input
                  id="v-linkedin"
                  className="input"
                  inputMode="url"
                  placeholder="https://linkedin.com/..."
                  value={form.linkedin}
                  onChange={(e) => atualizar('linkedin', e.target.value)}
                />
              </div>
            </div>

            {user?.role === 'STARTUP' ? (
              <div>
                <label htmlFor="v-pitch" className="label">
                  Pitch deck ou vídeo
                </label>
                <input
                  id="v-pitch"
                  className="input"
                  inputMode="url"
                  placeholder="https://"
                  value={form.pitchUrl}
                  onChange={(e) => atualizar('pitchUrl', e.target.value)}
                />
              </div>
            ) : null}

            <div>
              <label htmlFor="v-evidence" className="label">
                Comprovações <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="v-evidence"
                className="input min-h-[120px]"
                value={form.evidence}
                onChange={(e) => atualizar('evidence', e.target.value)}
                minLength={40}
                maxLength={4000}
                required
                placeholder="Conte o que comprova sua atuação: resultados, contratos, clientes, investimentos, participação em programas, prêmios, matérias na imprensa..."
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Mínimo de 40 caracteres. Quanto mais concreto, mais rápida a análise.
              </p>
            </div>

            <div>
              <label htmlFor="v-links" className="label">
                Links adicionais de comprovação
              </label>
              <textarea
                id="v-links"
                className="input min-h-[80px]"
                value={form.extraLinks}
                onChange={(e) => atualizar('extraLinks', e.target.value)}
                placeholder="Matérias, contratos públicos, portfólio, perfis em aceleradoras..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="btn-primary" disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar para análise'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setFormAberto(false)} disabled={enviando}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-noite-700">
            <p className="text-sm text-slate-500 dark:text-slate-300">
              {situacao.status === 'RECUSADA'
                ? 'Envie um novo pedido com as correções e mais comprovações.'
                : 'Envie documentos e provas de atividade para receber o selo.'}
            </p>
            <button type="button" className="btn-primary" onClick={() => setFormAberto(true)}>
              Solicitar verificação
            </button>
          </div>
        )
      ) : null}
    </section>
  );
}
