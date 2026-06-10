ALTER TABLE public.glosa_motivos_records ADD COLUMN descricao_tipo_glosa TEXT;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glosa_motivos_records TO authenticated;
GRANT ALL ON public.glosa_motivos_records TO service_role;