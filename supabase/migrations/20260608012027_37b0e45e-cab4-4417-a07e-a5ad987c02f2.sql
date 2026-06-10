-- Tabela de Procedimentos CBHPM
CREATE TABLE public.cbhpm_procedimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    descricao TEXT NOT NULL,
    porte TEXT, -- Ex: 1A, 2B, etc.
    custo_operacional DECIMAL(15,4) DEFAULT 0,
    uco DECIMAL(15,4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Portes (Valores)
CREATE TABLE public.cbhpm_portes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    porte TEXT NOT NULL, -- Ex: 1, 2, 3...
    subporte TEXT NOT NULL, -- Ex: A, B, C...
    valor DECIMAL(15,4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(porte, subporte)
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cbhpm_procedimentos TO authenticated;
GRANT ALL ON public.cbhpm_procedimentos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cbhpm_portes TO authenticated;
GRANT ALL ON public.cbhpm_portes TO service_role;

-- RLS
ALTER TABLE public.cbhpm_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbhpm_portes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for authenticated users" ON public.cbhpm_procedimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.cbhpm_procedimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow select for authenticated users" ON public.cbhpm_portes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.cbhpm_portes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.cbhpm_procedimentos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();