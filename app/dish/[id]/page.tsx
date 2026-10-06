'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/lib/cart';
import { baht } from '@/lib/money';
import { Header } from '@/components/Header';
import { useLang, pickName, otherName } from '@/lib/i18n';
import type { MenuItem, OptionGroup, OptionRow } from '@/lib/types';

export default function DishPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const add = useCart((s) => s.add);
  const { lang, t } = useLang();

  const [item, setItem] = useState<MenuItem | null>(null);
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  useEffect(() => {
    (async () => {
      const sb = supabase();
      const { data: it } = await sb.from('menu_items').select('*').eq('id', id).single();
      if (!it) return;
      setItem(it as MenuItem);
      const { data: gs } = await sb.from('option_groups').select('*').eq('menu_item_id', id).order('sort');
      const groupIds = (gs ?? []).map((g: { id: string }) => g.id);
      const { data: os } = groupIds.length
        ? await sb.from('options').select('*').in('group_id', groupIds).order('sort')
        : { data: [] };
      const merged: OptionGroup[] = (gs ?? []).map((g) => ({
        ...(g as Omit<OptionGroup, 'options'>),
        options: ((os ?? []) as OptionRow[]).filter((o) => o.group_id === (g as { id: string }).id),
      }));
      setGroups(merged);
    })();
  }, [id]);

  function toggle(group: OptionGroup, optionId: string) {
    setPicked((p) => {
      const cur = p[group.id] ?? [];
      if (group.pick_kind === 'one') return { ...p, [group.id]: [optionId] };
      if (cur.includes(optionId)) return { ...p, [group.id]: cur.filter((x) => x !== optionId) };
      const limit = group.pick_kind === 'exact' ? (group.pick_count ?? 1) : Infinity;
      if (cur.length >= limit) return p;
      return { ...p, [group.id]: [...cur, optionId] };
    });
  }

  const valid = groups.every((g) => {
    const n = (picked[g.id] ?? []).length;
    if (g.pick_kind === 'one') return n === 1;
    if (g.pick_kind === 'exact') return n === (g.pick_count ?? 1);
    return true;
  });

  const extras = groups.flatMap((g) =>
    (picked[g.id] ?? []).map((oid) => {
      const o = g.options.find((x) => x.id === oid)!;
      return { group: g.name, label: o.label, price_delta_satang: o.price_delta_satang, id: o.id };
    }),
  );
  const unitPrice = (item?.price_satang ?? 0) + extras.reduce((n, e) => n + e.price_delta_satang, 0);

  function handleAdd() {
    if (!item || !valid) return;
    const key = `${item.id}:${extras.map((e) => e.id).sort().join(',')}:${note}`;
    add({
      key,
      item_id: item.id,
      name: pickName(lang, item.name_en, item.name_th),
      // The ticket must not change language with the customer, or a Thai
      // kitchen gets an English docket because a tourist switched the toggle.
      name_kitchen: item.name_th?.trim() || item.name_en,
      base_price_satang: item.price_satang,
      qty,
      option_ids: extras.map((e) => e.id),
      option_labels: extras.map(({ group, label, price_delta_satang }) => ({ group, label, price_delta_satang })),
      line_total_satang: unitPrice * qty,
      note: note || undefined,
    });
    router.push('/');
  }

  if (!item) return <><Header back="/" /><div className="p-6 text-ink-3">{t.loading}</div></>;

  return (
    <>
      <Header title={pickName(lang, item.name_en, item.name_th)} back="/" />
      {item.photo_url && <img src={item.photo_url} alt="" className="w-full h-56 object-cover" />}
      <div className="px-4 py-4">
        <h1 className="serif text-2xl">{pickName(lang, item.name_en, item.name_th)}</h1>
        {otherName(lang, item.name_en, item.name_th) && (
          <div className="text-ink-3 text-sm">{otherName(lang, item.name_en, item.name_th)}</div>
        )}
        {item.description && <p className="text-ink-2 text-sm mt-2">{item.description}</p>}
        <div className="mt-2 text-ink font-medium">{baht(item.price_satang)}</div>
      </div>

      {groups.map((g) => {
        const n = (picked[g.id] ?? []).length;
        const need = g.pick_kind === 'exact' ? (g.pick_count ?? 1) : g.pick_kind === 'one' ? 1 : 0;
        const ok = g.pick_kind === 'multi' || n === need;
        return (
          <section key={g.id} className="px-4 py-3 border-t border-rule">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="serif text-lg">{g.name}</h2>
              <span className={`text-xs ${ok ? 'text-ink-3' : 'text-accent'}`}>
                {g.pick_kind === 'one' && t.pickOne}
                {g.pick_kind === 'exact' && t.pickN(g.pick_count ?? 1, n)}
                {g.pick_kind === 'multi' && t.optional}
              </span>
            </div>
            <ul className="space-y-2">
              {g.options.map((o) => {
                const selected = (picked[g.id] ?? []).includes(o.id);
                return (
                  <li key={o.id}>
                    <button
                      onClick={() => toggle(g, o.id)}
                      className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${
                        selected ? 'border-accent bg-accent-soft/30' : 'border-rule bg-white'
                      }`}
                    >
                      <span>{o.label}</span>
                      {o.price_delta_satang !== 0 && (
                        <span className="text-ink-3">{o.price_delta_satang > 0 ? '+' : ''}{baht(o.price_delta_satang)}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section className="px-4 py-3 border-t border-rule">
        <label className="text-sm text-ink-2">{t.noteLabel}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-rule p-2 text-sm"
          placeholder={t.notePlaceholder}
        />
      </section>

      <div className="sticky bottom-0 bg-bg/95 backdrop-blur border-t border-rule px-4 py-3 flex items-center gap-3">
        <div className="flex items-center rounded-full border border-rule bg-white">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2">−</button>
          <span className="w-6 text-center text-sm">{qty}</span>
          <button onClick={() => setQty((q) => q + 1)} className="px-3 py-2">+</button>
        </div>
        <button
          onClick={handleAdd}
          disabled={!valid}
          className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t.add} {baht(unitPrice * qty)}
        </button>
      </div>
    </>
  );
}
