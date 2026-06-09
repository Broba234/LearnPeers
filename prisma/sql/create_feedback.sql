-- Persistent beta feedback messages. Stored only (no email dispatch).
create table if not exists public."Feedback" (
  id         uuid primary key default gen_random_uuid(),
  message    text not null,
  user_id    uuid references public."Profiles"(id) on delete set null,
  email      text,
  name       text,
  page       text,
  user_agent text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists "Feedback_created_at_idx" on public."Feedback" (created_at desc);
create index if not exists "Feedback_is_read_idx" on public."Feedback" (is_read);
create index if not exists "Feedback_user_id_idx" on public."Feedback" (user_id);

-- Lock down: access only via service/postgres (Prisma API routes), not anon/public.
alter table public."Feedback" enable row level security;
