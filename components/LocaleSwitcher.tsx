'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n';

export default function LocaleSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function switchTo(loc: Locale) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('lang', loc);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <nav className="flex gap-2 text-sm">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchTo(loc)}
          className={`px-2 py-1 rounded ${current === loc ? 'bg-stone-700 text-white' : 'bg-stone-200 hover:bg-stone-300'}`}
        >
          {loc === 'zh' ? '中' : loc === 'ja' ? '日' : 'EN'}
        </button>
      ))}
    </nav>
  );
}
