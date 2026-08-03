# Scankro

QR digital menu SaaS for restaurants. Owners manage menus in a dashboard; guests scan a QR code and view a live branded menu—no app install.

## Stack

- Next.js 15 (App Router) + TypeScript
- PostgreSQL + Prisma
- better-auth (email/password)
- Tailwind CSS
- Razorpay subscriptions (optional in dev)
- Cloudflare R2 or local uploads

## Quick start

### 1. Database

```bash
docker compose up -d
```

### 2. Environment

```bash
cp .env.example .env
# DATABASE_URL already points at docker-compose Postgres
```

### 3. Install & migrate

```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo account** (after seed):

| Field    | Value              |
|----------|--------------------|
| Email    | demo@scankro.com   |
| Password | demo12345          |
| Menu     | /cafe-royal        |
| Plan     | Pro                |

## Features

| Area | Details |
|------|---------|
| Free | Up to 20 items, basic QR PNG, Powered-by branding |
| Starter ₹399 | Unlimited items, custom branding, SVG/PDF QR |
| Pro ₹999 | Analytics, multi-branch, team, i18n, specials, seasonal, promotions, table QRs |

Public URLs:

- `/{slug}` — restaurant menu
- `/r/{shortId}` — short redirect
- `/t/{slug}/{table}` — table-scoped menu + scan attribution

## Billing

Set Razorpay env vars for live checkout:

```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_STARTER=
RAZORPAY_PLAN_PRO=
```

Webhook: `POST /api/billing/webhook`

Without keys, Billing page upgrades apply immediately (manual/dev mode).

## Storage

- `STORAGE_PROVIDER=local` stores under `public/uploads/`
- `STORAGE_PROVIDER=r2` uses Cloudflare R2 presigned uploads

## Cron

Daily analytics rollup: `GET /api/cron/rollup` (protect in production).

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Deploy

1. Managed Postgres (Neon, Supabase, RDS)
2. Vercel / Node host for Next.js
3. Set env vars from `.env.example`
4. `npx prisma migrate deploy`
5. Configure Razorpay webhook + R2 if needed
