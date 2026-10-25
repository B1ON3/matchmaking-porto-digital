interface FactorBarProps {
  label: string;
  value: number;
  weight: number;
}

export function FactorBar({ label, value, weight }: FactorBarProps) {
  const normalizado = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
          {Math.round(normalizado)} · peso {weight}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(normalizado)}
        aria-label={label}
        className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-noite-700"
      >
        <div className="h-full rounded-full bg-laco-600 dark:bg-laco-400" style={{ width: `${normalizado}%` }} />
      </div>
    </div>
  );
}
