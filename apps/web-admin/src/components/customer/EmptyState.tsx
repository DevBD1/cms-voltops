export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center dark:border-white/7 dark:bg-night-raised">
      <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
    </div>
  );
}
