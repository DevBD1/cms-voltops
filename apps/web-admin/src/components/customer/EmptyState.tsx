export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#111111]">
      <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
    </div>
  );
}
