# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Run dev server (http://localhost:3000)
npm run build    # Production build
npm test         # Run tests (Jest via react-scripts)
```

Environment variables required (copy `.env.example` to `.env`):
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

## Architecture

**SeatCover OMS** is a Create React App (no TypeScript) order management system for a seat cover manufacturer. It uses Supabase (Postgres + Auth + Storage) as the backend and deploys to Vercel.

### Data flow

All orders are fetched once at the top level (`Dashboard.js`) and passed down as `orders` / `setOrders` props. There is no global state library — every page receives and mutates the same in-memory array. Mutations go through `src/lib/api.js` which wraps the Supabase JS client (`src/lib/supabase.js`).

### Authentication & roles

`AuthContext.js` holds the Supabase session and fetches the user's row from the `profiles` table. The `profile.role` field drives navigation — `ROLE_PAGES` in `constants.js` maps each role to the pages it can see:

| Role | Pages |
|------|-------|
| `admin` | everything |
| `sales` | orders, stats, archive |
| `production` | production queue only |
| `shipping_us` | US shipping only |
| `shipping_sweden` | Sweden shipping only |

### Pages

- **OrdersPage** — full order list with search/filter, create/edit/delete
- **ProductionPage** — orders in `Verified` / `In Production` stages; advance stage buttons
- **ShippingUSPage** — orders in `Production Complete`; generates UPS labels via `/api/ups-label`
- **ShippingSwedPage** — orders in `Shipped to Sweden` / `Shipped to Customer`; UPS labels + packing slips
- **StatsPage** — read-only charts/summaries over all orders
- **ArchivePage** — delivered/archived orders
- **StockPage** — Sweden warehouse stock (`stock` table); decrement on dispatch
- **UsersPage** — admin-only; invite users via Supabase Auth

### Order lifecycle (stages in `constants.js`)

`New` → `Contacted` → `Verified` → `In Production` → `Production Complete` → `Shipped to Sweden` → `Shipped to Customer` → `Delivered`

### Vercel API routes (`/api/`)

Three serverless functions under `api/` (not `src/api/`):
- `ups-label.js` — calls UPS API to generate a shipping label PDF
- `ups-track.js` — calls UPS tracking API
- `ebay-sync.js` — proxies to the Supabase Edge Function `ebay-sync`

The `src/api/ebay-sync.js` file is a separate client-side helper (same name, different directory).

### Supabase Edge Functions (`supabase/functions/`)

- `ebay-sync/` — Deno function that pulls recent eBay orders and upserts them into `orders`
- `ebay-backfill/` — one-off backfill variant

### Key utilities

- `src/lib/printPackingSlip.js` — opens a new browser window and writes a full HTML packing slip (eBay-style invoice format)
- `src/components/OrderModal.js` — detail/edit modal shared by multiple pages; includes eBay title parser that auto-fills car/position/material/color fields
- `src/components/StageProgress.js` — visual stage stepper shown inside the order modal

### Database schema

Defined in `supabase-schema.sql`. Main tables: `profiles`, `orders`, `stock`. Photos stored in Supabase Storage bucket `order-photos` as a JSON array (`photos` column on orders). The schema in the repo reflects the initial version; the live `orders` table has additional columns (e.g. `address`, `tracking_number`, `label_pdf`, `material`, `position`, `thumbnail`, `quantity`, `order_date`) added after initial deployment.
