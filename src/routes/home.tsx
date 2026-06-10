import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, BarChart3, Trophy, CircleDollarSign, PieChart, Calculator, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/home")({ component: HomePage, ssr: false });

interface DashboardItem {
  id: string;
  title: string;
  description: string | null;
  isGlosa?: boolean;
  isGlosaRec?: boolean;
  isGlosaMotivos?: boolean;
  isCBHPM?: boolean;
  isPrazos?: boolean;
}

function HomePage() {
  return (
    <AppShell>
      <HomeInner />
    </AppShell>
  );
}

function HomeInner() {
  const { fullName, user, avatarUrl, role, session } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const displayName = fullName ?? user?.email ?? "Usuário";

  const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Manaus",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const formattedTime = timeFormatter.format(now);

  const { data: openDemandsCount, isLoading } = useQuery({
    queryKey: ["agendas-positivas", "open-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("agendas_positivas")
        .select("*", { count: "exact", head: true })
        .eq("responsible_id", user!.id)
        .eq("status", "Pendente");
      if (error) throw error;
      return count ?? 0;
    },
  });

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col px-6 pt-6">
      <div className="flex items-start justify-between gap-4">
        <Link to="/agendas-positivas" className="block">
          <Card className="transition-shadow hover:shadow-md w-[280px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Demandas em aberto
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-3xl font-bold tabular-nums">...</div>
              ) : openDemandsCount === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma demanda em aberto</p>
              ) : (
                <div className="text-3xl font-bold tabular-nums">
                  {openDemandsCount}
                </div>
              )}
              {!isLoading && openDemandsCount !== 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Agenda Positiva
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <div className="text-right space-y-4">
          <div className="flex items-center justify-end gap-3">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Bem-vindo, <span className="text-primary">{displayName}</span>
            </h1>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Foto do usuário"
                className="h-12 w-12 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary">
                <span className="text-primary font-bold text-lg">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <p className="text-xl tabular-nums tracking-tight">
            {formattedTime} <span className="text-muted-foreground text-base">(AMZ)</span>
          </p>
        </div>
      </div>

      <DashboardsSection role={role} userId={user?.id} sessionReady={!!session} />
    </div>
  );
}

function DashboardsSection({
  role,
  userId,
  sessionReady,
}: {
  role: string | null;
  userId: string | undefined;
  sessionReady: boolean;
}) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["home", "dashboards-list", role, userId],
    enabled: sessionReady,
    queryFn: async () => {
      const { data } = await supabase
        .from("dashboards")
        .select("id, title, description, embed_url")
        .order("created_at", { ascending: false });

      let hasGlosa = role === "admin";
      let hasGlosaRec = role === "admin";
      let hasGlosaMotivos = role === "admin";
      let hasPrazos = role === "admin";

      if (userId && role !== "admin") {
        const [{ count: c1 }, { count: c2 }, { count: c3 }, { count: c4 }] = await Promise.all([
          supabase
            .from("glosa_dashboard_access")
            .select("user_id", { head: true, count: "exact" })
            .eq("user_id", userId),
          supabase
            .from("glosa_rec_dashboard_access")
            .select("user_id", { head: true, count: "exact" })
            .eq("user_id", userId),
          supabase
            .from("glosa_motivos_dashboard_access")
            .select("user_id", { head: true, count: "exact" })
            .eq("user_id", userId),
          supabase
            .from("prazos_pagamento_dashboard_access")
            .select("user_id", { head: true, count: "exact" })
            .eq("user_id", userId),
        ]);
        hasGlosa = (c1 ?? 0) > 0;
        hasGlosaRec = (c2 ?? 0) > 0;
        hasGlosaMotivos = (c3 ?? 0) > 0;
        hasPrazos = (c4 ?? 0) > 0;
      }

      const list: DashboardItem[] = [];
      if (hasGlosa)
        list.push({
          id: "__glosa_ranking__",
          title: "Ranking Glosa",
          description: "Análise de recursos de glosa hospitalar",
          isGlosa: true,
        });
      if (hasGlosaRec)
        list.push({
          id: "__glosa_recuperada__",
          title: "Glosa Recuperada",
          description: "Acompanhamento de recuperação de glosa vs metas mensais",
          isGlosaRec: true,
        });
      if (hasGlosaMotivos)
        list.push({
          id: "__glosa_motivos__",
          title: "Glosa por Área",
          description: "Painel auto-gerado a partir das planilhas de motivos de glosa",
          isGlosaMotivos: true,
        });
      list.push({
        id: "__cbhpm__",
        title: "Calculadora CBHPM",
        description: "Cálculo de honorários médicos e custos operacionais",
        isCBHPM: true,
      });
      if (hasPrazos) {
        list.push({
          id: "prazos-pagamento",
          title: "Acompanhamento de Prazos",
          description: "Gestão de cronogramas e prazos de recursos",
          isPrazos: true,
        });
      }
      if (data) list.push(...data.map((d) => ({ id: d.id, title: d.title, description: d.description })));
      return list;
    },
  });

  const nativas = items.filter((d) => d.isGlosa || d.isGlosaRec || d.isGlosaMotivos || d.isPrazos);
  const funcionalidades = items.filter((d) => d.isCBHPM);
  const powerbi = items.filter((d) => !d.isGlosa && !d.isGlosaRec && !d.isGlosaMotivos && !d.isCBHPM && !d.isPrazos);

  const renderItem = (d: DashboardItem) => (
    <Link
      key={d.id}
      to={d.isCBHPM ? "/cbhpm" : d.isPrazos ? "/prazos-pagamento" : d.isGlosa ? "/glosa-ranking" : d.isGlosaRec ? "/glosa-recuperada" : d.isGlosaMotivos ? "/glosa-motivos" : "/dashboards"}
      className="block w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent/40"
    >
      <div className="flex items-start gap-2">
        {d.isGlosa ? (
          <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        ) : d.isGlosaRec ? (
          <CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        ) : d.isGlosaMotivos ? (
          <PieChart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        ) : d.isCBHPM ? (
          <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        ) : d.isPrazos ? (
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
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
    </Link>
  );

  return (
    <div className="mt-6 w-full max-w-md space-y-4 pt-2.5">
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando dashboards…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum dashboard disponível</div>
      ) : (
        <>
          {funcionalidades.length > 0 && (
            <div className="space-y-2">
              <div className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Funcionalidades
              </div>
              {funcionalidades.map(renderItem)}
            </div>
          )}
          {nativas.length > 0 && (
            <div className="space-y-2 pt-2">
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
      )}
    </div>
  );
}
