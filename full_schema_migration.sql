-- Complete database schema export

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

CREATE TABLE IF NOT EXISTS public.agendas_positivas (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    so_number integer NOT NULL DEFAULT nextval('agendas_positivas_so_number_seq'::regclass),
    subject text NOT NULL,
    insurance text NOT NULL,
    responsible_sector text NOT NULL,
    description text NOT NULL,
    opening_date timestamp with time zone NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'Pendente'::text,
    responsible_user text,
    observations text,
    user_id uuid NOT NULL DEFAULT auth.uid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    treatment_count integer DEFAULT 0,
    reopening_count integer DEFAULT 0,
    resolved_at timestamp with time zone,
    responsible_id uuid,
    account_number text,
    glosa_reason text
);

ALTER TABLE public.agendas_positivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendas_positivas ADD CONSTRAINT agendas_positivas_status_check CHECK ((status = ANY (ARRAY['Pendente'::text, 'Em Atendimento'::text, 'Atendida'::text])));
ALTER TABLE public.agendas_positivas ADD CONSTRAINT agendas_positivas_pkey PRIMARY KEY (id);
ALTER TABLE public.agendas_positivas ADD CONSTRAINT agendas_positivas_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES profiles(id);
ALTER TABLE public.agendas_positivas ADD CONSTRAINT agendas_positivas_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
CREATE INDEX idx_agendas_positivas_responsible_id ON public.agendas_positivas USING btree (responsible_id);
CREATE POLICY "Users can view all demands" ON public.agendas_positivas FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Users can insert demands" ON public.agendas_positivas FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "Users can update their own demands or admin" ON public.agendas_positivas FOR UPDATE TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users can delete their own demands or admin" ON public.agendas_positivas FOR DELETE TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
GRANT ALL ON public.agendas_positivas TO authenticated;
GRANT ALL ON public.agendas_positivas TO service_role;
GRANT ALL ON public.agendas_positivas TO anon;


