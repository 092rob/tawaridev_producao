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
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  if (typeof v === "string") {
    const s = v.replace(/R\$\s?/, "").replace(/\./g, "").replace(",", ".");
    const n = Number(s);
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
    const v = normalized.get(normalizeKey(header));
    if (v !== undefined) return v;
  }
  return null;
}

function mapRow(raw: Record<string, unknown>, uploadId: string) {
  return {
    upload_id: uploadId,
    raw: raw as never,
    convenio_nome: str(pick(raw, "Nome do Convenio")),
    codigo_operadora: str(pick(raw, "Código Operadora")),
    num_atendimento: str(pick(raw, "Num.Atendimento")),
    num_conta: str(pick(raw, "Num. Conta")),
    id_guia: str(pick(raw, "ID da Guia")),
    id_item: str(pick(raw, "ID do Item")),
    data_recebimento: parseDate(pick(raw, "Data Receb.")),
    data_pagamento: parseDate(pick(raw, "Data Pagto.")),
    mes_pagamento: str(pick(raw, "Mês Pgto.")),
    tipo_guia: str(pick(raw, "Tipo de Guia")),
    nome_paciente: str(pick(raw, "Nome paciente")),
    data_atendimento: parseDate(pick(raw, "Dt.Atendimento")),
    data_saida_guia: parseDate(pick(raw, "Data Saída Guia")),
    status_analise: str(pick(raw, "Status de Analise")),
    data_analise: parseDate(pick(raw, "Data Analise")),
    guia_recurso: str(pick(raw, "Guia é de Recurso")),
    guia_associada: str(pick(raw, "Guia Associada")),
    conta_integralmente_glosada: str(pick(raw, "Conta Integralmente Glosada")),
    num_parcial_recurso: num(pick(raw, "Nº Parcial de Recurso")),
    codigo_item_convenio: str(pick(raw, "Código Item Convenio")),
    descricao_item_convenio: str(pick(raw, "Descrição Item Convenio")),
    tipo_produto: str(pick(raw, "Tipo produto")),
    tipo_tabela: str(pick(raw, "Tipo da Tabela")),
    data_realizacao: parseDate(pick(raw, "Dt.Realizacao")),
    data_recurso: parseDate(pick(raw, "Dt. Recurso")),
    data_aceite: parseDate(pick(raw, "Dt.Aceite")),
    codigo_centro_custos: str(pick(raw, "Código centro de custos")),
    centro_custos: str(pick(raw, "Centro de custos")),
    grau_participacao: num(pick(raw, "Grau Participação")),
    valor_apresentado: num(pick(raw, "Apresentado (Demonstrativo)")),
    qtde_faturada: num(pick(raw, "Qtde. Faturada")),
    vlr_unit_faturado: num(pick(raw, "Vlr. Unit. Faturado")),
    valor_faturado: num(pick(raw, "Valor Faturado")),
    qtde_paga: num(pick(raw, "Qtde. Paga")),
    vlr_unit_conv: num(pick(raw, "Vlr. Unit. Conv")),
    valor_pago: num(pick(raw, "Valor Pago")),
    diferenca: num(pick(raw, "Diferenca")),
    glosa_submetida: num(pick(raw, "Glosa Submetida")),
    glosa_em_analise: num(pick(raw, "1ª Análise - Glosa Em Análise")),
    glosa_aceita: num(pick(raw, "1ª Análise - Glosa Aceita")),
    glosa_refaturada: num(pick(raw, "1ª Análise - Glosa Refaturada")),
    glosa_recursada: num(pick(raw, "1ª Análise - Glosa Recursada")),
    glosa_pendente_retorno: num(pick(raw, "1ª Análise - Pendente Retorno")),
    glosa_recuperada: num(pick(raw, "1ª Análise - Glosa Recuperada")),
    glosa_mantida: num(pick(raw, "1ª Análise - Glosa Mantida")),
    codigo_motivo_glosa: str(pick(raw, "Código Motivo Glosa")),
    descricao_motivo_glosa: str(pick(raw, "Descrição Motivo Glosa")),
    codigo_motivo_glosa_tiss: str(pick(raw, "Código Motivo Glosa TISS")),
    descricao_motivo_glosa_tiss: str(pick(raw, "Descrição Motivo Glosa TISS")),
    complemento_motivo_glosa: str(pick(raw, "Complemento Motivo Glosa")),
    descricao_primeiro_motivo_glosa: str(pick(raw, "Descrição Primeiro Motivo Glosa")),
    justificativa_de_recurso: str(pick(raw, "Justif. de Recurso", "Justificativa de Recurso")),
    usuario_realizou_recurso: str(pick(raw, "Usuário Realizou Recurso")),
    data_envio_recurso_lote: parseDate(pick(raw, "Data Envio Recurso Lote")),
    protocolo_recurso_lote: str(pick(raw, "Protocolo de Recurso Lote")),
    justificativa_aceite: str(pick(raw, "Justif. De Aceite")),
    comentario_de_aceite: str(pick(raw, "Comentário de Aceite", "Comentário de Aceite")),
    usuario_realizou_aceite: str(pick(raw, "Usuário Realizou Aceite")),
    situacao_envio_recurso: str(pick(raw, "Situação envio recurso")),
    data_envio_recurso_item: parseDate(pick(raw, "Data Envio Recurso Item")),
    protocolo_envio_recurso_item: str(pick(raw, "Protocolo Envio Recurso Item")),
    num_proc_complementar: str(pick(raw, "Num. Proc. Complementar")),
    usuario_envio_recurso_item: str(pick(raw, "Usuario Envio Recurso Item")),
    descricao_tipo_glosa: str(pick(raw, "Descrição Tipo de Glosa")),
  };
}

export const ingestGlosaMotivosUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      file_name: z.string().min(1).max(255),
      rows: z.array(z.record(z.unknown())).min(1).max(20000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: upload, error: uErr } = await supabaseAdmin
      .from("glosa_motivos_uploads")
      .insert({
        file_name: data.file_name,
        row_count: data.rows.length,
        uploaded_by: context.userId,
      })
      .select("id")
      .single();
    if (uErr) throw new Error(uErr.message);

    const mapped = data.rows.map((r) => mapRow(r, upload.id));
    const batchSize = 500;
    for (let i = 0; i < mapped.length; i += batchSize) {
      const batch = mapped.slice(i, i + batchSize);
      const { error } = await supabaseAdmin.from("glosa_motivos_records").insert(batch);
      if (error) {
        await supabaseAdmin.from("glosa_motivos_uploads").delete().eq("id", upload.id);
        throw new Error(`Erro ao inserir registros: ${error.message}`);
      }
    }
    return { upload_id: upload.id, count: mapped.length };
  });

export const deleteGlosaMotivosUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ upload_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("glosa_motivos_uploads").delete().eq("id", data.upload_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const grantGlosaMotivosAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ user_id: z.string().uuid(), granted: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.granted) {
      const { error } = await supabaseAdmin
        .from("glosa_motivos_dashboard_access")
        .upsert({ user_id: data.user_id, granted_by: context.userId }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("glosa_motivos_dashboard_access")
        .delete()
        .eq("user_id", data.user_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listGlosaMotivosAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("glosa_motivos_dashboard_access")
      .select("user_id");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.user_id);
  });