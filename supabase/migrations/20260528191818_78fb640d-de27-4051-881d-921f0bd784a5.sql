-- Adiciona a coluna responsible_id
ALTER TABLE public.agendas_positivas 
ADD COLUMN responsible_id UUID REFERENCES public.profiles(id);

-- Cria um índice para performance
CREATE INDEX idx_agendas_positivas_responsible_id ON public.agendas_positivas(responsible_id);

-- Permissões já devem estar cobertas pelos GRANTs existentes na tabela, 
-- mas por garantia:
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendas_positivas TO authenticated;
GRANT ALL ON public.agendas_positivas TO service_role;