CREATE TABLE IF NOT EXISTS public.api_zg_sync_state (
    id smallint NOT NULL DEFAULT 1,
    last_ultima_atualizacao timestamp with time zone,
    last_run_at timestamp with time zone,
    last_total_processados integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_zg_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_zg_sync_state ADD CONSTRAINT api_zg_sync_state_singleton CHECK ((id = 1));
ALTER TABLE public.api_zg_sync_state ADD CONSTRAINT api_zg_sync_state_pkey PRIMARY KEY (id);
CREATE POLICY "Admins can read sync state" ON public.api_zg_sync_state FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can upsert sync state" ON public.api_zg_sync_state FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
GRANT ALL ON public.api_zg_sync_state TO authenticated;
GRANT ALL ON public.api_zg_sync_state TO service_role;
GRANT ALL ON public.api_zg_sync_state TO anon;


CREATE TABLE IF NOT EXISTS public.bi_api_imports (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    query_id text NOT NULL,
    mode text NOT NULL,
    status text NOT NULL DEFAULT 'running'::text,
    filter_from text,
    last_search_after text,
    pages integer NOT NULL DEFAULT 0,
    rows_fetched bigint NOT NULL DEFAULT 0,
    rows_upserted bigint NOT NULL DEFAULT 0,
    has_more boolean NOT NULL DEFAULT false,
    error text,
    triggered_by uuid,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    finished_at timestamp with time zone,
    total_rows bigint,
    planned_pages integer,
    cancel_requested boolean NOT NULL DEFAULT false
);

ALTER TABLE public.bi_api_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_api_imports ADD CONSTRAINT bi_api_imports_mode_check CHECK ((mode = ANY (ARRAY['initial'::text, 'incremental'::text])));
ALTER TABLE public.bi_api_imports ADD CONSTRAINT bi_api_imports_pkey PRIMARY KEY (id);
ALTER TABLE public.bi_api_imports ADD CONSTRAINT bi_api_imports_status_check CHECK ((status = ANY (ARRAY['running'::text, 'success'::text, 'error'::text, 'partial'::text, 'cancelled'::text])));
CREATE INDEX idx_bi_api_imports_started_at ON public.bi_api_imports USING btree (started_at DESC);
CREATE POLICY "Admins manage bi_api_imports" ON public.bi_api_imports FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
GRANT ALL ON public.bi_api_imports TO authenticated;
GRANT ALL ON public.bi_api_imports TO service_role;
GRANT ALL ON public.bi_api_imports TO anon;


CREATE TABLE IF NOT EXISTS public.bi_drive_imports (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    source text NOT NULL,
    file_name text,
    rows_loaded bigint NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'running'::text,
    error text,
    triggered_by uuid,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    finished_at timestamp with time zone
);

ALTER TABLE public.bi_drive_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_drive_imports ADD CONSTRAINT bi_drive_imports_pkey PRIMARY KEY (id);
CREATE POLICY "Admins manage bi_drive_imports" ON public.bi_drive_imports FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
GRANT ALL ON public.bi_drive_imports TO authenticated;
GRANT ALL ON public.bi_drive_imports TO service_role;
GRANT ALL ON public.bi_drive_imports TO anon;


CREATE TABLE IF NOT EXISTS public.bi_drive_records (
    id bigint NOT NULL,
    import_id uuid,
    entidade_id text,
    cliente_id text,
    data_ultima_atualizacao timestamp with time zone,
    raw jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bi_drive_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_drive_records ADD CONSTRAINT bi_drive_records_pkey PRIMARY KEY (id);
ALTER TABLE public.bi_drive_records ADD CONSTRAINT bi_drive_records_import_id_fkey FOREIGN KEY (import_id) REFERENCES bi_drive_imports(id) ON DELETE SET NULL;
CREATE INDEX bi_drive_records_id_idx ON public.bi_drive_records USING btree (id);
CREATE INDEX bi_drive_records_entidade_id_idx ON public.bi_drive_records USING btree (entidade_id);
CREATE INDEX bi_drive_records_data_ult_atu_idx ON public.bi_drive_records USING btree (data_ultima_atualizacao);
CREATE POLICY "Admins manage bi_drive_records" ON public.bi_drive_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
GRANT ALL ON public.bi_drive_records TO authenticated;
GRANT ALL ON public.bi_drive_records TO service_role;
GRANT ALL ON public.bi_drive_records TO anon;


CREATE TABLE IF NOT EXISTS public.cbhpm_portes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    porte text NOT NULL,
    valor numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    id_tabela text
);

ALTER TABLE public.cbhpm_portes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbhpm_portes ADD CONSTRAINT cbhpm_portes_pkey PRIMARY KEY (id);
ALTER TABLE public.cbhpm_portes ADD CONSTRAINT cbhpm_portes_id_tabela_porte_key UNIQUE (id_tabela, porte);
CREATE UNIQUE INDEX cbhpm_portes_id_tabela_porte_key ON public.cbhpm_portes USING btree (id_tabela, porte);
CREATE POLICY "Admins manage cbhpm_portes" ON public.cbhpm_portes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow select for authenticated users" ON public.cbhpm_portes FOR SELECT TO authenticated USING (true);
GRANT ALL ON public.cbhpm_portes TO authenticated;
GRANT ALL ON public.cbhpm_portes TO service_role;
GRANT ALL ON public.cbhpm_portes TO anon;


CREATE TABLE IF NOT EXISTS public.cbhpm_procedimentos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    codigo text,
    procedimento text NOT NULL,
    porte text,
    custo_operacional numeric DEFAULT 0,
    uco numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    id_tabela text,
    id_grupo text,
    descricao_grupo text,
    id_subgrupo text,
    descricao_subgrupo text,
    codigo_anatomico text,
    fator_multiplicativo numeric,
    num_auxiliares integer DEFAULT 0,
    porte_anestesico text,
    filmes numeric,
    incidencia integer DEFAULT 0,
    unidade_radiofarmaco text
);

ALTER TABLE public.cbhpm_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbhpm_procedimentos ADD CONSTRAINT cbhpm_procedimentos_pkey PRIMARY KEY (id);
CREATE POLICY "Admins manage cbhpm_procedimentos" ON public.cbhpm_procedimentos FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow select for authenticated users" ON public.cbhpm_procedimentos FOR SELECT TO authenticated USING (true);
GRANT ALL ON public.cbhpm_procedimentos TO authenticated;
GRANT ALL ON public.cbhpm_procedimentos TO service_role;
GRANT ALL ON public.cbhpm_procedimentos TO anon;


