-- Garantir que a tabela glosa_uploads existe
CREATE TABLE IF NOT EXISTS public.glosa_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  tipo_importacao text
);

-- Garantir que a tabela glosa_records existe
CREATE TABLE IF NOT EXISTS public.glosa_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES public.glosa_uploads(id) ON DELETE CASCADE,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  tipo_importacao text,
  upload_id_old uuid -- Campo auxiliar caso necessário durante transições
);

-- Garantir permissões básicas para as tabelas criadas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glosa_uploads TO authenticated;
GRANT ALL ON public.glosa_uploads TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.glosa_records TO authenticated;
GRANT ALL ON public.glosa_records TO service_role;

-- Habilitar RLS
ALTER TABLE public.glosa_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glosa_records ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de segurança (podem ser refinadas pelas migrações seguintes)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins manage glosa_uploads' AND polrelid = 'public.glosa_uploads'::regclass) THEN
        CREATE POLICY "Admins manage glosa_uploads" ON public.glosa_uploads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admins manage glosa_records' AND polrelid = 'public.glosa_records'::regclass) THEN
        CREATE POLICY "Admins manage glosa_records" ON public.glosa_records FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;
