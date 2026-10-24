-- The Codes page (24 October 2026): who made each code. Backward compatible; nothing else reads it.
alter table story.cohort_codes add column if not exists created_by text;