CREATE TABLE IF NOT EXISTS public.cbhpm_versoes (
    id_tabela text NOT NULL,
    nome_tabela text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cbhpm_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbhpm_versoes ADD CONSTRAINT cbhpm_versoes_pkey PRIMARY KEY (id_tabela);
CREATE POLICY "Admins manage cbhpm_versoes" ON public.cbhpm_versoes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read cbhpm_versoes" ON public.cbhpm_versoes FOR SELECT TO authenticated USING (true);
GRANT ALL ON public.cbhpm_versoes TO authenticated;
GRANT ALL ON public.cbhpm_versoes TO service_role;
GRANT ALL ON public.cbhpm_versoes TO anon;


CREATE TABLE IF NOT EXISTS public.dashboard_access (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    dashboard_id uuid NOT NULL,
    user_id uuid NOT NULL,
    granted_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_access ADD CONSTRAINT dashboard_access_pkey PRIMARY KEY (id);
ALTER TABLE public.dashboard_access ADD CONSTRAINT dashboard_access_dashboard_id_user_id_key UNIQUE (dashboard_id, user_id);
ALTER TABLE public.dashboard_access ADD CONSTRAINT dashboard_access_dashboard_id_fkey FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE;
ALTER TABLE public.dashboard_access ADD CONSTRAINT dashboard_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX dashboard_access_dashboard_id_user_id_key ON public.dashboard_access USING btree (dashboard_id, user_id);
CREATE POLICY "Usuário vê seus acessos" ON public.dashboard_access FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins gerenciam acessos" ON public.dashboard_access FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
GRANT ALL ON public.dashboard_access TO authenticated;
GRANT ALL ON public.dashboard_access TO service_role;
GRANT ALL ON public.dashboard_access TO anon;


CREATE TABLE IF NOT EXISTS public.dashboards (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    embed_url text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid
);

ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboards ADD CONSTRAINT dashboards_pkey PRIMARY KEY (id);
ALTER TABLE public.dashboards ADD CONSTRAINT dashboards_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
CREATE POLICY "Admins veem todos os dashboards" ON public.dashboards FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Clientes veem dashboards liberados" ON public.dashboards FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM dashboard_access
  WHERE ((dashboard_access.dashboard_id = dashboards.id) AND (dashboard_access.user_id = auth.uid())))));
CREATE POLICY "Admins gerenciam dashboards" ON public.dashboards FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
GRANT ALL ON public.dashboards TO authenticated;
GRANT ALL ON public.dashboards TO service_role;
GRANT ALL ON public.dashboards TO anon;


CREATE TABLE IF NOT EXISTS public.demand_annotations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    demand_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.demand_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_annotations ADD CONSTRAINT demand_annotations_pkey PRIMARY KEY (id);
ALTER TABLE public.demand_annotations ADD CONSTRAINT demand_annotations_demand_id_fkey FOREIGN KEY (demand_id) REFERENCES agendas_positivas(id) ON DELETE CASCADE;
ALTER TABLE public.demand_annotations ADD CONSTRAINT demand_annotations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.demand_annotations ADD CONSTRAINT demand_annotations_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX idx_demand_annotations_demand_id ON public.demand_annotations USING btree (demand_id);
CREATE POLICY "Users can create their own annotations" ON public.demand_annotations FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own annotations" ON public.demand_annotations FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own annotations" ON public.demand_annotations FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "View annotations on accessible demands" ON public.demand_annotations FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1
   FROM agendas_positivas d
  WHERE ((d.id = demand_annotations.demand_id) AND ((d.user_id = auth.uid()) OR (d.responsible_id = auth.uid())))))));
GRANT ALL ON public.demand_annotations TO authenticated;
GRANT ALL ON public.demand_annotations TO service_role;
GRANT ALL ON public.demand_annotations TO anon;


CREATE TABLE IF NOT EXISTS public.glosa_dashboard_access (
    user_id uuid NOT NULL,
    granted_at timestamp with time zone NOT NULL DEFAULT now(),
    granted_by uuid
);

ALTER TABLE public.glosa_dashboard_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glosa_dashboard_access ADD CONSTRAINT glosa_dashboard_access_pkey PRIMARY KEY (user_id);
CREATE POLICY "Admins manage glosa access" ON public.glosa_dashboard_access FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users see own glosa access" ON public.glosa_dashboard_access FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
GRANT ALL ON public.glosa_dashboard_access TO authenticated;
GRANT ALL ON public.glosa_dashboard_access TO service_role;
GRANT ALL ON public.glosa_dashboard_access TO anon;


