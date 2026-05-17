
-- Drop public read policy on riddles; we'll serve via server function (no correct_answer leak)
drop policy if exists "riddles_public_read" on public.riddles;

-- Create a sanitized public view (without correct_answer)
create or replace view public.riddles_public
with (security_invoker = true) as
select id, title, description, image_url, clues, difficulty, xp_reward, badge_title,
       start_time, end_time, max_winners, active, created_at
from public.riddles;

-- Allow anon to select the view source columns (but not correct_answer column directly)
-- Since RLS is row-level not column-level, we instead grant select only on the view
grant select on public.riddles_public to anon, authenticated;
revoke select on public.riddles from anon, authenticated;
