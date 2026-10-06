'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { baht } from '@/lib/money';
import { useCart } from '@/lib/cart';
import { Header } from '@/components/Header';
import { OngoingOrder } from '@/components/OngoingOrder';
import { useLang, pickName } from '@/lib/i18n';
import { dishTitle, dishSubtitle } from '@/lib/names';
import type { Category, MenuItem, StoreSettings } from '@/lib/types';

export default function MenuPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { lang, t } = useLang();
  const lastCategoryId = useCart((s) => s.lastCategoryId);
  const setLastCategoryId = useCart((s) => s.setLastCategoryId);

  useEffect(() => {
    (async () => {
      const sb = supabase();
      const [c, i, s] = await Promise.all([
        sb.from('categories').select('*').order('sort'),
        sb.from('menu_items').select('*').eq('is_available', true).order('sort'),
        sb.from('store_settings').select('*').limit(1).maybeSingle(),
      ]);
      const categories = (c.data ?? []) as Category[];
      setCats(categories);
      setItems((i.data ?? []) as MenuItem[]);
      if (s.data) setSettings(s.data as StoreSettings);
      // Come back to the category the customer was browsing, not the first tab.
      const remembered = categories.find((x) => x.id === lastCategoryId);
      setActive(remembered?.id ?? categories[0]?.id ?? null);
      setLoading(false);
    })();
    // lastCategoryId is read once on load on purpose: changing tabs must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickCategory(id: string) {
    setActive(id);
    setLastCategoryId(id);
  }

  const shown = useMemo(() => items.filter((it) => it.category_id === active), [items, active]);
  const closed = settings ? !settings.accepting_orders : false;

  return (
    <>
      <Header />
      <section className="px-4 pt-4 pb-2">
        <h1 className="serif text-2xl leading-tight">Mr. Big Belly</h1>
        <p className="text-ink-3 text-sm">{t.tagline}</p>
      </section>

      <OngoingOrder />

      {closed && (
        <div className="mx-4 mb-2 rounded-xl border border-accent bg-accent-soft/25 p-3">
          <div className="serif text-base">{t.closedTitle}</div>
          <p className="text-ink-2 text-sm mt-1">
            {settings?.closed_message?.trim() || t.closedBody}
          </p>
        </div>
      )}

      <nav className="sticky top-[57px] z-10 flex gap-2 overflow-x-auto bg-bg/95 backdrop-blur px-4 py-2 border-b border-rule">
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => pickCategory(c.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition ${
              active === c.id ? 'bg-accent text-white' : 'bg-white border border-rule text-ink-2'
            }`}
          >
            {pickName(lang, c.name_en, c.name_th)}
          </button>
        ))}
      </nav>

      <ul className="px-4 py-3 space-y-3 pb-24">
        {loading && <li className="text-ink-3 text-sm text-center py-10">{t.loadingMenu}</li>}
        {!loading && shown.length === 0 && <li className="text-ink-3 text-sm text-center py-10">{t.noItems}</li>}
        {shown.map((it) => (
          <li key={it.id}>
            <Link href={`/dish/${it.id}`} className="card flex gap-3 p-3 hover:border-ink-3">
              <div className="flex-1 min-w-0">
                <div className="serif text-base leading-snug">{dishTitle(lang, it.name_en, it.name_th)}</div>
                {dishSubtitle(lang, it.name_en, it.name_th) && (
                  <div className="text-ink-3 text-xs">{dishSubtitle(lang, it.name_en, it.name_th)}</div>
                )}
                {it.description && <p className="text-ink-2 text-sm mt-1 line-clamp-2">{it.description}</p>}
                <div className="mt-2 text-ink font-medium">{baht(it.price_satang)}</div>
              </div>
              {it.photo_url && (
                <img src={it.photo_url} alt="" loading="lazy" className="h-20 w-20 rounded-xl object-cover shrink-0" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
