-- Create sectors table
CREATE TABLE public.setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  gestor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Use GRANT to set permissions for different roles.
-- sectors is an admin-focused table, but might be useful for other modules later.
-- For now, restrict to authenticated and service_role.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setores TO authenticated;
GRANT ALL ON public.setores TO service_role;

-- Enable Row Level Security
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access (using the existing role check logic if possible, 
-- or a simple authenticated check if the app handles roles in the UI)
-- Since the project uses a profiles table/user_roles for roles, we should ideally check for 'admin' role.
CREATE POLICY "Admins can do everything on setores" 
ON public.setores 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Also allow reading for all authenticated users if needed (optional, but requested for admin menu)
-- If it's strictly admin, the above policy is enough.

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_setores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_setores_updated_at
BEFORE UPDATE ON public.setores
FOR EACH ROW
EXECUTE FUNCTION public.update_setores_updated_at();