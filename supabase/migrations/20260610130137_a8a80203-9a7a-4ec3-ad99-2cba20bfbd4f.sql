
CREATE OR REPLACE FUNCTION public.get_table_ddl(p_table text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_sql text := '';
  v_cols text := '';
  v_pk text := '';
  v_fk text := '';
  v_pol text := '';
  v_grants text := '';
  v_rls boolean;
  r record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = p_table) THEN
    RAISE EXCEPTION 'Tabela % não existe', p_table;
  END IF;

  -- Columns
  FOR r IN
    SELECT column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=p_table
    ORDER BY ordinal_position
  LOOP
    v_cols := v_cols || format(E'  %I %s%s%s%s,\n',
      r.column_name,
      CASE
        WHEN r.data_type = 'USER-DEFINED' THEN r.udt_name
        WHEN r.data_type = 'ARRAY' THEN regexp_replace(r.udt_name, '^_', '') || '[]'
        WHEN r.data_type = 'character varying' AND r.character_maximum_length IS NOT NULL THEN 'varchar(' || r.character_maximum_length || ')'
        ELSE r.data_type
      END,
      CASE WHEN r.column_default IS NOT NULL THEN ' DEFAULT ' || r.column_default ELSE '' END,
      CASE WHEN r.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
      ''
    );
  END LOOP;

  -- Primary key
  SELECT format(E'  PRIMARY KEY (%s),\n', string_agg(quote_ident(a.attname), ', ' ORDER BY array_position(c.conkey, a.attnum)))
  INTO v_pk
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  WHERE c.conrelid = ('public.'||quote_ident(p_table))::regclass AND c.contype='p';

  -- Foreign keys
  SELECT string_agg(
    format(E'  FOREIGN KEY (%s) REFERENCES %s.%s(%s)%s%s,\n',
      (SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY array_position(c.conkey,a.attnum))
         FROM pg_attribute a WHERE a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)),
      quote_ident(ns.nspname), quote_ident(rel.relname),
      (SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY array_position(c.confkey,a.attnum))
         FROM pg_attribute a WHERE a.attrelid=c.confrelid AND a.attnum=ANY(c.confkey)),
      CASE c.confdeltype WHEN 'c' THEN ' ON DELETE CASCADE' WHEN 'n' THEN ' ON DELETE SET NULL' ELSE '' END,
      CASE c.confupdtype WHEN 'c' THEN ' ON UPDATE CASCADE' ELSE '' END
    ), ''
  ) INTO v_fk
  FROM pg_constraint c
  JOIN pg_class rel ON rel.oid = c.confrelid
  JOIN pg_namespace ns ON ns.oid = rel.relnamespace
  WHERE c.conrelid = ('public.'||quote_ident(p_table))::regclass AND c.contype='f';

  v_sql := format(E'CREATE TABLE public.%I (\n%s%s%s', p_table, v_cols, coalesce(v_pk,''), coalesce(v_fk,''));
  v_sql := rtrim(v_sql, E',\n') || E'\n);\n\n';

  -- Grants
  SELECT string_agg(format(E'GRANT %s ON public.%I TO %I;', privilege_type, p_table, grantee), E'\n')
  INTO v_grants
  FROM information_schema.role_table_grants
  WHERE table_schema='public' AND table_name=p_table AND grantee IN ('anon','authenticated','service_role');
  IF v_grants IS NOT NULL THEN v_sql := v_sql || v_grants || E'\n\n'; END IF;

  -- RLS
  SELECT relrowsecurity INTO v_rls FROM pg_class WHERE oid = ('public.'||quote_ident(p_table))::regclass;
  IF v_rls THEN
    v_sql := v_sql || format(E'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;\n\n', p_table);
  END IF;

  -- Policies
  SELECT string_agg(
    format(E'CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s;',
      polname, p_table, permissive, cmd, roles,
      CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END,
      CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END
    ), E'\n\n'
  ) INTO v_pol
  FROM pg_policies
  WHERE schemaname='public' AND tablename=p_table;
  IF v_pol IS NOT NULL THEN v_sql := v_sql || v_pol || E'\n'; END IF;

  RETURN v_sql;
END;
$$;

REVOKE ALL ON FUNCTION public.get_table_ddl(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_table_ddl(text) TO service_role;
