
alter table public.riddles add column if not exists main_hint text not null default '';
alter table public.riddles add column if not exists creator_x_username text not null default '';

drop view if exists public.riddles_public;
create view public.riddles_public
with (security_invoker = true) as
select id, title, description, image_url, clues, difficulty, xp_reward, badge_title,
       start_time, end_time, max_winners, active, created_at,
       main_hint, creator_x_username
from public.riddles;
grant select on public.riddles_public to anon, authenticated;
