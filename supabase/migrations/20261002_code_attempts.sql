-- Wrong programme codes, so guessing can be throttled: ten wrong codes an hour per account,
-- twenty per address (hashed, as in story.runs). Written and read only by the server (service role).
create table story.code_attempts (
  id bigserial primary key,
  user_id uuid,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index code_attempts_user_idx on story.code_attempts (user_id, created_at);
create index code_attempts_ip_idx on story.code_attempts (ip_hash, created_at);
alter table story.code_attempts enable row level security;
grant all on story.code_attempts to service_role;
grant all on sequence story.code_attempts_id_seq to service_role;
