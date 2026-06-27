# Waste Command — Delhi Waste Management System

A full-stack command center for tracking garbage collection across Delhi's colonies. Built for municipal fleet operators.

## Features

- **Dashboard** — Live fleet overview (active trucks, overdue areas, fuel saved) with a guided onboarding tour
- **Route Optimization** — Interactive Leaflet map of Delhi with 20 colony markers; generates 3 optimized route options between any two areas
- **Warning Alerts** — Auto-detected areas with no collection in 7+ days, color-coded by severity (Warning / Critical), with one-click resolution
- **Fuel Analytics** — 14-day fuel consumption vs baseline chart (Recharts), per-truck records table, weekly savings summary
- **AI Insights** — Risk-ranked overdue areas with recommendations and daily fuel efficiency trend cards

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript |
| Routing | Wouter |
| UI | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| Map | React-Leaflet + OpenStreetMap |
| Backend | Express 5 + Node.js 24 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4 + Orval codegen |
| Package Manager | pnpm workspaces |

## Project Structure

```
garbage-route-planner
.
├── artifacts/
│   │   └── src/
│   │       ├── routes/      # trucks, areas, routes, alerts, fuel, ai, dashboard
│   │       ├── lib/         # logger
│   │       └── app.ts
│   └── waste-mgmt/          # React + Vite frontend
│       └── src/
│           ├── pages/       # Dashboard, Routes, Alerts, Fuel, AI
│           ├── components/  # AppLayout, AppSidebar, ui/
│           └── App.tsx
├── lib/
│   ├── db/                  # Drizzle ORM schema + client
│   │   └── src/schema/      # trucks, areas, routes, alerts, fuel_records
│   ├── api-spec/            # OpenAPI spec (source of truth)
│   │   └── openapi.yaml
│   ├── api-client-react/    # Generated React Query hooks (do not edit)
│   └── api-zod/             # Generated Zod schemas (do not edit)
└── scripts/
    └── src/seed.ts          # Delhi colony seed data
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd waste-mgmt
pnpm install
```

### 2. Environment Variables

Copy `.env.example` and fill in your database URL:

```bash
cp .env.example .env
```

Set the following in your `.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/waste_mgmt
```

### 3. Push Database Schema

```bash
pnpm --filter @workspace/db run push
```

### 4. Seed Sample Data (20 Delhi colonies + trucks + alerts)

```bash
pnpm --filter @workspace/scripts run seed
```

### 5. Regenerate API Client (optional — only after editing openapi.yaml)

```bash
pnpm --filter @workspace/api-spec run codegen
```

### 6. Run

Open two terminals:

```bash
# Terminal 1 — API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (port 5173)
pnpm --filter @workspace/waste-mgmt run dev
```

Visit `http://localhost:5173`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/summary` | Fleet overview stats |
| GET/POST | `/api/trucks` | List / create trucks |
| PATCH | `/api/trucks/:id` | Update truck |
| GET | `/api/areas` | All 20 Delhi colonies |
| PATCH | `/api/areas/:id` | Update area / mark collected |
| GET | `/api/alerts` | Active overdue alerts |
| PATCH | `/api/alerts/:id/resolve` | Resolve an alert |
| POST | `/api/routes/optimize` | Generate 3 route options |
| GET/POST | `/api/routes` | List / save routes |
| GET | `/api/fuel/savings` | 14-day savings data |
| GET/POST | `/api/fuel/records` | Per-truck fuel logs |
| GET | `/api/ai/insights` | Risk analysis + fuel trends |

## Database Schema

- **trucks** — plate number, driver, status, fuel level
- **areas** — name, colony, district, lat/lng, lastCollectedAt
- **routes** — start/end area, waypoints (JSONB), distance, fuel estimate
- **alerts** — area, daysSinceCollection, severity, resolved
- **fuel_records** — truck, date, liters used, distance km

## Architecture Notes

- Contract-first: `lib/api-spec/openapi.yaml` is the source of truth; run codegen after any API changes
- The reverse proxy routes `/api/*` to the Express server and `/` to the Vite app
- Alerts are generated at seed time; in production, wire a cron job to `POST /api/alerts` for areas where `daysSinceCollection > 7`
- The `baseline` for fuel savings is hardcoded at 120L/day across the fleet — adjust in `artifacts/api-server/src/routes/fuel.ts`
