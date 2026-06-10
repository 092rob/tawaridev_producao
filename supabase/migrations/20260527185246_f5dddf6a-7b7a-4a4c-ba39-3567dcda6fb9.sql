
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
