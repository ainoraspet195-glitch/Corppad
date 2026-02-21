-- ============================================================
-- Corppad — minimal schema
-- Run this in Supabase SQL editor (once, in order)
-- ============================================================

-- organizations
create table if not exists organizations (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  slug                   text not null unique,
  plan                   text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  subscription_status    text,
  current_period_end     timestamptz,        -- populated by Stripe webhook
  created_at             timestamptz not null default now()
);

-- Stage 4 migration: add current_period_end if running against an existing DB
alter table organizations
  add column if not exists current_period_end timestamptz;

-- org_members (junction: user ↔ org + role)
create table if not exists org_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique(org_id, user_id)
);

-- projects
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  description text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- invites
create table if not exists invites (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  token      text not null unique default encode(gen_random_bytes(32), 'hex'),
  role       text not null default 'member' check (role in ('admin', 'member')),
  email      text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at    timestamptz
);

-- indexes for common queries
create index if not exists idx_org_members_user_id on org_members(user_id);
create index if not exists idx_org_members_org_id  on org_members(org_id);
create index if not exists idx_projects_org_id     on projects(org_id);
create index if not exists idx_invites_token       on invites(token);
