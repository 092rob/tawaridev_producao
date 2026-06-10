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
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
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

function normKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ªº]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function pick(raw: Record<string, unknown>, ...headers: string[]): unknown {
  for (const h of headers) {
    if (Object.prototype.hasOwnProperty.call(raw, h)) return raw[h];
  }
  const map = new Map<string, unknown>();
  for (const [k, v] of Object.entries(raw)) map.set(normKey(k), v);
  for (const h of headers) {
    const v = map.get(normKey(h));
    if (v !== undefined) return v;
  }
  return null;
}

function mapRow(raw: Record<string, unknown>, uploadId: string, tipoImportacao: string | null) {
  return {
    upload_id: uploadId,
    tipo_importacao: tipoImportacao,
    raw: raw as never,
    convenio_nome: str(pick(raw, "Nome Convenio", "Nome do Convenio")),
    id_guia: str(pick(raw, "ID da Guia")),
    protocolo_convenio: str(pick(raw, "Protocolo Convênio", "Protocolo Convenio")),
    tipo_guia: str(pick(raw, "Tipo de Guia")),
    nome_paciente: str(pick(raw, "Nome paciente")),
    num_conta: str(pick(raw, "Num. Conta")),
    data_pagamento: parseDate(pick(raw, "Data Pagto.", "Data Pagto")),
    mes_pagamento: str(pick(raw, "Mês Pgto.", "Mes Pgto.")),
    prazo_recebimento: num(pick(raw, "Prazo recebimento")),
    data_submissao_guia: parseDate(pick(raw, "Data Submissão Guia", "Data Submissao Guia")),
    data_atendimento: parseDate(pick(raw, "Dt.Atendimento")),
    data_saida_guia: parseDate(pick(raw, "Data Saída Guia", "Data Saida Guia")),
    status_conciliacao: str(pick(raw, "Status Conciliação", "Status Conciliacao")),
    status_analise: str(pick(raw, "Status de Analise")),
    situacao_guia: str(pick(raw, "Situação da Guia", "Situacao da Guia")),
    guia_recurso: str(pick(raw, "Guia é de Recurso", "Guia e de Recurso")),
    guia_associada: str(pick(raw, "Guia Associada")),
    recurso_vinculado: str(pick(raw, "Recurso Vinculado")),
    conta_integralmente_glosada: str(pick(raw, "Conta Integralmente Glosada")),
    num_parcial_recurso: num(pick(raw, "Nº Parcial de Recurso")),
    valor_apresentado: num(pick(raw, "Apresentado (Demonstrativo)")),
    valor_faturado: num(pick(raw, "Valor Faturado (Associado)", "Valor Faturado")),
    valor_pago: num(pick(raw, "Valor Pago (Demonstrado)", "Valor Pago")),
    diferenca: num(pick(raw, "Diferenca")),
    glosa_submetida: num(pick(raw, "Glosa Submetida")),
    glosa_em_analise: num(pick(raw, "1ª Análise - Glosa Em Análise", "1a Analise - Glosa Em Analise")),
    glosa_aceita: num(pick(raw, "1ª Análise - Glosa Aceita")),
    glosa_refaturada: num(pick(raw, "1ª Análise - Glosa Refaturada")),
    glosa_recursada: num(pick(raw, "1ª Análise - Glosa Recursada")),
    pendente_retorno: num(pick(raw, "1ª Análise - Pendente Retorno")),
    glosa_recuperada: num(pick(raw, "1ª Análise - Glosa Recuperada")),
    glosa_mantida: num(pick(raw, "1ª Análise - Glosa Mantida")),
    dt_limite_envio: parseDate(pick(raw, "1ª Análise - Dt. limite Envio")),
    dt_envio: parseDate(pick(raw, "1ª Análise - Dt. Envio")),
    mes_envio: str(pick(raw, "1ª Análise - Mês Envio")),
    protocolo_envio: str(pick(raw, "1ª Análise - Protocolo")),
    dt_venc_recurso: parseDate(pick(raw, "1ª Análise - Dt. Venc. Recurso")),
    mes_venc_recurso: str(pick(raw, "1ª Análise - Mês Venc.Recurso")),
    dt_pgto_recurso: parseDate(pick(raw, "1ª Análise - Dt. Pgto. Recurso")),
    mes_pgto_recurso: str(pick(raw, "1ª Análise - Mês Pgto.Recurso")),
  };
}

function hasRecognized(r: ReturnType<typeof mapRow>): boolean {
  return Boolean(
    r.convenio_nome ||
    r.id_guia ||
    r.glosa_submetida !== null ||
    r.glosa_recuperada !== null ||
    r.mes_pagamento,
  );
}

export const ingestGlosaRecUpload = createServerFn({ method: "POST" })
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
      .from("glosa_rec_uploads")
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
    if (!mapped.some(hasRecognized)) {
      await supabaseAdmin.from("glosa_rec_uploads").delete().eq("id", upload.id);
      throw new Error(
        "A planilha não possui os títulos esperados (Nome Convenio, ID da Guia, Glosa Submetida, 1ª Análise - Glosa Recuperada, etc).",
      );
    }
    const batch = 500;
    for (let i = 0; i < mapped.length; i += batch) {
      const { error } = await supabaseAdmin.from("glosa_rec_records").insert(mapped.slice(i, i + batch));
      if (error) {
        await supabaseAdmin.from("glosa_rec_uploads").delete().eq("id", upload.id);
        throw new Error(`Erro ao inserir registros: ${error.message}`);
      }
    }
    return { upload_id: upload.id, count: mapped.length };
  });

export const deleteGlosaRecUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ upload_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("glosa_rec_records").delete().eq("upload_id", data.upload_id);
    const { error } = await supabaseAdmin.from("glosa_rec_uploads").delete().eq("id", data.upload_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const grantGlosaRecAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ user_id: z.string().uuid(), granted: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.granted) {
      const { error } = await supabaseAdmin
        .from("glosa_rec_dashboard_access")
        .upsert({ user_id: data.user_id, granted_by: context.userId }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("glosa_rec_dashboard_access")
        .delete()
        .eq("user_id", data.user_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listGlosaRecAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("glosa_rec_dashboard_access")
      .select("user_id");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.user_id as string);
  });

export const setGlosaRecMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      ano_mes: z.string().regex(/^\d{4}-\d{2}$/, "Formato esperado: AAAA-MM"),
      meta_valor: z.number().min(0).max(1_000_000_000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("glosa_rec_metas")
      .upsert({
        ano_mes: data.ano_mes,
        meta_valor: data.meta_valor,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "ano_mes" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGlosaRecMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ ano_mes: z.string().regex(/^\d{4}-\d{2}$/) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("glosa_rec_metas")
      .delete()
      .eq("ano_mes", data.ano_mes);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
