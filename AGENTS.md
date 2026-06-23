# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, layouts, API routes.
- `components/`: Reusable React components (prefer `PascalCase.tsx`).
- `lib/`: Utilities, clients, and helpers (prefer `kebab-case.ts`).
- `components/ui/primitives/`: Shared design-system primitives (Button, Input, Card, …); see `docs/DESIGN_SYSTEM.md`.
- `prisma/`: Prisma schema and generated client.
- `public/`: Static assets; `styles/`: Tailwind/PostCSS styles.
- `types/`: Shared TypeScript types; `docs/`, `generated/`: project docs/artifacts.
- Module aliases supported: `@/components/*`, `@/lib/*`, `@/app/*`.

## Build, Test, and Development Commands
- `npm run dev`: Start local dev server (Next.js).
- `npm run build`: Production build.
- `npm start`: Run production server.
- `npm run lint`: Lint with ESLint 9 flat config (`eslint .`, Next presets). Runs clean (errors = 0); pre-existing stylistic issues are warnings.
- `npm run typecheck`: Type-check with `tsc --noEmit`.
- Post-install: `prisma generate` runs automatically. For schema changes, run `npx prisma migrate dev` (if applicable).

## Coding Style & Naming Conventions
- TypeScript + React. Follow ESLint (`eslint-config-next`) and fix issues before PRs.
- Components: `PascalCase` filenames; hooks `useCamelCase`.
- App Router: directories lowercase; use `page.tsx`, `layout.tsx` patterns.
- Imports: prefer `@/components/...`, `@/lib/...` aliases.

## Testing Guidelines
- No automated test framework is wired up yet (no Jest/Vitest/Playwright config exists).
- Verification today is manual: `npm run typecheck` + `npm run lint` must pass, plus the
  end-to-end walkthroughs in `docs/MANUAL_TESTS.md` (auth, onboarding, explore, booking,
  payment, live session).
- If adding automated tests, prefer Vitest + Testing Library; co-locate as `*.test.tsx`.

## Commit & Pull Request Guidelines
- Commits: Use concise, action-oriented prefixes (seen in history): `feat:`, `fix:`, `improve:`, `refine:`. Example: `fix: prevent navbar hydration mismatch`.
- Scope small, commit often; reference issues when relevant (e.g., `Closes #123`).
- PRs: Include summary, rationale, screenshots for UI, test plan, and checklist (lint/tests passing). Link related issues.

## Security & Configuration Tips
- Secrets in `.env.local` (never commit). Client-safe vars use `NEXT_PUBLIC_*`.
- Database/config: Prisma uses `DATABASE_URL`. Keep schemas and migrations consistent.
- Review `next.config.js` and `proxy.ts` (the Supabase SSR middleware) when changing routing or headers.
