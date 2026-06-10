-- Alterar a tabela cbhpm_portes para o novo formato
ALTER TABLE public.cbhpm_portes ADD COLUMN id_tabela TEXT;

-- Remover a restrição antiga baseada em porte e subporte
ALTER TABLE public.cbhpm_portes DROP CONSTRAINT IF EXISTS cbhpm_portes_porte_subporte_key;

-- Remover a coluna subporte já que o novo JSON traz "1A" unificado em "PORTE"
ALTER TABLE public.cbhpm_portes DROP COLUMN IF EXISTS subporte;

-- Adicionar nova restrição de unicidade
ALTER TABLE public.cbhpm_portes ADD CONSTRAINT cbhpm_portes_id_tabela_porte_key UNIQUE (id_tabela, porte);
