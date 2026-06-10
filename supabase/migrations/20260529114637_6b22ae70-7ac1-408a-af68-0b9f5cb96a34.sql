-- Tabela para armazenar os motivos de glosa
CREATE TABLE IF NOT EXISTS public.motivos_glosa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Configurações de acesso
GRANT SELECT ON public.motivos_glosa TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motivos_glosa TO authenticated;
GRANT ALL ON public.motivos_glosa TO service_role;

-- Habilitar RLS
ALTER TABLE public.motivos_glosa ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Motivos de glosa são visíveis para todos os usuários autenticados" 
ON public.motivos_glosa FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.motivos_glosa
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();