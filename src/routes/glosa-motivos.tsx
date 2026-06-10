import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ListFilter, FileSpreadsheet, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/glosa-motivos")({
  component: () => (
    <AppShell>
      <GlosaMotivosInner />
    </AppShell>
  ),
  ssr: false,
});

interface Row {
  convenio_nome: string | null;
  mes_pagamento: string | null;
  descricao_motivo_glosa: string | null;
  codigo_motivo_glosa: string | null;
  situacao_envio_recurso: string | null;
  guia_recurso: string | null;
  data_realizacao: string | null;
  nome_paciente: string | null;
  num_conta: string | null;
  glosa_submetida: number | null;
  glosa_aceita: number | null;
  glosa_refaturada: number | null;
  glosa_recursada: number | null;
  glosa_recuperada: number | null;
  glosa_mantida: number | null;
  justificativa_de_recurso: string | null;
  comentario_de_aceite: string | null;
  usuario_realizou_recurso: string | null;
  usuario_realizou_aceite: string | null;
  valor_faturado: number | null;
  valor_pago: number | null;
  centro_custos: string | null;
  descricao_tipo_glosa: string | null;
  justificativa_aceite: string | null;
  tipo_produto: string | null;
  codigo_item_convenio: string | null;
  descricao_item_convenio: string | null;
}

