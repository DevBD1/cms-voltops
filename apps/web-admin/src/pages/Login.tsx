import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { VoltOpsLogo, ADMIN_BTN } from '../components/VoltOpsLogo';
import { login, resolveRedirect, ADMIN_ROLES, clearSession } from '../lib/auth';
import { ApiError } from '../lib/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginMode = 'customer' | 'admin';

const BG_IMAGE: Record<LoginMode, string> = {
  customer: '/login-bg-customer.png',
  admin: '/login-bg-admin.jpg',
};

const PANEL_COPY: Record<LoginMode, { title: string; subtitle: string }> = {
  customer: {
    title: 'Şarj Ağına Bağlanın',
    subtitle: 'Yakındaki istasyonları bulun, oturumları takip edin, faturalarınızı görüntüleyin.',
  },
  admin: {
    title: 'Operasyon Paneli',
    subtitle: 'Gerçek zamanlı izleme, bakım yönetimi ve ekip koordinasyonu.',
  },
};

const SWITCH_LINK: Record<LoginMode, { prompt: string; to: string; label: string }> = {
  customer: { prompt: 'Yönetim hesabı?', to: '/login/admin', label: 'Yönetim girişi →' },
  admin:    { prompt: 'Müşteri misiniz?', to: '/login',       label: 'Kullanıcı girişi →' },
};

interface FormFieldProps {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  placeholder: string;
  error?: string;
  variant?: 'customer' | 'admin';
  onChange: (value: string) => void;
  onClearError: () => void;
}

