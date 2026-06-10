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
    operadora_nome: str(pick(raw, "Operadora")),
    cod_operadora: str(pick(raw, "Cod Operadora")),
    data_pagamento: parseDate(pick(raw, "Data Pagamento")),
    mes_pagamento: str(pick(raw, "Mês Pagamento")),
    protocolo_convenio: str(pick(raw, "Protocolo Convenio")),
    guia_convenio: str(pick(raw, "Guia Convênio")),
    conta: str(pick(raw, "Conta")),
    lote_convenio: str(pick(raw, "Lote Convenio")),
    protocolo_recurso: str(pick(raw, "Protocolo Recurso")),
    cod_carteira: str(pick(raw, "Cod Carteira")),
    beneficiario: str(pick(raw, "Beneficiário")),
    data_atendimento: parseDate(pick(raw, "Dt Atendimento")),
    valor_faturado: num(pick(raw, "Valor Faturado")),
    valor_pago: num(pick(raw, "Valor Pago")),
    glosa_submetida: num(pick(raw, "Glosa Submetida")),
    glosa_aceita: num(pick(raw, "Glosa Aceita")),
    glosa_recursada: num(pick(raw, "Glosa Recursada")),
    glosa_recuperada: num(pick(raw, "Glosa Recuperada")),
    glosa_mantida: num(pick(raw, "Glosa Mantida")),
    pendente_retorno: num(pick(raw, "Pendente Retorno")),
    saldo_glosa: num(pick(raw, "Saldo Glosa")),
    status_analise: str(pick(raw, "Status Análise")),
    sem_registro_envio: str(pick(raw, "Sem Registro Envio")),
    data_envio_recurso: parseDate(pick(raw, "Data Envio Recurso")),
    guia_e_recurso: str(pick(raw, "Guia é de Recurso")),
  };
}

export const ingestPrazosUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      file_name: z.string().min(1).max(255),
      rows: z.array(z.record(z.unknown())).min(1).max(20000),
      tipo_importacao: z.string().optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: upload, error: uErr } = await supabaseAdmin
      .from("prazos_operadoras_uploads")
      .insert({
        file_name: data.file_name,
        row_count: data.rows.length,
        tipo_importacao: data.tipo_importacao,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (uErr) throw new Error(uErr.message);

    const mapped = data.rows.map((r) => mapRow(r, upload.id));
    const batchSize = 500;
    for (let i = 0; i < mapped.length; i += batchSize) {
      const batch = mapped.slice(i, i + batchSize);
      const { error } = await supabaseAdmin.from("prazos_operadoras_records").insert(batch);
      if (error) {
        await supabaseAdmin.from("prazos_operadoras_uploads").delete().eq("id", upload.id);
        throw new Error(`Erro ao inserir registros: ${error.message}`);
      }
    }
    return { upload_id: upload.id, count: mapped.length };
  });

export const deletePrazosUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ upload_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("prazos_operadoras_uploads").delete().eq("id", data.upload_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
