import 'server-only';

const ENDPOINT = 'https://api.line.me/v2/bot/message/push';

/** One push, best-effort. Says whether LINE took it. */
async function send(to: string | null | undefined, text: string): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !to) return false;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Sends the shop its own notification when an order arrives. Deliberately
// best-effort: a customer's order must never fail because the shop's alert
// could not go out.
export async function alertStaff(text: string, recipients: string[]): Promise<void> {
  await Promise.all(recipients.map((to) => send(to, text)));
}

/** A message to one customer, on the same terms: nice to have, never load-bearing. */
export async function pushLine(to: string | null | undefined, text: string): Promise<boolean> {
  return send(to, text);
}
