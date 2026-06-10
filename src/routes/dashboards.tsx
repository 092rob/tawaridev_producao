import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart3, ChevronLeft, ChevronRight, LayoutDashboard, Trophy, CircleDollarSign, PieChart, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { GlosaRankingInner } from "./glosa-ranking";
import { GlosaRecuperadaInner } from "./glosa-recuperada";
import { GlosaMotivosInner } from "./glosa-motivos";
import { PrazosPagamentoInner } from "./prazos-pagamento";

export const Route = createFileRoute("/dashboards")({ component: DashboardsPage, ssr: false });

interface Dashboard { id: string; title: string; description: string | null; embed_url: string; isGlosa?: boolean; isGlosaRec?: boolean; isGlosaMotivos?: boolean; isPrazos?: boolean; }

const GLOSA_ITEM: Dashboard = {
  id: "__glosa_ranking__",
  title: "Ranking Glosa",
  description: "Análise de recursos de glosa hospitalar",
  embed_url: "",
  isGlosa: true,
};
const GLOSA_REC_ITEM: Dashboard = {
  id: "__glosa_recuperada__",
  title: "Glosa Recuperada",
  description: "Acompanhamento de recuperação de glosa vs metas mensais",
  embed_url: "",
  isGlosaRec: true,
};
const GLOSA_MOTIVOS_ITEM: Dashboard = {
  id: "__glosa_motivos__",
  title: "Glosa por Área",
  description: "Painel auto-gerado a partir das planilhas de motivos de glosa",
  embed_url: "",
  isGlosaMotivos: true,
};
const PRAZOS_ITEM: Dashboard = {
  id: "prazos-pagamento",
  title: "Prazos de Pagamento",
  description: "Acompanhamento de conformidade de prazos das operadoras",
  embed_url: "",
  isPrazos: true,
};



function DashboardsPage() {
  return (
    <AppShell>
      <DashboardsInner />
    </AppShell>
  );
}

function DashboardsInner() {
  const { session, role, user } = useAuth();
  const [items, setItems] = useState<Dashboard[]>([]);
  const [selected, setSelected] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [listCollapsed, setListCollapsed] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data, error } = await supabase
        .from("dashboards")
        .select("id, title, description, embed_url")
        .order("created_at", { ascending: false });

      let hasGlosa = role === "admin";
      let hasGlosaRec = role === "admin";
      let hasGlosaMotivos = role === "admin";
      let hasPrazos = role === "admin";
      if (user?.id && role !== "admin") {
        const [{ count: c1 }, { count: c2 }, { count: c3 }, { count: c4 }] = await Promise.all([
          supabase.from("glosa_dashboard_access").select("user_id", { head: true, count: "exact" }).eq("user_id", user.id),
          supabase.from("glosa_rec_dashboard_access").select("user_id", { head: true, count: "exact" }).eq("user_id", user.id),
          supabase.from("glosa_motivos_dashboard_access").select("user_id", { head: true, count: "exact" }).eq("user_id", user.id),
          supabase.from("prazos_pagamento_dashboard_access").select("user_id", { head: true, count: "exact" }).eq("user_id", user.id),
        ]);
        hasGlosa = (c1 ?? 0) > 0;
        hasGlosaRec = (c2 ?? 0) > 0;
        hasGlosaMotivos = (c3 ?? 0) > 0;
        hasPrazos = (c4 ?? 0) > 0;
      }

      const list: Dashboard[] = [];
      if (hasGlosa) list.push(GLOSA_ITEM);
      if (hasGlosaRec) list.push(GLOSA_REC_ITEM);
      if (hasGlosaMotivos) list.push(GLOSA_MOTIVOS_ITEM);
      if (hasPrazos) list.push(PRAZOS_ITEM);
      if (!error && data) list.push(...data);


      setItems(list);
      setSelected((prev) => {
        if (prev && list.some((d) => d.id === prev.id)) return prev;
        return list[0] ?? null;
      });
      setLoading(false);
    })();
  }, [session, role, user?.id]);


  useEffect(() => {
    try { localStorage.setItem("dashboard-list-expanded-v2", String(!listCollapsed)); } catch { /* noop */ }
  }, [listCollapsed]);

  return (
    <div className="flex h-screen flex-col">
      <header className={`flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 sm:px-6 ${listCollapsed ? "py-2" : "py-4"}`}>
        <div className="min-w-0 flex-1">
          <h1 className={`font-semibold tracking-tight ${listCollapsed ? "text-base" : "text-xl"}`}>Meus Dashboards</h1>
          {!listCollapsed && (
            <p className="text-sm text-muted-foreground">Painéis Power BI liberados para sua conta</p>
          )}
        </div>
        {!loading && items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 self-center sm:self-start"
            onClick={() => setListCollapsed((c) => !c)}
            title={listCollapsed ? "Expandir lista" : "Recolher lista"}
            aria-label={listCollapsed ? "Expandir lista" : "Recolher lista"}
          >
            {listCollapsed ? (
              <>
                <ChevronRight className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Expandir lista</span>
              </>
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Recolher lista</span>
              </>
            )}
          </Button>
        )}
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-medium">Nenhum dashboard disponível</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Aguarde o administrador liberar dashboards para sua conta.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          <aside className={`shrink-0 border-r border-border overflow-y-auto p-3 space-y-2 lg:w-[280px] ${listCollapsed ? "hidden" : ""}`}>
            {(() => {
              const nativas = items.filter((d) => d.isGlosa || d.isGlosaRec || d.isGlosaMotivos || d.isPrazos);
              const powerbi = items.filter((d) => !d.isGlosa && !d.isGlosaRec && !d.isGlosaMotivos && !d.isPrazos);
              const renderItem = (d: Dashboard) => (
                <button
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selected?.id === d.id
                      ? "border-primary/50 bg-primary/10"
                      : "border-border hover:bg-accent/40"

                  }`}
                >
                  <div className="flex items-start gap-2">
                    {d.isGlosa ? (
                      <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : d.isGlosaRec ? (
                      <CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : d.isGlosaMotivos ? (
                      <PieChart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : d.isPrazos ? (
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    )}

                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{d.title}</div>
                      {d.description && (
                        <div className="line-clamp-2 text-xs text-muted-foreground">{d.description}</div>
                      )}
                    </div>
                  </div>
                </button>
              );

              return (
                <>
                  {nativas.length > 0 && (
                    <div className="space-y-2">
                      <div className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Dashboards nativas
                      </div>
                      {nativas.map(renderItem)}
                    </div>
                  )}
                  {powerbi.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Dashboards Power BI
                      </div>
                      {powerbi.map(renderItem)}
                    </div>
                  )}
                </>
              );
            })()}
          </aside>


          <section className="flex-1 overflow-auto p-4">
            {selected ? (
              selected.isGlosa ? (
                <GlosaRankingInner />
              ) : selected.isGlosaRec ? (
                <GlosaRecuperadaInner />
              ) : selected.isGlosaMotivos ? (
                <GlosaMotivosInner />
              ) : selected.isPrazos ? (
                <PrazosPagamentoInner />
              ) : (
                <Card className="h-full overflow-hidden p-0">
                  <iframe
                    key={selected.id}
                    title={selected.title}
                    src={selected.embed_url}
                    className="h-full w-full border-0"
                    allowFullScreen
                  />
                </Card>
              )

            ) : (

              <div className="flex h-full items-center justify-center text-muted-foreground">
                Selecione um dashboard
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
