-- Alterar a tabela cbhpm_procedimentos para o novo formato
ALTER TABLE public.cbhpm_procedimentos 
    ADD COLUMN id_tabela TEXT,
    ADD COLUMN id_grupo TEXT,
    ADD COLUMN descricao_grupo TEXT,
    ADD COLUMN id_subgrupo TEXT,
    ADD COLUMN descricao_subgrupo TEXT,
    ADD COLUMN codigo_anatomico TEXT,
    ADD COLUMN fator_multiplicativo TEXT,
    ADD COLUMN num_auxiliares INTEGER DEFAULT 0,
    ADD COLUMN porte_anestesico TEXT,
    ADD COLUMN filmes TEXT,
    ADD COLUMN incidencia INTEGER DEFAULT 0,
    ADD COLUMN unidade_radiofarmaco TEXT;

-- Renomear colunas existentes para manter compatibilidade com o novo JSON se necessário, 
-- ou apenas ajustar para os nomes solicitados.
-- No JSON o campo 'Procedimento' parece ser o que era 'descricao'
-- O campo 'Código Anatômico' é novo.
-- Vamos renomear 'descricao' para 'procedimento' e manter 'codigo' como identificador único do item se for o caso, 
-- mas o JSON traz 'Código Anatômico' e 'Procedimento'.

ALTER TABLE public.cbhpm_procedimentos RENAME COLUMN descricao TO procedimento;
-- O campo 'codigo' na tabela atual era TEXT NOT NULL UNIQUE. 
-- No novo JSON não há um 'codigo' explícito além do 'Código Anatômico'.
-- Vamos permitir que codigo seja nulo ou remover a restrição UNIQUE se o 'Código Anatômico' for o novo identificador.
ALTER TABLE public.cbhpm_procedimentos ALTER COLUMN codigo DROP NOT NULL;
ALTER TABLE public.cbhpm_procedimentos DROP CONSTRAINT IF EXISTS cbhpm_procedimentos_codigo_key;
