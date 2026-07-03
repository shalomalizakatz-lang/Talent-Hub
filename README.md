# Talent Hub

A hosted, single-tenant recruiting tool with three internal wings — Job Seekers,
Opportunities, and Matches — behind a shared login, plus a public-facing side for
candidates and employers that needs no login at all.

## Stack

- **Client:** React (Vite) + Tailwind CSS — `/client`
- **Server:** Node.js + Express, REST API — `/server`
- **Database:** PostgreSQL
- **File storage:** S3-compatible object storage (AWS S3, Cloudflare R2, Supabase
  Storage, …) for resumes, with a local-disk fallback for local development only
- **Auth:** Single shared password gating the internal admin tool, session-based
  (`express-session` + Postgres-backed session store)

The server serves the built client as static files and exposes the API under `/api`,
so the whole app deploys as one web service.

## One link to share: the public site

`https://<your-domain>/` (the bare root URL) **is** the thing to hand out — it's the
public open-roles board, reachable by anyone with no login. A hamburger menu in the
top corner (see `PublicShell`) links to everything else public-facing:

| Page | Route | Purpose |
|---|---|---|
| Browse Open Roles | `/` (also aliased at `/jobs`) | Lists open opportunities — title, skills, location, salary range. No employer contact info shown here. Each listing is clickable. |
| Apply as a Candidate | `/apply` | Job seeker self-intake — candidates fill in their own profile and upload a resume. |
| Post an Opportunity | `/post-opportunity` | Employer intake — hiring managers describe a role and their contact info. |

