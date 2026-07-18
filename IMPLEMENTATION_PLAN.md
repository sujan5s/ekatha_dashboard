# Ekatha Dashboard — Implementation Plan (v2)

> Planning by Fable 5 · to be implemented by Opus.
> **v2 correction:** there is ONE backend — `ekatha_server` (Express 5 + Prisma + Neon).
> It serves both `ekatha_client` and `ekatha_dashboard`. The dashboard is a pure
> frontend. All content is dynamic from the DB — no hardcoded content values in either
> frontend. Only static UI chrome (section tags, button labels, footer, sections the
> user did not list as editable) stays in code.

## 1. Goal

`ekatha_dashboard` = admin panel; `ekatha_server` = the API + data layer; the
`ekatha_client` homepage renders entirely from DB content:

| Client section | Editable via dashboard |
|---|---|
| Hero background | Multiple images, client auto-rotates every 5 s, add/remove/reorder |
| Hero text | Eyebrow, headline (incl. italic em part), sub-text, CTA labels, trust text |
| Stats bar | The 4 counters: icon, value, suffix, label — full CRUD + order |
| Impact ("Where every rupee goes") | Bars: label, percent, gradient colors — CRUD; quote text + image |
| Gallery | Image upload (webp), caption, tile size (normal/tall/wide), order |
| "Lives we've touched" | Testimonials: text, name, location, avatar — CRUD + publish toggle |
| Core team | Members: name, role, photo, lead flag, order — CRUD |
| FAQ | Question/answer — CRUD + order + publish toggle |

Stays static in code (per user: infrequent updates): marquee words, About section,
Activities cards, How-It-Works steps, Partners strip, footer, section headings/tags.

Infra: **Neon** (Postgres) · **Prisma** (in ekatha_server) · **UploadThing** (webp
images) · **Upstash Redis** (caching) · **Brevo** (OTP email) · **Google OAuth**.

## 2. Architecture

```
ekatha_client (Next, :3000)  ──reads──▶  ekatha_server (Express, :8080)  ──▶ Neon
ekatha_dashboard (Next, :3001) ─CRUD──▶       │  ├─ better-auth (sessions, Google, OTP)
                                              │  ├─ UploadThing route handler
                                              │  └─ Upstash Redis (cache + rate limits)
                                              └─ Brevo (OTP emails)
```

### 2.1 ekatha_server is rebuilt
The current `index.ts` (tasks/system-events + in-memory mocks) and the `Task` /
`SystemEvent` Prisma models are leftovers from the deleted portal demo — **replace
them**. New layout:

```
src/
  index.ts               # app wiring: cors, json, routes, error handler
  lib/ prisma.ts redis.ts brevo.ts auth.ts uploadthing.ts
  middleware/ requireAuth.ts requireAdmin.ts requirePage.ts rateLimit.ts
  validators/            # zod schemas per module (shared shapes with frontends)
  routes/
    auth.ts              # mounts better-auth toNodeHandler at /api/auth/*
    public.ts            # GET /api/public/home · POST /api/public/submissions
    hero.ts counters.ts impact.ts gallery.ts stories.ts team.ts faq.ts
    users.ts submissions.ts uploads.ts
```

- **CORS**: `origin: [CLIENT_ORIGIN, DASHBOARD_ORIGIN]`, `credentials: true`.
- No mock/in-memory fallbacks — if the DB is down the API errors honestly (5xx).
- Every mutation route: zod-validate → permission middleware → Prisma →
  `redis.del("home:v1")` → AuditLog row → JSON result.
- REST shape: `GET/POST /api/<module>`, `PATCH/DELETE /api/<module>/:id`,
  `POST /api/<module>/reorder` (array of ids).

### 2.2 Auth: better-auth on Express
better-auth has an official Express integration (`toNodeHandler(auth)` mounted at
`/api/auth/*`); Prisma adapter against the same Neon DB.

- **Email + OTP**: `emailOTP` plugin; `sendVerificationOTP` calls Brevo
  (`POST https://api.brevo.com/v3/smtp/email`, header `api-key`).
- **Google OAuth**: built-in social provider (counts as verified).
- **Roles** on `user.role`: `ADMIN | VOLUNTEER | CLIENT`.
  Self-signup defaults to `CLIENT`; an admin promotes.
  First admin: `ADMIN_EMAIL` env promoted on first login (DB hook).
- **Dashboard entry**: only ADMIN / VOLUNTEER. CLIENT gets a "no access" page.
  VOLUNTEER page-wise access via `PagePermission` rows (pageKeys: `overview`,
  `home-hero`, `home-counters`, `home-impact`, `home-gallery`, `home-stories`,
  `home-team`, `home-faq`, `submissions`). Sidebar filters by permissions; every
  server route re-checks via `requirePage(pageKey)` — never trust the UI.
- **Cookies across origins**: dev (localhost:3001 → localhost:8080) is same-site, works
  with defaults + `credentials: "include"`. Production: host API and dashboard on the
  same registrable domain (e.g. `api.ekatha.org` / `admin.ekatha.org`) and enable
  better-auth `crossSubDomainCookies`; set `trustedOrigins`.
