# LearnPeers Design System

A lightweight, in-house design system. **No external UI library** (no shadcn/MUI)
— just Tailwind tokens + a small set of typed React primitives. The brand colour
scheme is fixed; primitives standardise spacing, radius, elevation, and states so
screens stop hand-rolling (and drifting on) the same Tailwind strings.

## Tokens (`tailwind.config.js`)

### Colour
- `brand-{50..950}` — azure brand scale (`brand-600` = `#0077BE`, the logo blue).
- `ink-{50..950}` — charcoal neutral scale (`ink-900` = `#243036`, logo charcoal).
- Semantic surfaces (named aliases for greys that were previously hard-coded):
  - `canvas` (`#fafaf9`) — warm page background.
  - `surface` (`#ffffff`) — elevated/card background.
  - `muted` (`#f3f5f7`) — subtle fills (sidebars, chips, inert inputs).

Use `bg-canvas` / `bg-surface` / `bg-muted` instead of `bg-[#FAFAF9]` etc.
Use `text-ink-*` for text and `border-ink-100/200` for borders. Avoid raw
hex/`slate-*`; prefer `ink-*` so neutrals stay consistent.

### Elevation
- `shadow-sm` / `shadow-md` — standard card elevation.
- `shadow-brand` — brand-tinted elevation for primary CTAs
  (replaces the ad-hoc `shadow-lg shadow-brand-600/25`).

### Radius
Cards: `rounded-2xl`. Inputs/controls: `rounded-xl`. Small controls/chips:
`rounded-lg` / `rounded-full`.

## Primitives (`components/ui/primitives`)

```ts
import { Button, Input, Textarea, Label, Card, Badge, Spinner, Modal }
  from "@/components/ui/primitives";
```

### `Button`
`variant`: `primary` (brand gradient) · `secondary` · `ghost` · `danger` · `subtle`.
`size`: `sm` · `md` · `lg`. Plus `loading`, `fullWidth`, `leftIcon`, `rightIcon`.
Pass `href` to render a Next `<Link>` styled as a button (for link CTAs).

```tsx
<Button variant="primary" size="lg" loading={saving}>Create account</Button>
<Button href="/home/student/explore" variant="secondary">Explore tutors</Button>
```

### `Input` / `Textarea` / `Label`
Standard field styling with focus ring; `invalid` toggles the error style.

```tsx
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" invalid={!!error} />
```

### `Card`
`padding`: `none` · `sm` · `md` · `lg`. `interactive` adds hover elevation.

### `Badge`
`tone`: `brand` · `neutral` · `success` · `warning` · `danger`. `dot` adds a
status dot (e.g. live/available).

### `Spinner`
Small inline spinner for buttons/tight spots. For full-page loading use
`LearnPeersLoader` (`components/ui/LearnPeersLoader.tsx`).

### `Modal`
Portal-rendered dialog with Escape-to-close, backdrop click, body scroll-lock,
and initial focus. Props: `isOpen`, `onClose`, `title`, `size`
(`sm|md|lg|xl`), `closeOnOverlay`, `showClose`.

```tsx
<Modal isOpen={open} onClose={() => setOpen(false)} title="Book a session" size="xl">
  …
</Modal>
```

## Conventions
- Reach for a primitive before writing raw Tailwind for a button/input/card/modal.
- Keep the brand palette; don't introduce new accent colours.
- Compose classes with `cn()` from `@/lib/utils` (clsx + tailwind-merge).
- New shared, reusable UI belongs in `components/ui/primitives`.
