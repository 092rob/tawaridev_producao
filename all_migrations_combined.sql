
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


revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;


-- 1. Restrict EXECUTE on SECURITY DEFINER has_role to only authenticated role (used by RLS).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2. Add RESTRICTIVE policies on user_roles so only admins can ever INSERT/UPDATE/DELETE,
-- even if a permissive policy is ever added by mistake. Prevents privilege escalation.
CREATE POLICY "Only admins can insert roles (restrictive)"
ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins can update roles (restrictive)"
ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins can delete roles (restrictive)"
ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Restrict avatar bucket SELECT so files can be read but bucket cannot be enumerated
-- by listing without knowing the user folder. Drop broad public-read policy and replace.
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;

-- Allow public read of individual avatar files (path must include a uuid folder).
CREATE POLICY "Avatars public read by path"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
);

-- Garantir que a tabela glosa_uploads existe
CREATE TABLE IF NOT EXISTS public.glosa_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  tipo_importacao text
);

-- Garantir que a tabela glosa_records existe
CREATE TABLE IF NOT EXISTS public.glosa_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES public.glosa_uploads(id) ON DELETE CASCADE,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  tipo_importacao text,
  upload_id_old uuid -- Campo auxiliar caso necessário durante transições
);

-- Garantir permissões básicas para as tabelas criadas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glosa_uploads TO authenticated;
GRANT ALL ON public.glosa_uploads TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.glosa_records TO authenticated;
GRANT ALL ON public.glosa_records TO service_role;

-- Habilitar RLS
ALTER TABLE public.glosa_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glosa_records ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de segurança (podem ser refinadas pelas migrações seguintes)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins manage glosa_uploads' AND polrelid = 'public.glosa_uploads'::regclass) THEN
        CREATE POLICY "Admins manage glosa_uploads" ON public.glosa_uploads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins manage glosa_records' AND polrelid = 'public.glosa_records'::regclass) THEN
        CREATE POLICY "Admins manage glosa_records" ON public.glosa_records FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

ALTER TABLE public.glosa_records
  ADD COLUMN IF NOT EXISTS "Nome do Convenio" text,
  ADD COLUMN IF NOT EXISTS "Data Pagto." date,
  ADD COLUMN IF NOT EXISTS "Mês Pgto." text,
  ADD COLUMN IF NOT EXISTS "Tipo de Guia" text,
  ADD COLUMN IF NOT EXISTS "Nome paciente" text,
  ADD COLUMN IF NOT EXISTS "Num. Conta" text,
  ADD COLUMN IF NOT EXISTS "Dt.Atendimento" date,
  ADD COLUMN IF NOT EXISTS "Data Saída Guia" date,
  ADD COLUMN IF NOT EXISTS "Status de Analise" text,
  ADD COLUMN IF NOT EXISTS "Data Analise" date,
  ADD COLUMN IF NOT EXISTS "Situação da Guia" text,
  ADD COLUMN IF NOT EXISTS "Discriminador Guia" text,
  ADD COLUMN IF NOT EXISTS "Guia é de Recurso" text,
  ADD COLUMN IF NOT EXISTS "Conta Integralmente Glosada" text,
  ADD COLUMN IF NOT EXISTS "Nº Parcial de Recurso" numeric,
  ADD COLUMN IF NOT EXISTS "Nº Parcial do Item de Recurso" numeric,
  ADD COLUMN IF NOT EXISTS "Tipo produto" text,
  ADD COLUMN IF NOT EXISTS "Dt.Realizacao" date,
  ADD COLUMN IF NOT EXISTS "Dt. Recurso" date,
  ADD COLUMN IF NOT EXISTS "Dt.Aceite" date,
  ADD COLUMN IF NOT EXISTS "Centro de custos" text,
  ADD COLUMN IF NOT EXISTS "Apresentado (Demonstrativo)" numeric,
  ADD COLUMN IF NOT EXISTS "Qtde. Faturada" numeric,
  ADD COLUMN IF NOT EXISTS "Vlr. Unit. Faturado" numeric,
  ADD COLUMN IF NOT EXISTS "Valor Faturado" numeric,
  ADD COLUMN IF NOT EXISTS "Qtde. Paga" numeric,
  ADD COLUMN IF NOT EXISTS "Vlr. Unit. Pago" numeric,
  ADD COLUMN IF NOT EXISTS "Valor Pago" numeric,
  ADD COLUMN IF NOT EXISTS "Diferenca" numeric,
  ADD COLUMN IF NOT EXISTS "Glosa Submetida" numeric,
  ADD COLUMN IF NOT EXISTS "1ª Análise - Glosa Aceita" numeric,
  ADD COLUMN IF NOT EXISTS "1ª Análise - Glosa Refaturada" numeric,
  ADD COLUMN IF NOT EXISTS "1ª Análise - Glosa Recursada" numeric,
  ADD COLUMN IF NOT EXISTS "1ª Análise - Pendente Retorno" numeric,
  ADD COLUMN IF NOT EXISTS "1ª Análise - Glosa Recuperada" numeric,
  ADD COLUMN IF NOT EXISTS "1ª Análise - Glosa Mantida" numeric,
  ADD COLUMN IF NOT EXISTS "1ª Análise - Soma Aceites e Recursos" numeric,
  ADD COLUMN IF NOT EXISTS "Usuário Realizou Recurso" text,
  ADD COLUMN IF NOT EXISTS "Data Envio Recurso Lote" date,
  ADD COLUMN IF NOT EXISTS "Protocolo de Recurso Lote" text,
  ADD COLUMN IF NOT EXISTS "Usuário Realizou Aceite" text,
  ADD COLUMN IF NOT EXISTS "Data Envio Recurso Item" date,
  ADD COLUMN IF NOT EXISTS "Protocolo Envio Recurso Item" text,
  ADD COLUMN IF NOT EXISTS "Usuario Envio Recurso Item" text,
  ADD COLUMN IF NOT EXISTS "Usuário Realizou Refaturamento" text,
  ADD COLUMN IF NOT EXISTS "Data Refaturamento" date,
  ADD COLUMN IF NOT EXISTS "Usuario Analise" text,
  ADD COLUMN IF NOT EXISTS "Data última atualização dados" timestamp with time zone;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
