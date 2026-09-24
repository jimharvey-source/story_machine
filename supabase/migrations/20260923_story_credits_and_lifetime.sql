-- Applied to project fdiitxhgfytvlbtokbok on 23 September 2026 (migration story_credits_and_lifetime).
-- One free story, then single-story credits, a monthly subscription, or lifetime.
alter table story.profiles drop constraint if exists profiles_plan_check;
alter table story.profiles add constraint profiles_plan_check check (plan in ('free','pro','lifetime'));
alter table story.profiles add column if not exists story_credits integer not null default 0;
alter table story.profiles add column if not exists stories_started integer not null default 0;

create table if not exists story.purchases (
  session_id text primary key,
  user_id uuid not null references story.profiles(id) on delete cascade,
  kind text not null check (kind in ('story','lifetime')),
  created_at timestamptz not null default now()
);
alter table story.purchases enable row level security;

-- Spend the free story or a credit. Unlimited plans pass straight through.
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

-- Record a Stripe one-off payment once. A second call with the same session id does nothing.
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

revoke all on function story.start_story(uuid) from public, anon, authenticated;
revoke all on function story.grant_purchase(uuid, text, text) from public, anon, authenticated;

-- Give back a started story when generation failed (migration story_refund_story).
create or replace function story.refund_story(p_user uuid) returns void
language sql security definer set search_path = story as $$
  update story.profiles set stories_started = greatest(stories_started - 1, 0) where id = p_user;
$$;
revoke all on function story.refund_story(uuid) from public, anon, authenticated;

-- Programme codes give each participant a number of stories, 20 by default (migration story_codes_grant_credits).
alter table story.cohort_codes add column if not exists stories_per_user integer not null default 20;

create or replace function story.redeem_code(p_user uuid, p_code text) returns text
language plpgsql security definer set search_path = story, public as $$
declare
  c story.cohort_codes%rowtype;
  p story.profiles%rowtype;
begin
  select * into c from story.cohort_codes where code = upper(trim(p_code)) for update;
  if not found or not c.active then
    raise exception 'That code is not recognised';
  end if;
  if c.expires_at is not null and c.expires_at <= now() then
    raise exception 'That code has expired';
  end if;
  select * into p from story.profiles where id = p_user for update;
  if p.cohort_code = c.code then
    raise exception 'You have already used that code';
  end if;
  if c.max_uses is not null and c.uses >= c.max_uses then
    raise exception 'That code has been used the maximum number of times';
  end if;
  update story.cohort_codes set uses = uses + 1 where code = c.code;
  update story.profiles
    set story_credits = story_credits + c.stories_per_user,
        plan_source = coalesce(plan_source, 'code'),
        cohort_code = c.code,
        updated_at = now()
    where id = p_user;
  return c.label || ': ' || c.stories_per_user || ' stories added';
end;
$$;

update story.profiles set story_credits = story_credits + 20, plan = 'free' where plan = 'pro' and plan_source = 'code';

-- The server uses the service role (migration story_service_role_grants, 24 September).
-- Also: Project Settings, Data API, Exposed schemas must include "story", or PostgREST answers "Invalid schema: story".
grant usage on schema story to service_role;
grant all on all tables in schema story to service_role;
grant all on all sequences in schema story to service_role;
alter default privileges in schema story grant all on tables to service_role;
alter default privileges in schema story grant all on sequences to service_role;
grant execute on function story.start_story(uuid) to service_role;
grant execute on function story.refund_story(uuid) to service_role;
grant execute on function story.grant_purchase(uuid, text, text) to service_role;
grant execute on function story.redeem_code(uuid, text) to service_role;
