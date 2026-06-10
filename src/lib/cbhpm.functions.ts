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

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function pick(raw: Record<string, unknown>, ...headers: string[]): unknown {
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

function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  if (typeof v === "string") {
    const s = v.replace(/R\$\s?/, "").replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export const ingestCBHPMProcedimentos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      rows: z.array(z.record(z.unknown())).min(1).max(20000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const mapped = data.rows.map((r) => ({
      id_tabela: str(pick(r, "ID TABELA")),
      id_grupo: str(pick(r, "ID do Grupo")),
      descricao_grupo: str(pick(r, "Descrição do Grupo")),
      id_subgrupo: str(pick(r, "ID do Subgrupo")),
      descricao_subgrupo: str(pick(r, "Descrição do Subgrupo")),
      codigo_anatomico: str(pick(r, "Código Anatômico")),
      procedimento: str(pick(r, "Procedimento")),
      fator_multiplicativo: num(pick(r, "Fator Multiplicativo")),
      porte: str(pick(r, "Porte")),
      custo_operacional: num(pick(r, "Custo Operacional")),
      num_auxiliares: num(pick(r, "Número de Auxiliares")),
      porte_anestesico: str(pick(r, "Porte Anestésico")),
      filmes: num(pick(r, "Filmes")),
      incidencia: num(pick(r, "Incidência")),
      unidade_radiofarmaco: str(pick(r, "Unidade Radiofármaco")),
      codigo: str(pick(r, "Código Anatômico")),
    })).filter(r => r.codigo_anatomico || r.procedimento);

    const batchSize = 500;
    for (let i = 0; i < mapped.length; i += batchSize) {
      const batch = mapped.slice(i, i + batchSize);
      const { error } = await supabaseAdmin.from("cbhpm_procedimentos").upsert(batch);
      if (error) throw new Error(`Erro ao inserir procedimentos: ${error.message}`);
    }
    return { count: mapped.length };
  });

export const ingestCBHPMPortes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      rows: z.array(z.record(z.unknown())).min(1).max(1000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const mapped = data.rows.map((r) => ({
      id_tabela: str(pick(r, "ID TABELA")),
      porte: str(pick(r, "PORTE")),
      valor: num(pick(r, "VALOR PORTE")),
    })).filter(r => r.porte && r.valor > 0);

    const { error } = await supabaseAdmin.from("cbhpm_portes").upsert(mapped, { onConflict: "id_tabela, porte" });
    if (error) throw new Error(`Erro ao inserir portes: ${error.message}`);
    
    return { count: mapped.length };
  });