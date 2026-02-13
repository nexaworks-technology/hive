-- Create verification_codes table for custom email verification
create extension if not exists "pgcrypto";

create table if not exists public.verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now()
);

-- Allow only one active (unconsumed) code per user
create unique index if not exists verification_codes_one_active
  on public.verification_codes(user_id)
  where consumed_at is null;

alter table public.verification_codes enable row level security;

-- If you ever want end users to read/insert their own codes (not required when using the service role),
-- uncomment and apply policies like the following:
-- create policy "user_can_see_their_codes" on public.verification_codes
--   for select using (auth.uid() = user_id);
-- create policy "user_can_insert_their_codes" on public.verification_codes
--   for insert with check (auth.uid() = user_id);
