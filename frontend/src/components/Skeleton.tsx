interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-slate-200 dark:bg-noite-700 ${className}`} />;
}
