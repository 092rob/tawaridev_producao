DROP INDEX IF EXISTS public.uq_api_glosa_item_cliente_entidade;

CREATE UNIQUE INDEX IF NOT EXISTS uq_api_glosa_item_cliente_entidade
  ON public.api_glosa_item (cliente_id, entidade_id);