ALTER TABLE public.glosa_records ADD COLUMN IF NOT EXISTS tipo_importacao text;
ALTER TABLE public.glosa_uploads ADD COLUMN IF NOT EXISTS tipo_importacao text;
UPDATE public.glosa_uploads u
SET tipo_importacao = sub.tipo
FROM (
  SELECT DISTINCT ON (upload_id) upload_id, tipo_importacao AS tipo
  FROM public.glosa_records
  WHERE tipo_importacao IS NOT NULL
) sub
WHERE u.id = sub.upload_id AND u.tipo_importacao IS NULL;

-- Tabela de registros do BI (consulta 3541673)
CREATE TABLE public.bi_payment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id TEXT,
  entidade_id TEXT NOT NULL,
  data_ultima_atualizacao TIMESTAMPTZ,
  raw JSONB NOT NULL,
  last_sync_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, entidade_id)
);

CREATE INDEX idx_bi_payment_records_atualizacao ON public.bi_payment_records (data_ultima_atualizacao);
CREATE INDEX idx_bi_payment_records_raw ON public.bi_payment_records USING GIN (raw);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_payment_records TO authenticated;
GRANT ALL ON public.bi_payment_records TO service_role;

ALTER TABLE public.bi_payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bi_payment_records"
ON public.bi_payment_records
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Histórico de execuções da sincronização
CREATE TABLE public.bi_sync_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('initial', 'incremental')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
  triggered_by UUID,
  filter_from DATE,
  rows_fetched INTEGER NOT NULL DEFAULT 0,
  rows_upserted INTEGER NOT NULL DEFAULT 0,
  pages INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_bi_sync_runs_started ON public.bi_sync_runs (started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_sync_runs TO authenticated;
GRANT ALL ON public.bi_sync_runs TO service_role;

ALTER TABLE public.bi_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bi_sync_runs"
ON public.bi_sync_runs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger de updated_at em bi_payment_records
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_bi_payment_records_updated_at
BEFORE UPDATE ON public.bi_payment_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'notify_glosa_users'
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.notify_glosa_users(text, text, text) FROM PUBLIC, anon, authenticated;
    END IF;
END $$;

CREATE TABLE public.glosa_rec_dashboard_access (
  user_id uuid PRIMARY KEY,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glosa_rec_dashboard_access TO authenticated;
GRANT ALL ON public.glosa_rec_dashboard_access TO service_role;
ALTER TABLE public.glosa_rec_dashboard_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage glosa_rec access" ON public.glosa_rec_dashboard_access
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users see own glosa_rec access" ON public.glosa_rec_dashboard_access
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.glosa_rec_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glosa_rec_uploads TO authenticated;
GRANT ALL ON public.glosa_rec_uploads TO service_role;
ALTER TABLE public.glosa_rec_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage glosa_rec_uploads" ON public.glosa_rec_uploads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authorized clients view glosa_rec_uploads" ON public.glosa_rec_uploads
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)
         OR EXISTS (SELECT 1 FROM public.glosa_rec_dashboard_access a WHERE a.user_id = auth.uid()));

