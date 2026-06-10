-- Tabela para os registros de prazos de operadoras (similar ao glosa_motivos_records)
CREATE TABLE public.prazos_operadoras_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    operadora_nome TEXT,
    cod_operadora TEXT,
    data_pagamento DATE,
    mes_pagamento TEXT,
    protocolo_convenio TEXT,
    guia_convenio TEXT,
    conta TEXT,
    lote_convenio TEXT,
    protocolo_recurso TEXT,
    cod_carteira TEXT,
    beneficiario TEXT,
    data_atendimento DATE,
    valor_faturado DECIMAL(15,2),
    valor_pago DECIMAL(15,2),
    glosa_submetida DECIMAL(15,2),
    glosa_aceita DECIMAL(15,2),
    glosa_recursada DECIMAL(15,2),
    glosa_recuperada DECIMAL(15,2),
    glosa_mantida DECIMAL(15,2),
    pendente_retorno DECIMAL(15,2),
    saldo_glosa DECIMAL(15,2),
    status_analise TEXT,
    sem_registro_envio TEXT,
    data_envio_recurso DATE,
    guia_e_recurso TEXT,
    upload_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para gerenciar os uploads desse novo tipo
CREATE TABLE public.prazos_operadoras_uploads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    file_name TEXT NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    tipo_importacao TEXT, -- 'ZG' ou 'Manual'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Adicionar FK na tabela de records
ALTER TABLE public.prazos_operadoras_records 
ADD CONSTRAINT fk_prazos_upload FOREIGN KEY (upload_id) REFERENCES public.prazos_operadoras_uploads(id) ON DELETE CASCADE;

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prazos_operadoras_records TO authenticated;
GRANT ALL ON public.prazos_operadoras_records TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prazos_operadoras_uploads TO authenticated;
GRANT ALL ON public.prazos_operadoras_uploads TO service_role;

-- RLS
ALTER TABLE public.prazos_operadoras_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prazos_operadoras_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total para usuários autenticados" ON public.prazos_operadoras_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acesso total para usuários autenticados" ON public.prazos_operadoras_uploads FOR ALL USING (auth.role() = 'authenticated');
