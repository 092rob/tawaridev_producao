-- Create operadoras table
CREATE TABLE public.operadoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  prazo_contratual_envio_recurso INTEGER NOT NULL,
  prazo_ideal_envio_recurso INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Use GRANT to set permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operadoras TO authenticated;
GRANT ALL ON public.operadoras TO service_role;

-- Enable Row Level Security
ALTER TABLE public.operadoras ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can do everything on operadoras" 
ON public.operadoras 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_operadoras_updated_at
BEFORE UPDATE ON public.operadoras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();