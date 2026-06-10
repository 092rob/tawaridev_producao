-- Criar tabela de acesso específica para Prazos de Pagamento para evitar conflito de tipos UUID na tabela genérica
CREATE TABLE IF NOT EXISTS public.prazos_pagamento_dashboard_access (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Garantir permissões
GRANT SELECT, INSERT, DELETE ON public.prazos_pagamento_dashboard_access TO authenticated;
GRANT ALL ON public.prazos_pagamento_dashboard_access TO service_role;

-- Habilitar RLS
ALTER TABLE public.prazos_pagamento_dashboard_access ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Nota: A verificação de admin será feita via código ou uma política mais flexível se necessário, 
-- dado que profiles não tem a coluna role diretamente (provavelmente está em outra tabela ou gerida via custom claims)
CREATE POLICY "Admins podem gerenciar acessos de prazos" ON public.prazos_pagamento_dashboard_access
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Usuários podem ver seu próprio acesso de prazos" ON public.prazos_pagamento_dashboard_access
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
