interface ScoreBadgeProps {
  score: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const cor =
    score >= 70
      ? 'bg-emerald-100 text-emerald-700'
      : score >= 40
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-600';

  const rotulo =
    score >= 70 ? 'Alta afinidade' : score >= 40 ? 'Afinidade média' : 'Afinidade baixa';

  return (
    <span className={`badge ${cor}`} title={rotulo}>
      {score.toFixed(1)}% · {rotulo}
    </span>
  );
}