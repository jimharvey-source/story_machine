-- Stage 1 (Get your story straight) is free and needs no sign-in.
-- Stage 2 and the PDF need a signed-in, unlocked story: the first is free, then a credit, a month or lifetime.

-- Stories can belong to a guest (browser cookie) until the person signs in and claims them.
alter table story.stories alter column user_id drop not null;
alter table story.stories add column if not exists guest_id uuid;
alter table story.stories add column if not exists unlocked boolean not null default false;
-- Everything made before this change was already paid for or was the free story.
update story.stories set unlocked = true where unlocked = false;
create index if not exists stories_guest_id_idx on story.stories (guest_id) where guest_id is not null;
alter table story.stories add constraint stories_owner_check check (user_id is not null or guest_id is not null);

-- Every stage-1 run, for rate limiting guests and free accounts.
create table if not exists story.runs (
  id bigserial primary key,
  guest_id uuid,
  user_id uuid,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists runs_created_at_idx on story.runs (created_at);
grant select, insert on story.runs to service_role;
grant usage, select on sequence story.runs_id_seq to service_role;

-- Unlock a story for stage 2 and the PDF. Spends the free story or a credit through start_story.
-- Returns true when the story is unlocked (already, or now); false when the person must buy first.
create or replace function story.unlock_story(p_story uuid, p_user uuid) returns boolean
language plpgsql security definer set search_path = story, public as $$
declare
  is_unlocked boolean;
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
grant execute on function story.unlock_story(uuid, uuid) to service_role;

-- A guest's stories become theirs when they sign in on the same browser.
create or replace function story.claim_stories(p_guest uuid, p_user uuid) returns integer
language sql security definer set search_path = story, public as $$
  with c as (
    update story.stories set user_id = p_user, guest_id = null
    where guest_id = p_guest and user_id is null
    returning 1
  ) select count(*)::integer from c;
$$;
grant execute on function story.claim_stories(uuid, uuid) to service_role;