CREATE TABLE public.glosa_rec_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES public.glosa_rec_uploads(id) ON DELETE CASCADE,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  convenio_nome text,
  id_guia text,
  protocolo_convenio text,
  tipo_guia text,
  nome_paciente text,
  num_conta text,
  data_pagamento date,
  mes_pagamento text,
  prazo_recebimento numeric,
  data_submissao_guia date,
  data_atendimento date,
  data_saida_guia date,
  status_conciliacao text,
  status_analise text,
  situacao_guia text,
  guia_recurso text,
  guia_associada text,
  recurso_vinculado text,
  conta_integralmente_glosada text,
  num_parcial_recurso numeric,
  valor_apresentado numeric,
  valor_faturado numeric,
  valor_pago numeric,
  diferenca numeric,
  glosa_submetida numeric,
  glosa_em_analise numeric,
  glosa_aceita numeric,
  glosa_refaturada numeric,
  glosa_recursada numeric,
  pendente_retorno numeric,
  glosa_recuperada numeric,
  glosa_mantida numeric,
  dt_limite_envio date,
  dt_envio date,
  mes_envio text,
  protocolo_envio text,
  dt_venc_recurso date,
  mes_venc_recurso text,
  dt_pgto_recurso date,
  mes_pgto_recurso text
);
CREATE INDEX idx_glosa_rec_records_upload ON public.glosa_rec_records(upload_id);
CREATE INDEX idx_glosa_rec_records_mes_pgto ON public.glosa_rec_records(mes_pagamento);
CREATE INDEX idx_glosa_rec_records_convenio ON public.glosa_rec_records(convenio_nome);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glosa_rec_records TO authenticated;
GRANT ALL ON public.glosa_rec_records TO service_role;
ALTER TABLE public.glosa_rec_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage glosa_rec_records" ON public.glosa_rec_records
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authorized clients view glosa_rec_records" ON public.glosa_rec_records
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)
         OR EXISTS (SELECT 1 FROM public.glosa_rec_dashboard_access a WHERE a.user_id = auth.uid()));

CREATE TABLE public.glosa_rec_metas (
  ano_mes text PRIMARY KEY,
  meta_valor numeric NOT NULL DEFAULT 0,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glosa_rec_metas TO authenticated;
GRANT ALL ON public.glosa_rec_metas TO service_role;
ALTER TABLE public.glosa_rec_metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage glosa_rec_metas" ON public.glosa_rec_metas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authorized clients view glosa_rec_metas" ON public.glosa_rec_metas
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)
         OR EXISTS (SELECT 1 FROM public.glosa_rec_dashboard_access a WHERE a.user_id = auth.uid()));

ALTER TABLE public.glosa_rec_uploads ADD COLUMN tipo_importacao TEXT;
ALTER TABLE public.glosa_rec_records ADD COLUMN tipo_importacao TEXT;

-- Adicionar índice para performance no filtro do dashboard
CREATE INDEX idx_glosa_rec_records_tipo_importacao ON public.glosa_rec_records(tipo_importacao);
CREATE INDEX idx_glosa_rec_uploads_tipo_importacao ON public.glosa_rec_uploads(tipo_importacao);
DELETE FROM public.glosa_rec_metas;
INSERT INTO public.glosa_rec_metas (ano_mes, meta_valor) VALUES ('individual', 700000), ('coletiva', 1000000);
-- Create table for agendas_positivas
CREATE TABLE public.agendas_positivas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  so_number SERIAL NOT NULL,
  subject TEXT NOT NULL,
  insurance TEXT NOT NULL,
  responsible_sector TEXT NOT NULL,
  description TEXT NOT NULL,
  opening_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Atendimento', 'Atendida')),
  responsible_user TEXT,
  observations TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Use GRANT to set permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendas_positivas TO authenticated;
GRANT ALL ON public.agendas_positivas TO service_role;

-- Enable RLS
ALTER TABLE public.agendas_positivas ENABLE ROW LEVEL SECURITY;