const fmtBR = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function GlosaMotivosInner() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [convenios, setConvenios] = useState<string[]>([]);
  const [convenio, setConvenio] = useState<string>("__all__");
  const [tiposGlosa, setTiposGlosa] = useState<string[]>([]);
  const [tipoGlosa, setTipoGlosa] = useState<string>("__all__");
  
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [startDate, setStartDate] = useState<string>(firstDayOfMonth.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(now.toISOString().split("T")[0]);
  
  const [search, setSearch] = useState("");
  const [selectedMotivo, setSelectedMotivo] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Row | null>(null);

  const { data: lastUploadRaw } = useQuery({
    queryKey: ["glosa_motivos_last_upload"],
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
    setExpandedRow(null);
  }, [selectedMotivo]);

  const fetchData = async () => {
    setLoading(true);
    setLoadProgress(0);
    const allRows: Row[] = [];
    const pageSize = 1000; // Reduzindo tamanho da página para maior estabilidade
    let from = 0;
    
    try {
      // Primeira consulta apenas para pegar o total (count)
      const { count, error: countError } = await supabase
        .from("glosa_motivos_records")
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
          .from("glosa_motivos_records")
          .select("convenio_nome, mes_pagamento, descricao_motivo_glosa, codigo_motivo_glosa, situacao_envio_recurso, nome_paciente, num_conta, glosa_submetida, glosa_aceita, glosa_recursada, glosa_recuperada, glosa_mantida, valor_faturado, valor_pago, justificativa_de_recurso, comentario_de_aceite, usuario_realizou_recurso, usuario_realizou_aceite, centro_custos, descricao_tipo_glosa, guia_recurso, data_realizacao, justificativa_aceite, tipo_produto, codigo_item_convenio, descricao_item_convenio")
          .gte("data_pagamento", startDate)
          .lte("data_pagamento", endDate)
          .range(from, from + pageSize - 1);

        if (error) throw error;
        
        if (data) {
          allRows.push(...(data as Row[]));
          setLoadProgress(Math.min(99, Math.round((allRows.length / totalCount) * 100)));
        }

        if (!data || data.length === 0) break;
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

  const fetchFilters = async () => {
    const { data, error } = await supabase
      .from("glosa_motivos_records")
      .select("convenio_nome, descricao_tipo_glosa")
      .order("convenio_nome")
      .limit(10000); // Limitando para evitar carregar a tabela inteira na memória do browser
    
    if (!error && data) {
      const uniqueConvenios = Array.from(new Set(data.map(d => d.convenio_nome).filter(Boolean))) as string[];
      setConvenios(uniqueConvenios.sort());
      
      const uniqueTipos = Array.from(new Set(data.map(d => d.descricao_tipo_glosa).filter(Boolean))) as string[];
      setTiposGlosa(uniqueTipos.sort());
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  // Carregamento automático removido conforme solicitado.
  // useEffect(() => {
  //   fetchData();
  // }, [startDate, endDate]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (convenio !== "__all__" && r.convenio_nome !== convenio) return false;
      if (tipoGlosa !== "__all__" && r.descricao_tipo_glosa !== tipoGlosa) return false;
      if (q) {
        const hay = `${r.descricao_motivo_glosa ?? ""} ${r.nome_paciente ?? ""} ${r.num_conta ?? ""} ${r.codigo_motivo_glosa ?? ""} ${r.descricao_item_convenio ?? ""} ${r.codigo_item_convenio ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, convenio, tipoGlosa, search]);

  const kpis = useMemo(() => {
    const sum = (k: keyof Row) =>
      filtered.reduce((a, r) => a + (typeof r[k] === "number" ? (r[k] as number) : 0), 0);
    return {
      total: filtered.length,
      submetida: sum("glosa_submetida"),
      aceita: sum("glosa_aceita"),
      recursada: sum("glosa_recursada"),
      recuperada: sum("glosa_recuperada"),
      mantida: sum("glosa_mantida"),
      faturado: sum("valor_faturado"),
      pago: sum("valor_pago"),
    };
  }, [filtered]);

  const porMotivo = useMemo(() => {
    const m = new Map<string, { motivo: string; qtd: number; submetida: number; recursada: number; aceita: number }>();
    for (const r of filtered) {
      const key = r.descricao_motivo_glosa || "SEM MOTIVO";
      const cur = m.get(key) ?? { motivo: key, qtd: 0, submetida: 0, recursada: 0, aceita: 0 };
      cur.qtd += 1;
      cur.submetida += r.glosa_submetida ?? 0;
      cur.recursada += r.glosa_recursada ?? 0;
      cur.aceita += r.glosa_aceita ?? 0;
      m.set(key, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.submetida - a.submetida);
  }, [filtered]);

  const detalheMotivo = useMemo(() => {
    if (!selectedMotivo) return [];
    const m = new Map<string, { 
      mes: string; 
      convenio: string; 
      qtd: number; 
      submetida: number; 
      recursada: number; 
      acatada: number;
      contas: Map<string, Row>
    }>();
    
    for (const r of filtered) {
      const motivo = r.descricao_motivo_glosa || "SEM MOTIVO";
      if (motivo !== selectedMotivo) continue;
      const mes = r.mes_pagamento || "—";
      const conv = r.convenio_nome || "—";
      const key = `${mes}||${conv}`;
      
      const cur = m.get(key) ?? { 
        mes, 
        convenio: conv, 
        qtd: 0, 
        submetida: 0, 
        recursada: 0, 
        acatada: 0,
        contas: new Map()
      };
      
      cur.qtd += 1;
      cur.submetida += r.glosa_submetida ?? 0;
      cur.recursada += r.glosa_recursada ?? 0;
      cur.acatada += r.glosa_aceita ?? 0;
      
      const cKey = r.num_conta || "S/N";
      cur.contas.set(cKey, r);
      
      m.set(key, cur);
    }
    
    return Array.from(m.values())
      .map(item => ({
        ...item,
        listaContas: Array.from(item.contas.values())
          .sort((a, b) => (b.glosa_submetida ?? 0) - (a.glosa_submetida ?? 0))
      }))
      .sort((a, b) => b.submetida - a.submetida);
  }, [filtered, selectedMotivo]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Glosa por Área</h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada dos motivos de glosa com base nas planilhas importadas.
        </p>
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
                  Esta dashboard utiliza os seguintes campos da tabela <code className="bg-muted px-1 rounded">glosa_motivos_records</code>:
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm max-h-[60vh] overflow-auto pr-2">
                <div className="space-y-2">
                  <h4 className="font-semibold border-b pb-1">Identificação</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><code className="text-primary">convenio_nome</code>: Nome do convênio</li>
                    <li><code className="text-primary">nome_paciente</code>: Nome do paciente</li>
                    <li><code className="text-primary">num_conta</code>: Número da conta</li>
                    <li><code className="text-primary">guia_recurso</code>: Número da guia</li>
                    <li><code className="text-primary">centro_custos</code>: Área/Unidade</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold border-b pb-1">Temporal e Tipo</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><code className="text-primary">data_pagamento</code>: Data base p/ filtros</li>
                    <li><code className="text-primary">mes_pagamento</code>: Agrupamento mensal</li>
                    <li><code className="text-primary">descricao_tipo_glosa</code>: Categoria da glosa</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold border-b pb-1">Valores de Glosa</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><code className="text-primary">glosa_submetida</code>: Valor inicial glosado</li>
                    <li><code className="text-primary">glosa_aceita</code>: Valor de aceite</li>
                    <li><code className="text-primary">glosa_recursada</code>: Valor em recurso</li>
                    <li><code className="text-primary">glosa_recuperada</code>: Valor recuperado</li>
                    <li><code className="text-primary">glosa_mantida</code>: Valor mantido/perdido</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold border-b pb-1">Motivos e Itens</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><code className="text-primary">descricao_motivo_glosa</code>: Motivo da glosa</li>
                    <li><code className="text-primary">codigo_motivo_glosa</code>: Código do motivo</li>
                    <li><code className="text-primary">descricao_item_convenio</code>: Nome do item/procedimento</li>
                    <li><code className="text-primary">codigo_item_convenio</code>: Código do item</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Card className="p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <ListFilter className="h-4 w-4 text-primary" /> Filtros
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 w-fit">
            <span className="text-[10px] text-muted-foreground uppercase px-1">Data Inicial</span>
            <Input type="date" className="w-[130px] h-10 date-input-custom" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1 w-fit">
            <span className="text-[10px] text-muted-foreground uppercase px-1">Data Final</span>
            <Input type="date" className="w-[130px] h-10 date-input-custom" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="w-full sm:w-[200px]">
            <Select value={tipoGlosa} onValueChange={setTipoGlosa}>
              <SelectTrigger><SelectValue placeholder="Tipo de Glosa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os tipos de glosa</SelectItem>
                {tiposGlosa.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[200px]">
            <Select value={convenio} onValueChange={setConvenio}>
              <SelectTrigger><SelectValue placeholder="Convênio" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os convênios</SelectItem>
                {convenios.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="Buscar motivo, paciente, conta ou item…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button 
            onClick={fetchData} 
            disabled={loading}
            className="w-full sm:w-auto min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Carregar
              </>
            )}
          </Button>
        </div>
        {loading && (
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
              <span>Processando registros...</span>
              <span>{loadProgress}%</span>
            </div>
            <Progress value={loadProgress} className="h-2" />
          </div>
        )}
      </Card>

      {loading ? (
        <div className="p-12 text-muted-foreground flex flex-col items-center justify-center min-h-[300px] border rounded-lg bg-muted/5">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <h2 className="text-lg font-medium">Carregando dados</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Por favor, aguarde enquanto processamos todos os registros do período.
          </p>
        </div>
      ) : !hasLoadedOnce ? (
        <div className="flex h-full flex-col items-center justify-center p-12 text-center border rounded-lg bg-muted/5">
          <Search className="h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-medium">Pronto para carregar</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Selecione o período desejado e clique no botão <strong>Carregar</strong> para visualizar as informações.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center p-12 text-center border rounded-lg bg-muted/10">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-medium">Sem dados encontrados para o período</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Tente ajustar as datas ou aguarde o administrador importar uma planilha.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Itens analisados" value={kpis.total.toLocaleString("pt-BR")} />
            <Kpi label="Glosa submetida" value={fmtBR(kpis.submetida)} />
            <Kpi label="Glosa recuperada" value={fmtBR(kpis.recuperada)} tone="success" />
            <Kpi label="Glosa mantida" value={fmtBR(kpis.mantida)} tone="danger" />
            <Kpi label="Glosa aceita" value={fmtBR(kpis.aceita)} />
            <Kpi label="Glosa recursada" value={fmtBR(kpis.recursada)} />
            <Kpi label="Valor faturado" value={fmtBR(kpis.faturado)} />
            <Kpi label="Valor pago" value={fmtBR(kpis.pago)} />
          </div>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">
              Motivos de glosa ranqueados por valor submetido ({porMotivo.length})
            </h3>
            <div className="max-h-[420px] overflow-auto rounded border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 w-10">#</th>
                    <th className="px-2 py-2">Motivo</th>
                    <th className="px-2 py-2 text-right">Itens</th>
                    <th className="px-2 py-2 text-right">Submetida</th>
                    <th className="px-2 py-2 text-right">Recursada</th>
                    <th className="px-2 py-2 text-right">Aceite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {porMotivo.map((m, i) => (
                    <tr key={m.motivo} onClick={() => setSelectedMotivo(m.motivo)} className="cursor-pointer hover:bg-accent/40">
                      <td className="px-2 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-2">{m.motivo}</td>
                      <td className="px-2 py-2 text-right">{m.qtd.toLocaleString("pt-BR")}</td>
                      <td className="px-2 py-2 text-right font-medium">{fmtBR(m.submetida)}</td>
                      <td className="px-2 py-2 text-right text-blue-600">{fmtBR(m.recursada)}</td>
                      <td className="px-2 py-2 text-right text-emerald-600">{fmtBR(m.aceita)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 bg-muted font-bold">
                  <tr>
                    <td className="px-2 py-2" colSpan={2}>TOTAL</td>
                    <td className="px-2 py-2 text-right">{porMotivo.reduce((a, b) => a + b.qtd, 0).toLocaleString("pt-BR")}</td>
                    <td className="px-2 py-2 text-right">{fmtBR(porMotivo.reduce((a, b) => a + b.submetida, 0))}</td>
                    <td className="px-2 py-2 text-right text-blue-600">{fmtBR(porMotivo.reduce((a, b) => a + b.recursada, 0))}</td>
                    <td className="px-2 py-2 text-right text-emerald-600">{fmtBR(porMotivo.reduce((a, b) => a + b.aceita, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Dialog open={!!selectedMotivo} onOpenChange={(o) => !o && setSelectedMotivo(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-base">Detalhe da glosa</DialogTitle>
                <DialogDescription className="line-clamp-2">{selectedMotivo}</DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-auto rounded border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2">Mês Pgto.</th>
                      <th className="px-2 py-2">Convênio (clique p/ contas)</th>
                      <th className="px-2 py-2 text-right">Itens</th>
                      <th className="px-2 py-2 text-right">Submetida</th>
                      <th className="px-2 py-2 text-right">Recursada</th>
                      <th className="px-2 py-2 text-right">Acatada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {detalheMotivo.map((d, i) => (
                      <React.Fragment key={i}>
                        <tr 
                          className="cursor-pointer hover:bg-accent/40 transition-colors"
                          onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                        >
                          <td className="px-2 py-2 whitespace-nowrap">{d.mes}</td>
                          <td className="px-2 py-2 font-medium text-primary underline decoration-dotted underline-offset-4">
                            {d.convenio}
                          </td>
                          <td className="px-2 py-2 text-right">{d.qtd.toLocaleString("pt-BR")}</td>
                          <td className="px-2 py-2 text-right font-medium">{fmtBR(d.submetida)}</td>
                          <td className="px-2 py-2 text-right">{fmtBR(d.recursada)}</td>
                          <td className="px-2 py-2 text-right text-emerald-600">{fmtBR(d.acatada)}</td>
                        </tr>
                        {expandedRow === i && (
                          <tr className="bg-muted/30">
                            <td colSpan={6} className="px-4 py-2">
                              <div className="text-xs font-semibold mb-2 uppercase text-muted-foreground">Contas do Convênio (clique no número para detalhes):</div>
                              <div className="grid grid-cols-4 gap-2 text-xs border-t border-border pt-2 pb-2">
                                <div className="font-bold">Conta</div>
                                <div className="text-right font-bold">Submetida</div>
                                <div className="text-right font-bold">Recursada</div>
                                <div className="text-right font-bold">Acatada</div>
                                {d.listaContas.map((c, ci) => (
                                  <React.Fragment key={ci}>
                                    <div 
                                      className="text-primary underline cursor-pointer hover:text-primary/80"
                                      onClick={() => setSelectedAccount(c)}
                                    >
                                      {c.num_conta}
                                    </div>
                                    <div className="text-right">{fmtBR(c.glosa_submetida ?? 0)}</div>
                                    <div className="text-right">{fmtBR(c.glosa_recursada ?? 0)}</div>
                                    <div className="text-right text-emerald-600">{fmtBR(c.glosa_aceita ?? 0)}</div>
                                  </React.Fragment>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {detalheMotivo.length === 0 && (
                      <tr><td colSpan={6} className="px-2 py-6 text-center text-muted-foreground">Sem registros</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!selectedAccount} onOpenChange={(o) => !o && setSelectedAccount(null)}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="text-base">Resumo da Conta: {selectedAccount?.num_conta}</DialogTitle>
                <DialogDescription>
                  Paciente: {selectedAccount?.nome_paciente} | Convênio: {selectedAccount?.convenio_nome}
                  <div className="mt-2 grid grid-cols-2 gap-y-1 gap-x-4 text-xs">
                    <div><span className="font-semibold uppercase opacity-70">Centro de Custo:</span> {selectedAccount?.centro_custos || "—"}</div>
                    <div><span className="font-semibold uppercase opacity-70">Mês Pagamento:</span> {selectedAccount?.mes_pagamento || "—"}</div>
                    <div><span className="font-semibold uppercase opacity-70">Reanalise:</span> {selectedAccount?.guia_recurso || "—"}</div>
                  </div>
                  { (selectedAccount?.usuario_realizou_recurso || selectedAccount?.usuario_realizou_aceite) && (
                    <span className="block mt-2 text-xs font-medium border-t pt-2">
                      Analista: {selectedAccount?.usuario_realizou_recurso || selectedAccount?.usuario_realizou_aceite}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground uppercase">Tipo de Glosa</div>
                    <div className="text-lg font-bold">{selectedAccount?.descricao_tipo_glosa || "—"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground uppercase">Submetida</div>
                    <div className="text-lg font-bold">{fmtBR(selectedAccount?.glosa_submetida ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground uppercase">Mês Pagamento</div>
                    <div className="text-lg font-bold">{selectedAccount?.mes_pagamento}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground uppercase text-primary">Recursada</div>
                    <div className="text-lg font-bold text-primary">{fmtBR(selectedAccount?.glosa_recursada ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground uppercase text-emerald-700">Aceita</div>
                    <div className="text-lg font-bold text-emerald-600">{fmtBR(selectedAccount?.glosa_aceita ?? 0)}</div>
                  </div>
                </div>
                
                <div className="border-t pt-2 grid grid-cols-1 gap-y-1 text-xs">
                  <div><span className="font-semibold uppercase opacity-70">Data Realização:</span> {selectedAccount?.data_realizacao ? new Date(selectedAccount.data_realizacao).toLocaleDateString("pt-BR") : "—"}</div>
                  <div><span className="font-semibold uppercase opacity-70">Tipo Produto:</span> {selectedAccount?.tipo_produto || "—"}</div>
                  <div><span className="font-semibold uppercase opacity-70">Código Item:</span> {selectedAccount?.codigo_item_convenio || "—"}</div>
                  <div><span className="font-semibold uppercase opacity-70">Descrição Item:</span> {selectedAccount?.descricao_item_convenio || "—"}</div>
                  <div><span className="font-semibold uppercase opacity-70">Motivo Glosa:</span> {selectedAccount?.codigo_motivo_glosa ? `${selectedAccount.codigo_motivo_glosa} - ${selectedAccount.descricao_motivo_glosa || ""}` : "—"}</div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <div className="text-xs font-semibold mb-1 uppercase flex justify-between">
                      <span>Recurso de Glosa</span>
                      <span className="text-primary">{fmtBR(selectedAccount?.glosa_recursada ?? 0)}</span>
                    </div>
                    <div className="text-sm italic text-muted-foreground min-h-[40px]">
                      {selectedAccount?.justificativa_de_recurso || "Sem comentários de recurso."}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3 bg-muted/20">
                    <div className="text-xs font-semibold mb-1 uppercase flex justify-between">
                      <span>Aceite de Glosa</span>
                      <span className="text-emerald-600">{fmtBR(selectedAccount?.glosa_aceita ?? 0)}</span>
                    </div>
                    <div className="text-sm italic text-muted-foreground min-h-[40px]">
                      {selectedAccount?.justificativa_aceite || selectedAccount?.comentario_de_aceite || "Sem comentários de aceite."}
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  const color = tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-rose-600" : "text-foreground";
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${color}`}>{value}</div>
    </Card>
  );
}
