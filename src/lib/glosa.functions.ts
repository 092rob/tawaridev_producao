import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado: apenas administradores.");
}

function parseDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  // dd/mm/yyyy
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parseTimestamp(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  if (typeof v === "string") {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? null : n;
  }
  return null;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ªº]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function pick(raw: Record<string, unknown>, ...headers: string[]): unknown {
  for (const header of headers) {
    if (Object.prototype.hasOwnProperty.call(raw, header)) return raw[header];
  }

  const normalized = new Map<string, unknown>();
  for (const [key, value] of Object.entries(raw)) {
    normalized.set(normalizeKey(key), value);
  }

  for (const header of headers) {
    const value = normalized.get(normalizeKey(header));
    if (value !== undefined) return value;
  }

  return null;
}

function mapRow(raw: Record<string, unknown>, uploadId: string, tipoImportacao: string | null) {
  return {
    upload_id: uploadId,
    tipo_importacao: tipoImportacao,
    raw: raw as never,

    convenio_nome: str(pick(raw, "Nome do Convenio", "convenio_nome")),
    operadora_grupo: str(pick(raw, "Grupo Operadora", "operadora_grupo")),
    data_pagamento: parseDate(pick(raw, "Data Pagto.", "g_guia_data_pagamento")),
    mes_pagamento: str(pick(raw, "Mês Pgto.", "cc_mes_pagamento")),
    nome_paciente: str(pick(raw, "Nome paciente", "g_guia_beneficiario_nome")),
    num_conta: str(pick(raw, "Num. Conta", "g_guia_numero_conta")),
    data_atendimento: parseDate(pick(raw, "Dt.Atendimento", "g_guia_data_atendimento")),
    data_saida_guia: parseDate(pick(raw, "Data Saída Guia", "g_guia_data_saida")),
    status_analise: str(pick(raw, "Status de Analise", "g_guia_status_analise")),
    data_analise: parseDate(pick(raw, "Data Analise", "cc_data_analise_glosa")),
    situacao_guia: str(pick(raw, "Situação da Guia", "g_guia_convenio_situacaoguia")),
    discriminador_guia: str(pick(raw, "Discriminador Guia", "g_guia_discriminador")),
    guia_recurso: str(pick(raw, "Guia é de Recurso", "g_guia_eh_recurso")),
    conta_integralmente_glosada: str(pick(raw, "Conta Integralmente Glosada", "g_guia_glosa_total")),
    num_parcial_recurso: num(pick(raw, "Nº Parcial de Recurso", "g_recurso_idx")),
    num_parcial_item_recurso: num(pick(raw, "Nº Parcial do Item de Recurso", "i_recurso_idx")),
    data_realizacao: parseDate(pick(raw, "Dt.Realizacao", "i_item_data_execucao")),
    data_recurso: parseDate(pick(raw, "Dt. Recurso", "i_recurso_data")),
    data_aceite: parseDate(pick(raw, "Dt.Aceite", "i_aceite_data")),
    centro_custos: str(pick(raw, "Centro de custos", "i_item_centro_custos_descricao")),
    valor_apresentado: num(pick(raw, "Apresentado (Demonstrativo)", "i_item_valor_apresentado")),
    qtde_faturada: num(pick(raw, "Qtde. Faturada", "i_item_qtd_cobrada")),
    vlr_unit_faturado: num(pick(raw, "Vlr. Unit. Faturado", "i_item_valor_unitario_cobrado")),
    valor_faturado: num(pick(raw, "Valor Faturado", "i_item_valor_cobrado")),
    qtde_paga: num(pick(raw, "Qtde. Paga", "i_item_qtd_recebida")),
    vlr_unit_pago: num(pick(raw, "Vlr. Unit. Pago", "i_item_valor_unitario_recebido")),
    valor_pago: num(pick(raw, "Valor Pago", "i_item_valor_recebido")),
    diferenca: num(pick(raw, "Diferenca", "i_item_valor_diferenca")),
    glosa_submetida: num(pick(raw, "Glosa Submetida", "i_item_valor_glosa")),
    analise_glosa_aceita: num(pick(raw, "1ª Análise - Glosa Aceita", "i_aceite_valor_produtividade")),
    analise_glosa_refaturada: num(pick(raw, "1ª Análise - Glosa Refaturada", "i_refaturamento_valor")),
    analise_glosa_recursada: num(pick(raw, "1ª Análise - Glosa Recursada", "i_recurso_valor_produtividade")),
    analise_pendente_retorno: num(pick(raw, "1ª Análise - Pendente Retorno", "cc_i_item_1_analise_pendente_retorno")),
    analise_glosa_recuperada: num(pick(raw, "1ª Análise - Glosa Recuperada", "cc_1_analise_i_recurso_valor_recebido")),
    analise_glosa_mantida: num(pick(raw, "1ª Análise - Glosa Mantida", "i_recurso_valor_glosa_mantida")),
    analise_soma_aceites_recursos: num(pick(raw, "1ª Análise - Soma Aceites e Recursos", "cc_valor_analisado")),
    tipo_glosa_origem: str(pick(raw, "Tipo de Glosa Origem", "i_item_tipo_de_glosa_descricao")),
    codigo_motivo_glosa: str(pick(raw, "Código Motivo Glosa", "i_motivos_glosa_codigos")),
    descricao_motivo_glosa: str(pick(raw, "Descrição Motivo Glosa", "i_motivos_glosa_descricoes")),
    complemento_motivo_glosa: str(pick(raw, "Complemento Motivo Glosa", "i_motivos_glosa_complementos")),
    justificativa_recurso: str(pick(raw, "Justificativa Recurso", "i_recurso_justificativa")),
    usuario_recurso: str(pick(raw, "Usuário Realizou Recurso", "i_recurso_usuario_nome_completo")),
    data_envio_recurso_lote: parseDate(pick(raw, "Data Envio Recurso Lote", "g_recurso_data_envio")),
    protocolo_recurso_lote: str(pick(raw, "Protocolo de Recurso Lote", "g_recurso_protocolo")),
    justificativa_aceite: str(pick(raw, "Justificativa Aceite", "i_aceite_justificativa")),
    comentario_aceite: str(pick(raw, "Comentário Aceite", "i_item_comentario_aceite")),
    usuario_aceite: str(pick(raw, "Usuário Realizou Aceite", "i_aceite_usuario_realizou_nome_completo")),
    data_envio_recurso_item: parseDate(pick(raw, "Data Envio Recurso Item", "i_recurso_data_envio")),
    protocolo_envio_recurso_item: str(pick(raw, "Protocolo Envio Recurso Item", "i_recurso_protocolo")),
    usuario_envio_recurso_item: str(pick(raw, "Usuario Envio Recurso Item", "i_recurso_envio_usuario")),
    usuario_refaturamento: str(pick(raw, "Usuário Realizou Refaturamento", "i_refaturamento_usuario_nome_completo")),
    data_refaturamento: parseDate(pick(raw, "Data Refaturamento", "i_refaturamento_data")),
    usuario_analise: str(pick(raw, "Usuario Analise", "cc_usuario_analise_glosa")),
    tipo_guia: str(pick(raw, "Tipo de Guia", "g_guia_tipo")),
    tipo_produto: str(pick(raw, "Tipo produto", "g_guia_beneficiario_plano")),
    data_ultima_atualizacao: parseDate(pick(raw, "Data última atualização dados", "ultima_atualizacao")) ?? parseTimestamp(pick(raw, "Data última atualização dados", "ultima_atualizacao"))?.slice(0, 10) ?? null,
    codigo_setor_interno: str(pick(raw, "Código Setor Interno", "i_setor_interno_codigo")),
    descricao_setor_interno: str(pick(raw, "Descrição Setor Interno", "i_setor_interno_descricao")),
    "Nome do Convenio": str(pick(raw, "Nome do Convenio", "convenio_nome")),
    "Data Pagto.": parseDate(pick(raw, "Data Pagto.", "g_guia_data_pagamento")),
    "Mês Pgto.": str(pick(raw, "Mês Pgto.", "cc_mes_pagamento")),
    "Tipo de Guia": str(pick(raw, "Tipo de Guia", "g_guia_tipo")),
    "Nome paciente": str(pick(raw, "Nome paciente", "g_guia_beneficiario_nome")),
    "Num. Conta": str(pick(raw, "Num. Conta", "g_guia_numero_conta")),
    "Dt.Atendimento": parseDate(pick(raw, "Dt.Atendimento", "g_guia_data_atendimento")),
    "Data Saída Guia": parseDate(pick(raw, "Data Saída Guia", "g_guia_data_saida")),
    "Status de Analise": str(pick(raw, "Status de Analise", "g_guia_status_analise")),
    "Data Analise": parseDate(pick(raw, "Data Analise", "cc_data_analise_glosa")),
    "Situação da Guia": str(pick(raw, "Situação da Guia", "g_guia_convenio_situacaoguia")),
    "Discriminador Guia": str(pick(raw, "Discriminador Guia", "g_guia_discriminador")),
    "Guia é de Recurso": str(pick(raw, "Guia é de Recurso", "g_guia_eh_recurso")),
    "Conta Integralmente Glosada": str(pick(raw, "Conta Integralmente Glosada", "g_guia_glosa_total")),
    "Nº Parcial de Recurso": num(pick(raw, "Nº Parcial de Recurso", "g_recurso_idx")),
    "Nº Parcial do Item de Recurso": num(pick(raw, "Nº Parcial do Item de Recurso", "i_recurso_idx")),
    "Tipo produto": str(pick(raw, "Tipo produto", "g_guia_beneficiario_plano")),
    "Dt.Realizacao": parseDate(pick(raw, "Dt.Realizacao", "i_item_data_execucao")),
    "Dt. Recurso": parseDate(pick(raw, "Dt. Recurso", "i_recurso_data")),
    "Dt.Aceite": parseDate(pick(raw, "Dt.Aceite", "i_aceite_data")),
    "Centro de custos": str(pick(raw, "Centro de custos", "i_item_centro_custos_descricao")),
    "Apresentado (Demonstrativo)": num(pick(raw, "Apresentado (Demonstrativo)", "i_item_valor_apresentado")),
    "Qtde. Faturada": num(pick(raw, "Qtde. Faturada", "i_item_qtd_cobrada")),
    "Vlr. Unit. Faturado": num(pick(raw, "Vlr. Unit. Faturado", "i_item_valor_unitario_cobrado")),
    "Valor Faturado": num(pick(raw, "Valor Faturado", "i_item_valor_cobrado")),
    "Qtde. Paga": num(pick(raw, "Qtde. Paga", "i_item_qtd_recebida")),
    "Vlr. Unit. Pago": num(pick(raw, "Vlr. Unit. Pago", "i_item_valor_unitario_recebido")),
    "Valor Pago": num(pick(raw, "Valor Pago", "i_item_valor_recebido")),
    "Diferenca": num(pick(raw, "Diferenca", "i_item_valor_diferenca")),
    "Glosa Submetida": num(pick(raw, "Glosa Submetida", "i_item_valor_glosa")),
    "1ª Análise - Glosa Aceita": num(pick(raw, "1ª Análise - Glosa Aceita", "i_aceite_valor_produtividade")),
    "1ª Análise - Glosa Refaturada": num(pick(raw, "1ª Análise - Glosa Refaturada", "i_refaturamento_valor")),
    "1ª Análise - Glosa Recursada": num(pick(raw, "1ª Análise - Glosa Recursada", "i_recurso_valor_produtividade")),
    "1ª Análise - Pendente Retorno": num(pick(raw, "1ª Análise - Pendente Retorno", "cc_i_item_1_analise_pendente_retorno")),
    "1ª Análise - Glosa Recuperada": num(pick(raw, "1ª Análise - Glosa Recuperada", "cc_1_analise_i_recurso_valor_recebido")),
    "1ª Análise - Glosa Mantida": num(pick(raw, "1ª Análise - Glosa Mantida", "i_recurso_valor_glosa_mantida")),
    "1ª Análise - Soma Aceites e Recursos": num(pick(raw, "1ª Análise - Soma Aceites e Recursos", "cc_valor_analisado")),
    "Usuário Realizou Recurso": str(pick(raw, "Usuário Realizou Recurso", "i_recurso_usuario_nome_completo")),
    "Data Envio Recurso Lote": parseDate(pick(raw, "Data Envio Recurso Lote", "g_recurso_data_envio")),
    "Protocolo de Recurso Lote": str(pick(raw, "Protocolo de Recurso Lote", "g_recurso_protocolo")),
    "Usuário Realizou Aceite": str(pick(raw, "Usuário Realizou Aceite", "i_aceite_usuario_realizou_nome_completo")),
    "Data Envio Recurso Item": parseDate(pick(raw, "Data Envio Recurso Item", "i_recurso_data_envio")),
    "Protocolo Envio Recurso Item": str(pick(raw, "Protocolo Envio Recurso Item", "i_recurso_protocolo")),
    "Usuario Envio Recurso Item": str(pick(raw, "Usuario Envio Recurso Item", "i_recurso_envio_usuario")),
    "Usuário Realizou Refaturamento": str(pick(raw, "Usuário Realizou Refaturamento", "i_refaturamento_usuario_nome_completo")),
    "Data Refaturamento": parseDate(pick(raw, "Data Refaturamento", "i_refaturamento_data")),
    "Usuario Analise": str(pick(raw, "Usuario Analise", "cc_usuario_analise_glosa")),
    "Data última atualização dados": parseTimestamp(pick(raw, "Data última atualização dados", "ultima_atualizacao")),
  };
}

