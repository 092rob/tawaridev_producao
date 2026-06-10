-- Drop a constraint existente que aponta para auth.users
ALTER TABLE public.agendas_positivas 
DROP CONSTRAINT IF EXISTS agendas_positivas_user_id_fkey;

-- Recria a constraint apontando para public.profiles
ALTER TABLE public.agendas_positivas 
ADD CONSTRAINT agendas_positivas_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id);
