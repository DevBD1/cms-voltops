import type { ReactNode } from 'react';

interface AdminDataTableProps {
  headers: string[];
  rows: ReactNode[][];
  emptyMessage?: string;
}

export function AdminDataTable({ headers, rows, emptyMessage = 'Kayıt bulunamadı.' }: AdminDataTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111111]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-[#FAFAFA] dark:border-slate-800 dark:bg-[#0A0A0A]">
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-100 transition-colors last:border-0 hover:bg-[#FAFAFA] dark:border-slate-800/80 dark:hover:bg-slate-900/50"
                >
                  {row.map((cell, j) => (
                    <td key={headers[j] ?? j} className="px-5 py-3.5 text-sm text-slate-800 dark:text-slate-200">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
