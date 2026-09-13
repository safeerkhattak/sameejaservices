# Sameeja Commission Services

A modern invoice and payment-tracking application for meat deliveries to Metro stores. It focuses on invoice preparation, owner approval, partial payments, manually allocated combined payments, and outstanding balances.

## Product rules

- Staff can prepare and submit invoice drafts, but cannot edit them after submission.
- The owner can review, edit, issue, cancel, and record payments.
- Combined customer payments are allocated only to invoices the owner explicitly selects.
- The application never automatically settles other outstanding invoices.
- Expenses, purchasing costs, labor, taxes, wastage, and profit tracking are intentionally out of scope.

## Technology

- Next.js App Router, TypeScript, and Tailwind CSS
- Supabase PostgreSQL and Supabase Auth
- Drizzle ORM with Postgres.js
- Vercel-ready deployment

All database access and privileged Supabase operations run on the server. Secret keys are never exposed to browser code.

## Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `DATABASE_URL` using Supabase's transaction-mode pooler on port `6543`
- `DIRECT_URL` using the session-mode pooler on port `5432`

Never commit `.env.local` or expose `SUPABASE_SECRET_KEY` in client-side code.

## Database setup

Generate and apply Drizzle migrations:

```bash
npm run db:generate
npm run db:migrate
```

The included migration enables row-level security and revokes direct table access from Supabase's public roles. The application accesses the database only through authenticated server routes.

## Create the master account

1. In the Supabase dashboard, open **Authentication → Users → Add user** and create the owner's email/password account.
2. Open **Authentication → Sign In / Providers** and disable **Allow new users to sign up**. This keeps the application private.
3. Sign in to the application with the owner account. The first authorized account is registered as the single `owner` (master) user.
4. Open **Team** inside the application to create every staff account. Unprovisioned Supabase accounts are denied access.

There is no default master password. Keep the owner's credentials private and do not commit or share them in project files.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Verification

```bash
npm run lint
npm run build
```

## Main routes

- `/` dashboard and collection summary
- `/invoices` invoice register
- `/invoices/new` invoice preparation
- `/payments/new` owner-only manual payment allocation
- `/team` owner-only team overview

## Vercel deployment

Import the repository into Vercel, add the same environment variables to the Vercel project, and deploy. Run database migrations before the first production use.
