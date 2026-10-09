import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { lineUserFromToken } from '@/lib/line-verify';
import { alertStaff } from '@/lib/line-server';

export const dynamic = 'force-dynamic';

/**
 * A customer asking to use a reward. The points come off now, so the same
 * balance cannot be promised twice while the shop is deciding; declining the
 * request puts them straight back.
 */
export async function POST(req: NextRequest) {
  const { token, reward_id } = (await req.json()) as { token?: string; reward_id?: string };
  const who = await lineUserFromToken(token);
  if (!who) return NextResponse.json({ error: 'unverified' }, { status: 401 });
  if (!reward_id) return NextResponse.json({ error: 'no reward' }, { status: 400 });

  const sb = supabaseServer();

  const { data: found } = await sb
    .from('customers')
    .upsert({ line_user_id: who.userId, display_name: who.displayName }, { onConflict: 'line_user_id' })
    .select('id')
    .single();
  if (!found) return NextResponse.json({ error: 'no profile' }, { status: 500 });

  // Points that ran out are gone before the balance is read, so nothing can be
  // claimed with them in the window before anybody happens to look.
  await sb.rpc('expire_points', { p_customer: found.id });

  const { data: customer } = await sb
    .from('customers')
    .select('id, display_name, points_balance')
    .eq('id', found.id)
    .single();
  if (!customer) return NextResponse.json({ error: 'no profile' }, { status: 500 });

  const { data: reward } = await sb.from('rewards').select('*').eq('id', reward_id).maybeSingle();
  if (!reward || !reward.is_active) return NextResponse.json({ error: 'gone' }, { status: 404 });

  const now = Date.now();
  if (reward.starts_at && new Date(reward.starts_at).getTime() > now) {
    return NextResponse.json({ error: 'not yet' }, { status: 409 });
  }
  if (reward.ends_at && new Date(reward.ends_at).getTime() < now) {
    return NextResponse.json({ error: 'expired' }, { status: 409 });
  }
  if (reward.stock !== null && reward.stock <= 0) {
    return NextResponse.json({ error: 'out of stock' }, { status: 409 });
  }
  if ((customer.points_balance ?? 0) < reward.points_cost) {
    return NextResponse.json(
      { error: 'not enough points', balance: customer.points_balance, cost: reward.points_cost },
      { status: 409 },
    );
  }

  // One request at a time for the same reward, so a double tap on a slow
  // connection cannot spend the points twice.
  const { data: already } = await sb.from('redemptions')
    .select('id')
    .eq('customer_id', customer.id)
    .eq('reward_id', reward_id)
    .eq('status', 'pending')
    .maybeSingle();
  if (already) return NextResponse.json({ error: 'already pending', id: already.id }, { status: 409 });

  const { data: claim, error } = await sb.from('redemptions').insert({
    customer_id: customer.id,
    reward_id,
    reward_title_th: reward.title_th,
    reward_title_en: reward.title_en,
    points_cost: reward.points_cost,
    discount_satang: reward.discount_satang ?? null,
    status: 'pending',
  }).select('id').single();
  if (error || !claim) return NextResponse.json({ error: error?.message ?? 'failed' }, { status: 500 });

  const { error: spendError } = await sb.from('point_events').insert({
    customer_id: customer.id,
    delta: -reward.points_cost,
    kind: 'redeem',
    redemption_id: claim.id,
    note: reward.title_en,
  });
  // Taking the points is the part that must not half-happen: if it fails, the
  // request goes away again rather than sitting there unpaid for.
  if (spendError) {
    await sb.from('redemptions').delete().eq('id', claim.id);
    return NextResponse.json({ error: spendError.message }, { status: 500 });
  }

  const { data: staff } = await sb.from('staff_alerts').select('line_user_id');
  await alertStaff(
    `🎁 ขอใช้สิทธิ์ / REWARD REQUEST\n`
    + `${customer.display_name ?? who.displayName ?? 'ลูกค้า'}\n`
    + `${reward.title_th} (${reward.points_cost} แต้ม`
    + `${reward.discount_satang ? ` · ลด ฿${(reward.discount_satang / 100).toLocaleString('en-US')}` : ''})\n\n`
    + `${reward.title_en}\n`
    + 'เปิดหน้าคำขอเพื่ออนุมัติ\nOpen Requests in the admin to approve it.',
    ((staff ?? []) as { line_user_id: string }[]).map((r) => r.line_user_id),
  );

  const { data: after } = await sb.from('customers').select('points_balance').eq('id', customer.id).maybeSingle();

  return NextResponse.json({ ok: true, id: claim.id, balance: after?.points_balance ?? 0 });
}
