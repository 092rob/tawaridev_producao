
CREATE TABLE public.glosa_motivos_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glosa_motivos_uploads TO authenticated;
GRANT ALL ON public.glosa_motivos_uploads TO service_role;
ALTER TABLE public.glosa_motivos_uploads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.glosa_motivos_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES public.glosa_motivos_uploads(id) ON DELETE CASCADE,
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
  usuario_recurso text,
  usuario_aceite text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glosa_motivos_records TO authenticated;
GRANT ALL ON public.glosa_motivos_records TO service_role;
ALTER TABLE public.glosa_motivos_records ENABLE ROW LEVEL SECURITY;

CREATE INDEX glosa_motivos_records_upload_idx ON public.glosa_motivos_records(upload_id);
CREATE INDEX glosa_motivos_records_motivo_idx ON public.glosa_motivos_records(descricao_motivo_glosa);
CREATE INDEX glosa_motivos_records_convenio_idx ON public.glosa_motivos_records(convenio_nome);
CREATE INDEX glosa_motivos_records_mes_idx ON public.glosa_motivos_records(mes_pagamento);

CREATE TABLE public.glosa_motivos_dashboard_access (
  user_id uuid PRIMARY KEY,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glosa_motivos_dashboard_access TO authenticated;
GRANT ALL ON public.glosa_motivos_dashboard_access TO service_role;
ALTER TABLE public.glosa_motivos_dashboard_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage glosa_motivos_uploads" ON public.glosa_motivos_uploads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authorized clients view glosa_motivos_uploads" ON public.glosa_motivos_uploads
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM public.glosa_motivos_dashboard_access a WHERE a.user_id = auth.uid()));

CREATE POLICY "Admins manage glosa_motivos_records" ON public.glosa_motivos_records
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authorized clients view glosa_motivos_records" ON public.glosa_motivos_records
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM public.glosa_motivos_dashboard_access a WHERE a.user_id = auth.uid()));

CREATE POLICY "Admins manage glosa_motivos_access" ON public.glosa_motivos_dashboard_access
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users see own glosa_motivos_access" ON public.glosa_motivos_dashboard_access
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
