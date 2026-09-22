export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Загрузка" className="space-y-4">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-border" />
      <div className="h-28 animate-pulse rounded-2xl bg-border/60" />
      <div className="h-28 animate-pulse rounded-2xl bg-border/60" />
      <div className="h-28 animate-pulse rounded-2xl bg-border/60" />
    </div>
  );
}