CREATE TABLE IF NOT EXISTS public.glosa_motivos_dashboard_access (
    user_id uuid NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.glosa_motivos_dashboard_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glosa_motivos_dashboard_access ADD CONSTRAINT glosa_motivos_dashboard_access_pkey PRIMARY KEY (user_id);
CREATE POLICY "Admins manage glosa_motivos_access" ON public.glosa_motivos_dashboard_access FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users see own glosa_motivos_access" ON public.glosa_motivos_dashboard_access FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
GRANT ALL ON public.glosa_motivos_dashboard_access TO authenticated;
GRANT ALL ON public.glosa_motivos_dashboard_access TO service_role;
GRANT ALL ON public.glosa_motivos_dashboard_access TO anon;


CREATE TABLE IF NOT EXISTS public.glosa_motivos_records (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    upload_id uuid NOT NULL,
    raw jsonb NOT NULL,
    convenio_nome text,
    codigo_operadora text,
    num_conta text,
    id_guia text,
    id_item text,
    data_pagamento date,
    mes_pagamento text,
    tipo_guia text,
    nome_paciente text,
    data_atendimento date,
    status_analise text,
    guia_recurso text,
    conta_integralmente_glosada text,
    descricao_item_convenio text,
    tipo_produto text,
    centro_custos text,
    valor_apresentado numeric,
    valor_faturado numeric,
    valor_pago numeric,
    diferenca numeric,
    glosa_submetida numeric,
    glosa_em_analise numeric,
    glosa_aceita numeric,
    glosa_refaturada numeric,
    glosa_recursada numeric,
    glosa_pendente_retorno numeric,
    glosa_recuperada numeric,
    glosa_mantida numeric,
    codigo_motivo_glosa text,
    descricao_motivo_glosa text,
    complemento_motivo_glosa text,
    descricao_primeiro_motivo_glosa text,
    situacao_envio_recurso text,
    usuario_realizou_recurso text,
    usuario_realizou_aceite text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    justificativa_de_recurso text,
    comentario_de_aceite text,
    num_atendimento text,
    data_recebimento date,
    data_saida_guia date,
    data_analise date,
    guia_associada text,
    num_parcial_recurso numeric,
    codigo_item_convenio text,
    tipo_tabela text,
    data_realizacao date,
    data_recurso date,
    data_aceite date,
    codigo_centro_custos text,
    grau_participacao numeric,
    qtde_faturada numeric,
    vlr_unit_faturado numeric,
    qtde_paga numeric,
    vlr_unit_conv numeric,
    codigo_motivo_glosa_tiss text,
    descricao_motivo_glosa_tiss text,
    justificativa_recurso text,
    data_envio_recurso_lote date,
    protocolo_recurso_lote text,
    justificativa_aceite text,
    data_envio_recurso_item date,
    protocolo_envio_recurso_item text,
    num_proc_complementar text,
    usuario_envio_recurso_item text,
    descricao_tipo_glosa text
);

ALTER TABLE public.glosa_motivos_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glosa_motivos_records ADD CONSTRAINT glosa_motivos_records_pkey PRIMARY KEY (id);
ALTER TABLE public.glosa_motivos_records ADD CONSTRAINT glosa_motivos_records_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES glosa_motivos_uploads(id) ON DELETE CASCADE;
CREATE INDEX glosa_motivos_records_upload_idx ON public.glosa_motivos_records USING btree (upload_id);
CREATE INDEX glosa_motivos_records_motivo_idx ON public.glosa_motivos_records USING btree (descricao_motivo_glosa);
CREATE INDEX glosa_motivos_records_convenio_idx ON public.glosa_motivos_records USING btree (convenio_nome);
CREATE INDEX glosa_motivos_records_mes_idx ON public.glosa_motivos_records USING btree (mes_pagamento);
CREATE INDEX idx_glosa_motivos_data_pagamento ON public.glosa_motivos_records USING btree (data_pagamento);
CREATE INDEX idx_glosa_motivos_filtros_composto ON public.glosa_motivos_records USING btree (data_pagamento, convenio_nome, descricao_tipo_glosa);
CREATE POLICY "Admins manage glosa_motivos_records" ON public.glosa_motivos_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authorized clients view glosa_motivos_records" ON public.glosa_motivos_records FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1
   FROM glosa_motivos_dashboard_access a
  WHERE (a.user_id = auth.uid())))));
