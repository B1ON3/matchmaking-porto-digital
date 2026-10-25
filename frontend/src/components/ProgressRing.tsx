interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
}

export function ProgressRing({ value, size = 88, stroke = 8, label }: ProgressRingProps) {
  const normalizado = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const raio = (size - stroke) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const deslocamento = circunferencia - (normalizado / 100) * circunferencia;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${normalizado}%${label ? ` ${label}` : ''}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={raio}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200 dark:stroke-noite-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={raio}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={deslocamento}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="stroke-laco-600 transition-[stroke-dashoffset] duration-500 dark:stroke-laco-400"
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontSize: Math.max(12, size * 0.2) }}
          className="fill-slate-900 font-semibold dark:fill-areia-100"
        >
          {normalizado}%
        </text>
      </svg>
      {label ? <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span> : null}
    </div>
  );
}
