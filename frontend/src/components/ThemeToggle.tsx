import { useTheme } from '../context/ThemeContext';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { tema, alternarTema } = useTheme();
  const escuro = tema === 'escuro';
  const rotulo = escuro ? 'Ativar modo claro' : 'Ativar modo escuro';

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={rotulo}
      aria-pressed={escuro}
      title={rotulo}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-areia-100 hover:text-laco-800 focus:outline-none focus:ring-2 focus:ring-laco-400 focus:ring-offset-2 dark:border-noite-600 dark:bg-noite-800 dark:text-areia-200 dark:hover:bg-noite-700 dark:focus:ring-offset-noite-900 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[18px] w-[18px]"
        aria-hidden="true"
      >
        <path d="M2.6 12S6.1 5.7 12 5.7 21.4 12 21.4 12 17.9 18.3 12 18.3 2.6 12 2.6 12Z" />
        <circle cx="12" cy="12" r="2.7" />
        {escuro && <path d="M4.2 4.2l15.6 15.6" />}
      </svg>
    </button>
  );
}
