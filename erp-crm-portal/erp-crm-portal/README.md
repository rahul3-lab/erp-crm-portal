# Mini ERP + CRM Operations Portal

A small internal ERP/CRM system for a wholesale/distribution company, covering customer
relationship management, product & inventory tracking, and a sales challan workflow with
real stock-deduction business logic.

Built for the "Full Stack Developer Case Study" assignment.

---

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Backend    | Node.js, TypeScript, Express.js, Prisma ORM, PostgreSQL |
| Auth       | JWT (JSON Web Tokens), bcrypt password hashing, role-based middleware |
| Frontend   | React 18, TypeScript, Vite, React Router |
| Validation | Zod (backend request validation) |
| Deployment | Render/Railway/Fly.io (backend + DB), Vercel/Netlify (frontend). Docker files included for AWS/any container host. |

---

## Architecture Overview

```
erp-crm-portal/
├── backend/            Express + TypeScript REST API
│   ├── prisma/schema.prisma   Data model (Postgres)
│   └── src/
│       ├── routes/            auth, customers, products, challans
│       ├── middleware/        JWT auth, role authorization, error handler
│       ├── lib/prisma.ts      Prisma client singleton
│       └── seed.ts            Seeds 4 role-based test users + sample data
├── frontend/           React + Vite SPA
│   └── src/
│       ├── pages/              Login, Dashboard, Customers, Products, Challans
│       ├── context/AuthContext.tsx   JWT + user session state
│       └── api/client.ts       Axios instance with auth interceptor
├── docker-compose.yml  Full stack (Postgres + backend + frontend) for local/self-hosted use
├── postman_collection.json
└── .github/workflows/ci.yml    Build/typecheck CI (bonus)
```

**Request flow:** Frontend (Axios) → attaches JWT from `localStorage` → Express API →
`authenticate` middleware verifies JWT → `authorize(...roles)` middleware checks role →
route handler validates input with Zod → Prisma executes the query/transaction against
PostgreSQL → JSON response.

**Why Prisma:** gives typed queries against the schema, migrations, and makes the
transactional stock-deduction logic (see below) straightforward and safe.

### Key business logic: Sales Challan → Stock deduction

This is implemented in `backend/src/routes/challan.routes.ts` inside `prisma.$transaction(...)` blocks so that stock checks and stock decrements are atomic:

- Creating a challan with `status: "CONFIRMED"` (or calling `PUT /challans/:id/confirm` on a Draft) **validates stock for every line item first**, and only then decrements stock — if *any* item is short, the entire transaction is rolled back and a `400` with a clear message is returned (stock never goes negative).
- Each `ChallanItem` stores a **snapshot** of the product's name, SKU, and unit price at the time of the challan, not just a `productId` — so historical challans stay accurate even if the product is later renamed or repriced.
- Every stock change (challan confirm, cancel/restock, manual warehouse adjustment) is written to a `StockMovement` log with quantity, direction (`IN`/`OUT`), reason, and the user who made it.
- Cancelling a `CONFIRMED` challan automatically restocks the items (also logged).

---

## Roles

| Role       | Can do |
|------------|--------|
| **Admin**      | Everything, incl. creating new users via `POST /auth/register` |
| **Sales**      | Manage customers, follow-ups, create/confirm/cancel challans |
| **Warehouse**  | Manage products, stock movements |
| **Accounts**   | Read-only access across the app (view customers, products, challans) |

All list/detail `GET` endpoints are open to any authenticated role; write endpoints are
restricted per the table above (enforced by the `authorize()` middleware on the backend —
the frontend also hides/disables actions accordingly, but **the backend is the actual
source of truth for permissions**).

---

## Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ (local install, or use the Docker Compose option below which bundles it)

### 1. Backend

```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL to your local Postgres, and a JWT_SECRET

npm install
npx prisma generate
npx prisma migrate dev --name init   # creates tables
npm run seed                          # creates 4 role-based test users + sample data
npm run dev                           # starts API on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL should point at the backend, e.g. http://localhost:4000

npm install
npm run dev     # starts on http://localhost:5173
```

### 3. Or run everything with Docker Compose

```bash
docker compose up --build
```
This starts Postgres, the backend (auto-runs migrations on boot), and the frontend
(served via Nginx) together. Then run the seed script once against the running backend
container:
```bash
docker compose exec backend npm run seed
```

### Test Login Credentials
Seeded by `npm run seed` (password is the same for all four):

| Role       | Email                | Password       |
|------------|-----------------------|----------------|
| Admin      | admin@erp.test        | Password123!   |
| Sales      | sales@erp.test        | Password123!   |
| Warehouse  | warehouse@erp.test    | Password123!   |
| Accounts   | accounts@erp.test     | Password123!   |

---

## Environment Variables

**backend/.env**
| Variable        | Description |
|------------------|-------------|
| `DATABASE_URL`   | PostgreSQL connection string |
| `JWT_SECRET`     | Secret used to sign JWTs — use a long random value in production |
| `PORT`           | API port (default 4000) |
| `CORS_ORIGIN`    | Deployed frontend origin allowed to call the API |
| `NODE_ENV`       | `development` or `production` |

**frontend/.env**
| Variable         | Description |
|-------------------|-------------|
| `VITE_API_URL`    | Base URL of the deployed backend API |

Both are documented via `.env.example` files in their respective folders; neither `.env`
file is committed (see `.gitignore`).

---

## API Overview

