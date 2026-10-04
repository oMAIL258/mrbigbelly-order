'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { baht } from '@/lib/money';
import { Header } from '@/components/Header';
import type { Category, MenuItem } from '@/lib/types';

export default function MenuPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = supabase();
      const [c, i] = await Promise.all([
        sb.from('categories').select('*').order('sort'),
        sb.from('menu_items').select('*').eq('is_available', true).order('sort'),
      ]);
      if (c.data) { setCats(c.data as Category[]); setActive((c.data as Category[])[0]?.id ?? null); }
      if (i.data) setItems(i.data as MenuItem[]);
      setLoading(false);
    })();
  }, []);

  const shown = useMemo(() => items.filter((it) => it.category_id === active), [items, active]);

  return (
    <>
      <Header />
      <section className="px-4 pt-4 pb-2">
        <h1 className="serif text-2xl leading-tight">Mr. Big Belly</h1>
        <p className="text-ink-3 text-sm">Juice & More · Bangkok</p>
      </section>

      <nav className="sticky top-[57px] z-10 flex gap-2 overflow-x-auto bg-bg/95 backdrop-blur px-4 py-2 border-b border-rule">
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition ${
              active === c.id ? 'bg-accent text-white' : 'bg-white border border-rule text-ink-2'
            }`}
          >
            {c.name_en}
          </button>
        ))}
      </nav>

      <ul className="px-4 py-3 space-y-3 pb-24">
        {loading && <li className="text-ink-3 text-sm text-center py-10">Loading menu…</li>}
        {!loading && shown.length === 0 && <li className="text-ink-3 text-sm text-center py-10">No items yet.</li>}
        {shown.map((it) => (
          <li key={it.id}>
            <Link href={`/dish/${it.id}`} className="card flex gap-3 p-3 hover:border-ink-3">
              <div className="flex-1 min-w-0">
                <div className="serif text-base leading-snug">{it.name_en}</div>
                {it.name_th && <div className="text-ink-3 text-xs">{it.name_th}</div>}
                {it.description && <p className="text-ink-2 text-sm mt-1 line-clamp-2">{it.description}</p>}
                <div className="mt-2 text-ink font-medium">{baht(it.price_satang)}</div>
              </div>
              {it.photo_url && (
                <img src={it.photo_url} alt="" className="h-20 w-20 rounded-xl object-cover" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
