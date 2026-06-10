import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { getGlosaAnalystProfiles } from "@/lib/glosa.functions";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Trophy, FileSpreadsheet, Filter, CalendarIcon, Eraser, ClipboardList, Undo2, XCircle, X, Receipt, BarChart3, Medal, Crown, Award, ArrowUp, ArrowDown, ArrowUpDown, Table as TableIcon, User as UserIcon, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableFooter } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList, CartesianGrid, PieChart, Pie, Cell } from "recharts";

// Mapeia o valor do campo `usuario_analise` (raw) para o id do profile no banco.
// "Zero Glosa (ZG)" não tem profile e é apresentado apenas como "Zero Glosa".
const USER_PROFILE_MAP: globalThis.Record<string, string | null> = {
  "Stefany Sarah Ferreira Silva": "1231417b-7e27-448d-8969-a5db687fcbaa",
  "Rafael de Souza Batista": "7b839e41-53ba-429e-ae27-68a19204659b",
  "Vanessa Paes da Silva Pinheiro": "e05b81b1-9619-464b-819a-9b8028cb49fb",
  "Marcela Leite Monteiro": "05a08225-45d9-4307-8d8a-5a5eef744251",
  "Roberto Rodrigues da Costa": "5cbed258-848a-4e68-b69f-ac33548b5240",
  "bisantajulia2": "5cbed258-848a-4e68-b69f-ac33548b5240",
  "Zero Glosa (ZG)": null,
};
const USER_OVERRIDE_NAME: globalThis.Record<string, string> = {
  "Zero Glosa (ZG)": "Zero Glosa",
};

type UserInfo = { name: string; avatar: string | null; profileId: string | null };

// Cores por id de profile (com fallback por nome de exibição p/ "Zero Glosa").
const USER_COLORS: globalThis.Record<string, string> = {
  "1231417b-7e27-448d-8969-a5db687fcbaa": "#ec4899", // Stefany — rosa
  "7b839e41-53ba-429e-ae27-68a19204659b": "#9ca3af", // Rafael — cinza
  "e05b81b1-9619-464b-819a-9b8028cb49fb": "#22c55e", // Vanessa — verde
  "05a08225-45d9-4307-8d8a-5a5eef744251": "#a855f7", // Marcela — roxo
  "d27b0a27-b3dc-4854-bc29-6654e8084b35": "#3b82f6", // Roberto Costa — azul
  "5cbed258-848a-4e68-b69f-ac33548b5240": "#3b82f6", // Roberto Rodrigues — azul
};
const ZERO_GLOSA_COLOR = "#ef4444";
const FALLBACK_COLOR = "#64748b";
function colorFor(profileId: string | null, name: string): string {
  if (profileId && USER_COLORS[profileId]) return USER_COLORS[profileId];
  if (name?.toLowerCase().includes("zero glosa")) return ZERO_GLOSA_COLOR;
  return FALLBACK_COLOR;
}


export const Route = createFileRoute("/glosa-ranking")({ component: GlosaRankingPage, ssr: false });

interface Record {
  id: string;
  convenio_nome: string | null;
  mes_pagamento: string | null;
  usuario_analise: string | null;
  guia_recurso: string | null;
  data_analise: string | null;
  analise_glosa_aceita: number | null;
  analise_glosa_recursada: number | null;
  analise_soma_aceites_recursos: number | null;
  glosa_submetida: number | null;
  tipo_importacao: string | null;
  protocolo_envio_recurso_item: string | null;
}

function GlosaRankingPage() {
  return <AppShell><Inner /></AppShell>;
}

