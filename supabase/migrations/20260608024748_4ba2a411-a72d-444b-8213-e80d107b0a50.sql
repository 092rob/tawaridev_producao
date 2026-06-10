ALTER TABLE public.cbhpm_procedimentos 
ALTER COLUMN fator_multiplicativo TYPE numeric 
USING (CASE WHEN fator_multiplicativo = '' THEN NULL ELSE fator_multiplicativo::numeric END);