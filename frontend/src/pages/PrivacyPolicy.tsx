import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Logo } from '../components/Logo';
import { SiteFooter } from '../components/SiteFooter';
import { Spinner } from '../components/Spinner';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { privacyService } from '../services';
import { extractErrorMessage } from '../services/api';
import type { PrivacyPolicy as PrivacyPolicyData } from '../types';

const formatarData = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

export function PrivacyPolicy() {
  const { user } = useAuth();
  const location = useLocation();
  const [policy, setPolicy] = useState<PrivacyPolicyData | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const dados = await privacyService.policy();

        if (ativo) {
          setPolicy(dados);
        }
      } catch (e) {
        if (ativo) {
          setErro(extractErrorMessage(e));
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!policy || !location.hash) {
      return;
    }

    const timer = window.setTimeout(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [policy, location.hash]);

  return (
    <div className="min-h-screen bg-areia-50 dark:bg-noite-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-areia-50/90 backdrop-blur dark:border-noite-700 dark:bg-noite-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" aria-label="Laço — início">
            <Logo />
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link to="/privacidade/conta" className="btn-secondary px-3 py-1.5 sm:px-4 sm:py-2">
                Meus dados
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary hidden px-3 py-1.5 sm:inline-flex sm:px-4 sm:py-2">
                  Entrar
                </Link>
                <Link to="/cadastro" className="btn-primary px-3 py-1.5 sm:px-4 sm:py-2">
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        {carregando ? (
          <Spinner texto="Abrindo a política vigente..." />
        ) : erro || !policy ? (
          <div className="mx-auto max-w-xl space-y-4">
            <Alert mensagem={erro || 'Não foi possível carregar a política.'} />
            <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-14">
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <p className="eyebrow">Documento público</p>
                <p className="mt-2 font-display text-xl font-semibold text-slate-900">Nesta página</p>
                <nav aria-label="Seções da política" className="mt-4 space-y-1">
                  {policy.sections.map((section, index) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="group flex gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition hover:bg-white hover:text-laco-800 dark:text-slate-300 dark:hover:bg-noite-800 dark:hover:text-areia-100"
                    >
                      <span className="mt-0.5 w-5 shrink-0 text-[10px] font-bold tabular-nums text-slate-400">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span>{section.title}</span>
                    </a>
                  ))}
                </nav>

                <div className="mt-6 rounded-2xl border border-laco-200 bg-laco-50/70 p-4 text-xs leading-relaxed text-laco-900 dark:border-laco-800 dark:bg-laco-950/40 dark:text-areia-200">
                  <p className="font-semibold">Versão {policy.version}</p>
                  <p className="mt-1">Vigente desde {formatarData(policy.effectiveAt)}.</p>
                  <p className="mt-3 break-all font-mono text-[10px] text-laco-700/80 dark:text-laco-300/80">
                    SHA-256 {policy.hash.slice(0, 24)}…
                  </p>
                </div>
              </div>
            </aside>

            <article className="min-w-0">
              <div className="relative overflow-hidden rounded-3xl border border-laco-200 bg-laco-950 px-6 py-8 text-areia-100 shadow-laco sm:px-9 sm:py-10">
                <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-barro-500/20 blur-3xl" />
                <div className="relative">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-areia-200/70">
                    Transparência e controle
                  </p>
                  <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight text-areia-50 sm:text-4xl">
                    {policy.title}
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-areia-200/80">{policy.summary}</p>

                  <dl className="mt-7 grid gap-4 border-t border-white/10 pt-5 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="text-areia-200/55">Versão vigente</dt>
                      <dd className="mt-1 font-semibold text-areia-50">{policy.version}</dd>
                    </div>
                    <div>
                      <dt className="text-areia-200/55">Vigência</dt>
                      <dd className="mt-1 font-semibold text-areia-50">{formatarData(policy.effectiveAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-areia-200/55">Contato do encarregado</dt>
                      <dd className="mt-1 font-semibold text-areia-50">{policy.contact}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-noite-700 dark:bg-noite-800 lg:hidden">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  Ver seções desta política
                </summary>
                <nav aria-label="Seções da política" className="mt-3 grid gap-1">
                  {policy.sections.map((section, index) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="rounded-lg px-2 py-1.5 text-sm text-slate-600"
                    >
                      {String(index + 1).padStart(2, '0')} · {section.title}
                    </a>
                  ))}
                </nav>
              </details>

              <div className="mt-2">
                {policy.sections.map((section, index) => (
                  <section
                    key={section.id}
                    id={section.id}
                    aria-labelledby={`${section.id}-titulo`}
                    className="scroll-mt-28 border-b border-slate-200/80 py-9 last:border-0 dark:border-noite-700"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-[11px] font-semibold text-barro-600">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h2
                        id={`${section.id}-titulo`}
                        className="font-display text-2xl font-semibold text-slate-900 dark:text-areia-100"
                      >
                        {section.title}
                      </h2>
                    </div>
                    <p className="mt-2 pl-7 text-sm text-slate-500 dark:text-slate-400">{section.summary}</p>

                    <div className="mt-4 space-y-3 pl-0 sm:pl-7">
                      {section.paragraphs.map((paragrafo) => (
                        <p key={paragrafo} className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
                          {paragrafo}
                        </p>
                      ))}

                      {section.items ? (
                        <ul className="mt-4 space-y-2.5">
                          {section.items.map((item) => (
                            <li
                              key={item}
                              className="flex gap-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200"
                            >
                              <span
                                aria-hidden="true"
                                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-barro-500"
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-barro-200 bg-barro-50/60 p-5 dark:border-barro-800 dark:bg-barro-900/20 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Quer consultar seus recibos?</p>
                  <p className="mt-1 text-xs text-slate-600">
                    A Central de Privacidade reúne consentimentos, exportação e exclusão da conta.
                  </p>
                </div>
                <Link to={user ? '/privacidade/conta' : '/cadastro'} className="btn-primary shrink-0">
                  {user ? 'Abrir meus dados' : 'Criar conta com consentimento'}
                </Link>
              </div>
            </article>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
