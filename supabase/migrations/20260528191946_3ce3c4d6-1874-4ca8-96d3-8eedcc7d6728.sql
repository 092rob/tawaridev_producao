-- Garante que user_id referencia profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'agendas_positivas_user_id_fkey') THEN
        ALTER TABLE public.agendas_positivas 
        ADD CONSTRAINT agendas_positivas_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id);
    END IF;
END $$;

-- O responsible_id já foi criado com referência, mas vamos garantir o nome da constraint
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'agendas_positivas_responsible_id_fkey') THEN
        ALTER TABLE public.agendas_positivas 
        ADD CONSTRAINT agendas_positivas_responsible_id_fkey 
        FOREIGN KEY (responsible_id) REFERENCES public.profiles(id);
    END IF;
END $$;
