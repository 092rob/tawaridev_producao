
-- Enum de papéis
create type public.app_role as enum ('admin', 'cliente');

-- Perfis
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Papéis (separado de profiles por segurança)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Função de checagem (security definer evita recursão em RLS)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Dashboards
create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  embed_url text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
alter table public.dashboards enable row level security;

-- Acessos (qual cliente vê qual dashboard)
create table public.dashboard_access (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  unique (dashboard_id, user_id)
);
alter table public.dashboard_access enable row level security;

-- RLS: profiles
create policy "Usuários veem seu próprio perfil"
  on public.profiles for select to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));

create policy "Admins atualizam perfis"
  on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Usuário atualiza próprio perfil"
  on public.profiles for update to authenticated
  using (auth.uid() = id);

-- RLS: user_roles
create policy "Usuário vê próprias funções"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Admins gerenciam funções"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- RLS: dashboards
create policy "Admins veem todos os dashboards"
  on public.dashboards for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Clientes veem dashboards liberados"
  on public.dashboards for select to authenticated
  using (
    exists (
      select 1 from public.dashboard_access
      where dashboard_access.dashboard_id = dashboards.id
        and dashboard_access.user_id = auth.uid()
    )
  );

create policy "Admins gerenciam dashboards"
  on public.dashboards for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- RLS: dashboard_access
create policy "Usuário vê seus acessos"
  on public.dashboard_access for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Admins gerenciam acessos"
  on public.dashboard_access for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Trigger: cria profile + role 'cliente' ao registrar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);

  insert into public.user_roles (user_id, role)
  values (new.id, 'cliente');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
