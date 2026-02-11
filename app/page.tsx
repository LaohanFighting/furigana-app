import Link from 'next/link';
import { LocaleProvider } from './LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { t } from '@/lib/i18n';

function getInitialLocale(searchParams: { get?: (k: string) => string | null }): 'zh' | 'ja' | 'en' {
  const lang = searchParams?.get?.('lang');
  return lang === 'ja' || lang === 'en' ? lang : 'zh';
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }> | { lang?: string };
}) {
  const resolved = typeof (searchParams as Promise<{ lang?: string }>)?.then === 'function'
    ? await (searchParams as Promise<{ lang?: string }>)
    : (searchParams as { lang?: string });
  const initial = getInitialLocale({ get: (k: string) => (resolved as Record<string, string>)[k] ?? null });
  return (
    <LocaleProvider initial={initial}>
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-stone-200 bg-white">
          <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
            <Link href="/" className="font-semibold text-stone-800">
              {t(initial, 'site.name')}
            </Link>
            <div className="flex items-center gap-4">
              <LocaleSwitcher current={initial} />
              <Link href="/dashboard" className="text-amber-600 hover:underline">
                {t(initial, 'nav.tool')}
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            {t(initial, 'landing.h1')}
          </h1>
          <h2 className="text-xl text-stone-600 font-normal mb-6">
            {t(initial, 'landing.h2')}
          </h2>
          <ul className="text-stone-700 space-y-2 mb-6">
            <li>✔ {t(initial, 'landing.feature1')}</li>
            <li>✔ {t(initial, 'landing.feature2')}</li>
            <li>✔ {t(initial, 'landing.feature3')}</li>
            <li>✔ {t(initial, 'landing.feature4')}</li>
          </ul>
          <div className="flex gap-4 mb-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              {t(initial, 'landing.cta_tool')}
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 border border-stone-300 rounded-lg hover:bg-stone-100"
            >
              {t(initial, 'landing.login')}
            </Link>
          </div>
          <p className="text-sm text-stone-400">
            {t(initial, 'landing.slogan')}
          </p>
          <footer className="mt-16 pt-8 border-t border-stone-200 text-sm text-stone-500">
            <Link href="/terms" className="mr-4">{t(initial, 'nav.terms')}</Link>
            <Link href="/privacy" className="mr-4">{t(initial, 'nav.privacy')}</Link>
            <Link href="/refund" className="mr-4">{t(initial, 'nav.refund')}</Link>
            <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || '2410382485@qq.com'}`}>
              {t(initial, 'contact.email')}: 2410382485@qq.com
            </a>
            <p className="mt-3 text-stone-400">
              {t(initial, 'landing.footer_note')}
            </p>
          </footer>
        </main>
      </div>
    </LocaleProvider>
  );
}
