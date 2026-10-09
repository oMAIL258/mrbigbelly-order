import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import type { Fulfilment } from '@/lib/types';
import { alertStaff } from '@/lib/line-server';
import { lineUserFromToken } from '@/lib/line-verify';

type OptionLabel = { group: string; label: string; price_delta_satang: number };
type LinePayload = {
  item_id: string;
  name: string;
  base_price_satang: number;
  qty: number;
  options: OptionLabel[];
  option_ids: string[];
  line_total_satang: number;
  note: string | null;
};
type Body = {
  line_user_id: string | null;
  display_name: string | null;
  lines: LinePayload[];
  /** Kept for older pages; the server prices the order from its own lines. */
  total_satang: number;
  fulfilment: Fulfilment;
  slip_path: string;
  /** The LIFF access token, when the order was placed inside LINE. */
  token?: string | null;
  /** An approved reward the customer is spending on this order. */
  redemption_id?: string | null;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  if (!body.lines?.length) return NextResponse.json({ error: 'empty' }, { status: 400 });

  const sb = supabaseServer();

  const { data: settings } = await sb.from('store_settings').select('accepting_orders, closed_message').limit(1).maybeSingle();
  if (settings && !settings.accepting_orders) {
    return NextResponse.json(
      { error: settings.closed_message?.trim() || 'The shop is not taking orders right now.' },
      { status: 409 },
    );
  }

  // Who the order belongs to. Inside LINE this comes from LINE rather than
  // from the page, because the points it earns are worth money and a browser
  // could name anybody.
  const verified = await lineUserFromToken(body.token);
  const lineId = verified?.userId ?? body.line_user_id;
  const displayName = verified?.displayName ?? body.display_name;

  let customer_id: string | null = null;
  if (lineId) {
    const upserted = await sb
      .from('customers')
      .upsert({ line_user_id: lineId, display_name: displayName }, { onConflict: 'line_user_id' })
      .select('id')
      .single();
    customer_id = upserted.data?.id ?? null;
  }

  // The order is priced from its own lines, so what the customer is asked to
  // transfer and what is written down cannot drift apart.
  const subtotal = Math.round(body.lines.reduce((n, l) => n + (l.line_total_satang ?? 0), 0));

  let discount = 0;
  let redemption_id: string | null = null;
  if (body.redemption_id) {
    // Spending a voucher is spending money, so this needs LINE's word on who
    // is asking, not the page's.
    if (!verified || !customer_id) {
      return NextResponse.json({ error: 'unverified' }, { status: 401 });
    }
    const { data: voucher } = await sb
      .from('redemptions')
      .select('id, status, discount_satang, customer_id')
      .eq('id', body.redemption_id)
      .maybeSingle();
    if (!voucher || voucher.customer_id !== customer_id || !voucher.discount_satang) {
      return NextResponse.json({ error: 'no such discount' }, { status: 404 });
    }
    if (voucher.status !== 'approved') {
      return NextResponse.json({ error: 'discount used' }, { status: 409 });
    }
    // A voucher worth more than the order covers the whole bill, and whatever
    // is left over is not kept. The customer is asked to confirm that on the
    // payment screen before it gets here; what is written down is the part
    // that was actually used, so the three columns always add up.
    discount = Math.min(voucher.discount_satang, subtotal);
    redemption_id = voucher.id;
  }

  // Nothing to transfer, so there is no slip to wait for.
  const nothingToPay = subtotal - discount === 0;

  const insOrder = await sb.from('orders').insert({
    customer_id,
    status: 'new',
    subtotal_satang: subtotal,
    discount_satang: discount,
    total_satang: subtotal - discount,
    redemption_id,
    fulfilment_mode: body.fulfilment.mode,
    area_slug: body.fulfilment.mode === 'delivery' ? body.fulfilment.area_slug : null,
  }).select('id').single();
  if (insOrder.error) {
    // A unique index means one voucher reaches one order, whatever two taps on
    // a slow connection try at once. The customer is told to try again without
    // it rather than being charged the discounted amount for nothing.
    const clash = redemption_id && /orders_redemption_once/.test(insOrder.error.message);
    return NextResponse.json(
      { error: clash ? 'discount used' : insOrder.error.message },
      { status: clash ? 409 : 500 },
    );
  }
  const order_id = insOrder.data.id as string;

  if (redemption_id) {
    await sb.from('redemptions')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('id', redemption_id)
      .eq('status', 'approved');
  }

  if (body.fulfilment.mode === 'delivery') {
    await sb.from('delivery_details').insert({
      order_id,
      area_slug: body.fulfilment.area_slug,
      address: body.fulfilment.address,
      contact_name: body.fulfilment.name,
      contact_phone: body.fulfilment.phone,
    });
  }

  for (const l of body.lines) {
    const insLine = await sb.from('order_items').insert({
      order_id, menu_item_id: l.item_id, name_snapshot: l.name,
      base_price_satang: l.base_price_satang, qty: l.qty,
      line_total_satang: l.line_total_satang, note: l.note,
    }).select('id').single();
    if (insLine.error) continue;
    const oi_id = insLine.data.id as string;
    if (l.options.length) {
      await sb.from('order_item_options').insert(
        l.options.map((o, i) => ({
          order_item_id: oi_id,
          option_id: l.option_ids[i] ?? null,
          group_name: o.group, label: o.label,
          price_delta_satang: o.price_delta_satang,
        })),
      );
    }
  }

  if (body.slip_path) {
    await sb.from('payment_slips').insert({ order_id, storage_path: body.slip_path });
  }

  const { data: order } = await sb.from('orders').select('short_code').eq('id', order_id).maybeSingle();
  const { data: staff } = await sb.from('staff_alerts').select('line_user_id');
  const items = body.lines.map((l) => `• ${l.qty}× ${l.name}`).join('\n');
  const pickup = body.fulfilment.mode === 'pickup';
  const paid = subtotal - discount;
  const total = nothingToPay
    ? `฿0 · จ่ายด้วยแต้มทั้งหมด ไม่มีสลิป / paid with points, no slip`
    : discount > 0
      ? `฿${(paid / 100).toLocaleString('en-US')} (ลด ฿${(discount / 100).toLocaleString('en-US')})`
      : `฿${(paid / 100).toLocaleString('en-US')}`;

  // The shop wants to know who it is before opening the board. A delivery
  // order carries the name they typed for the rider, which is the one that
  // matters at the door; their LINE name rides along when it is a different
  // one. A pickup order outside LINE has no name to give, so the line is left
  // out rather than printed empty.
  const lineName = displayName?.trim() || null;
  const contactName = body.fulfilment.mode === 'delivery' ? body.fulfilment.name?.trim() || null : null;
  const customerName = contactName && lineName && contactName !== lineName
    ? `${contactName} (LINE: ${lineName})`
    : contactName ?? lineName;

  await alertStaff(
    `🔔 ออเดอร์ใหม่ / NEW ORDER ${order?.short_code ?? ''}\n`
    + (customerName ? `👤 ${customerName}\n` : '')
    + `${pickup ? 'รับที่ร้าน / Pickup' : 'จัดส่ง / Delivery'} · ${total}\n\n`
    + `${items}\n\n`
    + 'เปิดหน้าออเดอร์เพื่อรับออเดอร์\nOpen the order board to accept it.',
    ((staff ?? []) as { line_user_id: string }[]).map((r) => r.line_user_id),
  );

  return NextResponse.json({ order_id });
}
