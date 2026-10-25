interface LogoProps {
  compacto?: boolean;
  tom?: 'padrao' | 'claro';
  className?: string;
}

export function Logo({ compacto = false, tom = 'padrao', className = '' }: LogoProps) {
  const claro = tom === 'claro';

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`logo-mark inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
          claro
            ? 'bg-white/10 ring-1 ring-white/15'
            : 'bg-white ring-1 ring-slate-200 dark:bg-noite-800 dark:ring-noite-600'
        }`}
      >
        <svg viewBox="0 0 40 40" className="h-6 w-6" aria-hidden="true">
          <g fill="none" strokeWidth="2.6" strokeLinecap="round">
            <path d="M20 20C15.5 13.5 8 13.5 8 20s7.5 6.5 12 0" stroke={claro ? '#c1ddcc' : 'var(--mark-a)'} />
            <path d="M20 20c4.5-6.5 12-6.5 12 0s-7.5 6.5-12 0" stroke={claro ? '#e78358' : 'var(--mark-b)'} />
          </g>
          <circle cx="20" cy="20" r="1.9" fill={claro ? '#f4e9d8' : 'var(--mark-b)'} />
        </svg>
      </span>

      {!compacto && (
        <span className="leading-none">
          <span
            className={`block font-display text-[22px] font-semibold leading-none ${
              claro ? 'text-areia-50' : 'text-laco-900 dark:text-areia-100'
            }`}
          >
            Laço
          </span>
          <span
            className={`mt-1.5 block text-[9px] font-semibold uppercase tracking-[0.26em] ${
              claro ? 'text-areia-200/70' : 'text-slate-500'
            }`}
          >
            Porto Digital
          </span>
        </span>
      )}
    </span>
  );
}
