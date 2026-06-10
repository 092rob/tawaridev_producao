
create or replace function public.get_api_zg_item_totals(
  p_cliente text default null,
  p_convenio text default null,
  p_operadora text default null,
  p_data_de text default null,
  p_data_ate text default null,
  p_data_pag_de text default null,
  p_data_pag_ate text default null,
  p_search text default null
) returns table(
  total bigint,
  glosa_submetida numeric,
  glosa_recursada numeric,
  glosa_aceita numeric,
  analise_total numeric
)
language sql stable security definer set search_path = public as $$
  select
    count(*)::bigint as total,
    coalesce(sum(i_item_valor_glosa),0)::numeric as glosa_submetida,
    coalesce(sum(i_recurso_valor),0)::numeric as glosa_recursada,
    coalesce(sum(i_aceite_valor),0)::numeric as glosa_aceita,
    coalesce(sum(cc_valor_analisado),0)::numeric as analise_total
  from public.api_zg_item
  where (p_cliente is null or cliente_nome ilike '%'||p_cliente||'%')
    and (p_convenio is null or convenio_nome ilike '%'||p_convenio||'%')
    and (p_operadora is null or operadora_nome ilike '%'||p_operadora||'%')
    and (p_data_de is null or ultima_atualizacao >= p_data_de::timestamptz)
    and (p_data_ate is null or ultima_atualizacao <= (p_data_ate::date + 1)::timestamptz)
    and (p_data_pag_de is null or g_guia_data_pagamento >= p_data_pag_de::timestamptz)
    and (p_data_pag_ate is null or g_guia_data_pagamento <= (p_data_pag_ate::date + 1)::timestamptz)
    and (p_search is null or
      cliente_nome ilike '%'||p_search||'%' or
      convenio_nome ilike '%'||p_search||'%' or
      operadora_nome ilike '%'||p_search||'%' or
      g_guia_beneficiario_nome ilike '%'||p_search||'%' or
      i_item_descricao ilike '%'||p_search||'%'
    );
$$;

revoke all on function public.get_api_zg_item_totals(text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.get_api_zg_item_totals(text,text,text,text,text,text,text,text) to service_role;
