-- Photos and screenshots read into the notes (21 October 2026).
-- One row per picture read, so the daily ceilings can be counted. The picture itself is never stored.
create table if not exists story.photo_reads (
  id bigserial primary key,
  user_id uuid references story.profiles(id) on delete set null,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists photo_reads_user_idx on story.photo_reads (user_id, created_at);
create index if not exists photo_reads_ip_idx on story.photo_reads (ip_hash, created_at);
alter table story.photo_reads enable row level security;
revoke all on story.photo_reads from anon, authenticated;
grant all on story.photo_reads to service_role;
grant usage, select on sequence story.photo_reads_id_seq to service_role;