-- Create policies
-- For simplicity, let's allow all authenticated users to see and manage their own, 
-- but since this is a management panel, maybe they should see all?
-- User's request implies a "gestão de demandas", so likely team members should see all.
CREATE POLICY "Users can view all demands" 
ON public.agendas_positivas 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert demands" 
ON public.agendas_positivas 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update demands" 
ON public.agendas_positivas 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete demands" 
ON public.agendas_positivas 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER update_agendas_positivas_updated_at
BEFORE UPDATE ON public.agendas_positivas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.agendas_positivas 
ADD COLUMN IF NOT EXISTS treatment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reopening_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.agendas_positivas.treatment_count IS 'Número de vezes que a demanda recebeu tratativa';
COMMENT ON COLUMN public.agendas_positivas.reopening_count IS 'Número de vezes que a demanda foi reaberta após ser atendida';
COMMENT ON COLUMN public.agendas_positivas.resolved_at IS 'Data e hora em que a demanda foi marcada como Atendida pela primeira vez';
-- Adiciona a coluna responsible_id
ALTER TABLE public.agendas_positivas 
ADD COLUMN responsible_id UUID REFERENCES public.profiles(id);

-- Cria um índice para performance
CREATE INDEX idx_agendas_positivas_responsible_id ON public.agendas_positivas(responsible_id);

-- Permissões já devem estar cobertas pelos GRANTs existentes na tabela, 
-- mas por garantia:
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendas_positivas TO authenticated;
GRANT ALL ON public.agendas_positivas TO service_role;

-- Garante que user_id referencia profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'agendas_positivas_user_id_fkey') THEN
        ALTER TABLE public.agendas_positivas 
        ADD CONSTRAINT agendas_positivas_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id);
    END IF;
END $$;

-- O responsible_id já foi criado com referência, mas vamos garantir o nome da constraint
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'agendas_positivas_responsible_id_fkey') THEN
        ALTER TABLE public.agendas_positivas 
        ADD CONSTRAINT agendas_positivas_responsible_id_fkey 
        FOREIGN KEY (responsible_id) REFERENCES public.profiles(id);
    END IF;
END $$;

-- Drop a constraint existente que aponta para auth.users
ALTER TABLE public.agendas_positivas 
DROP CONSTRAINT IF EXISTS agendas_positivas_user_id_fkey;

-- Recria a constraint apontando para public.profiles
ALTER TABLE public.agendas_positivas 
ADD CONSTRAINT agendas_positivas_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- Create table for demand annotations
CREATE TABLE public.demand_annotations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    demand_id UUID NOT NULL REFERENCES public.agendas_positivas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_annotations TO authenticated;
GRANT ALL ON public.demand_annotations TO service_role;

-- Enable RLS
ALTER TABLE public.demand_annotations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Annotations are viewable by authenticated users" 
ON public.demand_annotations 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can create their own annotations" 
ON public.demand_annotations 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own annotations" 
ON public.demand_annotations 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own annotations" 
ON public.demand_annotations 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Create an index for faster lookups
CREATE INDEX idx_demand_annotations_demand_id ON public.demand_annotations(demand_id);

ALTER TABLE public.demand_annotations
ADD CONSTRAINT demand_annotations_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.agendas_positivas ADD COLUMN account_number TEXT;
-- Create storage bucket for demand attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('demand_attachments', 'demand_attachments', true);

-- Create policies for demand attachments
CREATE POLICY "Demand attachments are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'demand_attachments');

CREATE POLICY "Authenticated users can upload demand attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'demand_attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own demand attachments" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'demand_attachments' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own demand attachments" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'demand_attachments' AND auth.uid() = owner);
-- Create sectors table
CREATE TABLE public.setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  gestor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Use GRANT to set permissions for different roles.
-- sectors is an admin-focused table, but might be useful for other modules later.
-- For now, restrict to authenticated and service_role.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setores TO authenticated;
GRANT ALL ON public.setores TO service_role;

-- Enable Row Level Security
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access (using the existing role check logic if possible, 
-- or a simple authenticated check if the app handles roles in the UI)
-- Since the project uses a profiles table/user_roles for roles, we should ideally check for 'admin' role.
CREATE POLICY "Admins can do everything on setores" 
ON public.setores 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Also allow reading for all authenticated users if needed (optional, but requested for admin menu)
-- If it's strictly admin, the above policy is enough.

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_setores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_setores_updated_at
BEFORE UPDATE ON public.setores
FOR EACH ROW
EXECUTE FUNCTION public.update_setores_updated_at();
-- Create operadoras table
CREATE TABLE public.operadoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  prazo_contratual_envio_recurso INTEGER NOT NULL,
  prazo_ideal_envio_recurso INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Use GRANT to set permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operadoras TO authenticated;
