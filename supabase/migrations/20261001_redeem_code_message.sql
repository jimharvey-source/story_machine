-- The result of redeeming a code is shown to the person, so it must not carry the internal label
-- ("Jim end-to-end test", a client cohort name). Labels stay for reporting only.
create or replace function story.redeem_code(p_user uuid, p_code text)
 returns text
 language plpgsql
 security definer
 set search_path to 'story', 'public'
as $function$
declare
  c story.cohort_codes%rowtype;
  p story.profiles%rowtype;
begin
  select * into c from story.cohort_codes where code = upper(replace(p_code, ' ', '')) for update;
  if not found or not c.active then raise exception 'That code is not recognised'; end if;
  select * into p from story.profiles where id = p_user for update;
  if p.cohort_code = c.code then raise exception 'You have already used that code'; end if;
  if c.expires_at is not null and c.expires_at <= now() then raise exception 'That code has expired'; end if;
  if c.max_uses is not null and c.uses >= c.max_uses then raise exception 'That code has been used the maximum number of times'; end if;
  update story.cohort_codes set uses = uses + 1 where code = c.code;
  update story.profiles
    set story_credits = story_credits + c.stories_per_user,
        plan_source = coalesce(plan_source, 'code'),
        cohort_code = c.code,
        updated_at = now()
    where id = p_user;
  return c.stories_per_user || ' stories added to your account';
end $function$;

revoke execute on function story.redeem_code(uuid, text) from public, anon, authenticated;
grant execute on function story.redeem_code(uuid, text) to service_role;
