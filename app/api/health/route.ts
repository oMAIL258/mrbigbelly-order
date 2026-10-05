import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Booleans only, never the values. The admin Settings page reads this so the
// shop can see whether this site is able to send order alerts, rather than
// guessing at a variable it cannot see from there.
export async function GET() {
  return NextResponse.json({
    lineToken: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
    liffId: Boolean(process.env.NEXT_PUBLIC_LIFF_ID),
  });
}
