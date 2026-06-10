ALTER TABLE public.demand_annotations
ADD CONSTRAINT demand_annotations_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;