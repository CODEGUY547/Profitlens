# ProfitLens

ProfitLens is a private Next.js sales and profit tracker for jewellery, customized orders, watches, customer balances and general business expenses.

## Services

- Vercel hosts the standard Next.js application.
- Supabase Auth protects the dashboard.
- Supabase Postgres stores orders and expenses.
- Supabase Storage stores private item photos.

## Environment variables

Connect the Supabase Marketplace integration to the Vercel project. It supplies:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

For local development, copy `.env.example` to `.env.local` and fill the values from the connected Supabase project. Never commit `.env.local`.

## Database setup

Run `supabase/migrations/202610080001_profitlens.sql` once in the Supabase SQL Editor. It creates the orders and expenses tables, the private `order-photos` bucket, and Row Level Security policies.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run build
```