GRANT ALL ON public.glosa_motivos_records TO authenticated;
GRANT ALL ON public.glosa_motivos_records TO service_role;
GRANT ALL ON public.glosa_motivos_records TO anon;


CREATE TABLE IF NOT EXISTS public.glosa_motivos_uploads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    file_name text NOT NULL,
    row_count integer NOT NULL DEFAULT 0,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.glosa_motivos_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glosa_motivos_uploads ADD CONSTRAINT glosa_motivos_uploads_pkey PRIMARY KEY (id);
CREATE POLICY "Admins manage glosa_motivos_uploads" ON public.glosa_motivos_uploads FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authorized clients view glosa_motivos_uploads" ON public.glosa_motivos_uploads FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1
   FROM glosa_motivos_dashboard_access a
  WHERE (a.user_id = auth.uid())))));
GRANT ALL ON public.glosa_motivos_uploads TO authenticated;
GRANT ALL ON public.glosa_motivos_uploads TO service_role;
GRANT ALL ON public.glosa_motivos_uploads TO anon;


CREATE TABLE IF NOT EXISTS public.glosa_rec_dashboard_access (
    user_id uuid NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.glosa_rec_dashboard_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glosa_rec_dashboard_access ADD CONSTRAINT glosa_rec_dashboard_access_pkey PRIMARY KEY (user_id);
CREATE POLICY "Admins manage glosa_rec access" ON public.glosa_rec_dashboard_access FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users see own glosa_rec access" ON public.glosa_rec_dashboard_access FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
GRANT ALL ON public.glosa_rec_dashboard_access TO authenticated;
GRANT ALL ON public.glosa_rec_dashboard_access TO service_role;
GRANT ALL ON public.glosa_rec_dashboard_access TO anon;


CREATE TABLE IF NOT EXISTS public.glosa_rec_metas (
    ano_mes text NOT NULL,
    meta_valor numeric NOT NULL DEFAULT 0,
    updated_by uuid,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.glosa_rec_metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glosa_rec_metas ADD CONSTRAINT glosa_rec_metas_pkey PRIMARY KEY (ano_mes);
CREATE POLICY "Admins manage glosa_rec_metas" ON public.glosa_rec_metas FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authorized clients view glosa_rec_metas" ON public.glosa_rec_metas FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1
   FROM glosa_rec_dashboard_access a
  WHERE (a.user_id = auth.uid())))));
GRANT ALL ON public.glosa_rec_metas TO authenticated;
GRANT ALL ON public.glosa_rec_metas TO service_role;
GRANT ALL ON public.glosa_rec_metas TO anon;


CREATE TABLE IF NOT EXISTS public.glosa_rec_records (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    upload_id uuid NOT NULL,
    raw jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
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
    mes_pgto_recurso text,
    tipo_importacao text
);

ALTER TABLE public.glosa_rec_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glosa_rec_records ADD CONSTRAINT glosa_rec_records_pkey PRIMARY KEY (id);
ALTER TABLE public.glosa_rec_records ADD CONSTRAINT glosa_rec_records_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES glosa_rec_uploads(id) ON DELETE CASCADE;
CREATE INDEX idx_glosa_rec_records_upload ON public.glosa_rec_records USING btree (upload_id);
CREATE INDEX idx_glosa_rec_records_mes_pgto ON public.glosa_rec_records USING btree (mes_pagamento);
CREATE INDEX idx_glosa_rec_records_convenio ON public.glosa_rec_records USING btree (convenio_nome);
CREATE INDEX idx_glosa_rec_records_tipo_importacao ON public.glosa_rec_records USING btree (tipo_importacao);
CREATE POLICY "Admins manage glosa_rec_records" ON public.glosa_rec_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authorized clients view glosa_rec_records" ON public.glosa_rec_records FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1
   FROM glosa_rec_dashboard_access a
  WHERE (a.user_id = auth.uid())))));
GRANT ALL ON public.glosa_rec_records TO authenticated;
GRANT ALL ON public.glosa_rec_records TO service_role;
GRANT ALL ON public.glosa_rec_records TO anon;


