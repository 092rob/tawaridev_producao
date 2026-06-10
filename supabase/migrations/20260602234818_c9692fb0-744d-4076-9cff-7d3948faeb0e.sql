-- Índice único para upsert incremental conforme manual ZG (entidade_id + cliente_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_api_glosa_item_cliente_entidade
  ON public.api_glosa_item (COALESCE(cliente_id, ''), entidade_id)
  WHERE entidade_id IS NOT NULL;

-- Tabela de controle das execuções da API
CREATE TABLE IF NOT EXISTS public.bi_api_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('initial','incremental')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','error','partial')),
  filter_from text,
  last_search_after text,
  pages integer NOT NULL DEFAULT 0,
  rows_fetched bigint NOT NULL DEFAULT 0,
  rows_upserted bigint NOT NULL DEFAULT 0,
  has_more boolean NOT NULL DEFAULT false,
  error text,
  triggered_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_api_imports TO authenticated;
GRANT ALL ON public.bi_api_imports TO service_role;

ALTER TABLE public.bi_api_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bi_api_imports"
  ON public.bi_api_imports
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_bi_api_imports_started_at
  ON public.bi_api_imports (started_at DESC);