ALTER TABLE public.agendas_positivas 
ADD COLUMN IF NOT EXISTS treatment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reopening_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.agendas_positivas.treatment_count IS 'Número de vezes que a demanda recebeu tratativa';
COMMENT ON COLUMN public.agendas_positivas.reopening_count IS 'Número de vezes que a demanda foi reaberta após ser atendida';
COMMENT ON COLUMN public.agendas_positivas.resolved_at IS 'Data e hora em que a demanda foi marcada como Atendida pela primeira vez';