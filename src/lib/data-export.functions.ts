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

function toCSV(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
  return lines.join("\n");
}

export const listExportTables = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.rpc("get_api_zg_item_columns").select?.() as any ?? { data: null, error: null };
    // fallback: hardcoded known tables via information_schema is not available via REST.
    void data; void error;
    return {
      tables: [
        "agendas_positivas","api_zg_sync_state","bi_api_imports","bi_drive_imports","bi_drive_records",
        "cbhpm_portes","cbhpm_procedimentos","cbhpm_versoes","dashboard_access","dashboards",
        "demand_annotations","glosa_dashboard_access","glosa_motivos_dashboard_access","glosa_motivos_records",
        "glosa_motivos_uploads","glosa_rec_dashboard_access","glosa_rec_metas","glosa_rec_records",
        "glosa_rec_uploads","glosa_records","glosa_uploads","motivos_glosa","notifications","operadoras",
        "prazos_operadoras_records","prazos_operadoras_uploads","prazos_pagamento_dashboard_access",
        "profiles","setores","user_roles",
      ],
    };
  });

export const getTableSql = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ table: z.string().min(1).max(63).regex(/^[a-zA-Z0-9_]+$/) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: sql, error } = await supabaseAdmin.rpc("get_table_ddl" as any, { p_table: data.table });
    if (error) throw new Error(error.message);
    return { sql: (sql as unknown as string) ?? "" };
  });

export const exportData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      kind: z.enum(["table", "users", "storage", "edge_functions", "secrets", "logs", "appointments"]),
      table: z.string().max(63).regex(/^[a-zA-Z0-9_]+$/).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    if (data.kind === "table") {
      if (!data.table) throw new Error("Tabela não informada.");
      const { data: rows, error } = await (supabaseAdmin.from as any)(data.table).select("*").limit(100000);
      if (error) throw new Error(error.message);
      return { filename: `${data.table}.csv`, csv: toCSV(rows ?? []) };
    }

    if (data.kind === "appointments") {
      const { data: rows, error } = await supabaseAdmin.from("agendas_positivas").select("*").limit(100000);
      if (error) throw new Error(error.message);
      return { filename: "appointments.csv", csv: toCSV(rows ?? []) };
    }

    if (data.kind === "logs") {
      const { data: rows, error } = await supabaseAdmin
        .from("notifications").select("*").order("created_at", { ascending: false }).limit(50000);
      if (error) throw new Error(error.message);
      return { filename: "logs_notifications.csv", csv: toCSV(rows ?? []) };
    }

    if (data.kind === "users") {
      const all: Array<Record<string, unknown>> = [];
      let page = 1;
      while (true) {
        const { data: pageData, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw new Error(error.message);
        for (const u of pageData.users) {
          all.push({
            id: u.id,
            email: u.email,
            phone: u.phone,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            email_confirmed_at: u.email_confirmed_at,
            full_name: (u.user_metadata as any)?.full_name ?? "",
            providers: (u.app_metadata as any)?.providers?.join("|") ?? "",
          });
        }
        if (pageData.users.length < 1000) break;
        page++;
        if (page > 100) break;
      }
      return { filename: "users.csv", csv: toCSV(all) };
    }

    if (data.kind === "storage") {
      const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
      if (error) throw new Error(error.message);
      const rows: Array<Record<string, unknown>> = [];
      for (const b of buckets ?? []) {
        const { data: objs } = await supabaseAdmin.storage.from(b.name).list("", { limit: 10000, sortBy: { column: "name", order: "asc" } });
        for (const o of objs ?? []) {
          rows.push({
            bucket: b.name,
            public: b.public,
            name: o.name,
            id: o.id,
            size: (o.metadata as any)?.size ?? "",
            mimetype: (o.metadata as any)?.mimetype ?? "",
            updated_at: o.updated_at,
            created_at: o.created_at,
          });
        }
        if (!objs?.length) {
          rows.push({ bucket: b.name, public: b.public, name: "", id: "", size: "", mimetype: "", updated_at: "", created_at: "" });
        }
      }
      return { filename: "storage.csv", csv: toCSV(rows) };
    }

    if (data.kind === "edge_functions") {
      // Source code is not exportable via the runtime. Return metadata placeholder.
      return {
        filename: "edge_functions.csv",
        csv: toCSV([{ note: "O código-fonte das edge functions não está disponível em runtime. Exporte pelo repositório." }]),
      };
    }

    if (data.kind === "secrets") {
      // Names only — values are never returned for security.
      const names = [
        "SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_DB_URL","SUPABASE_PUBLISHABLE_KEY",
        "LOVABLE_API_KEY","ZG_BI_TOKEN","ZG_ID_CONSULTA","ZG_USUARIO","ZG_BI_USER","ZG_BI_PASSWORD","ZG_SENHA",
      ].filter((n) => !!process.env[n]);
      return { filename: "secrets.csv", csv: toCSV(names.map((name) => ({ name, value: "***hidden***" }))) };
    }

    throw new Error("Tipo de exportação inválido.");
  });
