import 'server-only';

const ENDPOINT = 'https://api.line.me/v2/bot/message/push';

// Sends the shop its own notification when an order arrives. Deliberately
// best-effort: a customer's order must never fail because the shop's alert
// could not go out.
export async function alertStaff(text: string, recipients: string[]): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || recipients.length === 0) return;
  await Promise.all(recipients.map(async (to) => {
    try {
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
      });
    } catch { /* the order still stands */ }
  }));
}
