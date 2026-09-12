# Sameeja Commission Services

A modern invoice and payment-tracking application for meat deliveries to Metro stores. It focuses on the business's core workflow: invoice preparation, owner approval, partial payments, manually allocated combined payments, and outstanding balances.

## Product rules

- Staff can create and submit invoice drafts, but cannot edit a submitted invoice.
- The owner can review, edit, issue, cancel, and record payments.
- A combined customer payment is allocated only to invoices the owner explicitly selects.
- The application never automatically settles other outstanding invoices.
- Expenses, purchasing costs, labor, taxes, wastage, and profit tracking are intentionally out of scope.

## Technology

- Next.js-compatible Vinext application with TypeScript and Tailwind CSS
- Supabase PostgreSQL for cloud data storage
- Server-only Supabase Data API access; the secret key is never exposed to browser code
- Sign in with ChatGPT when hosted with Sites; local development uses the Sites mock identity

## Connect Supabase

1. Create a Supabase project.
2. Open the Supabase SQL editor and run [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql).
3. Copy `.env.example` to `.env.local`.
4. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env.local`. Use a server-side `sb_secret_...` key and never commit it.
5. Restart the development server.

Without those variables the application runs in read-only demo mode using sample invoice data.

## Run locally

```bash
npm ci --prefer-offline --no-audit --no-fund
npm run dev
```

Open `http://localhost:5173`. A production verification build is available through `npm run build`.

## Main routes

- `/` dashboard and collection summary
- `/invoices` invoice register
- `/invoices/new` staff/owner invoice preparation
- `/payments/new` owner-only manual payment allocation
- `/team` owner-only team overview