GRANT ALL ON public.operadoras TO service_role;

-- Enable Row Level Security
ALTER TABLE public.operadoras ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can do everything on operadoras" 
ON public.operadoras 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_operadoras_updated_at
BEFORE UPDATE ON public.operadoras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Tabela para armazenar os motivos de glosa
CREATE TABLE IF NOT EXISTS public.motivos_glosa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Configurações de acesso
GRANT SELECT ON public.motivos_glosa TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motivos_glosa TO authenticated;
GRANT ALL ON public.motivos_glosa TO service_role;

-- Habilitar RLS
ALTER TABLE public.motivos_glosa ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Motivos de glosa são visíveis para todos os usuários autenticados" 
ON public.motivos_glosa FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.motivos_glosa
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
ALTER TABLE public.agendas_positivas ADD COLUMN IF NOT EXISTS glosa_reason TEXT;
CREATE POLICY "Authenticated users can view operadoras"
ON public.operadoras FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view setores"
ON public.setores FOR SELECT
TO authenticated
USING (true);

-- 1) agendas_positivas: scope UPDATE/DELETE to owner or admin
DROP POLICY IF EXISTS "Users can update demands" ON public.agendas_positivas;
DROP POLICY IF EXISTS "Users can delete demands" ON public.agendas_positivas;

CREATE POLICY "Users can update their own demands or admin"
ON public.agendas_positivas
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can delete their own demands or admin"
ON public.agendas_positivas
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) demand_annotations: restrict SELECT to demand owner, annotation author, or admin
DROP POLICY IF EXISTS "Annotations are viewable by authenticated users" ON public.demand_annotations;

CREATE POLICY "View annotations on accessible demands"
ON public.demand_annotations
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.agendas_positivas d
    WHERE d.id = demand_annotations.demand_id
      AND (d.user_id = auth.uid() OR d.responsible_id = auth.uid())
  )
);

-- 3) motivos_glosa: remove anon access
DROP POLICY IF EXISTS "Motivos de glosa são visíveis para todos os usuários autenticados" ON public.motivos_glosa;

CREATE POLICY "Motivos de glosa visíveis para autenticados"
ON public.motivos_glosa
FOR SELECT
TO authenticated
USING (true);

-- 4) profiles: add INSERT policy enforcing self-id
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 5) setores / operadoras: add RESTRICTIVE write policies (admin-only for INSERT/UPDATE/DELETE)
CREATE POLICY "Restrict setores writes to admin"
ON public.setores
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  CASE WHEN current_setting('request.method', true) IN ('GET') THEN true
  ELSE public.has_role(auth.uid(), 'admin'::public.app_role) END
)
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Restrict operadoras writes to admin"
ON public.operadoras
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  CASE WHEN current_setting('request.method', true) IN ('GET') THEN true
  ELSE public.has_role(auth.uid(), 'admin'::public.app_role) END
)
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 6) Fix search_path on handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 1. Make demand_attachments private
UPDATE storage.buckets SET public = false WHERE id = 'demand_attachments';

-- 2. Remove old, overly-permissive policies
DROP POLICY IF EXISTS "Demand attachments are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload demand attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own demand attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own demand attachments" ON storage.objects;

-- 3. Authenticated-only read of demand attachments (no public access)
CREATE POLICY "Authenticated users can read demand attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'demand_attachments');

-- 4. Authenticated users can upload only into their own folder (uid as first segment)
CREATE POLICY "Users upload own demand attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'demand_attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 5. Users can update/delete only files they own (by owner OR by uid folder)
CREATE POLICY "Users update own demand attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'demand_attachments'
  AND ((auth.uid() = owner) OR (auth.uid())::text = (storage.foldername(name))[1])
);

CREATE POLICY "Users delete own demand attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'demand_attachments'
  AND ((auth.uid() = owner) OR (auth.uid())::text = (storage.foldername(name))[1])
);
-- Garantir a criação da tabela de notificações se ela não existir
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir permissões para a tabela
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para notificações
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view their own notifications' AND polrelid = 'public.notifications'::regclass) THEN
        CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can update their own notifications' AND polrelid = 'public.notifications'::regclass) THEN
        CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;

