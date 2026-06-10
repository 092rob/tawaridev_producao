ALTER TABLE public.cbhpm_procedimentos 
ALTER COLUMN filmes TYPE numeric 
USING (CASE WHEN filmes = '' THEN NULL ELSE filmes END)::numeric;