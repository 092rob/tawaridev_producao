import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableFooter } from "@/components/ui/table";
import { CircleDollarSign, TrendingUp, Trophy, FileSpreadsheet, Filter, Eraser, X, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList, CartesianGrid, LineChart, Line, ReferenceLine } from "recharts";

export const Route = createFileRoute("/glosa-recuperada")({ component: Page, ssr: false });

const ALL = "__all";

interface Rec {
  id: string;
  convenio_nome: string | null;
  mes_pagamento: string | null;
  data_pagamento: string | null;
  dt_pgto_recurso: string | null;
  mes_pgto_recurso: string | null;
  tipo_guia: string | null;
  situacao_guia: string | null;
  glosa_submetida: number | null;
  glosa_recuperada: number | null;
  glosa_mantida: number | null;
  pendente_retorno: number | null;
  protocolo_envio: string | null;
  tipo_importacao: string | null;
  guia_recurso: string | null;
}

interface Meta { ano_mes: string; meta_valor: number }

function Page() { return <AppShell><Inner /></AppShell>; }
export function GlosaRecuperadaInner() { return <Inner />; }

function fmt(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pct(n: number) {
  if (!isFinite(n)) return "0,0%";
  return `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

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

function Inner() {
  const [convenio, setConvenio] = useState<string>(ALL);
  const [mes, setMes] = useState<string>(ALL);
  const [tipoImportacao, setTipoImportacao] = useState<string>(ALL);
  const [pgtoIni, setPgtoIni] = useState<Date | undefined>(undefined);
  const [pgtoFim, setPgtoFim] = useState<Date | undefined>(undefined);
  const [guiaRecurso, setGuiaRecurso] = useState<string>(ALL);
  const [expandedRanking, setExpandedRanking] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: lastUploadRaw } = useQuery({
    queryKey: ["glosa_rec_last_upload"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("glosa_rec_uploads")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.created_at as string | null ?? null;
    },
  });

  const { data: rows = [], isLoading: loading } = useQuery({
    queryKey: ["glosa_rec_records"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const PAGE = 1000;
      const all: Rec[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("glosa_rec_records")
          .select("id, convenio_nome, mes_pagamento, data_pagamento, dt_pgto_recurso, mes_pgto_recurso, tipo_guia, situacao_guia, glosa_submetida, glosa_recuperada, glosa_mantida, pendente_retorno, protocolo_envio, tipo_importacao, guia_recurso")
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error || !data) break;
        all.push(...(data as Rec[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
  });

  useEffect(() => {
    if (rows.length === 0) return;
    setPgtoIni((prev) => {
      if (prev) return prev;
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    setPgtoFim((prev) => {
      if (prev) return prev;
      const dates = rows.map((r) => r.dt_pgto_recurso).filter(Boolean) as string[];
      if (dates.length === 0) return prev;
      const maxDate = dates.reduce((a, b) => (a > b ? a : b));
      return parseISO(maxDate);
    });
  }, [rows]);

  const { data: metas = [] } = useQuery({
    queryKey: ["glosa_rec_metas"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("glosa_rec_metas").select("ano_mes, meta_valor");
      return (data ?? []) as Meta[];
    },
  });
  const metaByMonth = useMemo(() => {
    const m = new Map<string, number>();
    metas.forEach((x) => m.set(x.ano_mes, Number(x.meta_valor) || 0));
    return m;
  }, [metas]);

  const opt = (key: keyof Rec) => {
    const s = new Set<string>();
    rows.forEach((r) => { const v = r[key]; if (typeof v === "string" && v) s.add(v); });
    return Array.from(s).sort();
  };
  const convenios = useMemo(() => opt("convenio_nome"), [rows]);
  const meses = useMemo(() => opt("mes_pagamento"), [rows]);
  const tipoImportacoes = useMemo(() => opt("tipo_importacao"), [rows]);
  const guiasRecurso = useMemo(() => opt("guia_recurso"), [rows]);

  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const pgtoIniStr = pgtoIni ? toYMD(pgtoIni) : null;
  const pgtoFimStr = pgtoFim ? toYMD(pgtoFim) : null;

  const filtered = useMemo(() => rows.filter((r) => {
    if (convenio !== ALL && r.convenio_nome !== convenio) return false;
    if (mes !== ALL && r.mes_pagamento !== mes) return false;
    if (tipoImportacao !== ALL && r.tipo_importacao !== tipoImportacao) return false;
    if (guiaRecurso !== ALL && r.guia_recurso !== guiaRecurso) return false;
    if (pgtoIniStr || pgtoFimStr) {
      const d = r.dt_pgto_recurso;
      if (!d) return false;
      if (pgtoIniStr && d < pgtoIniStr) return false;
      if (pgtoFimStr && d > pgtoFimStr) return false;
    }
    return true;
  }), [rows, convenio, mes, tipoImportacao, pgtoIniStr, pgtoFimStr]);

  const kpi = useMemo(() => {
    let submetida = 0, recuperada = 0, mantida = 0, pendente = 0;
    for (const r of filtered) {
      submetida += Number(r.glosa_submetida) || 0;
      recuperada += Number(r.glosa_recuperada) || 0;
      mantida += Number(r.glosa_mantida) || 0;
      pendente += Number(r.pendente_retorno) || 0;
    }
    const taxa = submetida > 0 ? recuperada / submetida : 0;
    return { submetida, recuperada, mantida, pendente, taxa };
  }, [filtered]);

  // Evolução mensal e meta vs realizado
  const monthly = useMemo(() => {
    const map = new Map<string, { mes: string; submetida: number; recuperada: number }>();
    for (const r of filtered) {
      const k = r.mes_pagamento;
      if (!k) continue;
      const e = map.get(k) ?? { mes: k, submetida: 0, recuperada: 0 };
      e.submetida += Number(r.glosa_submetida) || 0;
      e.recuperada += Number(r.glosa_recuperada) || 0;
      map.set(k, e);
    }
    return Array.from(map.values())
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map((m) => ({ ...m, meta: metaByMonth.get(m.mes) ?? 0 }));
  }, [filtered, metaByMonth]);

  // Progressão diária de Glosa Recuperada — apenas quando o período filtrado for < 30 dias
  const dailyRecuperada = useMemo(() => {
    if (!pgtoIni || !pgtoFim) return { show: false, data: [] as { dia: string; recuperada: number; acumulado: number }[] };
    const msDay = 86_400_000;
    const spanDays = Math.floor((pgtoFim.getTime() - pgtoIni.getTime()) / msDay) + 1;
    if (spanDays <= 0 || spanDays >= 30) return { show: false, data: [] };
    const map = new Map<string, number>();
    for (const r of filtered) {
      if (!r.dt_pgto_recurso) continue;
      const k = r.dt_pgto_recurso.slice(0, 10);
      map.set(k, (map.get(k) ?? 0) + (Number(r.glosa_recuperada) || 0));
    }
    const data: { dia: string; recuperada: number; acumulado: number }[] = [];
    let acc = 0;
    for (let i = 0; i < spanDays; i++) {
      const d = new Date(pgtoIni.getTime() + i * msDay);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const v = map.get(ymd) ?? 0;
      acc += v;
      data.push({ dia: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, recuperada: v, acumulado: acc });
    }
    return { show: true, data };
  }, [filtered, pgtoIni, pgtoFim]);

  // Ranking por convênio agrupado por mês
  const ranking = useMemo(() => {
    type MonthAgg = { mes: string; submetida: number; recuperada: number; mantida: number };
    type ConvAgg = { convenio: string; submetida: number; recuperada: number; mantida: number; meses: Map<string, MonthAgg> };
    
    const map = new Map<string, ConvAgg>();
    for (const r of filtered) {
      const k = r.convenio_nome ?? "(Sem convênio)";
      const m = r.mes_pagamento ?? "(Sem mês)";
      
      const e = map.get(k) ?? { convenio: k, submetida: 0, recuperada: 0, mantida: 0, meses: new Map() };
      e.submetida += Number(r.glosa_submetida) || 0;
      e.recuperada += Number(r.glosa_recuperada) || 0;
      e.mantida += Number(r.glosa_mantida) || 0;
      
      const me = e.meses.get(m) ?? { mes: m, submetida: 0, recuperada: 0, mantida: 0 };
      me.submetida += Number(r.glosa_submetida) || 0;
      me.recuperada += Number(r.glosa_recuperada) || 0;
      me.mantida += Number(r.glosa_mantida) || 0;
      e.meses.set(m, me);
      
      map.set(k, e);
    }
    
    return Array.from(map.values())
      .map(c => ({
        ...c,
        mesesArr: Array.from(c.meses.values()).sort((a, b) => mesSortKey(a.mes).localeCompare(mesSortKey(b.mes)))
      }))
      .sort((a, b) => b.recuperada - a.recuperada);
  }, [filtered]);

  // Metas fixas vindas do banco de dados
  const META_INDIVIDUAL = metaByMonth.get("individual") || 700000;
  const META_COLETIVA = metaByMonth.get("coletiva") || 1000000;

  const hasAnyFilter = convenio !== ALL || mes !== ALL || tipoImportacao !== ALL || guiaRecurso !== ALL || !!pgtoIni || !!pgtoFim;
  const clearAll = () => { setConvenio(ALL); setMes(ALL); setTipoImportacao(ALL); setGuiaRecurso(ALL); setPgtoIni(undefined); setPgtoFim(undefined); };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center">
        <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-semibold">Sem dados de Glosa Recuperada</h2>
        <p className="text-sm text-muted-foreground">Solicite ao administrador o upload da planilha.</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      <header>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0" />
          <span className="truncate">Glosa Recuperada</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {lastUploadRaw ? `Dados atualizados em ${format(parseISO(lastUploadRaw), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}` : ""}
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
                  Esta dashboard utiliza os seguintes campos da tabela <code className="bg-muted px-1 rounded">glosa_rec_records</code>:
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm max-h-[60vh] overflow-auto pr-2">
                <div className="space-y-2">
                  <h4 className="font-semibold border-b pb-1">Identificação e Contexto</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><code className="text-primary">convenio_nome</code>: Nome do convênio</li>
                    <li><code className="text-primary">mes_pagamento</code>: Mês de pagamento (competência)</li>
                    <li><code className="text-primary">guia_recurso</code>: Número da guia de recurso</li>
                    <li><code className="text-primary">protocolo_envio</code>: Protocolo de envio</li>
                    <li><code className="text-primary">tipo_guia</code>: Categoria da guia</li>
                    <li><code className="text-primary">situacao_guia</code>: Status atual da guia</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold border-b pb-1">Datas e Origem</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><code className="text-primary">dt_pgto_recurso</code>: Data de pagamento do recurso</li>
                    <li><code className="text-primary">mes_pgto_recurso</code>: Mês de pagamento do recurso</li>
                    <li><code className="text-primary">tipo_importacao</code>: Origem dos dados</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold border-b pb-1">Valores Financeiros</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><code className="text-primary">glosa_submetida</code>: Valor total glosado</li>
                    <li><code className="text-primary">glosa_recuperada</code>: Valor efetivamente recuperado</li>
                    <li><code className="text-primary">glosa_mantida</code>: Valor perdido definitivamente</li>
                    <li><code className="text-primary">pendente_retorno</code>: Valor ainda em análise</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold border-b pb-1">Metas (Tabela: glosa_rec_metas)</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><code className="text-primary">meta_valor</code>: Valor da meta mensal</li>
                    <li><code className="text-primary">ano_mes</code>: Período da meta</li>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
              <div className="md:col-span-2 lg:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Dt. Pgto. Recurso</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <DateField value={pgtoIni} onChange={setPgtoIni} />
                  <span className="hidden sm:inline text-muted-foreground">—</span>
                  <DateField value={pgtoFim} onChange={setPgtoFim} />
                </div>
              </div>
              <FilterSelect label="Convênio" value={convenio} onChange={setConvenio} options={convenios} placeholder="Todos convênios" />
              <FilterSelect label="Mês Pgto." value={mes} onChange={setMes} options={meses} placeholder="Todos meses" />
              <FilterSelect label="Tipo Importação" value={tipoImportacao} onChange={setTipoImportacao} options={tipoImportacoes} placeholder="Todos tipos" />
              <FilterSelect label="Guia de Recurso" value={guiaRecurso} onChange={setGuiaRecurso} options={guiasRecurso} placeholder="Todos" />
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Filtros ativos:</span>
          {convenio !== ALL && <Pill label={`Convênio: ${convenio}`} onClear={() => setConvenio(ALL)} />}
          {mes !== ALL && <Pill label={`Mês: ${mes}`} onClear={() => setMes(ALL)} />}
          {tipoImportacao !== ALL && <Pill label={`Tipo: ${tipoImportacao}`} onClear={() => setTipoImportacao(ALL)} />}
          {guiaRecurso !== ALL && <Pill label={`Guia de Recurso: ${guiaRecurso}`} onClear={() => setGuiaRecurso(ALL)} />}
          {pgtoIni && <Pill label={`Pgto. Recurso ≥ ${format(pgtoIni, "dd/MM/yyyy")}`} onClear={() => setPgtoIni(undefined)} />}
          {pgtoFim && <Pill label={`Pgto. Recurso ≤ ${format(pgtoFim, "dd/MM/yyyy")}`} onClear={() => setPgtoFim(undefined)} />}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <KpiCard title="Glosa Submetida" value={fmt(kpi.submetida)} icon={<FileSpreadsheet className="h-5 w-5" />} />
        <KpiCard title="Glosa Recuperada" value={fmt(kpi.recuperada)} icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} accent="emerald" />
        <KpiCard title="% Recuperação" value={pct(kpi.taxa)} icon={<Trophy className="h-5 w-5 text-primary" />} />
        <MetaCard label="Meta Individual" meta={META_INDIVIDUAL} realizado={kpi.recuperada} />
        <MetaCard label="Meta Coletiva" meta={META_COLETIVA} realizado={kpi.recuperada} />
      </div>

      {/* Ranking por convênio */}
      {ranking.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Ranking de Recuperação por Convênio</h2>
          <div className="w-full" style={{ height: Math.max(280, ranking.length * 34) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ranking.slice(0, 20)} layout="vertical" margin={{ top: 8, right: 64, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} horizontal={false} />
                <XAxis type="number" fontSize={13} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <YAxis dataKey="convenio" type="category" width={160} fontSize={13} interval={0} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="recuperada" name="Recuperada" fill="#22c55e" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="recuperada" position="right" formatter={(v: number) => fmt(v)} style={{ fontSize: 12 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Progressão diária de Glosa Recuperada (quando período filtrado < 30 dias) */}
      {dailyRecuperada.show && dailyRecuperada.data.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Progressão diária — Glosa Recuperada</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyRecuperada.data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="dia" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="recuperada" name="Recuperada (dia)" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Tabela detalhada por convênio */}
      <Card className="p-4">
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" /> Detalhado por convênio
          </h2>
          {ranking.length > 0 && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setExpandedRanking(new Set(ranking.map(r => r.convenio)))}>
                Expandir tudo
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setExpandedRanking(new Set())}>
                Recolher tudo
              </Button>
            </div>
          )}
        </div>
        
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Convênio / Mês</TableHead>
                <TableHead className="text-right">Submetida</TableHead>
                <TableHead className="text-right">Recuperada</TableHead>
                <TableHead className="text-right">Mantida</TableHead>
                <TableHead className="text-right">% Recup.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Sem dados para os filtros selecionados.</TableCell>
                </TableRow>
              ) : (
                ranking.flatMap((r) => {
                  const isOpen = expandedRanking.has(r.convenio);
                  const taxa = r.submetida > 0 ? r.recuperada / r.submetida : 0;
                  
                  const toggleRow = () => {
                    const next = new Set(expandedRanking);
                    if (next.has(r.convenio)) next.delete(r.convenio);
                    else next.add(r.convenio);
                    setExpandedRanking(next);
                  };

                  const parent = (
                    <TableRow key={r.convenio} className="cursor-pointer hover:bg-muted/30" onClick={toggleRow}>
                      <TableCell className="w-10 py-2">
                        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {r.convenio}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">({r.mesesArr.length} {r.mesesArr.length === 1 ? "mês" : "meses"})</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(r.submetida)}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-semibold tabular-nums">{fmt(r.recuperada)}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">{fmt(r.mantida)}</TableCell>
                      <TableCell className="text-right font-medium">{pct(taxa)}</TableCell>
                    </TableRow>
                  );

                  if (!isOpen) return [parent];

                  const children = r.mesesArr.map((m) => {
                    const mTaxa = m.submetida > 0 ? m.recuperada / m.submetida : 0;
                    return (
                      <TableRow key={`${r.convenio}-${m.mes}`} className="bg-muted/10 border-l-2 border-l-primary/30">
                        <TableCell className="w-10"></TableCell>
                        <TableCell className="pl-10 text-sm text-muted-foreground whitespace-nowrap">{m.mes}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{fmt(m.submetida)}</TableCell>
                        <TableCell className="text-right text-sm text-emerald-600 font-medium tabular-nums">{fmt(m.recuperada)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{fmt(m.mantida)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{pct(mTaxa)}</TableCell>
                      </TableRow>
                    );
                  });

                  return [parent, ...children];
                })
              )}
            </TableBody>
            <TableFooter className="bg-muted/30">
              <TableRow>
                <TableCell className="w-10"></TableCell>
                <TableCell className="font-semibold">Total Geral</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{fmt(kpi.submetida)}</TableCell>
                <TableCell className="text-right font-semibold text-emerald-600 tabular-nums">{fmt(kpi.recuperada)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{fmt(kpi.mantida)}</TableCell>
                <TableCell className="text-right font-semibold">{pct(kpi.taxa)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{placeholder}</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function DateField({ label, value, onChange }: { label?: string; value: Date | undefined; onChange: (d: Date | undefined) => void }) {
  return (
    <div className="w-full">
      {label && <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd/MM/yyyy") : <span>Selecionar data</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className={cn("p-3 pointer-events-auto")} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Pill({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      {label}
      <button onClick={onClear} className="ml-1 rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
    </Badge>
  );
}

function KpiCard({ title, value, icon, accent }: { title: string; value: string; icon?: React.ReactNode; accent?: "emerald" }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
        <div className={cn("text-muted-foreground", accent === "emerald" && "text-emerald-500")}>{icon}</div>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </Card>
  );
}

function MetaCard({ label, meta, realizado }: { label: string; meta: number; realizado: number }) {
  const atingimento = meta > 0 ? realizado / meta : 0;
  const batida = realizado >= meta;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        {batida ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-amber-500" />}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{pct(atingimento)}</div>
      <div className="text-xs text-muted-foreground">{fmt(realizado)} de {fmt(meta)}</div>
      <Progress value={Math.min(100, atingimento * 100)} className="mt-2 h-2" />
      <div className={cn("mt-2 text-xs font-medium", batida ? "text-emerald-600" : "text-muted-foreground")}>
        {batida ? "Meta batida 🎉" : `Faltam ${fmt(Math.max(0, meta - realizado))}`}
      </div>
    </Card>
  );
}
