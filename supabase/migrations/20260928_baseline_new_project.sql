-- The whole StoryMachine schema in one file, for the StoryMachine's own Supabase project (created 28 September 2026).
-- Taken from the live schema in the shared DelegateIgnite project. The two earlier migrations are already folded in.
-- After applying: add "story" to Settings > API > Data API > Exposed schemas.

create schema if not exists story;

create table story.cohort_codes (
  code text primary key,
  label text not null,
  max_uses integer,
  uses integer not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  stories_per_user integer not null default 20
);

create table story.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  plan text not null default 'free' check (plan in ('free','pro','lifetime')),
  plan_source text check (plan_source in ('stripe','code','manual')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text,
  current_period_end timestamptz,
  cohort_code text references story.cohort_codes(code),
  mailchimp_subscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  story_credits integer not null default 0,
  stories_started integer not null default 0
);

create table story.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references story.profiles(id) on delete cascade,
  title text not null,
  notes text not null,
  audience text not null default '',
  intent text not null default '',
  register text not null default 'business' check (register in ('formal','business','conversational')),
  story jsonb not null,
  landing jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  guest_id uuid,
  unlocked boolean not null default false,
  constraint stories_owner_check check (user_id is not null or guest_id is not null)
);
create index stories_user_updated_idx on story.stories (user_id, updated_at desc);
create index stories_guest_id_idx on story.stories (guest_id) where guest_id is not null;

create table story.generations (
  id bigint generated always as identity primary key,
  user_id uuid references story.profiles(id) on delete set null,
  kind text not null check (kind in ('story','land','edit','refine','extract')),
  attempts integer,
  violations_before integer,
  violations_after integer,
  created_at timestamptz not null default now()
);
create index generations_user_idx on story.generations (user_id, created_at desc);

create table story.purchases (
  session_id text primary key,
  user_id uuid not null references story.profiles(id) on delete cascade,
  kind text not null check (kind in ('story','lifetime')),
  created_at timestamptz not null default now()
);

create table story.runs (
  id bigserial primary key,
  guest_id uuid,
  user_id uuid,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index runs_created_at_idx on story.runs (created_at);

alter table story.cohort_codes enable row level security;
alter table story.profiles enable row level security;
alter table story.stories enable row level security;
alter table story.generations enable row level security;
alter table story.purchases enable row level security;
alter table story.runs enable row level security;

create policy "own profile" on story.profiles for select using (auth.uid() = id);
create policy "own stories" on story.stories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own generations" on story.generations for select using (auth.uid() = user_id);

create or replace function story.start_story(p_user uuid) returns boolean
language plpgsql security definer set search_path = story as $$
declare p record;
begin
  select * into p from story.profiles where id = p_user for update;
  if p is null then return false; end if;
  if p.plan = 'lifetime' then
    update story.profiles set stories_started = stories_started + 1 where id = p_user;
    return true;
  end if;
  if p.plan = 'pro' and (p.current_period_end is null or p.current_period_end > now() - interval '3 days') then
    update story.profiles set stories_started = stories_started + 1 where id = p_user;
    return true;
  end if;
  if p.stories_started < 1 + p.story_credits then
    update story.profiles set stories_started = stories_started + 1 where id = p_user;
    return true;
  end if;
  return false;
end $$;

create or replace function story.refund_story(p_user uuid) returns void
language sql security definer set search_path = story as $$
  update story.profiles set stories_started = greatest(stories_started - 1, 0) where id = p_user;
$$;

create or replace function story.grant_purchase(p_user uuid, p_session text, p_kind text) returns boolean
language plpgsql security definer set search_path = story as $$
begin
  insert into story.purchases (session_id, user_id, kind) values (p_session, p_user, p_kind)
  on conflict (session_id) do nothing;
  if not found then return false; end if;
  if p_kind = 'story' then
    update story.profiles set story_credits = story_credits + 1, updated_at = now() where id = p_user;
  elsif p_kind = 'lifetime' then
    update story.profiles set plan = 'lifetime', plan_source = 'stripe', updated_at = now() where id = p_user;
  else
    raise exception 'unknown purchase kind %', p_kind;
  end if;
  return true;
end $$;

create or replace function story.redeem_code(p_user uuid, p_code text) returns text
language plpgsql security definer set search_path = story, public as $$
declare
  c story.cohort_codes%rowtype;
  p story.profiles%rowtype;
begin
  select * into c from story.cohort_codes where code = upper(trim(p_code)) for update;
  if not found or not c.active then raise exception 'That code is not recognised'; end if;
  if c.expires_at is not null and c.expires_at <= now() then raise exception 'That code has expired'; end if;
  select * into p from story.profiles where id = p_user for update;
  if p.cohort_code = c.code then raise exception 'You have already used that code'; end if;
  if c.max_uses is not null and c.uses >= c.max_uses then raise exception 'That code has been used the maximum number of times'; end if;
  update story.cohort_codes set uses = uses + 1 where code = c.code;
  update story.profiles
    set story_credits = story_credits + c.stories_per_user,
        plan_source = coalesce(plan_source, 'code'),
        cohort_code = c.code,
        updated_at = now()
    where id = p_user;
  return c.label || ': ' || c.stories_per_user || ' stories added';
end $$;

create or replace function story.unlock_story(p_story uuid, p_user uuid) returns boolean
language plpgsql security definer set search_path = story, public as $$
declare is_unlocked boolean;
begin
  select unlocked into is_unlocked from story.stories where id = p_story and user_id = p_user for update;
  if not found then return false; end if;
  if is_unlocked then return true; end if;
  if story.start_story(p_user) then
    update story.stories set unlocked = true where id = p_story;
    return true;
  end if;
  return false;
end $$;

create or replace function story.claim_stories(p_guest uuid, p_user uuid) returns integer
language sql security definer set search_path = story, public as $$
  with c as (
    update story.stories set user_id = p_user, guest_id = null
    where guest_id = p_guest and user_id is null
    returning 1
  ) select count(*)::integer from c;
$$;

-- The server works through the service role. Signed-in browsers see only their own rows (RLS above).
grant usage on schema story to service_role, authenticated;
grant all on all tables in schema story to service_role;
grant all on all sequences in schema story to service_role;
grant select, insert, update, delete on story.stories to authenticated;
grant select on story.profiles, story.generations to authenticated;
revoke execute on all functions in schema story from public, anon, authenticated;
grant execute on all functions in schema story to service_role;

-- Programme codes carried over from the shared project.
insert into story.cohort_codes (code, label, max_uses, uses, active, expires_at, stories_per_user)
values ('JHTEST26', 'Jim end-to-end test', 5, 0, true, '2026-12-31 00:00:00+00', 20);
