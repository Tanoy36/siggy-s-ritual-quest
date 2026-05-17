
-- Riddles table
create table public.riddles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  image_url text,
  clues text[] not null default '{}',
  correct_answer text not null,
  difficulty text not null default 'medium',
  xp_reward integer not null default 100,
  badge_title text not null default 'Ritualist',
  start_time timestamptz not null default now(),
  end_time timestamptz not null default (now() + interval '7 days'),
  max_winners integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Submissions table
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  riddle_id uuid not null references public.riddles(id) on delete cascade,
  wallet_address text not null,
  x_username text not null,
  x_avatar_seed text not null,
  answer text not null,
  is_correct boolean not null default false,
  xp_earned integer not null default 0,
  badge_title text,
  completion_time_ms bigint not null default 0,
  tx_hash text,
  signature text,
  created_at timestamptz not null default now(),
  unique (riddle_id, wallet_address)
);

create index on public.submissions (riddle_id, is_correct, completion_time_ms);
create index on public.submissions (created_at desc);

-- Banned wallets
create table public.banned_wallets (
  wallet_address text primary key,
  reason text,
  created_at timestamptz not null default now()
);

-- Announcements
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.riddles enable row level security;
alter table public.submissions enable row level security;
alter table public.banned_wallets enable row level security;
alter table public.announcements enable row level security;

-- Public read
create policy "riddles_public_read" on public.riddles for select using (true);
create policy "submissions_public_read" on public.submissions for select using (true);
create policy "announcements_public_read" on public.announcements for select using (true);

-- Public insert for submissions (validations enforced app-side + unique constraint + banned check via trigger)
create or replace function public.check_submission_not_banned()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.banned_wallets where lower(wallet_address) = lower(new.wallet_address)) then
    raise exception 'Wallet banned';
  end if;
  return new;
end; $$;

create trigger submissions_ban_check before insert on public.submissions
for each row execute function public.check_submission_not_banned();

create policy "submissions_public_insert" on public.submissions for insert with check (true);

-- Storage bucket for riddle images
insert into storage.buckets (id, name, public) values ('riddle-images', 'riddle-images', true)
on conflict (id) do nothing;

create policy "riddle_images_public_read" on storage.objects for select using (bucket_id = 'riddle-images');
create policy "riddle_images_public_upload" on storage.objects for insert with check (bucket_id = 'riddle-images');
create policy "riddle_images_public_update" on storage.objects for update using (bucket_id = 'riddle-images');
create policy "riddle_images_public_delete" on storage.objects for delete using (bucket_id = 'riddle-images');

-- Realtime
alter publication supabase_realtime add table public.submissions;
alter publication supabase_realtime add table public.riddles;
alter publication supabase_realtime add table public.announcements;
