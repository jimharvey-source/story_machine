-- One free story per real inbox. jim+a@gmail.com, jim+b@gmail.com and j.i.m@gmail.com are one inbox.
-- Applied 2 October 2026. ensureProfile (lib/access.ts) fills email_canonical for new profiles.
alter table story.profiles add column if not exists email_canonical text;
update story.profiles set email_canonical =
  case when split_part(lower(email), '@', 2) in ('gmail.com', 'googlemail.com')
    then replace(split_part(split_part(lower(email), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else split_part(split_part(lower(email), '@', 1), '+', 1) || '@' || split_part(lower(email), '@', 2)
  end
where email_canonical is null;
create index if not exists profiles_email_canonical_idx on story.profiles (email_canonical);