CREATE TABLE IF NOT EXISTS public.glosa_rec_uploads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    file_name text NOT NULL,
    row_count integer NOT NULL DEFAULT 0,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    tipo_importacao text
);

ALTER TABLE public.glosa_rec_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glosa_rec_uploads ADD CONSTRAINT glosa_rec_uploads_pkey PRIMARY KEY (id);
CREATE INDEX idx_glosa_rec_uploads_tipo_importacao ON public.glosa_rec_uploads USING btree (tipo_importacao);
CREATE POLICY "Admins manage glosa_rec_uploads" ON public.glosa_rec_uploads FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authorized clients view glosa_rec_uploads" ON public.glosa_rec_uploads FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1
   FROM glosa_rec_dashboard_access a
  WHERE (a.user_id = auth.uid())))));
GRANT ALL ON public.glosa_rec_uploads TO authenticated;
GRANT ALL ON public.glosa_rec_uploads TO service_role;
GRANT ALL ON public.glosa_rec_uploads TO anon;


CREATE TABLE IF NOT EXISTS public.glosa_records (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    upload_id uuid NOT NULL,
    raw jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    convenio_nome text,
    operadora_grupo text,
    data_pagamento date,
    mes_pagamento text,
    nome_paciente text,
    num_conta text,
    data_atendimento date,
    data_saida_guia date,
    status_analise text,
    data_analise date,
    situacao_guia text,
    discriminador_guia text,
    guia_recurso text,
    conta_integralmente_glosada text,
    num_parcial_recurso numeric,
    num_parcial_item_recurso numeric,
    data_realizacao date,
    data_recurso date,
    data_aceite date,
    centro_custos text,
    valor_apresentado numeric,
    qtde_faturada numeric,
    vlr_unit_faturado numeric,
    valor_faturado numeric,
    qtde_paga numeric,
    vlr_unit_pago numeric,
    valor_pago numeric,
    diferenca numeric,
    glosa_submetida numeric,
    analise_glosa_aceita numeric,
    analise_glosa_refaturada numeric,
    analise_glosa_recursada numeric,
    analise_pendente_retorno numeric,
    analise_glosa_recuperada numeric,
    analise_glosa_mantida numeric,
    analise_soma_aceites_recursos numeric,
    tipo_glosa_origem text,
    codigo_motivo_glosa text,
    descricao_motivo_glosa text,
    complemento_motivo_glosa text,
    justificativa_recurso text,
    usuario_recurso text,
    data_envio_recurso_lote date,
    protocolo_recurso_lote text,
    justificativa_aceite text,
    comentario_aceite text,
    usuario_aceite text,
    data_envio_recurso_item date,
    protocolo_envio_recurso_item text,
    usuario_envio_recurso_item text,
    usuario_refaturamento text,
    data_refaturamento date,
    usuario_analise text,
    tipo_guia text,
    tipo_produto text,
    data_ultima_atualizacao date,
    codigo_setor_interno text,
    descricao_setor_interno text,
    Nome do Convenio text,
    Data Pagto. date,
    Mês Pgto. text,
    Tipo de Guia text,
    Nome paciente text,
    Num. Conta text,
    Dt.Atendimento date,
    Data Saída Guia date,
    Status de Analise text,
    Data Analise date,
    Situação da Guia text,
    Discriminador Guia text,
    Guia é de Recurso text,
    Conta Integralmente Glosada text,
    Nº Parcial de Recurso numeric,
    Nº Parcial do Item de Recurso numeric,
    Tipo produto text,
    Dt.Realizacao date,
    Dt. Recurso date,
    Dt.Aceite date,
    Centro de custos text,
    Apresentado (Demonstrativo) numeric,
    Qtde. Faturada numeric,
    Vlr. Unit. Faturado numeric,
    Valor Faturado numeric,
    Qtde. Paga numeric,
    Vlr. Unit. Pago numeric,
    Valor Pago numeric,
    Diferenca numeric,
    Glosa Submetida numeric,
    1ª Análise - Glosa Aceita numeric,
    1ª Análise - Glosa Refaturada numeric,
    1ª Análise - Glosa Recursada numeric,
    1ª Análise - Pendente Retorno numeric,
    1ª Análise - Glosa Recuperada numeric,
    1ª Análise - Glosa Mantida numeric,
    1ª Análise - Soma Aceites e Recursos numeric,
    Usuário Realizou Recurso text,
    Data Envio Recurso Lote date,
    Protocolo de Recurso Lote text,
    Usuário Realizou Aceite text,
    Data Envio Recurso Item date,
    Protocolo Envio Recurso Item text,
    Usuario Envio Recurso Item text,
    Usuário Realizou Refaturamento text,
    Data Refaturamento date,
    Usuario Analise text,
    Data última atualização dados timestamp with time zone,
    tipo_importacao text
);

