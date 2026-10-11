-- Email first, one full free story (Jim and John, 9 October; built 11 October).
-- Every story now needs a signed-in account. Starting a story spends the allowance at once,
-- so the story is unlocked from the start and Stage 1 and Stage 2 run without a break.
-- The free story (no purchase, no programme, no subscription) is capped, so nobody can
-- take the prompts apart by running it a hundred times. Paid, programme and unlimited
-- stories are never capped. The caps themselves live in lib/access.ts (FREE_CAPS).

alter table story.stories add column if not exists capped boolean not null default false;
alter table story.stories add column if not exists ai_usage jsonb not null default '{}'::jsonb;
alter table story.stories add column if not exists rhetoric jsonb;

-- Spend what it takes to start a story. Returns how it was paid for:
-- 'unlimited' (lifetime, a running subscription or programme month), 'paid' (a bought or programme credit),
-- 'free' (the one free story), or null when the person must buy first.
create or replace function story.begin_story(p_user uuid) returns text
language plpgsql security definer set search_path = story as $$
declare p record;
begin
  select * into p from story.profiles where id = p_user for update;
  if p is null then return null; end if;
  if p.plan = 'lifetime'
     or (p.plan = 'pro' and (p.current_period_end is null or p.current_period_end > now() - interval '3 days')) then
    update story.profiles set stories_started = stories_started + 1 where id = p_user;
    return 'unlimited';
  end if;
  if p.stories_started < 1 + p.story_credits then
    update story.profiles set stories_started = stories_started + 1 where id = p_user;
    -- The free story is the one spent with no credits on the account and no programme behind it.
    if p.story_credits = 0 and p.cohort_code is null and p.stories_started = 0 then
      return 'free';
    end if;
    return 'paid';
  end if;
  return null;
end $$;

-- Unlocking an older locked story (made as a guest before 11 October) goes through the same door,
-- so a free unlock is capped like any other free story.
create or replace function story.unlock_story(p_story uuid, p_user uuid) returns boolean
language plpgsql security definer set search_path = story, public as $$
declare
  is_unlocked boolean;
  how text;
begin
  select unlocked into is_unlocked from story.stories where id = p_story and user_id = p_user for update;
  if not found then return false; end if;
  if is_unlocked then return true; end if;
  how := story.begin_story(p_user);
  if how is null then return false; end if;
  update story.stories set unlocked = true, capped = (how = 'free') where id = p_story;
  return true;
end $$;

-- Count one AI action on a story and say whether it may go ahead.
-- Uncapped stories always may. A capped story may until its count for that kind reaches p_limit.
-- A capped story whose owner has since subscribed is uncapped for good.
create or replace function story.spend_ai(p_story uuid, p_user uuid, p_kind text, p_limit integer) returns boolean
language plpgsql security definer set search_path = story, public as $$
declare
  s record;
  p record;
  used integer;
begin
  select id, capped, ai_usage into s from story.stories where id = p_story and user_id = p_user for update;
  if not found then return false; end if;
  used := coalesce((s.ai_usage ->> p_kind)::integer, 0);
  if s.capped then
    select plan, current_period_end into p from story.profiles where id = p_user;
    if p.plan = 'lifetime' or (p.plan = 'pro' and (p.current_period_end is null or p.current_period_end > now() - interval '3 days')) then
      update story.stories set capped = false where id = p_story;
    elsif used >= p_limit then
      return false;
    end if;
  end if;
  update story.stories set ai_usage = jsonb_set(ai_usage, array[p_kind], to_jsonb(used + 1)) where id = p_story;
  return true;
end $$;

-- Give an AI action back when the call failed.
create or replace function story.refund_ai(p_story uuid, p_kind text) returns void
language sql security definer set search_path = story, public as $$
  update story.stories
  set ai_usage = jsonb_set(ai_usage, array[p_kind], to_jsonb(greatest(coalesce((ai_usage ->> p_kind)::integer, 0) - 1, 0)))
  where id = p_story;
$$;

revoke execute on function story.begin_story(uuid) from public, anon, authenticated;
revoke execute on function story.unlock_story(uuid, uuid) from public, anon, authenticated;
revoke execute on function story.spend_ai(uuid, uuid, text, integer) from public, anon, authenticated;
revoke execute on function story.refund_ai(uuid, text) from public, anon, authenticated;
grant execute on function story.begin_story(uuid) to service_role;
grant execute on function story.unlock_story(uuid, uuid) to service_role;
grant execute on function story.spend_ai(uuid, uuid, text, integer) to service_role;
grant execute on function story.refund_ai(uuid, text) to service_role;

-- The two new AI calls are logged like the others.
alter table story.generations drop constraint if exists generations_kind_check;
alter table story.generations add constraint generations_kind_check
  check (kind in ('story','land','edit','refine','extract','questions','rhetoric','ending'));
