import type { ReactNode } from 'react';

type Accent = 'laco' | 'barro' | 'areia' | 'porto';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: Accent;
}

const ACENTOS: Record<Accent, string> = {
  laco: 'border-l-laco-500',
  barro: 'border-l-barro-500',
  areia: 'border-l-areia-500',
  porto: 'border-l-porto-600',
};

export function StatCard({ label, value, hint, accent = 'laco' }: StatCardProps) {
  return (
    <div className={`card border-l-4 ${ACENTOS[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold leading-none text-slate-900 dark:text-areia-100">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}
