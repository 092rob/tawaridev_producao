ALTER TABLE public.glosa_rec_uploads ADD COLUMN tipo_importacao TEXT;
ALTER TABLE public.glosa_rec_records ADD COLUMN tipo_importacao TEXT;

-- Adicionar índice para performance no filtro do dashboard
CREATE INDEX idx_glosa_rec_records_tipo_importacao ON public.glosa_rec_records(tipo_importacao);
CREATE INDEX idx_glosa_rec_uploads_tipo_importacao ON public.glosa_rec_uploads(tipo_importacao);