ALTER TABLE public.glosa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glosa_records ADD CONSTRAINT glosa_records_pkey PRIMARY KEY (id);
ALTER TABLE public.glosa_records ADD CONSTRAINT glosa_records_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES glosa_uploads(id) ON DELETE CASCADE;
CREATE INDEX idx_glosa_records_upload ON public.glosa_records USING btree (upload_id);
CREATE INDEX idx_glosa_records_mes_pagamento ON public.glosa_records USING btree (mes_pagamento);
CREATE INDEX idx_glosa_records_usuario_analise ON public.glosa_records USING btree (usuario_analise);
CREATE INDEX idx_glosa_records_operadora_grupo ON public.glosa_records USING btree (operadora_grupo);
CREATE POLICY "Admins manage glosa_records" ON public.glosa_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authorized clients view glosa_records" ON public.glosa_records FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1
   FROM glosa_dashboard_access a
  WHERE (a.user_id = auth.uid())))));
GRANT ALL ON public.glosa_records TO authenticated;
GRANT ALL ON public.glosa_records TO service_role;
GRANT ALL ON public.glosa_records TO anon;


CREATE TABLE IF NOT EXISTS public.glosa_uploads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    file_name text NOT NULL,
    uploaded_by uuid NOT NULL,
    row_count integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    tipo_importacao text
);

ALTER TABLE public.glosa_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glosa_uploads ADD CONSTRAINT glosa_uploads_pkey PRIMARY KEY (id);
CREATE POLICY "Admins manage glosa_uploads" ON public.glosa_uploads FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authorized clients view glosa_uploads" ON public.glosa_uploads FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1
   FROM glosa_dashboard_access a
  WHERE (a.user_id = auth.uid())))));
GRANT ALL ON public.glosa_uploads TO authenticated;
GRANT ALL ON public.glosa_uploads TO service_role;
GRANT ALL ON public.glosa_uploads TO anon;


CREATE TABLE IF NOT EXISTS public.motivos_glosa (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    codigo text NOT NULL,
    descricao text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.motivos_glosa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivos_glosa ADD CONSTRAINT motivos_glosa_pkey PRIMARY KEY (id);
ALTER TABLE public.motivos_glosa ADD CONSTRAINT motivos_glosa_codigo_key UNIQUE (codigo);
CREATE UNIQUE INDEX motivos_glosa_codigo_key ON public.motivos_glosa USING btree (codigo);
CREATE POLICY "Motivos de glosa visíveis para autenticados" ON public.motivos_glosa FOR SELECT TO authenticated USING (true);
GRANT ALL ON public.motivos_glosa TO authenticated;
GRANT ALL ON public.motivos_glosa TO service_role;
GRANT ALL ON public.motivos_glosa TO anon;


CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text,
    link text,
    read_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, created_at DESC) WHERE (read_at IS NULL);
CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Admins manage all notifications" ON public.notifications FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING ((auth.uid() = user_id));
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.notifications TO anon;


CREATE TABLE IF NOT EXISTS public.operadoras (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    prazo_contratual_envio_recurso integer NOT NULL,
    prazo_ideal_envio_recurso integer NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    cod_operadora text
);

ALTER TABLE public.operadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operadoras ADD CONSTRAINT operadoras_pkey PRIMARY KEY (id);
CREATE POLICY "Admins can do everything on operadoras" ON public.operadoras FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Authenticated users can view operadoras" ON public.operadoras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Restrict operadoras writes to admin" ON public.operadoras FOR ALL TO authenticated USING (
CASE
    WHEN (current_setting('request.method'::text, true) = 'GET'::text) THEN true
    ELSE has_role(auth.uid(), 'admin'::app_role)
END) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
GRANT ALL ON public.operadoras TO authenticated;
GRANT ALL ON public.operadoras TO service_role;
GRANT ALL ON public.operadoras TO anon;


