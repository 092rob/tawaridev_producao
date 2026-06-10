ALTER TABLE public.glosa_uploads ADD COLUMN IF NOT EXISTS tipo_importacao text;
UPDATE public.glosa_uploads u
SET tipo_importacao = sub.tipo
FROM (
  SELECT DISTINCT ON (upload_id) upload_id, tipo_importacao AS tipo
  FROM public.glosa_records
  WHERE tipo_importacao IS NOT NULL
) sub
WHERE u.id = sub.upload_id AND u.tipo_importacao IS NULL;