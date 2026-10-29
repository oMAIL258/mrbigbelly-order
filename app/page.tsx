'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { baht } from '@/lib/money';
import { useCart } from '@/lib/cart';
import { Header } from '@/components/Header';
import { OngoingOrder } from '@/components/OngoingOrder';
import { MemberStrip } from '@/components/MemberStrip';
import { useLang, pickName } from '@/lib/i18n';
import { dishTitle, dishSubtitle } from '@/lib/names';
import { cachedMenu, fetchMenu, menuIsStale } from '@/lib/menu-cache';
import { categoryOpen, clock } from '@/lib/hours';
import { promoLive } from '@/lib/promo';
import { useShopMinutes } from '@/lib/use-hours';
import type { Category, MenuItem, Promotion, StoreSettings } from '@/lib/types';

export default function MenuPage() {
  // Whatever the last visit already fetched, so coming back from a dish paints
  // the menu immediately instead of showing a spinner over the same list.
  const first = cachedMenu();
  const [cats, setCats] = useState<Category[]>(first?.cats ?? []);
  const [items, setItems] = useState<MenuItem[]>(first?.items ?? []);
  const [settings, setSettings] = useState<StoreSettings | null>(first?.settings ?? null);
  const [promos, setPromos] = useState<Promotion[]>(first?.promos ?? []);
  const now = useShopMinutes();
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(!first);
  const { lang, t } = useLang();
  const lastCategoryId = useCart((s) => s.lastCategoryId);
  const setLastCategoryId = useCart((s) => s.setLastCategoryId);

  useEffect(() => {
    const show = (data: { cats: Category[]; items: MenuItem[]; settings: StoreSettings | null; promos: Promotion[] }) => {
      setCats(data.cats);
      setItems(data.items);
      setSettings(data.settings);
      setPromos(data.promos);
      // Come back to the category the customer was browsing, not the first tab.
      setActive((current) => {
        if (current && data.cats.some((x) => x.id === current)) return current;
        const remembered = data.cats.find((x) => x.id === lastCategoryId);
        return remembered?.id ?? data.cats[0]?.id ?? null;
      });
      setLoading(false);
    };

    if (first) show(first);
    if (!first || menuIsStale()) void fetchMenu().then(show);
    // first and lastCategoryId are read once on purpose: switching tabs must
    // not refetch, and must not jump the customer back to a remembered one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickCategory(id: string) {
    setActive(id);
    setLastCategoryId(id);
  }

  const shown = useMemo(() => items.filter((it) => it.category_id === active), [items, active]);
  const closed = settings ? !settings.accepting_orders : false;
  const activeCat = cats.find((c) => c.id === active);
  // Shown with the time it opens rather than hidden, so the customer knows
  // the burger is coming and when.
  const notYet = activeCat && !categoryOpen(activeCat, now) ? clock(activeCat.available_from!) : null;
  const deals = promos.filter((p) => promoLive(p, now));
  const dealOn = (id: string) => deals.find((p) => p.item_ids.includes(id));

  return (
    <>
      <Header />
      <section className="px-4 pt-4 pb-2">
        <h1 className="serif text-2xl leading-tight">Mr. Big Belly</h1>
        <p className="text-ink-3 text-sm">{t.tagline}</p>
      </section>

      <OngoingOrder />
      <MemberStrip />

      {closed && (
        <div className="mx-4 mb-2 rounded-xl border border-accent bg-accent-soft/25 p-3">
          <div className="serif text-base">{t.closedTitle}</div>
          <p className="text-ink-2 text-sm mt-1">
            {settings?.closed_message?.trim() || t.closedBody}
          </p>
        </div>
      )}

      {!closed && deals.map((p) => (
        <div key={p.id} className="mx-4 mb-2 rounded-xl border border-veg bg-white p-3">
          <div className="serif text-base">☕ {lang === 'th' ? p.title_th : p.title_en}</div>
          <p className="text-ink-3 text-xs mt-0.5">{t.dealUntil(clock(p.ends_at))}</p>
        </div>
      ))}

      <nav className="sticky top-[57px] z-10 flex gap-2 overflow-x-auto bg-bg/95 backdrop-blur px-4 py-2 border-b border-rule">
        {cats.map((c) => {
          const later = !categoryOpen(c, now);
          return (
            <button
              key={c.id}
              onClick={() => pickCategory(c.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition ${
                active === c.id ? 'bg-accent text-white' : 'bg-white border border-rule text-ink-2'
              } ${later && active !== c.id ? 'opacity-60' : ''}`}
            >
              {pickName(lang, c.name_en, c.name_th)}
              {later && <span className="ml-1 text-[10px] opacity-80">{clock(c.available_from!)}</span>}
            </button>
          );
        })}
      </nav>

      {notYet && !closed && (
        <div className="mx-4 mt-3 rounded-xl border border-rule bg-surface-2 p-3 text-sm text-ink-2">
          🕘 {t.notYetTitle(notYet)}
        </div>
      )}

      <ul className={`px-4 py-3 space-y-3 pb-24 ${notYet ? 'opacity-60' : ''}`}>
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
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-ink font-medium">{baht(it.price_satang)}</span>
                  {dealOn(it.id) && (
                    <span className="rounded-full border border-veg text-veg px-2 py-0.5 text-xs font-medium">
                      {t.dealChip(dealOn(it.id)!.bundle_qty, dealOn(it.id)!.bundle_price_satang / 100)}
                    </span>
                  )}
                </div>
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
