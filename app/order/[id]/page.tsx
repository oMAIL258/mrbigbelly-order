'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { baht } from '@/lib/money';
import { Header } from '@/components/Header';
import { StatusArt } from '@/components/StatusArt';
import { useCart } from '@/lib/cart';

type Order = {
  id: string;
  short_code: string | null;
  status: 'new' | 'confirmed' | 'ready' | 'done' | 'rejected';
  total_satang: number;
  fulfilment_mode: 'pickup' | 'delivery';
  prep_minutes: number | null;
  reject_reason: string | null;
  created_at: string;
};

const STEPS = [
  { key: 'new', label: 'Waiting for the shop', note: 'We’re checking your payment slip.' },
  { key: 'confirmed', label: 'Preparing your order', note: 'The kitchen is on it.' },
  { key: 'ready', pickup: 'Ready for pickup', delivery: 'Out for delivery' },
  { key: 'done', pickup: 'Picked up', delivery: 'Delivered' },
] as const;

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const setActiveOrderId = useCart((s) => s.setActiveOrderId);

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

  // Opening this page is itself a claim that the order is the live one, which
  // covers customers who follow the LINE link on a phone that never held the
  // cart. Finished orders are forgotten so the menu banner disappears.
  useEffect(() => {
    if (!order) return;
    setActiveOrderId(order.status === 'done' || order.status === 'rejected' ? null : order.id);
  }, [order, setActiveOrderId]);

  if (!order) return <><Header back="/" /><div className="p-6 text-ink-3">Loading your order…</div></>;

  if (order.status === 'rejected') {
    return (
      <>
        <Header title="Order" back="/" />
        <div className="p-6 text-center step-rise">
          <div className="serif text-xl text-accent">Order declined</div>
          {order.reject_reason && <p className="text-ink-2 mt-2 text-sm">{order.reject_reason}</p>}
          <p className="text-ink-3 text-xs mt-4">If you were charged, the shop will arrange a refund via LINE.</p>
        </div>
      </>
    );
  }

  const idx = STEPS.findIndex((s) => s.key === order.status);
  const labelFor = (s: (typeof STEPS)[number]) =>
    'label' in s ? s.label : order.fulfilment_mode === 'pickup' ? s.pickup : s.delivery;
  const current = STEPS[idx];

  return (
    <>
      <Header title="Order status" back="/" />
      <section className="px-4 pt-5 pb-2">
        <StatusArt status={order.status} mode={order.fulfilment_mode} />
      </section>

      <section className="px-4 pb-6 text-center step-rise">
        {order.short_code && <div className="text-ink-3 text-xs">Order {order.short_code}</div>}
        <div className="serif text-2xl mt-1">{current ? labelFor(current) : order.status}</div>
        {order.status === 'confirmed' && order.prep_minutes && (
          <p className="text-ink-2 text-sm mt-2">
            Ready in about <strong>{order.prep_minutes} min</strong>
          </p>
        )}
        {order.status === 'ready' && (
          <p className="text-ink-2 text-sm mt-2">
            {order.fulfilment_mode === 'pickup' ? 'Come and grab it!' : 'On the way to you now.'}
          </p>
        )}
      </section>

      <ol className="px-4 space-y-2">
        {STEPS.map((s, i) => {
          const done = i < idx;
          const activeStep = i === idx;
          return (
            <li
              key={s.key}
              className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                i <= idx ? 'border-accent bg-accent-soft/20' : 'border-rule bg-white'
              } ${activeStep ? 'sweep' : ''}`}
            >
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  i <= idx ? 'bg-accent text-white' : 'bg-surface-2 text-ink-3'
                } ${activeStep ? 'step-active' : ''}`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className="text-sm">{labelFor(s)}</span>
            </li>
          );
        })}
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