CREATE TABLE IF NOT EXISTS public.prazos_operadoras_records (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    operadora_nome text,
    cod_operadora text,
    data_pagamento date,
    mes_pagamento text,
    protocolo_convenio text,
    guia_convenio text,
    conta text,
    lote_convenio text,
    protocolo_recurso text,
    cod_carteira text,
    beneficiario text,
    data_atendimento date,
    valor_faturado numeric,
    valor_pago numeric,
    glosa_submetida numeric,
    glosa_aceita numeric,
    glosa_recursada numeric,
    glosa_recuperada numeric,
    glosa_mantida numeric,
    pendente_retorno numeric,
    saldo_glosa numeric,
    status_analise text,
    sem_registro_envio text,
    data_envio_recurso date,
    guia_e_recurso text,
    upload_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.prazos_operadoras_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prazos_operadoras_records ADD CONSTRAINT prazos_operadoras_records_pkey PRIMARY KEY (id);
ALTER TABLE public.prazos_operadoras_records ADD CONSTRAINT fk_prazos_upload FOREIGN KEY (upload_id) REFERENCES prazos_operadoras_uploads(id) ON DELETE CASCADE;
CREATE POLICY "Admins manage prazos_operadoras_records" ON public.prazos_operadoras_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read prazos_operadoras_records" ON public.prazos_operadoras_records FOR SELECT TO authenticated USING (true);
GRANT ALL ON public.prazos_operadoras_records TO authenticated;
GRANT ALL ON public.prazos_operadoras_records TO service_role;
GRANT ALL ON public.prazos_operadoras_records TO anon;


CREATE TABLE IF NOT EXISTS public.prazos_operadoras_uploads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    file_name text NOT NULL,
    row_count integer NOT NULL DEFAULT 0,
    tipo_importacao text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);

ALTER TABLE public.prazos_operadoras_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prazos_operadoras_uploads ADD CONSTRAINT prazos_operadoras_uploads_pkey PRIMARY KEY (id);
ALTER TABLE public.prazos_operadoras_uploads ADD CONSTRAINT prazos_operadoras_uploads_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
CREATE POLICY "Admins manage prazos_operadoras_uploads" ON public.prazos_operadoras_uploads FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read prazos_operadoras_uploads" ON public.prazos_operadoras_uploads FOR SELECT TO authenticated USING (true);
GRANT ALL ON public.prazos_operadoras_uploads TO authenticated;
GRANT ALL ON public.prazos_operadoras_uploads TO service_role;
GRANT ALL ON public.prazos_operadoras_uploads TO anon;


CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    full_name text,
    email text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    login text,
    phone text,
    avatar_url text,
    operadoras_responsaveis ARRAY DEFAULT '{}'::text[]
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX profiles_login_unique_idx ON public.profiles USING btree (lower(login)) WHERE (login IS NOT NULL);
CREATE POLICY "Usuários veem seu próprio perfil" ON public.profiles FOR SELECT TO authenticated USING (((auth.uid() = id) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins atualizam perfis" ON public.profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Usuário atualiza próprio perfil" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO anon;


CREATE TABLE IF NOT EXISTS public.setores (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    gestor text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores ADD CONSTRAINT setores_pkey PRIMARY KEY (id);
CREATE POLICY "Admins can do everything on setores" ON public.setores FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Authenticated users can view setores" ON public.setores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Restrict setores writes to admin" ON public.setores FOR ALL TO authenticated USING (
CASE
    WHEN (current_setting('request.method'::text, true) = 'GET'::text) THEN true
    ELSE has_role(auth.uid(), 'admin'::app_role)
END) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
GRANT ALL ON public.setores TO authenticated;
GRANT ALL ON public.setores TO service_role;
GRANT ALL ON public.setores TO anon;


CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role USER-DEFINED NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_roles USING btree (user_id, role);
CREATE POLICY "Usuário vê próprias funções" ON public.user_roles FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins gerenciam funções" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can insert roles (restrictive)" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can update roles (restrictive)" ON public.user_roles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can delete roles (restrictive)" ON public.user_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.user_roles TO anon;