Base URL: `{API_URL}` (e.g. `http://localhost:4000`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | Public | Login, returns JWT + user |
| POST | `/auth/register` | Admin | Create a new user |
| GET  | `/auth/me` | Any | Current user info |
| GET  | `/customers` | Any | List (search, status filter, pagination) |
| GET  | `/customers/:id` | Any | Detail incl. follow-ups & challans |
| POST | `/customers` | Admin, Sales | Create customer |
| PUT  | `/customers/:id` | Admin, Sales | Update customer |
| POST | `/customers/:id/follow-up` | Admin, Sales | Add a follow-up note |
| GET  | `/products` | Any | List (search, `lowStock=true` filter, pagination) |
| GET  | `/products/:id` | Any | Detail incl. stock movement log |
| POST | `/products` | Admin, Warehouse | Create product |
| PUT  | `/products/:id` | Admin, Warehouse | Update product metadata |
| POST | `/products/:id/stock-movement` | Admin, Warehouse | Record IN/OUT stock movement |
| GET  | `/challans` | Any | List (status filter, pagination) |
| GET  | `/challans/:id` | Any | Detail incl. line items |
| POST | `/challans` | Admin, Sales | Create challan (Draft or Confirmed) |
| PUT  | `/challans/:id/confirm` | Admin, Sales | Confirm a Draft (deducts stock) |
| PUT  | `/challans/:id/cancel` | Admin, Sales | Cancel (restocks if it was Confirmed) |
| GET  | `/health` | Public | Health check |

All endpoints (except `/auth/login` and `/health`) require `Authorization: Bearer <token>`.
Errors follow `{ success: false, message, errors?: [...] }` with correct HTTP status codes
(400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 500).

Full request/response examples: see `postman_collection.json` — import it into Postman,
run the three "Login" requests first (they auto-save tokens as collection variables), then
run the rest.

---

## Deployment Guide

This was deployed without cost using free-tier hosting (AWS deployment is optional/bonus
per the assignment; Docker + AWS ECS/EC2 steps are included below too).

### Option A — Render/Railway/Fly.io (backend) + Vercel/Netlify (frontend) + Neon/Supabase (DB)

1. **Database:** create a free Postgres instance on Neon or Supabase. Copy the connection string into `DATABASE_URL`.
2. **Backend:** push this repo to GitHub, create a new Web Service on Render (or Railway/Fly.io) pointing at `/backend`.
   - Build command: `npm install && npx prisma generate && npm run build`
   - Start command: `npx prisma migrate deploy && npm start`
   - Set env vars: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (set once frontend URL is known), `NODE_ENV=production`
3. **Frontend:** create a new project on Vercel/Netlify pointing at `/frontend`.
   - Build command: `npm run build`, output dir: `dist`
   - Env var: `VITE_API_URL` = your deployed backend URL
4. Update the backend's `CORS_ORIGIN` to the frontend's deployed URL and redeploy.
5. Run `npm run seed` once against the deployed DB (e.g. via Render's shell) to create test users.

### Option B — Docker on AWS (bonus / optional per assignment)

Both `backend/Dockerfile` and `frontend/Dockerfile` build production images. `docker-compose.yml`
runs the full stack locally and can also be run on a single EC2 instance:

```bash
docker compose up --build -d
```
For a more "cloud-native" AWS setup: push the two images to ECR, run the backend on
ECS Fargate (or a small EC2 instance) with `DATABASE_URL` pointed at RDS Postgres, and
serve the frontend's static build via S3 + CloudFront. This assignment's scope did not
require this to be completed, and it was not deployed to AWS — see Known Limitations.

### CI (bonus)
`.github/workflows/ci.yml` runs on every push/PR: installs dependencies, generates the
Prisma client, and typechecks/builds both the backend and frontend. Commented-out deploy
steps show how to wire it to Render deploy hooks / Vercel once hosting is chosen.

---

## Assumptions Made

- "Accounts" role is treated as read-only across all modules (the assignment didn't specify write permissions for Accounts, and accounting/reporting features weren't in scope for this build).
- Challan numbers are auto-generated as `CH-<year>-<sequence>` (e.g. `CH-2026-0001`), reset per calendar year.
- "Add product" does not allow editing `stock` directly after creation — stock changes always go through the stock-movement endpoint so every change is logged, per the requirement that the movement log track quantity/type/reason/user/timestamp.
- GST number and email are optional per the customer schema (marked optional in the brief).
- User creation (beyond the 4 seeded role accounts) is done by an Admin via `POST /auth/register`; there's no public self-signup, consistent with an internal operations tool.

## Known Limitations / Incomplete Parts

- Invoice generation (separate from challans) and PDF export were not built — only Sales Challans, per the required core modules; PDF export was listed as a bonus and was left out due to the assignment's time-box.
- No automated test suite (unit/integration tests) is included; validation was done via manual review, TypeScript compilation, and Postman.
- AWS deployment was not completed (explicitly marked optional/bonus in the brief) — deployed instead to free-tier hosts as described above.
- S3 image upload for products (bonus) was not implemented.
- Pagination is offset-based (page/limit) rather than cursor-based — adequate at this data scale.

## Bonus Items Included
- ✅ Docker setup (`Dockerfile` for both services + `docker-compose.yml`)
- ✅ GitHub Actions CI (build/typecheck on push, with commented deploy hooks)
- ⬜ Invoice PDF export — not implemented
- ⬜ S3 image upload — not implemented