- **OTP hardening** (Redis): 5 sends/email/hour, 5 verify attempts, 10-min expiry.

### 2.3 Images: UploadThing, forced webp
- UploadThing's **Express adapter** (`createRouteHandler` from `uploadthing/express`)
  hosts the file router on ekatha_server, auth-gated (ADMIN/VOLUNTEER session).
- Browser converts to webp **before** upload (uploads go browser → UploadThing storage
  directly): `createImageBitmap` → `OffscreenCanvas` → `convertToBlob({type:
  "image/webp", quality: 0.82})`; resize max 1920 px long edge (400 px avatars).
  Shared `useWebpUpload` hook in the dashboard wraps conversion + progress.
- Store `imageUrl` + `imageKey` on every row; delete replaced/removed files via
  `UTApi.deleteFiles` server-side. Alt/caption stored alongside.
- Both frontends add UploadThing hosts (`utfs.io`, `*.ufs.sh`) to `remotePatterns`.

### 2.4 Caching: Upstash Redis (server-side only)
- `@upstash/redis` in ekatha_server. Key `home:v1` = composed payload of
  `GET /api/public/home`; TTL 1 h; deleted on every content mutation.
- Client additionally fetches with `next: { revalidate: 60 }` — Next keeps serving the
  last good ISR page if the API is briefly down (graceful degradation **without**
  hardcoded fallback content, per user requirement).
- OTP + submission rate-limit keys. Nothing else in v1.

## 3. Prisma schema (in `ekatha_server/prisma/schema.prisma`)

Drop demo models `Task`, `SystemEvent`. Add (same as v1 plan):

- `User` (role enum ADMIN/VOLUNTEER/CLIENT, emailVerified) + better-auth's generated
  `Account`/`Session`/`Verification` models
- `PagePermission` (userId + pageKey, unique pair)
- `HeroSlide` (imageUrl, imageKey, alt, order, active)
- `HomeText` (singleton id="home": eyebrow, headline, headlineEm, headlineEnd, subText,
  ctaPrimary, ctaGhost, trustText, quoteText, quoteAttribution, quoteImageUrl/Key)
- `StatCounter` (icon, value, suffix, label, order)
- `ImpactBar` (label, percent, colorFrom, colorTo, order)
- `GalleryImage` (imageUrl, imageKey, caption, span NORMAL/TALL/WIDE, order)
- `Testimonial` (text, name, location, avatarUrl/Key, published, order)
- `TeamMember` (name, role, photoUrl/Key, isLead, order)
- `Faq` (question, answer, published, order)
- `Submission` (type HELP/DONATE, payload Json, status NEW/REVIEWED/CLOSED)
- `AuditLog` (userId, action, detail Json, createdAt)

The parenthesized fields above are the complete field lists; every model with `order`
gets an `Int`, ids are `uuid()`, timestamps `createdAt`/`updatedAt` where useful.
`prisma/seed.ts`: idempotent upserts of the **current** client content (hero text, 4
counters, 4 bars, 6 gallery, 3 testimonials, 6 team, 4 FAQs) — day-one render is
identical to today, but sourced from DB.

Prisma 7 + `@prisma/adapter-neon`; `DATABASE_URL` pooled, `DIRECT_URL` for migrations.

## 4. ekatha_dashboard (pure frontend)

```
src/
  lib/
    api.ts          # typed fetch wrapper → EKATHA_API_URL, credentials: "include"
    auth-client.ts  # better-auth React client (baseURL = server)
    webp.ts         # browser webp conversion
  app/
    (auth)/login (auth)/verify (auth)/no-access
    (dashboard)/layout.tsx        # session fetch + shell; redirect by role
      overview/ home-control/{hero,counters,impact,gallery,stories,team,faq}/
      submissions/ users/ settings/
  components/ shell/ ui/ upload/   # same inventory as v1 plan
```

- All reads/writes go through `lib/api.ts` to the Express API (React Query optional —
  prefer plain fetch + `router.refresh()` to keep deps minimal).
- Session gate in `(dashboard)/layout.tsx` is a server component fetching
  `/api/auth/get-session` (forwarding cookies); middleware does a cheap
  cookie-presence check only.
- **Theme "Ekatha Admin"** (unchanged from v1): deep-forest `#122B1D` sidebar with
  saffron active pill, cream `#FAFAF8` canvas, white rounded-2xl cards, Fraunces page
  titles + Plus Jakarta Sans UI, gold highlights, `#2D6A4F` success, `#B3261E`
  destructive. Tailwind 4 `@theme` tokens, same pattern as ekatha_client.
- Module page pattern: list (order arrows/drag, publish toggles, edit/delete) + create/
  edit modal; hero module shows a 5 s rotation preview; impact module warns when
  percents ≠ 100 (non-blocking).
- Overview: content counts, NEW-submissions badge, recent AuditLog activity, link to
  live site.
- User Control (ADMIN): role select per user; volunteer rows expand to pageKey
  checkboxes; cannot demote self; search by email/name.

## 5. ekatha_client changes — fully dynamic

