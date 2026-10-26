import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';
import { AuthLayout } from '../components/AuthLayout';
import { privacyService } from '../services';
import { extractErrorMessage } from '../services/api';
import type { PrivacyPolicy } from '../types';

type Tipo = 'STARTUP' | 'INVESTOR';

export function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();

  const [tipo, setTipo] = useState<Tipo>('STARTUP');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    sector: '',
    description: '',
    stage: 'Seed',
    city: 'Recife',
    state: 'PE',
    sectorInterest: '',
    stageInterest: 'Seed',
    ticketMin: '50000',
    ticketMax: '300000',
    bio: '',
  });
  const [erro, setErro] = useState('');
  const [erroPolicy, setErroPolicy] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [policy, setPolicy] = useState<PrivacyPolicy | null>(null);
  const [aceitoTermos, setAceitoTermos] = useState(false);
  const [aceitoPrivacidade, setAceitoPrivacidade] = useState(false);
  const [aceitoComunicacoes, setAceitoComunicacoes] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function buscarPolicy() {
      try {
        const dados = await privacyService.policy();

        if (ativo) {
          setPolicy(dados);
          setErroPolicy('');
        }
      } catch (e) {
        if (ativo) {
          setErroPolicy(extractErrorMessage(e));
        }
      }
    }

    void buscarPolicy();

    return () => {
      ativo = false;
    };
  }, []);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  function atualizar(campo: keyof typeof form, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro('');

    if (!aceitoTermos || !aceitoPrivacidade) {
      setErro('Você precisa aceitar os termos de uso e o tratamento de dados para criar a conta.');
      return;
    }

    if (!policy) {
      setErro('A política vigente ainda não carregou. Tente novamente em instantes.');
      return;
    }

    setEnviando(true);

    try {
      const consentimento = {
        acceptedTerms: true,
        acceptedPrivacy: true,
        termsVersion: policy.version,
        privacyVersion: policy.version,
        communicationsOptIn: aceitoComunicacoes,
      };

      if (tipo === 'STARTUP') {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          role: 'STARTUP',
          ...consentimento,
          startup: {
            companyName: form.companyName,
            sector: form.sector,
            description: form.description,
            stage: form.stage,
            city: form.city,
            state: form.state,
          },
        });
      } else {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          role: 'INVESTOR',
          ...consentimento,
          investor: {
            companyName: form.companyName || undefined,
            sectorInterest: form.sectorInterest,
            stageInterest: form.stageInterest,
            ticketMin: Number(form.ticketMin),
            ticketMax: Number(form.ticketMax),
            city: form.city,
            state: form.state,
            bio: form.bio || undefined,
          },
        });
      }

      navigate('/dashboard');
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 409) {
        const detalhes = e.response.data as { details?: { currentVersion?: string } } | undefined;

        if (detalhes?.details?.currentVersion) {
          setErro(
            `A política foi atualizada para a versão ${detalhes.details.currentVersion}. Leia o novo texto e confirme os dois aceites novamente.`,
          );
          setAceitoTermos(false);
          setAceitoPrivacidade(false);
          setAceitoComunicacoes(false);

          try {
            setPolicy(await privacyService.policy());
          } catch {
            setPolicy(null);
          }
        } else {
          setErro(extractErrorMessage(e));
        }
      } else {
        setErro(extractErrorMessage(e));
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout
      titulo="Criar conta"
      subtitulo="Escolha seu perfil para calcularmos a compatibilidade certa."
      largura="2xl"
    >
      <div className="mb-5 flex gap-2">
        {(['STARTUP', 'INVESTOR'] as Tipo[]).map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => setTipo(opcao)}
            className={tipo === opcao ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
          >
            {opcao === 'STARTUP' ? 'Sou startup' : 'Sou investidor anjo'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {erro && <Alert mensagem={erro} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="label">
              Seu nome
            </label>
            <input
              id="name"
              className="input"
              value={form.name}
              onChange={(e) => atualizar('name', e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="label">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => atualizar('email', e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="label">
            Senha
          </label>
          <input
            id="password"
            type="password"
            className="input"
            value={form.password}
            onChange={(e) => atualizar('password', e.target.value)}
            placeholder="mínimo de 6 caracteres"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="companyName" className="label">
              {tipo === 'STARTUP' ? 'Nome da startup' : 'Empresa (opcional)'}
            </label>
            <input
              id="companyName"
              className="input"
              value={form.companyName}
              onChange={(e) => atualizar('companyName', e.target.value)}
              required={tipo === 'STARTUP'}
            />
          </div>
          <div>
            <label htmlFor="city" className="label">
              Cidade
            </label>
            <input id="city" className="input" value={form.city} onChange={(e) => atualizar('city', e.target.value)} />
          </div>
        </div>

        {tipo === 'STARTUP' ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="sector" className="label">
                  Setor
                </label>
                <input
                  id="sector"
                  className="input"
                  placeholder="Tecnologia"
                  value={form.sector}
                  onChange={(e) => atualizar('sector', e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="stage" className="label">
                  Estágio
                </label>
                <select
                  id="stage"
                  className="input"
                  value={form.stage}
                  onChange={(e) => atualizar('stage', e.target.value)}
                >
                  <option>Ideação</option>
                  <option>Pre-seed</option>
                  <option>Seed</option>
                  <option>Série A</option>
                </select>
              </div>
              <div>
                <label htmlFor="state" className="label">
                  UF
                </label>
                <input
                  id="state"
                  className="input"
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => atualizar('state', e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="description" className="label">
                Sobre a startup
              </label>
              <textarea
                id="description"
                className="input min-h-[90px]"
                value={form.description}
                onChange={(e) => atualizar('description', e.target.value)}
                required
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="sectorInterest" className="label">
                  Setores de interesse
                </label>
                <input
                  id="sectorInterest"
                  className="input"
                  placeholder="Tecnologia, Design"
                  value={form.sectorInterest}
                  onChange={(e) => atualizar('sectorInterest', e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="state" className="label">
                  UF
                </label>
                <input
                  id="state"
                  className="input"
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => atualizar('state', e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="stageInterest" className="label">
                  Estágios
                </label>
                <input
                  id="stageInterest"
                  className="input"
                  placeholder="Seed, Pre-seed"
                  value={form.stageInterest}
                  onChange={(e) => atualizar('stageInterest', e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="ticketMin" className="label">
                  Ticket mínimo (R$)
                </label>
                <input
                  id="ticketMin"
                  type="number"
                  className="input"
                  value={form.ticketMin}
                  onChange={(e) => atualizar('ticketMin', e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="ticketMax" className="label">
                  Ticket máximo (R$)
                </label>
                <input
                  id="ticketMax"
                  type="number"
                  className="input"
                  value={form.ticketMax}
                  onChange={(e) => atualizar('ticketMax', e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="bio" className="label">
                Sobre você
              </label>
              <textarea
                id="bio"
                className="input min-h-[80px]"
                value={form.bio}
                onChange={(e) => atualizar('bio', e.target.value)}
              />
            </div>
          </>
        )}

        <fieldset className="rounded-2xl border border-slate-200 bg-areia-50/60 p-4 dark:border-noite-600 dark:bg-noite-850/70">
          <legend className="px-1 text-sm font-semibold text-slate-900">Consentimentos</legend>
          <p className="text-xs leading-relaxed text-slate-500">
            {policy ? (
              <>
                Política versão <strong className="text-slate-700">{policy.version}</strong>, vigente desde{' '}
                {new Date(`${policy.effectiveAt}T12:00:00`).toLocaleDateString('pt-BR')}. Leia a{' '}
                <Link to="/privacidade" target="_blank" rel="noreferrer" className="link">
                  política completa
                </Link>
                .
              </>
            ) : erroPolicy ? (
              'Não foi possível carregar a versão vigente da política.'
            ) : (
              'Carregando a versão vigente da política...'
            )}
          </p>

          {erroPolicy ? (
            <div className="mt-3 space-y-2">
              <Alert mensagem={erroPolicy} />
              <button type="button" className="btn-secondary w-full" onClick={() => window.location.reload()}>
                Recarregar página
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-2.5">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-1.5 text-sm text-slate-700 transition hover:border-slate-200 hover:bg-white dark:hover:border-noite-600 dark:hover:bg-noite-800">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-laco-800"
                  checked={aceitoTermos}
                  onChange={(e) => setAceitoTermos(e.target.checked)}
                  required
                />
                <span>
                  <strong className="font-semibold text-slate-900">Li e aceito os termos de uso.</strong> Entendo as
                  regras de convivência, veracidade e limites do serviço.{' '}
                  <Link to="/privacidade#termos-de-uso" target="_blank" rel="noreferrer" className="link">
                    Ler os termos
                  </Link>
                  .
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-1.5 text-sm text-slate-700 transition hover:border-slate-200 hover:bg-white dark:hover:border-noite-600 dark:hover:bg-noite-800">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-laco-800"
                  checked={aceitoPrivacidade}
                  onChange={(e) => setAceitoPrivacidade(e.target.checked)}
                  required
                />
                <span>
                  <strong className="font-semibold text-slate-900">Autorizo o tratamento dos meus dados.</strong>{' '}
                  Finalidades, bases legais e direitos estão na{' '}
                  <Link to="/privacidade" target="_blank" rel="noreferrer" className="link">
                    política de privacidade
                  </Link>
                  . Posso exportar ou excluir os dados na central de privacidade.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed border-slate-300 p-1.5 text-sm text-slate-600 transition hover:bg-white dark:border-noite-600 dark:hover:bg-noite-800">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-laco-800"
                  checked={aceitoComunicacoes}
                  onChange={(e) => setAceitoComunicacoes(e.target.checked)}
                />
                <span>
                  <strong className="font-medium text-slate-800">Quero receber comunicações do Laço</strong>{' '}
                  <span className="text-xs text-slate-500">(opcional, posso revogar depois)</span>. Sem essa opção o
                  cadastro funciona normalmente.
                </span>
              </label>
            </div>
          )}
        </fieldset>

        <button type="submit" className="btn-primary w-full" disabled={enviando || !policy}>
          {enviando ? 'Criando conta...' : 'Criar conta'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Já tem conta?{' '}
          <Link to="/login" className="link">
            Entrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
