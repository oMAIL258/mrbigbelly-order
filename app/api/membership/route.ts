import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { lineUserFromToken } from '@/lib/line-verify';

export const dynamic = 'force-dynamic';

/**
 * Just enough for the sign-up page: whether this customer is already a member,
 * the number on their account, and the rules to show them.
 *
 * Deliberately not the whole profile. Somebody about to register has no points
 * history, no orders and no rewards, and the one thing they are waiting for is
 * a box to type a phone number into — so this asks for nothing it will not
 * show, and unlike the profile it does not create an account for a visitor who
 * only looked.
 */
export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string };

  const sb = supabaseServer();

  // The rules belong to the shop, not to the caller, so they are on their way
  // before LINE has finished saying who the caller is.
  const settingsSoon = sb
    .from('loyalty_settings')
    .select('satang_per_point, points_valid_months')
    .limit(1).maybeSingle();

  const who = await lineUserFromToken(token);
  if (!who) {
    void settingsSoon.then(() => {}, () => {});
    return NextResponse.json({ error: 'unverified' }, { status: 401 });
  }

  const [{ data: customer }, settings] = await Promise.all([
    sb.from('customers')
      .select('id, phone, points_balance, created_at')
      .eq('line_user_id', who.userId)
      .maybeSingle(),
    settingsSoon,
  ]);

  let points = customer?.points_balance ?? 0;
  if (customer && points > 0) {
    await sb.rpc('expire_points', { p_customer: customer.id });
    const { data: after } = await sb
      .from('customers').select('points_balance').eq('id', customer.id).maybeSingle();
    points = after?.points_balance ?? points;
  }

  return NextResponse.json({
    member: Boolean(customer),
    phone: customer?.phone ?? null,
    points,
    since: customer?.created_at ?? null,
    satangPerPoint: settings.data?.satang_per_point ?? 10000,
    validMonths: settings.data?.points_valid_months ?? 12,
  });
}
