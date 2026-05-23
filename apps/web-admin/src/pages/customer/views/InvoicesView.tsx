import { getUserInvoices } from '../../../lib/customer-data';

interface InvoicesViewProps {
  userId: string;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

const PAYMENT_LABELS = {
  CREDIT_CARD: 'Kredi kartı',
  WALLET: 'Cüzdan',
} as const;

export function InvoicesView({ userId }: InvoicesViewProps) {
  const invoices = getUserInvoices(userId);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Faturalar</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Şarj oturumlarınıza bağlı fatura kayıtları
        </p>
      </section>

      {invoices.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#111111]">
          <p className="text-sm text-slate-600 dark:text-slate-400">Henüz faturanız bulunmuyor.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {invoices.map((invoice) => (
            <li
              key={invoice.id}
              className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111111]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                    {invoice.invoiceNumber}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(invoice.issuedAt)} · {PAYMENT_LABELS[invoice.paymentMethod]}
                  </p>
                </div>
                <p className="font-mono text-lg font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(invoice.amount)}
                </p>
              </div>
              <div className="mt-4 flex gap-6 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">KDV </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {formatCurrency(invoice.tax)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Oturum </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{invoice.sessionId}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