function fmt(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function GlosaRankingInner() { return <Inner />; }

const ALL = "__all";

function Inner() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(new Date(now.getFullYear(), now.getMonth(), 1));
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [convenio, setConvenio] = useState<string>(ALL);
  const [mes, setMes] = useState<string>(ALL);
  const [usuario, setUsuario] = useState<string>(ALL);
  const [recurso, setRecurso] = useState<string>(ALL);
  const [tipoImportacao, setTipoImportacao] = useState<string>(ALL);
  const [protocolo, setProtocolo] = useState<string>(ALL);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Busca a data mais recente de data_analise para usar como padrão no filtro "até"
  const { data: maxDateRaw } = useQuery({
    queryKey: ["glosa_max_data_analise"],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("glosa_records")
        .select("data_analise")
        .not("data_analise", "is", null)
        .order("data_analise", { ascending: false })
        .limit(1)
        .single();
      if (error || !data) return null;
      return data.data_analise as string | null;
    },
  });

  // Busca a data/hora da última importação de dados (glosa_uploads)
  const { data: lastUploadRaw } = useQuery({
    queryKey: ["glosa_last_upload"],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("glosa_uploads")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error || !data) return null;
      return data.created_at as string | null;
    },
  });

  useEffect(() => {
    if (maxDateRaw && !dateTo) {
      setDateTo(parseISO(maxDateRaw));
    }
  }, [maxDateRaw, dateTo]);

  const fromIso = dateFrom ? format(dateFrom, "yyyy-MM-dd") : null;
  const toIso = dateTo ? format(dateTo, "yyyy-MM-dd") : null;

  const { data: rows = [], isLoading: loading } = useQuery({
    queryKey: ["glosa_records", fromIso, toIso],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const PAGE = 1000;
      const all: Record[] = [];
      let from = 0;
      while (true) {
        let q = supabase
          .from("glosa_records")
          .select("id, convenio_nome, mes_pagamento, usuario_analise, guia_recurso, data_analise, analise_glosa_aceita, analise_glosa_recursada, analise_soma_aceites_recursos, glosa_submetida, tipo_importacao, protocolo_envio_recurso_item")
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (fromIso) q = q.gte("data_analise", fromIso);
        if (toIso) q = q.lte("data_analise", toIso);
        const { data, error } = await q;
        if (error || !data) break;
        all.push(...(data as Record[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
  });

  const { data: profiles = {} } = useQuery({
    queryKey: ["glosa_profiles"],
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async () => {
      const ids = Array.from(new Set(Object.values(USER_PROFILE_MAP).filter((v): v is string => !!v)));
      const map: globalThis.Record<string, { name: string; avatar: string | null }> = {};
      if (ids.length === 0) return map;
      // Usa server function (admin) p/ contornar RLS e funcionar p/ clientes.
      const rows = await getGlosaAnalystProfiles({ data: { ids } });
      rows.forEach((p) => {
        map[p.id] = { name: p.full_name ?? "", avatar: p.avatar_url ?? null };
      });
      return map;
    },
  });


  const displayFor = useMemo(() => (raw: string | null | undefined): UserInfo => {
    const key = raw?.trim() ?? "";
    if (!key) return { name: "Sem usuário", avatar: null, profileId: null };
    const override = USER_OVERRIDE_NAME[key];
    const pid = USER_PROFILE_MAP[key] ?? null;
    if (pid && profiles[pid]) return { name: profiles[pid].name || override || key, avatar: profiles[pid].avatar, profileId: pid };
    return { name: override ?? key, avatar: null, profileId: pid };
  }, [profiles]);


  const opt = (key: keyof Record) => {
    const s = new Set<string>();
    rows.forEach((r) => { const v = r[key]; if (typeof v === "string" && v) s.add(v); });
    return Array.from(s).sort();
  };
  const convenios = useMemo(() => opt("convenio_nome"), [rows]);
  const meses = useMemo(() => opt("mes_pagamento"), [rows]);
  const usuarios = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.usuario_analise) s.add(displayFor(r.usuario_analise).name); });
    return Array.from(s).sort();
  }, [rows, displayFor]);
  const recursos = useMemo(() => opt("guia_recurso"), [rows]);
  const tipoImportacoes = useMemo(() => opt("tipo_importacao"), [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (convenio !== ALL && r.convenio_nome !== convenio) return false;
    if (mes !== ALL && r.mes_pagamento !== mes) return false;
    if (usuario !== ALL && displayFor(r.usuario_analise).name !== usuario) return false;
    if (recurso !== ALL && r.guia_recurso !== recurso) return false;
    if (tipoImportacao !== ALL && r.tipo_importacao !== tipoImportacao) return false;
    if (protocolo !== ALL) {
      const hasProto = !!(r.protocolo_envio_recurso_item && r.protocolo_envio_recurso_item.trim());
      if (protocolo === "com_protocolo" && !hasProto) return false;
      if (protocolo === "sem_protocolo" && hasProto) return false;
    }

    if (dateFrom || dateTo) {
      if (!r.data_analise) return false;
      const d = parseISO(r.data_analise);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
    }
    return true;
  }), [rows, convenio, mes, usuario, recurso, tipoImportacao, protocolo, dateFrom, dateTo]);

  const kpi = useMemo(() => {
    let analisada = 0, recursada = 0, acatada = 0, countAnalisada = 0;
    for (const r of filtered) {
      const valRecursada = Number(r.analise_glosa_recursada) || 0;
      const valAceita = Number(r.analise_glosa_aceita) || 0;
      const valAnalisada = valRecursada + valAceita;
      
      analisada += valAnalisada;
      if (valAnalisada > 0) countAnalisada += 1;
      recursada += valRecursada;
      acatada += valAceita;
    }
    const ticketMedio = countAnalisada > 0 ? analisada / countAnalisada : 0;
    return { analisada, recursada, acatada, countAnalisada, ticketMedio };
  }, [filtered]);

  const rankingData = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string | null; profileId: string | null; analisada: number; recursada: number; aceita: number }>();
    for (const r of filtered) {
      const info = displayFor(r.usuario_analise);
      const entry = map.get(info.name) ?? { name: info.name, avatar: info.avatar, profileId: info.profileId, analisada: 0, recursada: 0, aceita: 0 };
      
      const valRecursada = Number(r.analise_glosa_recursada) || 0;
      const valAceita = Number(r.analise_glosa_aceita) || 0;
      
      entry.avatar = entry.avatar ?? info.avatar;
      entry.profileId = entry.profileId ?? info.profileId;
      entry.recursada += valRecursada;
      entry.aceita += valAceita;
      entry.analisada += (valRecursada + valAceita);
      map.set(info.name, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.analisada - a.analisada);
  }, [filtered, displayFor]);


  const defaultDateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultDateTo = maxDateRaw ? parseISO(maxDateRaw) : new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const isDefaultPeriod =
    dateFrom?.getTime() === defaultDateFrom.getTime() &&
    dateTo?.getTime() === defaultDateTo.getTime();

  const hasAnyFilter =
    !isDefaultPeriod ||
    convenio !== ALL || mes !== ALL || usuario !== ALL || recurso !== ALL || tipoImportacao !== ALL || protocolo !== ALL;

  const clearAll = () => {
    setDateFrom(defaultDateFrom);
    setDateTo(defaultDateTo);
    setConvenio(ALL); setMes(ALL); setUsuario(ALL); setRecurso(ALL); setTipoImportacao(ALL); setProtocolo(ALL);
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center">
        <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-semibold">Sem dados de glosa</h2>
        <p className="text-sm text-muted-foreground">Solicite ao administrador o upload da planilha de análise de recursos.</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      <header>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Trophy className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0" />
          <span className="truncate">Ranking — Análise de Recursos de Glosa Hospitalar</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {lastUploadRaw
            ? `Dados atualizados em ${format(parseISO(lastUploadRaw), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
            : ""}
        </p>
        <div className="pt-2">
          <Dialog>
            <DialogTrigger asChild>
              <button className="text-[10px] uppercase font-bold text-primary hover:underline transition-all">
                Ver campos utilizados
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Campos do Banco de Dados</DialogTitle>
                <DialogDescription>
                  Esta dashboard utiliza os seguintes campos da tabela <code className="bg-muted px-1 rounded">glosa_records</code>:
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm max-h-[60vh] overflow-auto pr-2">
                <div className="space-y-2">
                  <h4 className="font-semibold border-b pb-1">Identificação e Contexto</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><code className="text-primary">convenio_nome</code>: Nome do convênio</li>
                    <li><code className="text-primary">mes_pagamento</code>: Mês de referência</li>
                    <li><code className="text-primary">usuario_analise</code>: Analista responsável</li>
                    <li><code className="text-primary">guia_recurso</code>: Número da guia</li>
                    <li><code className="text-primary">protocolo_envio_recurso_item</code>: Protocolo de envio</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold border-b pb-1">Datas e Tipos</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><code className="text-primary">data_analise</code>: Data da análise (base filtros)</li>
                    <li><code className="text-primary">tipo_importacao</code>: Origem dos dados</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold border-b pb-1">Valores Analisados</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><code className="text-primary">analise_glosa_aceita</code>: Valor de glosa aceita</li>
                    <li><code className="text-primary">analise_glosa_recursada</code>: Valor recursado</li>
                    <li><code className="text-primary">analise_soma_aceites_recursos</code>: Total analisado</li>
                    <li><code className="text-primary">glosa_submetida</code>: Valor total submetido</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Filtros */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card className="p-3 sm:p-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer select-none">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4 text-muted-foreground" /> Filtros
              </div>
              <div className="flex items-center gap-2">
                {hasAnyFilter && (
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); clearAll(); }}>
                    <Eraser className="mr-1 h-4 w-4" /> Limpar
                  </Button>
                )}
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", filtersOpen && "rotate-180")} />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              {/* Data Análise (intervalo) */}
              <div className="lg:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Data Análise</label>
                <div className="flex items-center gap-2">
                  <DateField value={dateFrom} onChange={setDateFrom} placeholder="dd/mm/aaaa" />
                  <span className="text-muted-foreground">—</span>
                  <DateField value={dateTo} onChange={setDateTo} placeholder="dd/mm/aaaa" />
                </div>
              </div>

              <FilterSelect label="Nome do Convênio" value={convenio} onChange={setConvenio} options={convenios} placeholder="Todos convênios" />
              <FilterSelect label="Mês Pgto." value={mes} onChange={setMes} options={meses} placeholder="Todos meses" />
              <FilterSelect label="Usuário Análise" value={usuario} onChange={setUsuario} options={usuarios} placeholder="Todos usuários" />
              <FilterSelect label="Reanalise" value={recurso} onChange={setRecurso} options={recursos} placeholder="Todos" />
              <FilterSelect label="Tipo Importação" value={tipoImportacao} onChange={setTipoImportacao} options={tipoImportacoes} placeholder="Todos tipos" />
              <FilterSelect
                label="Protocolo Envio"
                value={protocolo}
                onChange={setProtocolo}
                options={["com_protocolo", "sem_protocolo"]}
                optionLabels={{ com_protocolo: "Tem protocolo", sem_protocolo: "Sem protocolo" }}
                placeholder="Todos"
              />
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Filtros ativos */}
      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Filtros ativos:</span>
          {dateFrom && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Data de: {format(dateFrom, "dd/MM/yyyy")}
              <button onClick={() => setDateFrom(undefined)} className="ml-1 rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {dateTo && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Data até: {format(dateTo, "dd/MM/yyyy")}
              <button onClick={() => setDateTo(undefined)} className="ml-1 rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {convenio !== ALL && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Convênio: {convenio}
              <button onClick={() => setConvenio(ALL)} className="ml-1 rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {mes !== ALL && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Mês: {mes}
              <button onClick={() => setMes(ALL)} className="ml-1 rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {usuario !== ALL && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Usuário: {usuario}
              <button onClick={() => setUsuario(ALL)} className="ml-1 rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {recurso !== ALL && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Recurso: {recurso}
              <button onClick={() => setRecurso(ALL)} className="ml-1 rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {tipoImportacao !== ALL && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Tipo: {tipoImportacao}
              <button onClick={() => setTipoImportacao(ALL)} className="ml-1 rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {protocolo !== ALL && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Protocolo: {protocolo === "com_protocolo" ? "Tem protocolo" : "Sem protocolo"}
              <button onClick={() => setProtocolo(ALL)} className="ml-1 rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
            </Badge>
          )}
        </div>
      )}

      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Glosa total Analisada" value={fmt(kpi.analisada)} icon={<ClipboardList className="h-4 w-4" />} accent="text-emerald-500" />
        <Kpi label="Glosa total Recursada" value={fmt(kpi.recursada)} icon={<Undo2 className="h-4 w-4" />} accent="text-blue-500" />
        <Kpi label="Glosa total Acatada" value={fmt(kpi.acatada)} icon={<XCircle className="h-4 w-4" />} accent="text-primary" />
        <Kpi label="Ticket médio analise" value={fmt(kpi.ticketMedio)} icon={<Receipt className="h-4 w-4" />} accent="text-amber-500" />
      </div>

      {/* Pódio + Distribuição percentual lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <PodiumCard data={rankingData} />
        <AnalystPieChart data={rankingData} />
      </div>

      {/* Ranking por Usuário Análise */}
      <Card className="p-3 sm:p-4 overflow-hidden">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Recurso por Analista
        </div>
        <RankingChart data={rankingData} />
      </Card>


      {/* Tabela de Resumo de Recursos agrupada */}
      <ResumoRecursosTable rows={filtered} />
    </div>
  );
}

type SortKey = "convenio_nome" | "analise_glosa_recursada" | "analise_glosa_aceita" | "analise_glosa_analisada";

function mesSortKey(mes: string): string {
  const ymd = mes.match(/^(\d{4})-(\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}`;
  const mY = mes.match(/^(\d{1,2})\/(\d{4})/);
  if (mY) return `${mY[2]}-${mY[1].padStart(2, "0")}`;
  const names: globalThis.Record<string, string> = {
    janeiro: "01", fevereiro: "02", marco: "03", "março": "03", abril: "04",
    maio: "05", junho: "06", julho: "07", agosto: "08", setembro: "09",
    outubro: "10", novembro: "11", dezembro: "12",
  };
  const nm = mes.toLowerCase().match(/^([a-zçãéê]+)[\s\/-]+(\d{4})/);
  if (nm && names[nm[1]]) return `${nm[2]}-${names[nm[1]]}`;
  return mes;
}

function ResumoRecursosTable({ rows }: { rows: Record[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("analise_glosa_recursada");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    type MesAgg = { recursada: number; aceita: number; analisada: number; recursos: Set<string>; tipos: Set<string> };
    type ConvAgg = {
      convenio_nome: string;
      recursada: number;
      aceita: number;
      analisada: number;
      recursos: Set<string>;
      tipos: Set<string>;
      meses: Map<string, MesAgg>;
    };
    const map = new Map<string, ConvAgg>();
    for (const r of rows) {
      const conv = r.convenio_nome?.trim() || "—";
      const mes = r.mes_pagamento?.trim() || "—";
      const valRecursada = Number(r.analise_glosa_recursada) || 0;
      const valAceita = Number(r.analise_glosa_aceita) || 0;
      const valAnalisada = valRecursada + valAceita;
      const rec = r.guia_recurso?.trim();
      const tip = r.tipo_importacao?.trim();
      const entry =
        map.get(conv) ?? { convenio_nome: conv, recursada: 0, aceita: 0, analisada: 0, recursos: new Set(), tipos: new Set(), meses: new Map() };
      entry.recursada += valRecursada;
      entry.aceita += valAceita;
      entry.analisada += valAnalisada;
      if (rec) entry.recursos.add(rec);
      if (tip) entry.tipos.add(tip);
      const mEntry = entry.meses.get(mes) ?? { recursada: 0, aceita: 0, analisada: 0, recursos: new Set(), tipos: new Set() };
      mEntry.recursada += valRecursada;
      mEntry.aceita += valAceita;
      mEntry.analisada += valAnalisada;
      if (rec) mEntry.recursos.add(rec);
      if (tip) mEntry.tipos.add(tip);
      entry.meses.set(mes, mEntry);
      map.set(conv, entry);
    }
    const sortStr = (s: Set<string>) => Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
    return Array.from(map.values()).map((g) => ({
      convenio_nome: g.convenio_nome,
      recursada: g.recursada,
      aceita: g.aceita,
      analisada: g.analisada,
      recursos: sortStr(g.recursos),
      tipos: sortStr(g.tipos),
      mesesArr: Array.from(g.meses.entries())
        .map(([mes, m]) => ({
          mes_pagamento: mes,
          recursada: m.recursada,
          aceita: m.aceita,
          analisada: m.analisada,
          recursos: sortStr(m.recursos),
          tipos: sortStr(m.tipos),
        }))
        .sort((a, b) => mesSortKey(a.mes_pagamento).localeCompare(mesSortKey(b.mes_pagamento))),
    }));
  }, [rows]);

  const sorted = useMemo(() => {
    const arr = [...grouped];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "analise_glosa_recursada") cmp = a.recursada - b.recursada;
      else if (sortKey === "analise_glosa_aceita") cmp = a.aceita - b.aceita;
      else if (sortKey === "analise_glosa_analisada") cmp = a.analisada - b.analisada;
      else cmp = a.convenio_nome.localeCompare(b.convenio_nome, "pt-BR", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [grouped, sortKey, sortDir]);

  const totalRecursada = useMemo(() => sorted.reduce((s, r) => s + r.recursada, 0), [sorted]);
  const totalAceita = useMemo(() => sorted.reduce((s, r) => s + r.aceita, 0), [sorted]);
  const totalAnalisada = useMemo(() => sorted.reduce((s, r) => s + r.analisada, 0), [sorted]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "convenio_nome" ? "asc" : "desc"); }
  };

  const toggleRow = (conv: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(conv)) next.delete(conv); else next.add(conv);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(sorted.map((g) => g.convenio_nome)));
  const collapseAll = () => setExpanded(new Set());

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (k !== sortKey) return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 opacity-50" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 inline h-3.5 w-3.5" />
      : <ArrowDown className="ml-1 inline h-3.5 w-3.5" />;
  };

  const HeaderCell = ({ k, children, align, className }: { k: SortKey; children: React.ReactNode; align?: "right"; className?: string }) => (
    <TableHead className={cn("select-none cursor-pointer hover:text-foreground whitespace-nowrap", align === "right" && "text-right", className)}
      onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center">{children}<SortIcon k={k} /></span>
    </TableHead>
  );

  return (
      <Card className="p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <TableIcon className="h-4 w-4 text-muted-foreground" />
          Resumo de Recursos
        </div>
        {sorted.length > 0 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={expandAll}>Expandir tudo</Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={collapseAll}>Recolher tudo</Button>
          </div>
        )}
      </div>
      <div className="rounded-md border border-border">
        <div className="max-h-[520px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <HeaderCell k="convenio_nome">Convênio / Mês Pgto.</HeaderCell>
                <TableHead className="whitespace-nowrap">Reanalise</TableHead>
                <TableHead className="whitespace-nowrap">Tipo Importação</TableHead>
                <HeaderCell k="analise_glosa_analisada" align="right">Glosa Analisada</HeaderCell>
                <HeaderCell k="analise_glosa_recursada" align="right">Glosa Recursada</HeaderCell>
                <HeaderCell k="analise_glosa_aceita" align="right">Glosa Aceita</HeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Sem dados.</TableCell></TableRow>
              ) : sorted.flatMap((g) => {
                const isOpen = expanded.has(g.convenio_nome);
                const recParent = g.recursos.join(", ") || "—";
                const tipParent = g.tipos.join(", ") || "—";
                const parent = (
                  <TableRow key={g.convenio_nome} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(g.convenio_nome)}>
                    <TableCell className="w-8 py-2">
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="font-medium max-w-[320px] truncate" title={g.convenio_nome}>
                      {g.convenio_nome}
                      <span className="ml-2 text-xs text-muted-foreground">({g.mesesArr.length} {g.mesesArr.length === 1 ? "mês" : "meses"})</span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm" title={recParent}>
                      {recParent}
                      {g.recursos.length > 1 && <span className="ml-1 text-xs text-muted-foreground">({g.recursos.length})</span>}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm" title={tipParent}>
                      {tipParent}
                      {g.tipos.length > 1 && <span className="ml-1 text-xs text-muted-foreground">({g.tipos.length})</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap font-semibold text-emerald-600">{fmt(g.analisada)}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap font-medium">{fmt(g.recursada)}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap font-medium text-primary">{fmt(g.aceita)}</TableCell>
                  </TableRow>
                );
                if (!isOpen) return [parent];
                const children = g.mesesArr.map((m) => {
                  const rec = m.recursos.join(", ") || "—";
                  const tip = m.tipos.join(", ") || "—";
                  return (
                    <TableRow key={`${g.convenio_nome}::${m.mes_pagamento}`} className="bg-muted/20">
                      <TableCell className="w-8"></TableCell>
                      <TableCell className="pl-10 text-sm text-muted-foreground whitespace-nowrap">{m.mes_pagamento}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={rec}>{rec}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={tip}>{tip}</TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap text-sm font-medium text-emerald-600/80">{fmt(m.analisada)}</TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap text-sm">{fmt(m.recursada)}</TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap text-sm text-primary">{fmt(m.aceita)}</TableCell>
                    </TableRow>
                  );
                });
                return [parent, ...children];
              })}
            </TableBody>
          </Table>
        </div>
        {sorted.length > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-3 sm:px-4 py-3 gap-2">
            <span className="text-xs sm:text-sm font-semibold">Total ({sorted.length.toLocaleString("pt-BR")} convênios)</span>
            <div className="flex gap-4">
              <span className="text-xs sm:text-sm font-bold tabular-nums text-emerald-600">{fmt(totalAnalisada)}</span>
              <span className="text-xs sm:text-sm font-semibold tabular-nums">{fmt(totalRecursada)}</span>
              <span className="text-xs sm:text-sm font-semibold tabular-nums text-primary">{fmt(totalAceita)}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function PodiumCard({ data }: { data: { name: string; avatar: string | null; analisada: number }[] }) {
  if (data.length === 0) return null;
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);
  // ordem visual: 2º, 1º, 3º
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = { 0: "h-28", 1: "h-40", 2: "h-20" } as const;
  const ranks: { [k: string]: number } = {};
  top3.forEach((u, i) => { ranks[u.name] = i + 1; });

  const podiumStyle = (rank: number) => {
    if (rank === 1) return { ring: "ring-amber-400/60", bg: "bg-gradient-to-b from-amber-300/20 to-amber-500/5", text: "text-amber-500", icon: <Crown className="h-5 w-5" /> };
    if (rank === 2) return { ring: "ring-slate-300/60", bg: "bg-gradient-to-b from-slate-200/20 to-slate-400/5", text: "text-slate-400", icon: <Medal className="h-5 w-5" /> };
    return { ring: "ring-orange-400/60", bg: "bg-gradient-to-b from-orange-300/20 to-orange-600/5", text: "text-orange-500", icon: <Award className="h-5 w-5" /> };
  };

  const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

  return (
    <Card className="p-4 sm:p-6 h-full flex flex-col">
      <div className="mb-4 sm:mb-6 flex items-center gap-2 text-sm font-medium">
        <Trophy className="h-4 w-4 text-amber-500" />
        Pódio Analistas
      </div>

      <div className="flex items-end justify-center gap-2 sm:gap-4 md:gap-8 mb-6 sm:mb-8">
        {podiumOrder.map((u) => {
          const rank = ranks[u.name];
          const s = podiumStyle(rank);
          const h = heights[(rank === 1 ? 1 : rank === 2 ? 0 : 2) as 0 | 1 | 2];
          const avatarSize = rank === 1 ? "h-16 w-16" : "h-14 w-14";
          return (
            <div key={u.name} className="flex flex-col items-center w-20 sm:w-32 md:w-40 min-w-0">
              <Avatar className={cn("mb-2 ring-2 ring-offset-2 ring-offset-background", avatarSize, s.ring)}>
                {u.avatar ? <AvatarImage src={u.avatar} alt={u.name} /> : null}
                <AvatarFallback className={cn("text-sm font-semibold", s.bg, s.text)}>
                  {u.avatar ? initials(u.name) : <UserIcon className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div className={cn("mb-1 flex h-7 w-7 items-center justify-center rounded-full ring-1", s.ring, s.text, s.bg)}>
                {s.icon}
              </div>
              <div className="text-center text-[11px] sm:text-sm font-medium truncate w-full" title={u.name}>{u.name}</div>
              <div className={cn("text-[10px] sm:text-xs font-semibold tabular-nums truncate w-full text-center", s.text)}>{fmt(u.analisada)}</div>
              <div className={cn("mt-2 w-full rounded-t-lg ring-1 ring-border flex items-start justify-center pt-2 text-2xl font-bold", h, s.bg, s.text)}>
                {rank}º
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Demais colocados</div>
          <ol className="divide-y divide-border">
            {rest.map((u, i) => (
              <li key={u.name} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
                    {i + 4}
                  </span>
                  <Avatar className="h-7 w-7 shrink-0">
                    {u.avatar ? <AvatarImage src={u.avatar} alt={u.name} /> : null}
                    <AvatarFallback className="text-[10px]">{initials(u.name)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate" title={u.name}>{u.name}</span>
                </div>
                <span className="font-medium tabular-nums text-foreground">{fmt(u.analisada)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}


function RankingChart({ data }: { data: { name: string; analisada: number; recursada: number; aceita: number }[] }) {
  const c1 = "var(--primary)";
  const c2 = "color-mix(in oklch, var(--primary) 55%, black)";
  const c3 = "color-mix(in oklch, var(--primary) 45%, oklch(0.65 0.18 40))";
  const height = Math.max(260, data.length * 85);
  const compact = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(".", ",")} Mi`
    : n >= 1_000 ? `${(n / 1_000).toFixed(0)} mil` : n.toLocaleString("pt-BR");

  if (data.length === 0) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Sem dados para o filtro selecionado.</div>;
  }

  return (
    <div style={{ width: "100%", height }} className="-mx-1 sm:mx-0">
      <ClientOnly fallback={<div className="h-full w-full animate-pulse rounded-md bg-muted/40" />}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 4, bottom: 8 }} barCategoryGap="22%" barGap={2} barSize={19}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={compact} stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis type="category" dataKey="name" width={90} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} interval={0} />
            <Tooltip
              cursor={{ fill: "color-mix(in oklch, var(--muted) 60%, transparent)" }}
              contentStyle={{
                background: "var(--popover)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--popover-foreground)", fontSize: 12,
              }}
              formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} iconType="circle" />
            <Bar dataKey="analisada" name="Glosa Analisada" fill={c1} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="analisada" content={SmartLabel} />
            </Bar>
            <Bar dataKey="recursada" name="Glosa Recursada" fill={c2} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="recursada" content={SmartLabel} />
            </Bar>
            <Bar dataKey="aceita" name="Glosa Aceita" fill={c3} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="aceita" content={SmartLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ClientOnly>
    </div>
  );
}

function SmartLabel(props: any) {
  const { x, y, width, height, value } = props;
  if (!value || value === 0) return null;

  const text = Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Estima largura do texto: ~6.2px por caractere para fonte 10px
  const textWidth = text.length * 6.2;
  const padding = 6;

  const fitsInside = width > textWidth + padding;
  const textX = fitsInside ? x + width - padding : x + width + padding;
  const textAnchor = fitsInside ? "end" : "start";
  const fill = fitsInside ? "var(--primary-foreground)" : "var(--foreground)";

  return (
    <text x={textX} y={y + height / 2} dy="0.35em" textAnchor={textAnchor} fill={fill} fontSize={12}>
      {text}
    </text>
  );
}

function FilterSelect({ label, value, onChange, options, placeholder, optionLabels }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder: string; optionLabels?: globalThis.Record<string, string>;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{placeholder}</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{optionLabels?.[o] ?? o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function DateField({ value, onChange, placeholder }: {
  value: Date | undefined; onChange: (d: Date | undefined) => void; placeholder: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("flex-1 justify-between font-normal", !value && "text-muted-foreground")}
        >
          {value ? format(value, "dd/MM/yyyy") : placeholder}
          <CalendarIcon className="ml-2 h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          locale={ptBR}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

function Kpi({ label, value, accent, icon }: { label: string; value: string; accent?: string; icon?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        {icon && <span className={accent}>{icon}</span>}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${accent ?? ""}`}>{value}</div>
    </Card>
  );
}

function AnalystPieChart({ data }: { data: { name: string; profileId: string | null; analisada: number }[] }) {
  const filtered = data.filter((d) => d.analisada > 0);
  const total = filtered.reduce((s, d) => s + d.analisada, 0);

  if (!filtered.length || total <= 0) {
    return (
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Percentual por Analista
        </div>
        <div className="text-sm text-muted-foreground">Sem dados para exibir.</div>
      </Card>
    );
  }

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        Percentual por Analista
      </div>
      <div className="grid grid-cols-1 gap-4 items-center flex-1">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={filtered}
                dataKey="analisada"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={2}
                stroke="hsl(var(--background))"
                strokeWidth={2}
                labelLine={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
                label={({ name, value }) => {
                  const pct = ((value / total) * 100).toFixed(1);
                  return `${pct}%`;
                }}
              >
                {filtered.map((entry) => (
                  <Cell key={entry.name} fill={colorFor(entry.profileId, entry.name)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, _name, item) => {
                  const pct = ((value / total) * 100).toFixed(1);
                  return [`${pct}% • ${value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, item?.payload?.name];
                }}
                contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mx-auto grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 justify-center w-full">
          {filtered.map((entry) => {
            const pct = (entry.analisada / total) * 100;
            return (
              <div key={entry.name} className="flex items-center gap-2 text-sm min-w-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colorFor(entry.profileId, entry.name) }} />
                <span className="truncate" title={entry.name}>{entry.name}</span>
                <span className="tabular-nums font-medium text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
