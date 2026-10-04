# Mr. Big Belly — Customer ordering

The LIFF-wrapped site customers open from the LINE Official Account rich menu. Browse menu → cart → PromptPay slip → status.

## Stack
- Next.js 15 (App Router) · TypeScript · Tailwind
- LINE LIFF (`@line/liff`) for in-LINE auth
- Supabase (database + slip storage)

## Local setup
```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_LIFF_ID
npm install
npm run dev
```
The site runs at <http://localhost:3000>. Opening in a desktop browser falls back to a guest flow for development; opening via the LINE in-app browser via LIFF uses the real LINE user ID.

## Deploy (Netlify)
Netlify picks up `netlify.toml` automatically. Set these environment variables in Site settings → Environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_LIFF_ID`
- `SUPABASE_SECRET_KEY` (server-only; used by `/api/orders`)
