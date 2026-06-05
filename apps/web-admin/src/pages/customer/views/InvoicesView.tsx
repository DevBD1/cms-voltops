import { useEffect, useState } from 'react';
import { EmptyState } from '../../../components/customer/EmptyState';
import { receiptsApi } from '../../../lib/api';
import { formatCurrency, formatDate } from '../../../lib/formatters';
import type { Receipt } from '../../../types/db.types';


export function InvoicesView() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    receiptsApi
      .list()
      .then(setReceipts)
      .catch(() => setReceipts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Faturalar
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Şarj oturumlarınıza bağlı fatura kayıtları
        </p>
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">Yükleniyor…</p>
      ) : receipts.length === 0 ? (
        <EmptyState message="Henüz faturanız bulunmuyor." />
      ) : (
        <ul className="space-y-4">
          {receipts.map((receipt) => (
            <li
              key={receipt.receiptNo}
              className="rounded-xl border border-slate-200/80 bg-white p-5 dark:border-white/7 dark:bg-night-raised"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                    {receipt.receiptNo}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {receipt.stationName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(receipt.issuedAt)}
                  </p>
                </div>
                <p className="font-mono text-lg font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(parseFloat(receipt.totalAmount))}
                </p>
              </div>
              <div className="mt-4 flex gap-6 border-t border-slate-100 pt-4 text-xs dark:border-white/6">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">KDV </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {formatCurrency(parseFloat(receipt.taxAmount))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Seans </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    #{receipt.sessionId}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
