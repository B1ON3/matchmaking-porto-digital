interface GaugeProps {
  value: number;
  label?: string;
}

export function Gauge({ value, label = 'Potencial' }: GaugeProps) {
  const normalizado = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        <span className="font-display text-lg font-semibold text-slate-900 dark:text-areia-100">
          {Math.round(normalizado)}
          <span className="ml-0.5 font-sans text-xs font-normal text-slate-500 dark:text-slate-400">/100</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(normalizado)}
        aria-label={label}
        className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-noite-700"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-barro-500 via-laco-500 to-porto-700 transition-[width] duration-500"
          style={{ width: `${normalizado}%` }}
        />
      </div>
    </div>
  );
}
