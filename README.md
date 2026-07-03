# Talent Hub

A hosted, single-tenant recruiting tool with three wings — Job Seekers, Opportunities,
and Matches — plus two public shareable links for candidates and employers to submit
themselves without needing the shared login.

## Stack

- **Client:** React (Vite) + Tailwind CSS — `/client`
- **Server:** Node.js + Express, REST API — `/server`
- **Database:** PostgreSQL
- **File storage:** S3-compatible object storage (AWS S3, Cloudflare R2, Supabase
  Storage, …) for resumes, with a local-disk fallback for local development only
- **Auth:** Single shared password gating the whole app, session-based
  (`express-session` + Postgres-backed session store)

The server serves the built client as static files and exposes the API under `/api`,
so the whole app deploys as one web service.

## Public shareable links

Two routes are intentionally left outside the login gate so they can be shared with
people who don't have the shared password:

| Link | Purpose |
|---|---|
| `https://<your-domain>/apply` | Job seeker self-intake — candidates fill in their own profile and upload a resume. |
| `https://<your-domain>/post-opportunity` | Employer intake — hiring managers describe a role and what they're looking for. |

Submissions land directly in the Job Seekers / Opportunities lists (as `new` /
`open` records) and are matched automatically like anything entered by hand. Both
forms have a honeypot field and rate limiting against basic bot abuse.

## Local development

### 1. Prerequisites

- Node.js 20+
- A local PostgreSQL instance

### 2. Set up the database

```bash
createdb talent_hub
# or, with a dedicated role:
psql -c "CREATE ROLE talent_hub WITH LOGIN PASSWORD 'talent_hub';"
psql -c "CREATE DATABASE talent_hub OWNER talent_hub;"
```

### 3. Configure environment variables

```bash
cp server/.env.example server/.env
```

Fill in `DATABASE_URL`, `SESSION_SECRET`, and `SHARED_PASSWORD` at minimum. Leave
the `S3_*` variables blank to use local-disk resume storage for development
(files land in `server/uploads/`, which is gitignored and **not** suitable for
production — see below).

### 4. Install dependencies and run migrations

```bash
npm install
npm run db:migrate
```

### 5. Start the app

```bash
npm run dev
```

This runs the Express API on `http://localhost:4000` and the Vite dev server on
`http://localhost:5173` (which proxies `/api` and `/uploads` to the API). Open
`http://localhost:5173`.

To test the production build (single service serving both API and static
frontend):

```bash
npm run build
npm start
```

Then open `http://localhost:4000`.

## Deployment

### Object storage (required for production)

Resumes are never stored in Postgres. Provision an S3-compatible bucket —
[Cloudflare R2](https://developers.cloudflare.com/r2/) and
[Supabase Storage](https://supabase.com/storage) both have generous free tiers and
work as drop-in S3-compatible endpoints; plain AWS S3 works too. Set:

- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `S3_ENDPOINT` — leave blank for AWS S3, set to the provider's endpoint for R2/Supabase
- `S3_PUBLIC_BASE_URL` — the URL resumes are served from (bucket public URL or a
  CDN domain in front of it)
- `S3_FORCE_PATH_STYLE` — set `true` for some R2/MinIO-style setups

If these are left unset in production, the app falls back to local disk, which
will **lose all resumes on every redeploy** — do not run production this way.

### Render (recommended, one-click blueprint)

This repo includes a `render.yaml` blueprint that provisions:
- one web service (build: `npm install && npm run build`, start: `npm start`)
- one managed Postgres database (automated daily backups included on paid plans)

In the Render dashboard: **New → Blueprint**, point it at this repo, and fill in
the `sync: false` environment variables (`SHARED_PASSWORD` and the `S3_*` object
storage credentials) when prompted. `DATABASE_URL` and `SESSION_SECRET` are wired
up automatically.

Migrations run automatically on boot (`server/src/index.js` calls
`runMigrations()` before starting the server), so no separate release step is
needed.

### Railway / Fly.io

Both work the same way: one Node service running `npm install && npm run build`
then `npm start`, plus a managed Postgres add-on. Set the same environment
variables described above (see `server/.env.example`). Both platforms offer
automated Postgres backups on their standard managed database offerings — make
sure backups are enabled, since this database holds candidate PII (names, contact
info, salary expectations).

## Matching algorithm

Scores are 0–100, recomputed server-side whenever a job seeker or opportunity is
created or updated:

- **Skills — 50 pts:** `(matching required skills / total required skills) × 50`,
  case-insensitive.
- **Experience — 20 pts:** `min(candidate years / role minimum, 1) × 20`. Full 20
  if the role has no stated minimum.
- **Location — 15 pts:** 15 for an exact match (case-insensitive), 8 if the
  candidate is open to relocation, 0 otherwise.
- **Salary — 15 pts:** 15 if desired salary is within the role's max (or either is
  unset), otherwise `15 - (overage / 1000) × 2`, floored at 0.

Tiers: **Strong fit** ≥75, **Moderate fit** 45–74, **Weak fit** <45.

Matches already **approved** or **rejected** keep their score and status frozen —
recomputation only ever touches rows still in `suggested`, so a decision someone
already made never silently re-ranks itself.

## Data model notes

- Both `job_seekers` and `opportunities` use soft delete (`deleted_at`) so match
  history stays intact after a record is removed from the active lists.
- `job_seekers.source` and `pipeline_status` are populated now specifically so a
  future pipeline/CRM view doesn't require a schema migration (see spec §7).

## Project layout

```
/client   React (Vite) + Tailwind frontend
/server   Express API, Postgres migrations, matching engine
```
