create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pokemon_id integer not null default 25 check (pokemon_id between 1 and 1025),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Utilizadores podem ver o próprio perfil"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Utilizadores podem criar o próprio perfil"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Utilizadores podem atualizar o próprio perfil"
  on public.user_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