function hasRecognizedGlosaData(row: ReturnType<typeof mapRow>): boolean {
  return Boolean(
    row.convenio_nome ||
    row.data_analise ||
    row.usuario_analise ||
    row.analise_soma_aceites_recursos !== null ||
    row.analise_glosa_recursada !== null ||
    row.analise_glosa_aceita !== null,
  );
}

export const ingestGlosaUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      file_name: z.string().min(1).max(255),
      rows: z.array(z.record(z.unknown())).min(1).max(20000),
      tipo_importacao: z.enum(["ZG", "Manual"]).nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: upload, error: uErr } = await supabaseAdmin
      .from("glosa_uploads")
      .insert({
        file_name: data.file_name,
        row_count: data.rows.length,
        uploaded_by: context.userId,
        tipo_importacao: data.tipo_importacao ?? null,
      })
      .select("id")
      .single();
    if (uErr) throw new Error(uErr.message);

    const mapped = data.rows.map((r) => mapRow(r, upload.id, data.tipo_importacao ?? null));

    if (!mapped.some(hasRecognizedGlosaData)) {
      await supabaseAdmin.from("glosa_uploads").delete().eq("id", upload.id);
      throw new Error(
        "A planilha não possui os títulos esperados para Ranking Glosa. Use o modelo com colunas como Nome do Convenio, Data Analise, Usuario Analise e 1ª Análise - Soma Aceites e Recursos.",
      );
    }
    const batchSize = 500;
    for (let i = 0; i < mapped.length; i += batchSize) {
      const batch = mapped.slice(i, i + batchSize);
      const { error } = await supabaseAdmin.from("glosa_records").insert(batch);
      if (error) {
        await supabaseAdmin.from("glosa_uploads").delete().eq("id", upload.id);
        throw new Error(`Erro ao inserir registros: ${error.message}`);
      }
    }
    return { upload_id: upload.id, count: mapped.length };
  });

export const deleteGlosaUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ upload_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("glosa_records").delete().eq("upload_id", data.upload_id);
    const { error } = await supabaseAdmin.from("glosa_uploads").delete().eq("id", data.upload_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const grantGlosaAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      user_id: z.string().uuid(),
      granted: z.boolean(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.granted) {
      const { error } = await supabaseAdmin
        .from("glosa_dashboard_access")
        .upsert({ user_id: data.user_id, granted_by: context.userId }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("glosa_dashboard_access")
        .delete()
        .eq("user_id", data.user_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listGlosaAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("glosa_dashboard_access")
      .select("user_id");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.user_id);
  });

// Retorna nome e avatar dos analistas (whitelist fixa) p/ exibição no dashboard.
// Acessível a qualquer usuário autenticado — apenas dados de exibição dos
// analistas listados, sem expor demais perfis (RLS bypass via admin client).
export const getGlosaAnalystProfiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(50) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id as string,
      full_name: (r.full_name as string | null) ?? null,
      avatar_url: (r.avatar_url as string | null) ?? null,
    }));
  });
