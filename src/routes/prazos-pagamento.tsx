import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { format, parseISO, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Clock, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/prazos-pagamento")({
  component: () => (
    <AppShell>
      <PrazosPagamentoInner />
    </AppShell>
  ),
  ssr: false,
});

interface PrazosRow {
  operadora_nome: string | null;
  cod_operadora: string | null;
  data_pagamento: string | null;
  mes_pagamento: string | null;
  data_atendimento: string | null;
  data_envio_recurso: string | null;
  valor_faturado: number | null;
  valor_pago: number | null;
  glosa_submetida: number | null;
  glosa_recursada: number | null;
  glosa_aceita: number | null;
  guia_e_recurso: string | null;
  protocolo_convenio: string | number | null;
  protocolo_recurso: string | number | null;
}

interface OperadoraConfig {
  nome: string;
  cod_operadora: string | null;
  prazo_contratual_envio_recurso: number;
  prazo_ideal_envio_recurso: number;
}

const fmtBR = (n: number | null | undefined) => {
  if (n == null) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

type SortKey = "operadora_nome" | "valor_faturado" | "valor_pago" | "glosa_submetida";

export function PrazosPagamentoInner() {
  const [rows, setRows] = useState<PrazosRow[]>([]);
  const [operadorasConfig, setOperadorasConfig] = useState<Record<string, OperadoraConfig>>({});
  const [analistas, setAnalistas] = useState<{id: string; full_name: string; operadoras: string[]}[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  
  const [sortKey, setSortKey] = useState<SortKey>("operadora_nome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  
  // Filters
  const [filterMes, setFilterMes] = useState<string>("all");
  const [filterOperadora, setFilterOperadora] = useState<string>("all");
  const [filterTipoGuia, setFilterTipoGuia] = useState<string>("all");
  const [filterProtocoloRecurso, setFilterProtocoloRecurso] = useState<string>("all");
  const [filterAnalista, setFilterAnalista] = useState<string>("all");
  const [filterIgnoreAceite, setFilterIgnoreAceite] = useState(false);

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [startDate, setStartDate] = useState<string>(firstDayOfMonth.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(now.toISOString().split("T")[0]);

  const fetchOperadorasConfig = useCallback(async () => {
    const { data } = await supabase.from("operadoras").select("*");
    if (data) {
      const config: Record<string, OperadoraConfig> = {};
      data.forEach((o) => {
        if (o.cod_operadora) config[o.cod_operadora] = o as any;
      });
      setOperadorasConfig(config);
    }
  }, []);

  useEffect(() => {
    fetchOperadorasConfig();
    
    // Fetch analistas (profiles)
    const fetchAnalistas = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, operadoras_responsaveis")
        .order("full_name");
      if (data) {
        setAnalistas(data.map(p => ({
          id: p.id,
          full_name: p.full_name || "Sem Nome",
          operadoras: (p.operadoras_responsaveis as string[]) || []
        })));
      }
    };
    fetchAnalistas();
  }, [fetchOperadorasConfig]);

  const fetchData = async () => {
    setLoading(true);
    setLoadProgress(0);
    const allRows: PrazosRow[] = [];
    const pageSize = 1000;
    let from = 0;
    
    try {
      const { count, error: countError } = await supabase
        .from("prazos_operadoras_records")
        .select("*", { count: 'exact', head: true })
        .gte("data_pagamento", startDate)
        .lte("data_pagamento", endDate);

      if (countError) throw countError;
      const totalCount = count || 0;

      if (totalCount === 0) {
        setRows([]);
        setHasLoadedOnce(true);
        return;
      }

      while (from < totalCount) {
        const { data, error } = await supabase
          .from("prazos_operadoras_records")
          .select("operadora_nome, cod_operadora, data_pagamento, mes_pagamento, data_atendimento, data_envio_recurso, valor_faturado, valor_pago, glosa_submetida, glosa_recursada, glosa_aceita, guia_e_recurso, protocolo_convenio, protocolo_recurso")
          .gte("data_pagamento", startDate)
          .lte("data_pagamento", endDate)
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (data) {
          allRows.push(...(data as any[]));
          setLoadProgress(Math.min(99, Math.round((allRows.length / totalCount) * 100)));
        }
        from += pageSize;
      }
      
      setRows(allRows);
      setHasLoadedOnce(true);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setLoadProgress(100);
    }
  };

  const filteredRows = useMemo(() => {
    const selectedAnalista = analistas.find(a => a.id === filterAnalista);
    const restrictedOperadoras = selectedAnalista?.operadoras || [];

    return rows.filter(r => {
      if (filterMes !== "all" && r.mes_pagamento !== filterMes) return false;
      if (filterOperadora !== "all" && r.operadora_nome !== filterOperadora) return false;
      
      if (filterAnalista !== "all") {
        if (!r.cod_operadora || !restrictedOperadoras.includes(r.cod_operadora)) return false;
      }

      if (filterTipoGuia !== "all") {
        const isReanalise = r.guia_e_recurso?.toUpperCase() === "SIM";
        if (filterTipoGuia === "Reanálise" && !isReanalise) return false;
        if (filterTipoGuia === "1º Análise" && isReanalise) return false;
      }

      if (filterProtocoloRecurso !== "all") {
        const hasProtocolo = r.protocolo_recurso !== null && String(r.protocolo_recurso).trim() !== "";
        if (filterProtocoloRecurso === "Com protocolo" && !hasProtocolo) return false;
        if (filterProtocoloRecurso === "Sem protocolo" && hasProtocolo) return false;
      }

      if (filterIgnoreAceite && r.glosa_submetida === r.glosa_aceita) {
        return false;
      }

      return true;
    });
  }, [rows, filterMes, filterOperadora, filterTipoGuia, filterAnalista, filterProtocoloRecurso, filterIgnoreAceite, analistas]);

  const grouped = useMemo(() => {
    const map = new Map<string, {
      operadora_nome: string;
      cod_operadora: string;
      valor_faturado: number;
      valor_pago: number;
      glosa_submetida: number;
      glosa_recursada: number;
      glosa_aceita: number;
      meses: Map<string, {
        mes_pagamento: string;
        valor_faturado: number;
        valor_pago: number;
        glosa_submetida: number;
        glosa_recursada: number;
        glosa_aceita: number;
        detalhes: PrazosRow[];
      }>;
    }>();

    filteredRows.forEach(r => {
      const opName = r.operadora_nome?.trim() || "N/A";
      const cod = r.cod_operadora || "S/C";
      const mes = r.mes_pagamento || "N/A";

      const entry = map.get(opName) ?? {
        operadora_nome: opName,
        cod_operadora: cod,
        valor_faturado: 0,
        valor_pago: 0,
        glosa_submetida: 0,
        glosa_recursada: 0,
        glosa_aceita: 0,
        meses: new Map()
      };

      entry.valor_faturado += r.valor_faturado || 0;
      entry.valor_pago += r.valor_pago || 0;
      entry.glosa_submetida += r.glosa_submetida || 0;
      entry.glosa_recursada += r.glosa_recursada || 0;
      entry.glosa_aceita += r.glosa_aceita || 0;

      const mEntry = entry.meses.get(mes) ?? {
        mes_pagamento: mes,
        valor_faturado: 0,
        valor_pago: 0,
        glosa_submetida: 0,
        glosa_recursada: 0,
        glosa_aceita: 0,
        detalhes: []
      };

      mEntry.valor_faturado += r.valor_faturado || 0;
      mEntry.valor_pago += r.valor_pago || 0;
      mEntry.glosa_submetida += r.glosa_submetida || 0;
      mEntry.glosa_recursada += r.glosa_recursada || 0;
      mEntry.glosa_aceita += r.glosa_aceita || 0;
      mEntry.detalhes.push(r);

      entry.meses.set(mes, mEntry);
      map.set(opName, entry);
    });

    return Array.from(map.values()).map(g => ({
      ...g,
      mesesArr: Array.from(g.meses.values()).sort((a, b) => b.mes_pagamento.localeCompare(a.mes_pagamento))
    }));
  }, [filteredRows]);

  const sorted = useMemo(() => {
    const arr = [...grouped];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "valor_faturado") cmp = a.valor_faturado - b.valor_faturado;
      else if (sortKey === "valor_pago") cmp = a.valor_pago - b.valor_pago;
      else if (sortKey === "glosa_submetida") cmp = a.glosa_submetida - b.glosa_submetida;
      else cmp = a.operadora_nome.localeCompare(b.operadora_nome, "pt-BR");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [grouped, sortKey, sortDir]);

  const totals = useMemo(() => {
    return filteredRows.reduce((acc, curr) => {
      acc.valor_faturado += curr.valor_faturado || 0;
      acc.valor_pago += curr.valor_pago || 0;
      acc.glosa_submetida += curr.glosa_submetida || 0;
      acc.glosa_recursada += curr.glosa_recursada || 0;
      acc.glosa_aceita += curr.glosa_aceita || 0;
      return acc;
    }, {
      valor_faturado: 0,
      valor_pago: 0,
      glosa_submetida: 0,
      glosa_recursada: 0,
      glosa_aceita: 0
    });
  }, [filteredRows]);

  const trafficLightData = useMemo(() => {
    const today = new Date();
    const items: { operadora: string; mes: string; deadline: Date; daysDiff: number }[] = [];

    grouped.forEach(op => {
      const config = op.cod_operadora ? operadorasConfig[op.cod_operadora] : null;
      if (!config || !config.prazo_contratual_envio_recurso) return;

      op.mesesArr.forEach(m => {
        const firstRecord = m.detalhes[0];
        if (firstRecord?.data_pagamento) {
          try {
            const date = parseISO(firstRecord.data_pagamento);
            const deadline = addDays(date, config.prazo_contratual_envio_recurso);
            const daysDiff = differenceInDays(deadline, today);
            items.push({
              operadora: op.operadora_nome,
              mes: m.mes_pagamento,
              deadline,
              daysDiff
            });
          } catch (e) {
            console.error(e);
          }
        }
      });
    });

    const getTopUnique = (filtered: typeof items, sortDir: 'asc' | 'desc') => {
      const unique = new Map<string, typeof items[0]>();
      filtered.forEach(i => {
        const existing = unique.get(i.operadora);
        // Para o mesmo convênio em meses diferentes, pegamos o que vence primeiro (menor daysDiff)
        if (!existing || i.daysDiff < existing.daysDiff) {
          unique.set(i.operadora, i);
        }
      });
      return Array.from(unique.values())
        .sort((a, b) => sortDir === 'asc' ? a.daysDiff - b.daysDiff : b.daysDiff - a.daysDiff)
        .slice(0, 5);
    };

    return {
      red: getTopUnique(items.filter(i => i.daysDiff <= 5), 'asc'),
      yellow: getTopUnique(items.filter(i => i.daysDiff >= 6 && i.daysDiff <= 15), 'asc'),
      green: getTopUnique(items.filter(i => i.daysDiff >= 16), 'desc')
    };
  }, [grouped, operadorasConfig]);


  const uniqueMeses = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.mes_pagamento) set.add(r.mes_pagamento); });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const uniqueOperadoras = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.operadora_nome) set.add(r.operadora_nome); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [rows]);

  const glosaPendente = totals.glosa_submetida - (totals.glosa_recursada + totals.glosa_aceita);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "operadora_nome" ? "asc" : "desc"); }
  };

  const toggleRow = (op: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(op)) next.delete(op); else next.add(op);
      return next;
    });
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (k !== sortKey) return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="ml-1 inline h-3.5 w-3.5" /> : <ArrowDown className="ml-1 inline h-3.5 w-3.5" />;
  };

  const HeaderCell = ({ k, children, align }: { k: SortKey; children: React.ReactNode; align?: "right" }) => (
    <TableHead 
      className={cn("select-none cursor-pointer hover:text-foreground whitespace-nowrap", align === "right" && "text-right")}
      onClick={() => toggleSort(k)}
    >
      <span className="inline-flex items-center">{children}<SortIcon k={k} /></span>
    </TableHead>
  );

  const StatCard = ({ title, value, variant = "default" }: { title: string; value: number; variant?: "default" | "destructive" | "success" | "pending" }) => (
    <Card className="p-4 flex flex-col gap-1.5 border-l-4 border-l-primary">
      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{title}</span>
      <span className={cn(
        "text-xl font-bold",
        variant === "destructive" && "text-destructive",
        variant === "success" && "text-emerald-600",
        variant === "pending" && "text-amber-600"
      )}>
        {fmtBR(value)}
      </span>
    </Card>
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" /> Acompanhamento de Prazos
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumo aninhado de faturamentos e glosas por operadora e mês de pagamento.
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
                  Esta dashboard utiliza os seguintes campos das tabelas <code className="bg-muted px-1 rounded">prazos_operadoras_records</code> e <code className="bg-muted px-1 rounded">operadoras</code>:
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm max-h-[60vh] overflow-auto pr-2">
                <div className="space-y-2">
                  <h4 className="font-semibold border-b pb-1">Registros de Prazos</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><code className="text-primary">operadora_nome</code>: Nome da operadora</li>
                    <li><code className="text-primary">cod_operadora</code>: Código identificador da operadora</li>
                    <li><code className="text-primary">data_pagamento</code>: Data base para cálculo do prazo</li>
                    <li><code className="text-primary">mes_pagamento</code>: Mês de competência do pagamento</li>
                    <li><code className="text-primary">guia_e_recurso</code>: Identifica se é guia de reanálise</li>
                    <li><code className="text-primary">protocolo_recurso</code>: Número do protocolo de recurso</li>
                    <li><code className="text-primary">valor_faturado</code>: Valor total faturado</li>
                    <li><code className="text-primary">valor_pago</code>: Valor efetivamente pago</li>
                    <li><code className="text-primary">glosa_submetida</code>: Valor total de glosas</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold border-b pb-1">Configuração de Operadoras</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><code className="text-primary">prazo_contratual_envio_recurso</code>: Prazo em dias para envio</li>
                    <li><code className="text-primary">prazo_ideal_envio_recurso</code>: Prazo interno recomendado</li>
                  </ul>
                  <h4 className="font-semibold border-b pb-1 pt-2">Cálculos Utilizados</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><span className="font-medium text-foreground">Prazo de Envio:</span> <code className="text-primary">data_pagamento</code> + <code className="text-primary">prazo_contratual_envio_recurso</code></li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 w-fit">
            <span className="text-[10px] text-muted-foreground uppercase px-1 font-bold">Data Inicial</span>
            <Input type="date" className="w-[140px]" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1 w-fit">
            <span className="text-[10px] text-muted-foreground uppercase px-1 font-bold">Data Final</span>
            <Input type="date" className="w-[140px]" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <Button onClick={fetchData} disabled={loading} className="min-w-[120px]">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Carregar
          </Button>
        </div>

        {hasLoadedOnce && rows.length > 0 && (
          <div className="pt-4 border-t grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase px-1 font-bold">Mês de Pagamento</span>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={filterMes}
                onChange={(e) => setFilterMes(e.target.value)}
              >
                <option value="all">Todos os Meses</option>
                {uniqueMeses.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase px-1 font-bold">Operadora</span>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={filterOperadora}
                onChange={(e) => setFilterOperadora(e.target.value)}
              >
                <option value="all">Todas as Operadoras</option>
                {uniqueOperadoras.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase px-1 font-bold">Tipo de Guia</span>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={filterTipoGuia}
                onChange={(e) => setFilterTipoGuia(e.target.value)}
              >
                <option value="all">Todos os Tipos</option>
                <option value="Reanálise">Reanálise</option>
                <option value="1º Análise">1º Análise</option>
              </select>
            </div>


            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase px-1 font-bold">Operadoras Analista</span>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={filterAnalista}
                onChange={(e) => setFilterAnalista(e.target.value)}
              >
                <option value="all">Todos os Analistas</option>
                {analistas.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase px-1 font-bold">Protocolo Recurso</span>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={filterProtocoloRecurso}
                onChange={(e) => setFilterProtocoloRecurso(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="Com protocolo">Com protocolo</option>
                <option value="Sem protocolo">Sem protocolo</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox 
                id="ignore-aceite" 
                checked={filterIgnoreAceite} 
                onCheckedChange={(checked) => setFilterIgnoreAceite(checked as boolean)}
              />
              <Label htmlFor="ignore-aceite" className="text-[10px] text-muted-foreground uppercase font-bold cursor-pointer">
                Ignorar aceite
              </Label>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-4 space-y-1">
            <Progress value={loadProgress} className="h-2" />
          </div>
        )}
      </Card>

      {!hasLoadedOnce ? (
        <div className="p-12 text-center border rounded-lg bg-muted/5">
          <Search className="h-12 w-12 text-muted-foreground/50 mx-auto" />
          <h2 className="mt-4 text-lg font-medium">Selecione o período</h2>
          <p className="text-sm text-muted-foreground">Clique em carregar para analisar os dados.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 flex flex-col gap-3 border-l-4 border-l-red-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-red-600">Crítico (≤ 5 dias)</span>
              </div>
              <div className="space-y-2">
                {trafficLightData.red.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum convênio nesta situação</p>
                ) : trafficLightData.red.map((item, i) => (
                  <div key={i} className="flex flex-col border-b border-border/50 pb-1 last:border-0">
                    <span className="text-xs font-bold truncate">{item.operadora}</span>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{item.mes}</span>
                      <span className="text-red-600 font-medium">{format(item.deadline, "dd/MM/yy")} ({item.daysDiff}d)</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 flex flex-col gap-3 border-l-4 border-l-amber-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Atenção (6 a 15 dias)</span>
              </div>
              <div className="space-y-2">
                {trafficLightData.yellow.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum convênio nesta situação</p>
                ) : trafficLightData.yellow.map((item, i) => (
                  <div key={i} className="flex flex-col border-b border-border/50 pb-1 last:border-0">
                    <span className="text-xs font-bold truncate">{item.operadora}</span>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{item.mes}</span>
                      <span className="text-amber-600 font-medium">{format(item.deadline, "dd/MM/yy")} ({item.daysDiff}d)</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 flex flex-col gap-3 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Seguro (≥ 16 dias)</span>
              </div>
              <div className="space-y-2">
                {trafficLightData.green.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum convênio nesta situação</p>
                ) : trafficLightData.green.map((item, i) => (
                  <div key={i} className="flex flex-col border-b border-border/50 pb-1 last:border-0">
                    <span className="text-xs font-bold truncate">{item.operadora}</span>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{item.mes}</span>
                      <span className="text-emerald-600 font-medium">{format(item.deadline, "dd/MM/yy")} ({item.daysDiff}d)</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Valor Faturado" value={totals.valor_faturado} />
            <StatCard title="Valor Pago" value={totals.valor_pago} variant="success" />
            <StatCard title="Glosa Submetida" value={totals.glosa_submetida} variant="destructive" />
            <StatCard title="Glosa Pendente" value={glosaPendente} variant="pending" />
            <StatCard title="Glosa Recursada" value={totals.glosa_recursada} />
            <StatCard title="Glosa Aceita" value={totals.glosa_aceita} />
          </div>


          <Card className="overflow-hidden border-border">
          <div className="mb-3 p-4 flex items-center justify-between gap-2 border-b">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TableIcon className="h-4 w-4 text-muted-foreground" />
              Resumo de Operadoras
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setExpanded(new Set(sorted.map(s => s.operadora_nome)))}>
                Expandir tudo
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setExpanded(new Set())}>
                Recolher tudo
              </Button>
            </div>
          </div>
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <HeaderCell k="operadora_nome">Operadora / Mês</HeaderCell>
                  <HeaderCell k="valor_faturado" align="right">Valor Faturado</HeaderCell>
                  <HeaderCell k="valor_pago" align="right">Valor Pago</HeaderCell>
                  <HeaderCell k="glosa_submetida" align="right">Glosa Submetida</HeaderCell>
                  <TableHead className="text-right">Glosa Recursada</TableHead>
                  <TableHead className="text-right">Glosa Aceita</TableHead>
                  <TableHead className="text-right">Pend. Analise</TableHead>
                  <TableHead className="text-right">Prazo de Envio</TableHead>
                  <TableHead className="text-right">P. Contratual</TableHead>
                  <TableHead className="text-right">P. Ideal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">Nenhum dado encontrado.</TableCell></TableRow>
                ) : sorted.flatMap((op) => {
                  const isOpen = expanded.has(op.operadora_nome);
                  const config = op.cod_operadora ? operadorasConfig[op.cod_operadora] : null;
                  
                  const parent = (
                    <TableRow key={op.operadora_nome} className="cursor-pointer hover:bg-muted/50 group" onClick={() => toggleRow(op.operadora_nome)}>
                      <TableCell className="w-8 py-2">
                        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-bold">
                        {op.operadora_nome}
                        <span className="ml-2 text-[10px] text-muted-foreground font-normal">({op.mesesArr.length} meses)</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{fmtBR(op.valor_faturado)}</TableCell>
                      <TableCell className="text-right font-medium">{fmtBR(op.valor_pago)}</TableCell>
                      <TableCell className="text-right text-destructive font-medium">{fmtBR(op.glosa_submetida)}</TableCell>
                      <TableCell className="text-right">{fmtBR(op.glosa_recursada)}</TableCell>
                      <TableCell className="text-right">{fmtBR(op.glosa_aceita)}</TableCell>
                      <TableCell className="text-right font-medium">{fmtBR(op.glosa_submetida - (op.glosa_recursada + op.glosa_aceita))}</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right font-semibold">{config?.prazo_contratual_envio_recurso ?? "-"}</TableCell>
                      <TableCell className="text-right font-semibold">{config?.prazo_ideal_envio_recurso ?? "-"}</TableCell>
                    </TableRow>
                  );

                  if (!isOpen) return [parent];

                  return [
                    parent,
                    ...op.mesesArr.map(m => {
                      const firstRecord = m.detalhes[0];
                      let prazoEnvio = "-";
                      if (firstRecord?.data_pagamento && config?.prazo_contratual_envio_recurso) {
                        try {
                          const date = parseISO(firstRecord.data_pagamento);
                          const deadline = addDays(date, config.prazo_contratual_envio_recurso);
                          prazoEnvio = format(deadline, "dd/MM/yyyy");
                        } catch (e) {
                          console.error("Error calculating deadline", e);
                        }
                      }

                      return (
                        <TableRow key={`${op.operadora_nome}-${m.mes_pagamento}`} className="bg-muted/20">
                          <TableCell></TableCell>
                          <TableCell className="pl-8 text-sm text-muted-foreground">{m.mes_pagamento}</TableCell>
                          <TableCell className="text-right text-sm">{fmtBR(m.valor_faturado)}</TableCell>
                          <TableCell className="text-right text-sm">{fmtBR(m.valor_pago)}</TableCell>
                          <TableCell className="text-right text-sm text-destructive/80">{fmtBR(m.glosa_submetida)}</TableCell>
                          <TableCell className="text-right text-sm">{fmtBR(m.glosa_recursada)}</TableCell>
                          <TableCell className="text-right text-sm">{fmtBR(m.glosa_aceita)}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{fmtBR(m.glosa_submetida - (m.glosa_recursada + m.glosa_aceita))}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{prazoEnvio}</TableCell>
                          <TableCell className="text-right text-sm">—</TableCell>
                          <TableCell className="text-right text-sm">—</TableCell>
                        </TableRow>
                      );
                    })
                  ];
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </>
    )}
  </div>
);
}