function FormField({ id, label, type, autoComplete, value, placeholder, error, variant = 'customer', onChange, onClearError }: FormFieldProps) {
  const focusCls = variant === 'admin'
    ? 'focus:border-amber-400 focus:ring-amber-400/20 dark:focus:border-amber-400 dark:focus:ring-amber-400/20'
    : 'focus:border-brand-600 focus:ring-brand-600/20 dark:focus:border-brand-400 dark:focus:ring-brand-400/20';

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (error) onClearError();
        }}
        className={`mt-1.5 w-full rounded-lg border bg-white px-4 py-3 text-sm text-ink outline-none transition-colors focus:ring-2 ${focusCls} dark:bg-slate-950 dark:text-white ${
          error ? 'border-red-500 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
        }`}
        placeholder={placeholder}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

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

    if (!trimmedEmail) next.email = 'E-posta adresi zorunludur.';
    else if (!EMAIL_REGEX.test(trimmedEmail)) next.email = 'Geçerli bir e-posta adresi girin.';

    if (!password) next.password = 'Şifre zorunludur.';
    else if (password.length < 6) next.password = 'Şifre en az 6 karakter olmalıdır.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
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
        clearSession(); // discard the just-stored token — wrong panel for this role
        setErrors({
          form: isAdmin
            ? 'Bu hesap yönetim paneline erişemez. Müşteri girişini kullanın.'
            : 'Bu hesap müşteri alanına erişemez. Yönetim girişini kullanın.',
        });
        return;
      }

      navigate(resolveRedirect(session.user.role, from), { replace: true });
    } catch (err) {
      setErrors({
        form: err instanceof ApiError ? err.message : 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.',
      });
    } finally {
      setLoading(false);
    }
  };

  const { title, subtitle } = PANEL_COPY[mode];
  const switchLink = SWITCH_LINK[mode];

  return (
    <div className="flex min-h-screen text-ink dark:text-white">

      {/* Image panel */}
      <div
        className={`relative hidden lg:flex lg:w-[58%] xl:w-[62%] flex-col ${
          isAdmin
            ? 'bg-[linear-gradient(135deg,#1e293b_0%,#0f172a_50%,#1e3a5f_100%)]'
            : 'bg-[linear-gradient(135deg,#0f2027_0%,#203a43_50%,#2c5364_100%)]'
        }`}
        style={{
          backgroundImage: `url(${BG_IMAGE[mode]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Scrim — preserves text legibility across both photos */}
        <div className="absolute inset-0 bg-linear-to-b from-black/55 via-black/20 to-black/70 pointer-events-none" />

        <div className="relative z-10 p-8 xl:p-10">
          <Link to="/">
            <VoltOpsLogo size="md" wordmarkColor="white" />
          </Link>
        </div>

        <div className="relative z-10 mt-auto p-8 xl:p-12">
          <p className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
            {title}
          </p>
          <p className="mt-3 max-w-sm text-base leading-relaxed text-white/70">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col bg-white dark:bg-[#0A0A0A]">
        <header className="flex items-center border-b border-slate-100 px-6 py-5 dark:border-slate-800/60 sm:px-8">
          {/* Logo — mobile only (desktop has it on the image panel) */}
          <Link to="/" className="mr-auto lg:hidden">
            <VoltOpsLogo size="sm" />
          </Link>

          <nav className="flex items-center gap-2 lg:ml-auto">
            <Link
              to="/login"
              className={`rounded-md px-5 py-3 text-base font-medium transition-colors ${
                !isAdmin
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'
              }`}
            >
              Kullanıcı
            </Link>
            <Link
              to="/login/admin"
              className={`rounded-md border px-5 py-3 text-base font-medium transition-colors ${
                isAdmin
                  ? 'border-amber-400 bg-amber-400 text-slate-900'
                  : `border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white ${ADMIN_BTN}`
              }`}
            >
              Yönetim
            </Link>
            <ThemeToggle size="md" />
          </nav>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-88">
            <p className={`text-xs font-semibold uppercase tracking-widest ${isAdmin ? 'text-amber-500 dark:text-amber-400' : 'text-brand-600 dark:text-brand-400'}`}>
              {isAdmin ? 'Yönetim girişi' : 'Kullanıcı girişi'}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink dark:text-white">
              Giriş Yap
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {isAdmin
                ? 'Operasyon paneline erişmek için hesabınızla giriş yapın.'
                : 'Şarj geçmişinizi ve yakındaki istasyonları görüntüleyin.'}
            </p>

            {errors.form && (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                {errors.form}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
              <FormField
                id="email"
                label="E-posta"
                type="email"
                autoComplete="email"
                value={email}
                placeholder={isAdmin ? 'admin@voltops.com' : 'ahmet@example.com'}
                error={errors.email}
                variant={isAdmin ? 'admin' : 'customer'}
                onChange={setEmail}
                onClearError={() => setErrors((prev) => ({ ...prev, email: undefined }))}
              />
              <FormField
                id="password"
                label="Şifre"
                type="password"
                autoComplete="current-password"
                value={password}
                placeholder="••••••••"
                error={errors.password}
                variant={isAdmin ? 'admin' : 'customer'}
                onChange={setPassword}
                onClearError={() => setErrors((prev) => ({ ...prev, password: undefined }))}
              />

              <button
                type="submit"
                disabled={loading}
                className={`mt-1 w-full rounded-lg py-3.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                  isAdmin
                    ? 'bg-slate-800 hover:bg-amber-400 hover:text-slate-900 dark:bg-slate-700 dark:hover:bg-amber-400 dark:hover:text-slate-900'
                    : 'bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600'
                }`}
              >
                {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
              </button>
            </form>

            <div className="mt-7 space-y-2 text-center text-xs text-slate-500 dark:text-slate-400">
              <p>
                {switchLink.prompt}{' '}
                <Link
                  to={switchLink.to}
                  className={`font-medium ${isAdmin ? 'text-amber-500 hover:text-amber-400 dark:text-amber-400 dark:hover:text-amber-300' : 'text-brand-600 hover:text-brand-700 dark:text-brand-400'}`}
                >
                  {switchLink.label}
                </Link>
              </p>
              <p>
                <Link to="/" className={isAdmin ? 'hover:text-amber-500 dark:hover:text-amber-400' : 'hover:text-brand-600 dark:hover:text-brand-400'}>
                  ← Ana sayfaya dön
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
