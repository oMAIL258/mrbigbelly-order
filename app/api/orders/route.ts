import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import type { Fulfilment } from '@/lib/types';
import { alertStaff } from '@/lib/line-server';

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
  total_satang: number;
  fulfilment: Fulfilment;
  slip_path: string;
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

  let customer_id: string | null = null;
  if (body.line_user_id) {
    const upserted = await sb
      .from('customers')
      .upsert({ line_user_id: body.line_user_id, display_name: body.display_name }, { onConflict: 'line_user_id' })
      .select('id')
      .single();
    customer_id = upserted.data?.id ?? null;
  }

  const insOrder = await sb.from('orders').insert({
    customer_id,
    status: 'new',
    total_satang: body.total_satang,
    fulfilment_mode: body.fulfilment.mode,
    area_slug: body.fulfilment.mode === 'delivery' ? body.fulfilment.area_slug : null,
  }).select('id').single();
  if (insOrder.error) return NextResponse.json({ error: insOrder.error.message }, { status: 500 });
  const order_id = insOrder.data.id as string;

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

  await sb.from('payment_slips').insert({ order_id, storage_path: body.slip_path });

  const { data: order } = await sb.from('orders').select('short_code').eq('id', order_id).maybeSingle();
  const { data: staff } = await sb.from('staff_alerts').select('line_user_id');
  const items = body.lines.map((l) => `• ${l.qty}× ${l.name}`).join('\n');
  const pickup = body.fulfilment.mode === 'pickup';
  const total = `฿${(body.total_satang / 100).toLocaleString('en-US')}`;

  // The shop wants to know who it is before opening the board. A delivery
  // order carries the name they typed for the rider, which is the one that
  // matters at the door; their LINE name rides along when it is a different
  // one. A pickup order outside LINE has no name to give, so the line is left
  // out rather than printed empty.
  const lineName = body.display_name?.trim() || null;
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
