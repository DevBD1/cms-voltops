import { FormEvent, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { PublicLayout } from '../components/Layout/PublicLayout';
import { login, resolveRedirect } from '../lib/auth';
import { ApiError } from '../lib/api';
import type { UserRole } from '../types/db.types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ADMIN_ROLES: UserRole[] = ['ADMIN', 'OPERATOR', 'TECHNICIAN'];

export type LoginMode = 'customer' | 'admin';

interface LoginProps {
  mode: LoginMode;
}

export default function Login({ mode }: LoginProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const isAdmin = mode === 'admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const validate = (): boolean => {
    const next: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      next.email = 'E-posta adresi zorunludur.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      next.email = 'Geçerli bir e-posta adresi girin.';
    }

    if (!password) {
      next.password = 'Şifre zorunludur.';
    } else if (password.length < 6) {
      next.password = 'Şifre en az 6 karakter olmalıdır.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const session = await login(email.trim(), password);
      const roleOk = isAdmin
        ? ADMIN_ROLES.includes(session.user.role)
        : session.user.role === 'CUSTOMER';

      if (!roleOk) {
        setErrors({
          form: isAdmin
            ? 'Bu hesap yönetim paneline erişemez. Müşteri girişini kullanın.'
            : 'Bu hesap müşteri alanına erişemez. Yönetim girişini kullanın.',
        });
        return;
      }

      navigate(resolveRedirect(session.user.role, from), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ form: err.message });
      } else {
        setErrors({ form: 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg flex-col justify-center px-6 py-16">
        <div className="rounded-xl border border-slate-200 bg-white p-10 dark:border-slate-800 dark:bg-[#111111]">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            {isAdmin ? 'Yönetim girişi' : 'Kullanıcı girişi'}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink dark:text-white">
            Giriş Yap
          </h1>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
            {isAdmin
              ? 'Operasyon paneline erişmek için yönetim hesabınızla giriş yapın.'
              : 'Şarj oturumlarınızı, faturalarınızı ve yakındaki istasyonları görüntüleyin.'}
          </p>

          {errors.form && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {errors.form}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-base font-medium text-slate-700 dark:text-slate-300"
              >
                E-posta
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className={`mt-2 w-full rounded-lg border bg-white px-4 py-3.5 text-base text-ink outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 dark:bg-slate-950 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400/20 ${
                  errors.email
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
                placeholder={isAdmin ? 'admin@voltops.com' : 'ahmet@example.com'}
              />
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-base font-medium text-slate-700 dark:text-slate-300"
              >
                Şifre
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                className={`mt-2 w-full rounded-lg border bg-white px-4 py-3.5 text-base text-ink outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 dark:bg-slate-950 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400/20 ${
                  errors.password
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-lg py-4 text-base font-semibold text-white transition-colors disabled:opacity-60 sm:text-lg ${
                isAdmin
                  ? 'bg-slate-800 hover:bg-amber-400 hover:text-slate-900 dark:bg-slate-700 dark:hover:bg-amber-400'
                  : 'bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600'
              }`}
            >
              {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            {isAdmin ? (
              <>
                Müşteri misiniz?{' '}
                <Link
                  to="/login"
                  className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Kullanıcı girişi
                </Link>
              </>
            ) : (
              <>
                Yönetim hesabı?{' '}
                <Link
                  to="/login/admin"
                  className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Yönetim girişi
                </Link>
              </>
            )}
          </p>

          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400">
              ← Ana sayfaya dön
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
