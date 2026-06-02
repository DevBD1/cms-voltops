interface VoltOpsLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  /** Use 'white' on dark photo backgrounds where brand colors are illegible. */
  wordmarkColor?: 'brand' | 'white';
}

const SIZES = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-[4.5rem] w-[4.5rem]',
  xl: 'h-20 w-20',
} as const;

const WORDMARK = {
  sm: { title: 'text-base', tag: 'text-[10px]' },
  md: { title: 'text-xl', tag: 'text-xs' },
  lg: { title: 'text-2xl', tag: 'text-xs' },
  xl: { title: 'text-3xl', tag: 'text-sm' },
} as const;

const COLOR = {
  brand: { title: 'text-brand-600 dark:text-brand-400', tag: 'text-slate-500 dark:text-slate-400' },
  white: { title: 'text-white',                          tag: 'text-white/60' },
} as const;

export function VoltOpsLogo({ className = '', size = 'md', showWordmark = true, wordmarkColor = 'brand' }: VoltOpsLogoProps) {
  const wm = WORDMARK[size];
  const color = COLOR[wordmarkColor];

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span
        className={`relative shrink-0 overflow-hidden rounded-full ${SIZES[size]}`}
        aria-hidden
      >
        <img
          src="/logo-voltops.png"
          alt=""
          className="h-full w-full object-cover mix-blend-multiply dark:mix-blend-normal"
          draggable={false}
        />
      </span>
      {showWordmark && (
        <span className="flex flex-col leading-tight">
          <span className={`${wm.title} font-bold tracking-tight ${color.title}`}>
            VoltOps
          </span>
          <span className={`${wm.tag} hidden font-medium uppercase tracking-widest sm:block ${color.tag}`}>
            Araç Şarj Ağı
          </span>
        </span>
      )}
    </span>
  );
}

/** Yönetim giriş butonları — sarı hover */
export const ADMIN_BTN =
  'transition-colors duration-200 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-900 dark:hover:border-amber-400 dark:hover:bg-amber-400 dark:hover:text-slate-900';
