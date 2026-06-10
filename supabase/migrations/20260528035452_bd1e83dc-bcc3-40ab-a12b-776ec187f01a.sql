
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
