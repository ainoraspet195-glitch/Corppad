-- ============================================================
-- Corppad — RLS policies for org isolation
-- Idempotent: drops and recreates all policies.
-- Run AFTER schema.sql in Supabase SQL editor.
-- ============================================================

-- Enable RLS on all tables
alter table organizations enable row level security;
alter table org_members    enable row level security;
alter table projects       enable row level security;
alter table invites        enable row level security;

-- ─── Helper functions ────────────────────────────────────────

-- Returns true if the current user is a member of the given org
create or replace function is_org_member(org uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from org_members
    where org_id = org and user_id = auth.uid()
  );
$$;

-- Returns true if the current user has at least the given role in the org
-- role hierarchy: owner > admin > member
create or replace function has_org_role(org uuid, required_role text)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from org_members
    where org_id = org
      and user_id = auth.uid()
      and (
        case required_role
          when 'member' then role in ('owner', 'admin', 'member')
          when 'admin'  then role in ('owner', 'admin')
          when 'owner'  then role = 'owner'
          else false
        end
      )
  );
$$;

-- ─── organizations ───────────────────────────────────────────

drop policy if exists "org members can read their org" on organizations;

-- Members can read orgs they belong to
create policy "org members can read their org"
  on organizations for select
  using (is_org_member(id));

-- No direct inserts from client; org creation uses service role in onboarding action

-- ─── org_members ─────────────────────────────────────────────

drop policy if exists "org members can read memberships" on org_members;

-- Members can see other members in the same org
create policy "org members can read memberships"
  on org_members for select
  using (is_org_member(org_id));

-- No direct inserts from client; managed via service role

-- ─── projects ────────────────────────────────────────────────
-- Stage 2: write operations require admin or owner role.
-- Members are read-only; limit enforcement happens in app code.

drop policy if exists "org members can read projects"   on projects;
drop policy if exists "org members can insert projects" on projects;
drop policy if exists "org members can update projects" on projects;
drop policy if exists "admins can insert projects"      on projects;
drop policy if exists "admins can update projects"      on projects;
drop policy if exists "admins can delete projects"      on projects;

-- All org members can read projects
create policy "org members can read projects"
  on projects for select
  using (is_org_member(org_id));

-- Owner/Admin only: create projects
-- Note: free-plan project limit is enforced in app code (server actions), not here.
create policy "admins can insert projects"
  on projects for insert
  with check (has_org_role(org_id, 'admin'));

-- Owner/Admin only: update projects
create policy "admins can update projects"
  on projects for update
  using (has_org_role(org_id, 'admin'))
  with check (has_org_role(org_id, 'admin'));

-- Owner/Admin only: delete projects
create policy "admins can delete projects"
  on projects for delete
  using (has_org_role(org_id, 'admin'));

-- ─── invites ─────────────────────────────────────────────────

drop policy if exists "org members can read invites" on invites;
drop policy if exists "admins can insert invites"    on invites;
drop policy if exists "admins can update invites"    on invites;

-- Org members can read invites for their org
create policy "org members can read invites"
  on invites for select
  using (is_org_member(org_id));

-- Admins/owners can create invites
create policy "admins can insert invites"
  on invites for insert
  with check (has_org_role(org_id, 'admin'));

-- Admins/owners can update invites (e.g. mark used)
create policy "admins can update invites"
  on invites for update
  using (has_org_role(org_id, 'admin'));

-- Service role bypasses RLS — used for onboarding and accept-invite flows
