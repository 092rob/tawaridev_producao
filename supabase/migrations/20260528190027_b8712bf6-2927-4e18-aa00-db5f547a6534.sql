-- Create table for agendas_positivas
CREATE TABLE public.agendas_positivas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  so_number SERIAL NOT NULL,
  subject TEXT NOT NULL,
  insurance TEXT NOT NULL,
  responsible_sector TEXT NOT NULL,
  description TEXT NOT NULL,
  opening_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Atendimento', 'Atendida')),
  responsible_user TEXT,
  observations TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Use GRANT to set permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendas_positivas TO authenticated;
GRANT ALL ON public.agendas_positivas TO service_role;

-- Enable RLS
ALTER TABLE public.agendas_positivas ENABLE ROW LEVEL SECURITY;

-- Create policies
-- For simplicity, let's allow all authenticated users to see and manage their own, 
-- but since this is a management panel, maybe they should see all?
-- User's request implies a "gestão de demandas", so likely team members should see all.
CREATE POLICY "Users can view all demands" 
ON public.agendas_positivas 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert demands" 
ON public.agendas_positivas 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update demands" 
ON public.agendas_positivas 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete demands" 
ON public.agendas_positivas 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER update_agendas_positivas_updated_at
BEFORE UPDATE ON public.agendas_positivas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
