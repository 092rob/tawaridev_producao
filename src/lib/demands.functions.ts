import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listDemandResponsibles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data: demands, error: dErr } = await supabaseAdmin
      .from("agendas_positivas")
      .select("responsible_id")
      .not("responsible_id", "is", null);
    if (dErr) throw new Error(dErr.message);

    const ids = Array.from(
      new Set((demands ?? []).map((d) => d.responsible_id).filter(Boolean) as string[])
    );
    if (ids.length === 0) return [];

    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, login")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);

    return (profiles ?? [])
      .map((p) => ({ id: p.id, full_name: p.full_name, login: p.login }))
      .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  });

export const listDemandAnnotations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { demandId: string }) => data)
  .handler(async ({ data }) => {
    const { data: annotations, error } = await supabaseAdmin
      .from("demand_annotations")
      .select("id, content, created_at, user_id, demand_id")
      .eq("demand_id", data.demandId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = Array.from(
      new Set((annotations ?? []).map((a) => a.user_id).filter(Boolean) as string[])
    );

    let profilesMap = new Map<string, { full_name: string | null; login: string | null }>();
    if (ids.length > 0) {
      const { data: profiles, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, login")
        .in("id", ids);
      if (pErr) throw new Error(pErr.message);
      profilesMap = new Map((profiles ?? []).map((p) => [p.id, { full_name: p.full_name, login: p.login }]));
    }

    return (annotations ?? []).map((a) => ({
      ...a,
      user: profilesMap.get(a.user_id) ?? null,
    }));
  });