1. `src/lib/content.ts` — `getHomeContent()`: `fetch(\`${API_URL}/api/public/home\`,
   { next: { revalidate: 60 } })`. **No hardcoded content fallback** — module-level
   content consts are deleted from all editable sections. If the fetch fails at
   build/revalidate, ISR serves the last good page; if it fails on first-ever build,
   the build fails loudly (correct: DB is now the source of truth, seed it first).
2. `page.tsx` becomes async, fetches once, passes section props down.
3. New `HeroSlideshow` client component: stacked `next/image` layers, opacity
   crossfade every 5000 ms, interval cleared on unmount, paused when `document.hidden`,
   first slide `priority`. One slide ⇒ identical to today's zoom + parallax.
4. `Stats`, `Impact`, `Gallery`, `Testimonials`, `Team`, `Faq`, hero text → props.
   Static sections (About, Activities, How-It-Works, Marquee, Partners, Footer) keep
   their in-code text.
5. `ApplyForm` POSTs to `POST /api/public/submissions` (rate-limited server-side);
   keep the existing thank-you UX, error toast on failure.
6. `next.config.ts`: add UploadThing hosts. `.env.local`: `API_URL`.

## 6. Environment variables

`ekatha_server/.env`:
```
DATABASE_URL= DIRECT_URL=
BETTER_AUTH_SECRET= BETTER_AUTH_URL=http://localhost:8080
GOOGLE_CLIENT_ID= GOOGLE_CLIENT_SECRET=
BREVO_API_KEY= BREVO_SENDER_EMAIL=
UPLOADTHING_TOKEN=
UPSTASH_REDIS_REST_URL= UPSTASH_REDIS_REST_TOKEN=
ADMIN_EMAIL=
CLIENT_ORIGIN=http://localhost:3000
DASHBOARD_ORIGIN=http://localhost:3001
```
`ekatha_client/.env.local`: `API_URL=http://localhost:8080`
`ekatha_dashboard/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8080`
Dashboard dev script: `next dev -p 3001`.

## 7. Extras included (user approved adding)

Submissions inbox (client forms stop discarding data) · AuditLog ("who changed what",
feeds Overview) · publish toggles (stories/FAQ) · OTP + submission rate limiting ·
UploadThing orphan deletion · impact-percent sum warning.

## 8. Phases (Opus: execute in order)

- **P0 server reset**: strip demo routes/models, new folder layout, deps
  (`better-auth @upstash/redis uploadthing zod @prisma/adapter-neon`), error handler,
  CORS. ✔ `npm run build` (tsc) passes, `/api/health` slimmed & working.
- **P1 schema + seed**: models above, `prisma migrate dev`, seed current content.
  ✔ Studio shows seeded rows.
- **P2 auth on server**: better-auth Express handler, Google + emailOTP(Brevo),
  ADMIN_EMAIL promotion, middlewares, rate limits. ✔ OTP mail arrives; session cookie
  set; role guards return 401/403 correctly.
- **P3 public + CRUD API**: `/api/public/home` (Redis read-through) +
  `/api/public/submissions` + all module routes with the mutation contract.
  ✔ curl round-trip per module; Redis key invalidates on write.
- **P4 uploads**: UploadThing Express handler, auth-gated. ✔ upload from a test page
  returns URL+key; delete removes remote file.
- **P5 dashboard**: auth pages → shell/theme → module pages (hero, counters, impact,
  gallery, stories, team, faq) → users → submissions → overview.
  ✔ volunteer with one permission sees exactly one module; all CRUD round-trips.
- **P6 client integration**: content.ts, HeroSlideshow, props refactor, submissions
  wiring, remotePatterns. ✔ dashboard edit visible on client ≤ 60 s; slideshow 5 s.
- **P7 verify**: lint+build all three packages; drive end-to-end (login → edit every
  section → confirm live → submit form → inbox); mobile pass on dashboard.

## 9. Resolved decisions (user answered 2026-07-17)

1. **User Control page** (ADMIN only): self-signup lands as CLIENT; admins promote/
   demote roles and manage volunteer page permissions on this page. This is the §4
   "users/" route — name it **User Control** in the sidebar. Include: role dropdown per
   user, pageKey checkboxes for volunteers, cannot-demote-self guard, search by
   email/name.
2. **Credentials**: Opus creates complete `.env.example` files in all three packages
   with every key from §6 and a one-line comment each; the user fills real values.
   Code must fail fast with a clear message when a required env var is missing.
3. **Hosting**: `ekatha_server` deploys to **Render**; the two Next apps to Vercel.
   Cookie implication: `*.onrender.com` and `*.vercel.app` are different registrable
   domains → cross-site cookies. Either (a) put custom domains on one registrable
   domain (`api.ekatha.org` + `admin.ekatha.org`) and use `crossSubDomainCookies`
   (preferred), or (b) set better-auth cookies `sameSite: "none", secure: true` and
   list both frontend origins in `trustedOrigins` + CORS. Implement (b) as the working
   default, document (a) in the README for when domains exist. Render free tier
   cold-starts: keep `/api/health` for uptime pings.
