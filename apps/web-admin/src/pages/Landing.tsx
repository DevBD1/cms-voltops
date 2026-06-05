import { Link } from 'react-router-dom';
import { PublicLayout } from '../components/Layout/PublicLayout';
import { ADMIN_BTN } from '../components/VoltOpsLogo';

const QUOTES = [
  {
    text: 'Şarjınızı başlatın, oturumunuzu izleyin — yolculuğa odaklanın.',
    cite: 'VoltOps sürücü deneyimi',
  },
  {
    text: 'Müsait soketleri anında görün, doğru istasyonda zaman kazanın.',
    cite: 'Akıllı istasyon keşfi',
  },
  {
    text: 'Faturalarınız ve geçmiş oturumlarınız her zaman elinizin altında.',
    cite: 'Şeffaf şarj takibi',
  },
] as const;

const FEATURES = [
  {
    title: 'Yakındaki istasyonlar',
    description:
      'Şehir ve ilçe bilgisiyle istasyonları listeleyin; müsait soket sayısını anlık görün ve şarj için doğru noktayı seçin.',
    icon: StationIcon,
  },
  {
    title: 'Şarj oturumunuz',
    description:
      'Aktif şarjınızda istasyon adı, enerji (kWh) ve tutarı takip edin; tamamlanan oturumlar geçmişinizde saklanır.',
    icon: ChargeIcon,
  },
  {
    title: 'Fatura ve destek',
    description:
      'Tamamlanan oturumlara bağlı faturalarınıza erişin; QR veya cihaz sorunları için destek talebi oluşturun.',
    icon: SupportIcon,
  },
] as const;

const BTN_PRIMARY =
  'inline-flex items-center justify-center rounded-lg bg-brand-600 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 sm:text-lg';

const BTN_ADMIN = `inline-flex items-center justify-center rounded-lg border-2 border-slate-200 bg-white px-8 py-4 text-base font-semibold text-ink sm:text-lg dark:border-slate-600 dark:bg-slate-900 dark:text-white ${ADMIN_BTN}`;

export default function Landing() {
  return (
    <PublicLayout>
      <section className="relative min-h-[min(92vh,820px)] overflow-hidden border-b border-slate-200 dark:border-slate-800">
        <div
          className="absolute inset-0 bg-[length:cover] bg-[position:68%_center] bg-no-repeat sm:bg-[position:72%_center]"
          style={{ backgroundImage: 'url(/hero-charging.png)' }}
          role="img"
          aria-label="Elektrikli araç şarj istasyonunda şarj olan araç"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white from-35% via-white/70 via-55% to-transparent to-100% dark:from-[#0A0A0A] dark:from-35% dark:via-[#0A0A0A]/75 dark:via-50% dark:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-white/20 dark:from-[#0A0A0A]/90 dark:to-[#0A0A0A]/30" />

        <div className="relative mx-auto flex min-h-[min(92vh,820px)] max-w-6xl flex-col justify-center px-6 pb-20 pt-16 md:pb-28 md:pt-20">
          <p className="mb-5 text-base font-semibold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400 sm:text-lg">
            Araç şarj deneyimi
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl md:text-6xl lg:text-7xl dark:text-white">
            VoltOps ile şarjınızı kolayca yönetin
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl dark:text-slate-300">
            İstasyon bulun, şarj oturumunuzu izleyin, faturalarınıza ulaşın — hepsi tek uygulamada.
          </p>
          <div className="mt-12 flex flex-wrap gap-4">
            <Link to="/login" className={BTN_PRIMARY}>
              Kullanıcı Girişi
            </Link>
            <Link to="/login/admin" className={BTN_ADMIN}>
              Yönetim Girişi
            </Link>
            <a
              href="#ozellikler"
              className="inline-flex items-center justify-center rounded-lg px-4 py-4 text-base font-semibold text-brand-600 underline-offset-4 transition-colors hover:text-brand-700 hover:underline sm:text-lg dark:text-brand-400"
            >
              Özellikleri incele
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-[#FAFAFA] py-16 dark:border-slate-800 dark:bg-[#111111] md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0A0A0A]">
              <img
                src="/driver-experience.png"
                alt="VoltOps şarj istasyonunda mutlu bir sürücü, yanında elektrikli araç"
                className="static aspect-[4/3] w-full object-cover object-center sm:aspect-[16/10]"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="grid gap-10 sm:gap-8">
              {QUOTES.map((q) => (
                <figure key={q.cite} className="relative border-l-4 border-brand-500 pl-6 dark:border-brand-400">
                  <blockquote className="text-xl font-bold leading-snug tracking-tight text-ink sm:text-2xl dark:text-white">
                    &ldquo;{q.text}&rdquo;
                  </blockquote>
                  <figcaption className="mt-3 text-base font-medium text-brand-600 dark:text-brand-400">
                    — {q.cite}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="ozellikler" className="scroll-mt-24 mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mb-14 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl dark:text-white">
            Sürücüler için tasarlandı
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Şarj ağına bağlı günlük kullanıcılar için: istasyon keşfi, oturum takibi ve fatura erişimi.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-slate-200 bg-white p-8 transition-colors hover:border-brand-200 dark:border-slate-800 dark:bg-[#111111] dark:hover:border-slate-700"
            >
              <feature.icon />
              <h3 className="mt-6 text-xl font-semibold text-ink dark:text-white">{feature.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0A0A0A]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-16 md:flex-row md:items-center md:py-20">
          <div>
            <h2 className="text-2xl font-bold text-ink sm:text-3xl dark:text-white">Hemen başlayın</h2>
            <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
              Müşteri hesabınızla uygulamaya girin veya yönetim paneline erişin.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-4">
            <Link to="/login" className={BTN_PRIMARY}>
              Kullanıcı Girişi
            </Link>
            <Link to="/login/admin" className={BTN_ADMIN}>
              Yönetim Girişi
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-8 text-base text-slate-500 md:flex-row md:items-center dark:border-slate-800 dark:text-slate-400">
          <span className="text-lg font-semibold text-ink dark:text-slate-300">VoltOps</span>
          <span>© {new Date().getFullYear()} VoltOps. Tüm hakları saklıdır.</span>
        </div>
      </footer>
    </PublicLayout>
  );
}

function StationIcon() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </div>
  );
}

function ChargeIcon() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>
  );
}

function SupportIcon() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    </div>
  );
}
