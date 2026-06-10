ALTER TABLE public.operadoras ADD COLUMN cod_operadora TEXT;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operadoras TO authenticated;
GRANT ALL ON public.operadoras TO service_role;