Clicking a listing on the jobs board goes to `/apply?opportunity=<id>`, which
pre-fills the target role and required skills from that listing and shows an
"Applying for X" banner. The resulting candidate record gets a note ("Applied
directly for: <title>") so admin can see it was a direct application rather
than a generic submission — this is informational only, it doesn't skip the
normal scoring/approval flow. A bookmarked or shared version of that same URL
works too (`GET /api/public/jobs/:id` backs it when there's no in-app
navigation state to read from).

`/login` — the door into the internal admin tool — is deliberately **not** in
that menu. There's no reason to advertise a staff login to candidates and
employers browsing the public site; staff just bookmark `/login` directly. If
already logged in, it redirects straight past the password form.

Submissions to `/apply` and `/post-opportunity` land directly in the Job Seekers /
Opportunities lists (as `new` / `open` records) and are matched automatically like
anything entered by hand. Both forms have a honeypot field and rate limiting
against basic bot abuse.

Employers never get a browsing view of candidates — that's deliberate, since job
seeker records hold PII (name, contact info, salary expectations). Instead,
employers are notified by email when admin approves a strong match for their role
(see "Approval email notifications" below).

Visiting `/` never redirects into the admin tool, even if you're already logged
in as staff — the public board is always what's at the root. Staff reach the
internal wings by going straight to `/login`, landing on `/job-seekers` after
authenticating.

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

### Approval email notifications (optional)

When admin approves a match, the app emails the opportunity's contact with a
summary of the candidate (name, target role, experience, skills, resume link) and
the fit score. This uses [Resend](https://resend.com):

1. Create a free Resend account and verify a sending domain (or use their test
   domain for a quick trial).
2. Create an API key.
3. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (an address on the verified
   domain, e.g. `notifications@yourdomain.com`).

Leave both blank to skip this feature entirely — the app logs and continues
instead of failing when they're unset.

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

### Railway (with Supabase Storage for resumes)

This repo includes a `railway.json` with explicit build/start commands so
Railway's Nixpacks builder doesn't have to guess at the monorepo layout.

**1. Set up Supabase Storage**

1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard: **Storage → Buckets → New bucket**. Name it `resumes` and
   mark it **Public**. (Public here means anyone with the exact file URL can view
   it — URLs are random UUIDs, not listable or guessable, but not
   access-controlled. If you later want private, signed-URL-only access instead,
   that requires a small code change — ask and I'll add it.)
3. Go to **Storage → S3 Access Keys** (Project Settings → Storage in older UI) and
   create a new S3-compatible access key. Note the **Access Key ID**, **Secret
   Access Key**, and the **S3 endpoint URL** it gives you (looks like
   `https://<project-ref>.supabase.co/storage/v1/s3`).
4. Your public base URL for objects will be
   `https://<project-ref>.supabase.co/storage/v1/object/public/resumes`.

**2. Deploy on Railway**

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
   → select this repo.
2. In the same project: **+ New → Database → Add PostgreSQL**. Railway wires
   `DATABASE_URL` into your web service automatically if you reference
   `${{Postgres.DATABASE_URL}}` in the web service's variables (Railway's UI
   offers this as a suggestion/autocomplete when you start typing).
3. On the web service, go to **Variables** and add:
   - `SESSION_SECRET` — any long random string (e.g. generate with
     `openssl rand -hex 32`)
   - `SHARED_PASSWORD` — the password you'll use to log into the app
   - `S3_BUCKET` = `resumes`
   - `S3_REGION` = `us-east-1` (Supabase ignores the value but the S3 SDK
     requires one)
   - `S3_ENDPOINT` = the endpoint URL from step 1.3
   - `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` = from step 1.3
   - `S3_PUBLIC_BASE_URL` = the URL from step 1.4
   - `S3_FORCE_PATH_STYLE` = `true`
   - `NODE_ENV` = `production`
   - `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — optional, see "Approval email
     notifications" above; leave unset to skip that feature
4. Railway auto-assigns `PORT` — no action needed, the app already reads it.
5. Deploy. Railway builds with `npm install && npm run build` and starts with
   `npm start` per `railway.json`. Migrations run automatically on boot.
6. Under **Settings → Networking**, generate a public domain if one wasn't
   created automatically. That domain is your app's URL.
7. Enable backups on the Postgres service (**Postgres → Settings → Backups**) —
   this database holds candidate PII (names, contact info, salary expectations).

### Fly.io

Works the same way conceptually: one Node service (`flyctl launch`, using the
`npm install && npm run build` / `npm start` commands), a `fly postgres create`
database attached via `fly postgres attach`, and the same environment variables
set with `fly secrets set`.

## Matching algorithm

Scores are 0–100, recomputed server-side whenever a job seeker or opportunity is
created or updated:

- **Skills — 50 pts:** `(matching required skills / total required skills) × 50`,
  case-insensitive.
- **Experience — 20 pts:** `min(candidate years / role minimum, 1) × 20`. Full 20
  if the role has no stated minimum.
- **Location — 15 pts:** 15 within 20 miles, scaling down linearly to 8 between
  20–50 miles (same metro area but not the immediate neighborhood — e.g. Hernando,
  MS to Memphis, TN is ~23 miles, so it lands here rather than falling off a cliff
  to 0), 8 flat beyond 50 miles if the candidate is open to relocation, 0
  otherwise. Distance is computed from coordinates geocoded from the free-text
  `location` field on save (via [OpenStreetMap
  Nominatim](https://nominatim.openstreetmap.org/) — free, no API key needed), so
  "Marine Park, Brooklyn" correctly scores as local to a "Brooklyn, NY"
  opportunity even though the strings don't match. If either side couldn't be
  geocoded (service unreachable, unrecognized location text), it falls back to
  the original exact case-insensitive string match. Match score breakdowns
  expose which basis applied (`locationBasis: 'local' | 'nearby' | 'relocation' |
  'none'`) — the UI shows "(nearby)" or "(open to relocation)" next to the
  location score when that's why it's counted as a fit.
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
- `opportunities.contact_email` is required on every new opportunity (internal
  form and public `/post-opportunity` submission alike) — it's what approval
  notification emails are sent to. `contact_name` and `contact_phone` are
  optional. None of the three are ever exposed on the public `/jobs` board.

## Project layout

```
/client   React (Vite) + Tailwind frontend
/server   Express API, Postgres migrations, matching engine
```
