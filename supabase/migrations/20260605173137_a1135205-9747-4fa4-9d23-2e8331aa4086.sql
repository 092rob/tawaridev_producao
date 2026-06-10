ALTER TABLE public.glosa_motivos_records ADD COLUMN justif_de_recurso TEXT;
ALTER TABLE public.glosa_motivos_records ADD COLUMN comentario_de_aceite TEXT;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glosa_motivos_records TO authenticated;
GRANT ALL ON public.glosa_motivos_records TO service_role;