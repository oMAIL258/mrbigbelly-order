'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { baht } from '@/lib/money';
import { Header } from '@/components/Header';

type Order = {
  id: string;
  status: 'new' | 'confirmed' | 'ready' | 'done' | 'rejected';
  total_satang: number;
  fulfilment_mode: 'pickup' | 'delivery';
  prep_minutes: number | null;
  reject_reason: string | null;
  created_at: string;
};

const STEPS: { key: Order['status']; label: string }[] = [
  { key: 'new', label: 'Waiting for the shop' },
  { key: 'confirmed', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'done', label: 'Picked up / Delivered' },
];

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const sb = supabase();
    (async () => {
      const { data } = await sb.from('orders').select('*').eq('id', id).single();
      if (data) setOrder(data as Order);
    })();
    const channel = sb
      .channel(`order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => {
        setOrder(payload.new as Order);
      })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [id]);

  if (!order) return <><Header back="/" /><div className="p-6 text-ink-3">Loading your order…</div></>;

  if (order.status === 'rejected') {
    return (
      <>
        <Header title="Order" back="/" />
        <div className="p-6 text-center">
          <div className="serif text-xl text-accent">Order declined</div>
          {order.reject_reason && <p className="text-ink-2 mt-2 text-sm">{order.reject_reason}</p>}
          <p className="text-ink-3 text-xs mt-4">If you were charged, the shop will arrange a refund via LINE.</p>
        </div>
      </>
    );
  }

  const idx = STEPS.findIndex((s) => s.key === order.status);

  return (
    <>
      <Header title="Order status" back="/" />
      <section className="px-4 py-6 text-center">
        <div className="serif text-2xl">{STEPS[idx]?.label ?? order.status}</div>
        {order.status === 'confirmed' && order.prep_minutes && (
          <p className="text-ink-2 text-sm mt-2">
            Ready in about <strong>{order.prep_minutes} min</strong>
          </p>
        )}
      </section>

      <ol className="px-4 space-y-2">
        {STEPS.map((s, i) => (
          <li key={s.key} className={`flex items-center gap-3 rounded-xl border p-3 ${i <= idx ? 'border-accent bg-accent-soft/20' : 'border-rule bg-white'}`}>
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${i <= idx ? 'bg-accent text-white' : 'bg-surface-2 text-ink-3'}`}>
              {i < idx ? '✓' : i + 1}
            </span>
            <span className="text-sm">{s.label}</span>
          </li>
        ))}
      </ol>

      <section className="px-4 py-6 mt-2 border-t border-rule">
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">Total paid</span>
          <span className="font-medium">{baht(order.total_satang)}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-ink-2">Fulfilment</span>
          <span>{order.fulfilment_mode === 'pickup' ? 'Pickup' : 'Delivery'}</span>
        </div>
      </section>
    </>
  );
}
