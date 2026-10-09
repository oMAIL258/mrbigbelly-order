'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { baht } from '@/lib/money';
import { Header } from '@/components/Header';
import { StatusArt } from '@/components/StatusArt';
import { useCart } from '@/lib/cart';
import { useLang, rejectReason } from '@/lib/i18n';

type Order = {
  id: string;
  short_code: string | null;
  status: 'new' | 'confirmed' | 'ready' | 'done' | 'rejected';
  subtotal_satang: number | null;
  discount_satang: number | null;
  total_satang: number;
  fulfilment_mode: 'pickup' | 'delivery';
  prep_minutes: number | null;
  reject_reason: string | null;
  created_at: string;
};

const STEP_KEYS = ['new', 'confirmed', 'ready', 'done'] as const;

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const setActiveOrderId = useCart((s) => s.setActiveOrderId);
  const { t } = useLang();

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

  if (!order) return <><Header back="/" /><div className="p-6 text-ink-3">{t.loadingOrder}</div></>;

  if (order.status === 'rejected') {
    return (
      <>
        <Header title={t.orderStatus} back="/" />
        <div className="p-6 text-center step-rise">
          <div className="serif text-xl text-accent">{t.declined}</div>
          {rejectReason(t, order.reject_reason) && (
            <p className="text-ink-2 mt-2 text-sm">{rejectReason(t, order.reject_reason)}</p>
          )}
          <p className="text-ink-3 text-xs mt-4">{t.declinedNote}</p>
        </div>
      </>
    );
  }

  const pickup = order.fulfilment_mode === 'pickup';
  const labelFor = (key: (typeof STEP_KEYS)[number]) => {
    if (key === 'new') return t.stepNew;
    if (key === 'confirmed') return t.stepConfirmed;
    if (key === 'ready') return pickup ? t.stepReadyPickup : t.stepReadyDelivery;
    return pickup ? t.stepDonePickup : t.stepDoneDelivery;
  };
  const idx = STEP_KEYS.indexOf(order.status as (typeof STEP_KEYS)[number]);

  return (
    <>
      <Header title={t.orderStatus} back="/" />
      <section className="px-4 pt-5 pb-2">
        <StatusArt status={order.status} mode={order.fulfilment_mode} />
      </section>

      <section className="px-4 pb-6 text-center step-rise">
        {order.short_code && <div className="text-ink-3 text-xs">{t.orderNo} {order.short_code}</div>}
        <div className="serif text-2xl mt-1">{idx >= 0 ? labelFor(STEP_KEYS[idx]) : order.status}</div>
        {order.status === 'confirmed' && order.prep_minutes && (
          <p className="text-ink-2 text-sm mt-2">{t.readyInAbout(order.prep_minutes)}</p>
        )}
        {order.status === 'ready' && (
          <p className="text-ink-2 text-sm mt-2">{pickup ? t.comeGrab : t.onTheWay}</p>
        )}
      </section>

      <ol className="px-4 space-y-2">
        {STEP_KEYS.map((key, i) => {
          const done = i < idx;
          const activeStep = i === idx;
          return (
            <li
              key={key}
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
              <span className="text-sm">{labelFor(key)}</span>
            </li>
          );
        })}
      </ol>

      <section className="px-4 py-6 mt-2 border-t border-rule">
        {order.discount_satang ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-ink-2">{t.subtotal}</span>
              <span>{baht(order.subtotal_satang ?? order.total_satang)}</span>
            </div>
            <div className="flex justify-between text-sm text-veg mt-1">
              <span>{t.discountApplied}</span>
              <span>−{baht(order.discount_satang)}</span>
            </div>
          </>
        ) : null}
        <div className={`flex justify-between text-sm ${order.discount_satang ? 'mt-1' : ''}`}>
          <span className="text-ink-2">{t.totalPaid}</span>
          <span className="font-medium">{baht(order.total_satang)}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-ink-2">{t.fulfilment}</span>
          <span>{pickup ? t.pickup : t.delivery}</span>
        </div>
      </section>
    </>
  );
}
