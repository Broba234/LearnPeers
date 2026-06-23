# LearnPeers

Peer-to-peer tutoring marketplace — learn live from students who aced your exact course.

**Stack:** Next.js 16 (App Router) · Prisma ORM · Supabase (auth + storage) · Stripe Connect · LiveKit (live video + shared whiteboard).

## Development

```bash
npm install      # installs deps + generates Prisma client (postinstall)
npm run dev      # start the dev server on http://localhost:3000
npm run build    # production build
npm run lint     # eslint (next lint)
```

Environment variables are documented in [.env.example](.env.example).

## Project layout

| Path | Purpose |
|------|---------|
| `app/` | Next.js routes — `(admin)` dashboard, `(auth)`, `home/{student,tutor}`, `tutor/[id]`, and `api/` route handlers |
| `components/` | React components (landing, onboarding, sessions, UI primitives) |
| `lib/` | Server/client helpers — Prisma singleton, Supabase clients, auth, Stripe, LiveKit, presence |
| `prisma/` | Schema, migrations, seeds (`prisma/generated/` is git-ignored, regenerated on build) |
| `scripts/` | Seed + data-build utilities |
| `docs/` | Feature/audit notes |

> Note: several `eclero-*` identifiers remain in code (`eclero-storage` Supabase bucket, `eclero-collaboration` LiveKit topic, `eclero-livekit.livekit.cloud` host). These are live infrastructure names and are intentionally left unchanged.
