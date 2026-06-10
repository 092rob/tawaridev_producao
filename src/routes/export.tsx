import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Download, Database, Users, HardDrive, Zap, KeyRound, FileText, Calendar, Code2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { exportData, listExportTables, getTableSql } from "@/lib/data-export.functions";

export const Route = createFileRoute("/export")({ component: ExportPage });

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function ExportPage() {
  const runExport = useServerFn(exportData);
  const runList = useServerFn(listExportTables);
  const runSql = useServerFn(getTableSql);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [sqlTable, setSqlTable] = useState<string>("");
  const [sql, setSql] = useState<string>("");
  const [loading, setLoading] = useState<string | null>(null);

  const loadTables = async () => {
    try {
      const res = await runList();
      setTables(res.tables);
    } catch (e: any) { toast.error(e.message); }
  };

  const doExport = async (kind: any, table?: string) => {
    setLoading(kind + (table ?? ""));
    try {
      const res = await runExport({ data: { kind, table } });
      if (!res.csv) { toast.warning("Sem dados para exportar."); return; }
      downloadCSV(res.filename, res.csv);
      toast.success("Exportação concluída.");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(null); }
  };

  const loadSql = async () => {
    if (!sqlTable) return;
    setLoading("sql" + sqlTable);
    try {
      const res = await runSql({ data: { table: sqlTable } });
      setSql(res.sql);
      if (!res.sql) toast.warning("Sem SQL gerado.");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(null); }
  };

  const copySql = async () => {
    if (!sql) return;
    await navigator.clipboard.writeText(sql);
    toast.success("SQL copiado.");
  };

  const Item = ({ icon, title, desc, action }: any) => (
    <Card className="p-4 flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      {action}
    </Card>
  );

  return (
    <AppShell requireAdmin>
      <div className="p-6 space-y-4 max-w-4xl">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Download className="h-6 w-6 text-primary" /> Exportar Dados
          </h1>
          <p className="text-sm text-muted-foreground">Exporte dados do Lovable Cloud em formato CSV.</p>
        </header>

        <Item
          icon={<Database className="h-5 w-5" />}
          title="Database (tabelas)"
          desc="Escolha uma tabela do banco para exportar."
          action={
            <div className="flex items-center gap-2">
              <Select
                value={selectedTable}
                onValueChange={(v) => setSelectedTable(v)}
                onOpenChange={(o) => { if (o && tables.length === 0) loadTables(); }}
              >
                <SelectTrigger className="w-56"><SelectValue placeholder="Selecione a tabela" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {tables.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button disabled={!selectedTable || loading === "table" + selectedTable} onClick={() => doExport("table", selectedTable)}>
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </div>
          }
        />

        <Item icon={<Users className="h-5 w-5" />} title="Users" desc="Lista completa de usuários autenticados."
          action={<Button onClick={() => doExport("users")} disabled={loading === "users"}><Download className="h-4 w-4" /> Exportar</Button>} />

        <Item icon={<HardDrive className="h-5 w-5" />} title="Storage" desc="Buckets e arquivos armazenados."
          action={<Button onClick={() => doExport("storage")} disabled={loading === "storage"}><Download className="h-4 w-4" /> Exportar</Button>} />

        <Item icon={<Zap className="h-5 w-5" />} title="Edge Functions" desc="Metadados (código-fonte não é exportável em runtime)."
          action={<Button onClick={() => doExport("edge_functions")} disabled={loading === "edge_functions"}><Download className="h-4 w-4" /> Exportar</Button>} />

        <Item icon={<KeyRound className="h-5 w-5" />} title="Secrets" desc="Apenas nomes (valores nunca são expostos)."
          action={<Button onClick={() => doExport("secrets")} disabled={loading === "secrets"}><Download className="h-4 w-4" /> Exportar</Button>} />

        <Item icon={<FileText className="h-5 w-5" />} title="Logs (Notificações)" desc="Histórico de notificações do sistema."
          action={<Button onClick={() => doExport("logs")} disabled={loading === "logs"}><Download className="h-4 w-4" /> Exportar</Button>} />

        <Item icon={<Calendar className="h-5 w-5" />} title="Appointments" desc="Agendas positivas registradas."
          action={<Button onClick={() => doExport("appointments")} disabled={loading === "appointments"}><Download className="h-4 w-4" /> Exportar</Button>} />

        <Card className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-primary/10 text-primary"><Code2 className="h-5 w-5" /></div>
            <div className="flex-1">
              <div className="font-medium">SQL das tabelas (DDL)</div>
              <div className="text-xs text-muted-foreground">Gere o CREATE TABLE com colunas, chaves, grants, RLS e policies para copiar e migrar.</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={sqlTable}
              onValueChange={(v) => setSqlTable(v)}
              onOpenChange={(o) => { if (o && tables.length === 0) loadTables(); }}
            >
              <SelectTrigger className="w-56"><SelectValue placeholder="Selecione a tabela" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {tables.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={loadSql} disabled={!sqlTable || loading === "sql" + sqlTable}>
              <Code2 className="h-4 w-4" /> Gerar SQL
            </Button>
            <Button variant="outline" onClick={copySql} disabled={!sql}>
              <Copy className="h-4 w-4" /> Copiar
            </Button>
          </div>
          <Textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            placeholder="O SQL aparecerá aqui após a geração."
            className="font-mono text-xs min-h-64"
          />
        </Card>
      </div>
    </AppShell>
  );
}
