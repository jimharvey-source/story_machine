-- The way in for participants and trialists (Phase 1 of the join-flow brief, 2 October 2026).
-- slug: the short address for a cohort (storymachine.themessagebusiness.com/givaudan). Lower case, unique.
--       Leave it empty for single-use trialist codes: a guessable /john could be spent by a stranger,
--       so trialists use /join/CODE, where the code is the secret.
-- greeting: the welcome page's first line, shown before sign-in ("Welcome to the Givaudan programme.").
-- banner: the line at the top of the app once in ("Givaudan programme").
-- label stays internal, for reporting. It is never shown.
alter table story.cohort_codes add column if not exists slug text;
alter table story.cohort_codes add column if not exists greeting text;
alter table story.cohort_codes add column if not exists banner text;
create unique index if not exists cohort_codes_slug_idx on story.cohort_codes (slug) where slug is not null;
alter table story.cohort_codes drop constraint if exists cohort_codes_slug_format;
alter table story.cohort_codes add constraint cohort_codes_slug_format check (slug is null or slug ~ '^[a-z0-9][a-z0-9-]{1,30}$');

-- A programme's stories include the free one. Twenty stories means twenty to use, not twenty-one:
-- someone who has not started a story yet gets stories_per_user less the free story they already hold.
-- The result is what the person now has, in words the page can show after "Code accepted.".
create or replace function story.redeem_code(p_user uuid, p_code text)
 returns text
 language plpgsql
 security definer
 set search_path to 'story', 'public'
as $function$
declare
  c story.cohort_codes%rowtype;
  p story.profiles%rowtype;
  added int;
  left_now int;
begin
  select * into c from story.cohort_codes where code = upper(replace(p_code, ' ', '')) for update;
  if not found or not c.active then raise exception 'That code is not recognised'; end if;
  select * into p from story.profiles where id = p_user for update;
  if p.cohort_code = c.code then raise exception 'You have already used that code'; end if;
  if c.expires_at is not null and c.expires_at <= now() then raise exception 'That code has expired'; end if;
  if c.max_uses is not null and c.uses >= c.max_uses then raise exception 'That code has been used the maximum number of times'; end if;
  added := c.stories_per_user - case when coalesce(p.stories_started, 0) = 0 then 1 else 0 end;
  update story.cohort_codes set uses = uses + 1 where code = c.code;
  update story.profiles
    set story_credits = story_credits + added,
        plan_source = coalesce(plan_source, 'code'),
        cohort_code = c.code,
        updated_at = now()
    where id = p_user
    returning greatest(0, 1 + story_credits - stories_started) into left_now;
  return left_now || case when left_now = 1 then ' story' else ' stories' end || ' on your account';
end $function$;

revoke execute on function story.redeem_code(uuid, text) from public, anon, authenticated;
grant execute on function story.redeem_code(uuid, text) to service_role;

update story.cohort_codes set slug = 'givaudan', greeting = 'Welcome to the Givaudan programme.', banner = 'Givaudan programme' where code = 'GIVAUDAN-E93K';
update story.cohort_codes set slug = 'puig', greeting = 'Welcome to the Puig programme.', banner = 'Puig programme' where code = 'PUIG-SF2D';
update story.cohort_codes set greeting = 'Welcome, John.', banner = 'Your trial' where code = 'ZIMMER-7YC5';
update story.cohort_codes set greeting = 'Welcome, Rob.', banner = 'Your trial' where code = 'ROB-3VAK';
update story.cohort_codes set greeting = 'Welcome, Jim.', banner = 'Test account' where code = 'JHTEST26';
