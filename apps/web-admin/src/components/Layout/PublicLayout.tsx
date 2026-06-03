import { Link } from 'react-router-dom';
import { ThemeToggle } from '../ThemeToggle';
import { ADMIN_BTN, VoltOpsLogo } from '../VoltOpsLogo';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="relative min-h-screen bg-white text-ink dark:bg-[#0A0A0A] dark:text-white">
      <ThemeToggle className="fixed top-4 right-4 z-[100] shadow-md sm:top-5 sm:right-6" />

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white pr-28 dark:border-slate-800 dark:bg-[#0A0A0A] sm:pr-36">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 sm:h-24">
          <Link
            to="/"
            className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <VoltOpsLogo size="lg" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-md px-3 py-2.5 text-base font-medium text-slate-600 transition-colors hover:bg-brand-50 hover:text-brand-600 sm:px-4 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-brand-400"
            >
              Kullanıcı
            </Link>
            <Link
              to="/login/admin"
              className={`rounded-md border border-transparent px-3 py-2.5 text-base font-medium text-slate-600 sm:px-4 dark:text-slate-300 ${ADMIN_BTN}`}
            >
              Yönetim
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
