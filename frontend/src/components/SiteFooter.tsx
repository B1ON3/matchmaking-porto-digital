import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-areia-50/70 px-4 py-8 dark:border-noite-700 dark:bg-noite-900/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Logo compacto />
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Laço · matchmaking entre startups e investidores anjo.
            <br />
            Projeto acadêmico do Porto Digital.
          </p>
        </div>

        <nav
          aria-label="Links de privacidade"
          className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-600"
        >
          <Link to="/privacidade" className="hover:text-laco-800 dark:text-slate-300 dark:hover:text-areia-100">
            Política de privacidade
          </Link>
          <Link
            to="/privacidade#termos-de-uso"
            className="hover:text-laco-800 dark:text-slate-300 dark:hover:text-areia-100"
          >
            Termos de uso
          </Link>
          <Link to="/privacidade/conta" className="hover:text-laco-800 dark:text-slate-300 dark:hover:text-areia-100">
            Meus dados
          </Link>
        </nav>
      </div>
    </footer>
  );
}
