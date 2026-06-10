import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Users, LayoutDashboard, Shield, KeyRound, Copy, FileSpreadsheet, Upload, Trophy, RefreshCw, CircleDollarSign, Building2, ChevronRight, PieChart, Pencil, Clock } from "lucide-react";
import { createUserAsAdmin, setUserRole, deleteUserAsAdmin, listAllUsers, resetUserPasswordAsAdmin } from "@/lib/admin.functions";
import { ingestGlosaUpload, deleteGlosaUpload, grantGlosaAccess, listGlosaAccess } from "@/lib/glosa.functions";
import { ingestGlosaRecUpload, deleteGlosaRecUpload, grantGlosaRecAccess, listGlosaRecAccess, setGlosaRecMeta, deleteGlosaRecMeta } from "@/lib/glosa-rec.functions";
import { ingestGlosaMotivosUpload, deleteGlosaMotivosUpload, grantGlosaMotivosAccess, listGlosaMotivosAccess } from "@/lib/glosa-motivos.functions";
import { ingestCBHPMProcedimentos, ingestCBHPMPortes } from "@/lib/cbhpm.functions";
import { ingestPrazosUpload, deletePrazosUpload } from "@/lib/prazos-operadoras.functions";
import * as XLSX from "xlsx";


export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  return (
    <AppShell requireAdmin>
      <div className="p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Administração
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie usuários, dashboards e acessos.</p>
        </header>

        <Tabs defaultValue="dashboards">
          <TabsList>
            <TabsTrigger value="dashboards"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboards</TabsTrigger>
            <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />Usuários</TabsTrigger>
            <TabsTrigger value="operadoras"><Building2 className="mr-2 h-4 w-4" />Operadoras</TabsTrigger>
            <TabsTrigger value="setores"><Building2 className="mr-2 h-4 w-4" />Setores</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboards" className="mt-4 space-y-8">
            <DashboardsAdmin />
            <div className="border-t border-border pt-6">
              <h2 className="mb-3 text-sm font-semibold tracking-tight text-muted-foreground uppercase">
                Dashboards nativas
              </h2>
              <Accordion type="multiple" className="w-full space-y-2">
                <AccordionItem value="glosa-ranking" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 text-base font-medium">
                      <Trophy className="h-5 w-5 text-primary" /> Ranking Glosa
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <GlosaAdmin />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="glosa-recuperada" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 text-base font-medium">
                      <CircleDollarSign className="h-5 w-5 text-primary" /> Glosa Recuperada
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <GlosaRecAdmin />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="glosa-motivos" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 text-base font-medium">
                      <PieChart className="h-5 w-5 text-primary" /> Glosa por Área
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <GlosaMotivosAdmin />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="cbhpm" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 text-base font-medium">
                      <FileSpreadsheet className="h-5 w-5 text-primary" /> Configuração CBHPM
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <CBHPMAdmin />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="prazos-operadoras" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2 text-base font-medium">
                      <Clock className="h-5 w-5 text-primary" /> Prazos de Pagamento
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <PrazosAdmin />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

            </div>
          </TabsContent>
          <TabsContent value="users" className="mt-4"><UsersAdmin /></TabsContent>
          <TabsContent value="operadoras" className="mt-4"><OperadorasAdmin /></TabsContent>
          <TabsContent value="setores" className="mt-4"><SetoresAdmin /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

/* ---------- Dashboards ---------- */

interface Dashboard { id: string; title: string; description: string | null; embed_url: string; }
interface UserRow { id: string; full_name: string | null; email: string | null; role: string; }

function DashboardsAdmin() {
  const [items, setItems] = useState<Dashboard[]>([]);
  const [open, setOpen] = useState(false);
  const [accessFor, setAccessFor] = useState<Dashboard | null>(null);
  const [editFor, setEditFor] = useState<Dashboard | null>(null);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("dashboards").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const remove = async (id: string) => {
    if (!confirm("Remover este dashboard?")) return;
    const { error } = await supabase.from("dashboards").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido.");
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">
          Dashboards Power BI
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo dashboard</Button>
          </DialogTrigger>
          <NewDashboardDialog onClose={() => { setOpen(false); reload(); }} />
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhum dashboard cadastrado.</Card>
      ) : (
        <Accordion type="multiple" className="w-full space-y-2">
          {items.map((d) => (
            <AccordionItem key={d.id} value={d.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-base font-medium min-w-0">
                  <LayoutDashboard className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{d.title}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
                    <p className="text-xs text-muted-foreground break-all">{d.embed_url}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" variant="secondary" onClick={() => setAccessFor(d)}>Acessos</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditFor(d)}>Alterar link</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {accessFor && (
        <AccessDialog dashboard={accessFor} onClose={() => setAccessFor(null)} />
      )}
      {editFor && (
        <EditDashboardDialog
          dashboard={editFor}
          onClose={() => { setEditFor(null); reload(); }}
        />
      )}
    </div>
  );
}

function EditDashboardDialog({ dashboard, onClose }: { dashboard: Dashboard; onClose: () => void }) {
  const [embed, setEmbed] = useState(dashboard.embed_url);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!embed.trim()) return toast.error("Informe a URL.");
    setLoading(true);
    const { error } = await supabase.from("dashboards")
      .update({ embed_url: embed.trim() })
      .eq("id", dashboard.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Link atualizado.");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Alterar link — {dashboard.title}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>URL de embed do Power BI</Label>
            <Input value={embed} onChange={(e) => setEmbed(e.target.value)} placeholder="https://app.powerbi.com/view?r=..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewDashboardDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [embed, setEmbed] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !embed.trim()) return toast.error("Preencha título e URL.");
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("dashboards").insert({
      title: title.trim(), description: description.trim() || null,
      embed_url: embed.trim(), created_by: u.user?.id,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Dashboard criado.");
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo dashboard</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
        <div className="space-y-2"><Label>Descrição (opcional)</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} /></div>
        <div className="space-y-2">
          <Label>URL de embed do Power BI</Label>
          <Input value={embed} onChange={(e) => setEmbed(e.target.value)} placeholder="https://app.powerbi.com/view?r=..." />
          <p className="text-xs text-muted-foreground">No Power BI: Arquivo → Incorporar relatório → Publicar na Web (ou Incorporar em ambiente seguro).</p>
        </div>
        <DialogFooter><Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Salvar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function AccessDialog({ dashboard, onClose }: { dashboard: Dashboard; onClose: () => void }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const listUsers = useServerFn(listAllUsers);

  useEffect(() => {
    (async () => {
      const [u, a] = await Promise.all([
        listUsers(),
        supabase.from("dashboard_access").select("user_id").eq("dashboard_id", dashboard.id),
      ]);
      setUsers(u);
      setGranted(new Set(a.data?.map((r) => r.user_id) ?? []));
      setLoading(false);
    })();
  }, [dashboard.id, listUsers]);

  const toggle = async (uid: string, has: boolean) => {
    if (has) {
      const { error } = await supabase.from("dashboard_access").delete()
        .eq("dashboard_id", dashboard.id).eq("user_id", uid);
      if (error) return toast.error(error.message);
      granted.delete(uid);
    } else {
      const { error } = await supabase.from("dashboard_access").insert({ dashboard_id: dashboard.id, user_id: uid });
      if (error) return toast.error(error.message);
      granted.add(uid);
    }
    setGranted(new Set(granted));
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Acessos: {dashboard.title}</DialogTitle></DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando…</div>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {users.filter((u) => u.role === "cliente").length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
            )}
            {users.filter((u) => u.role === "cliente").map((u) => {
              const has = granted.has(u.id);
              return (
                <label key={u.id} className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent/30">
                  <Checkbox checked={has} onCheckedChange={() => toggle(u.id, has)} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{u.full_name || u.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Users ---------- */

function UsersAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const listUsers = useServerFn(listAllUsers);
  const setRole = useServerFn(setUserRole);
  const delUser = useServerFn(deleteUserAsAdmin);
  const resetPwd = useServerFn(resetUserPasswordAsAdmin);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar");
    }
    setLoading(false);
  }, [listUsers]);
  useEffect(() => { reload(); }, [reload]);

  const changeRole = async (uid: string, role: "admin" | "cliente") => {
    try {
      await setRole({ data: { user_id: uid, role } });
      toast.success("Função atualizada.");
      reload();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  const remove = async (uid: string) => {
    if (!confirm("Remover este usuário?")) return;
    try {
      await delUser({ data: { user_id: uid } });
      toast.success("Removido.");
      reload();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  const handleResetPassword = async (u: UserRow) => {
    if (!confirm(`Resetar a senha de ${u.email}?`)) return;
    try {
      const { password } = await resetPwd({ data: { user_id: u.id } });
      setResetResult({ email: u.email ?? "", password });
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novo usuário</Button></DialogTrigger>
          <NewUserDialog onClose={() => { setOpen(false); reload(); }} />
        </Dialog>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando…</div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{u.full_name || "(sem nome)"}</div>
                  <div className="text-sm text-muted-foreground truncate">{u.email}</div>
                </div>
                <Select value={u.role} onValueChange={(v) => changeRole(u.id, v as "admin" | "cliente")}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" title="Resetar senha" onClick={() => handleResetPassword(u)}>
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(u.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!resetResult} onOpenChange={(o) => !o && setResetResult(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova senha gerada</DialogTitle></DialogHeader>
          {resetResult && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Copie e informe ao usuário — ela não será mostrada novamente.
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={resetResult.password} className="font-mono text-base" />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(resetResult.password);
                    toast.success("Senha copiada.");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResetResult(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewUserDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "cliente">("cliente");
  const [loading, setLoading] = useState(false);
  const create = useServerFn(createUserAsAdmin);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await create({ data: { email: email.trim(), password, full_name: name.trim(), role } });
      toast.success("Usuário criado.");
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
    setLoading(false);
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
        <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="space-y-2"><Label>Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
        <div className="space-y-2">
          <Label>Função</Label>
          <Select value={role} onValueChange={(v) => setRole(v as "admin" | "cliente")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cliente">Cliente</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter><Button type="submit" disabled={loading}>{loading ? "Criando…" : "Criar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}


/* ---------- Setores ---------- */

interface Setor {
  id: string;
  nome: string;
  gestor: string;
}

function SetoresAdmin() {
  const [items, setItems] = useState<Setor[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("setores").select("*").order("nome");
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const remove = async (id: string) => {
    if (!confirm("Remover este setor?")) return;
    const { error } = await supabase.from("setores").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Setor removido.");
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">
          Cadastro de Setores
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo setor</Button>
          </DialogTrigger>
          <NewSetorDialog onClose={() => { setOpen(false); reload(); }} />
        </Dialog>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Carregando…</div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhum setor cadastrado.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <Card key={s.id} className="p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="font-semibold text-lg">{s.nome}</div>
                <div className="text-sm text-muted-foreground">Gestor: {s.gestor}</div>
              </div>
              <div className="flex justify-end pt-2 border-t border-border">
                <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewSetorDialog({ onClose }: { onClose: () => void }) {
  const [nome, setNome] = useState("");
  const [gestor, setGestor] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !gestor.trim()) return toast.error("Preencha todos os campos.");
    setLoading(true);
    const { error } = await supabase.from("setores").insert({
      nome: nome.trim(),
      gestor: gestor.trim(),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Setor cadastrado.");
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo Setor</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do Setor</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gestor">Gestor</Label>
          <Input id="gestor" value={gestor} onChange={(e) => setGestor(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}


/* ---------- Operadoras ---------- */

interface Operadora {
  id: string;
  nome: string;
  cod_operadora: string | null;
  prazo_contratual_envio_recurso: number;
  prazo_ideal_envio_recurso: number;
}

function OperadorasAdmin() {
  const [items, setItems] = useState<Operadora[]>([]);
  const [open, setOpen] = useState(false);
  const [editFor, setEditFor] = useState<Operadora | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("operadoras").select("*").order("nome");
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const remove = async (id: string) => {
    if (!confirm("Remover esta operadora?")) return;
    const { error } = await supabase.from("operadoras").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Operadora removida.");
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">
          Cadastro de Operadoras
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Nova operadora</Button>
          </DialogTrigger>
          <NewOperadoraDialog onClose={() => { setOpen(false); reload(); }} />
        </Dialog>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Carregando…</div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhuma operadora cadastrada.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((o) => (
            <Card key={o.id} className="p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-lg">{o.nome}</div>
                  {o.cod_operadora && <div className="text-xs font-mono bg-muted px-2 py-0.5 rounded">ID: {o.cod_operadora}</div>}
                </div>
                <div className="grid grid-cols-1 gap-1 text-sm text-muted-foreground">
                  <div>Prazo Contratual: <span className="font-medium text-foreground">{o.prazo_contratual_envio_recurso} dias</span></div>
                  <div>Prazo Ideal: <span className="font-medium text-foreground">{o.prazo_ideal_envio_recurso} dias</span></div>
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-border gap-2">
                <Button variant="ghost" size="icon" onClick={() => setEditFor(o)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(o.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editFor && (
        <EditOperadoraDialog 
          operadora={editFor} 
          onClose={() => { setEditFor(null); reload(); }} 
        />
      )}
    </div>
  );
}

function NewOperadoraDialog({ onClose }: { onClose: () => void }) {
  const [nome, setNome] = useState("");
  const [codOperadora, setCodOperadora] = useState("");
  const [prazoContratual, setPrazoContratual] = useState("");
  const [prazoIdeal, setPrazoIdeal] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !prazoContratual || !prazoIdeal) return toast.error("Preencha todos os campos obrigatórios.");
    
    setLoading(true);
    const { error } = await supabase.from("operadoras").insert({
      nome: nome.trim(),
      cod_operadora: codOperadora.trim() || null,
      prazo_contratual_envio_recurso: parseInt(prazoContratual),
      prazo_ideal_envio_recurso: parseInt(prazoIdeal),
    });
    setLoading(false);
    
    if (error) return toast.error(error.message);
    toast.success("Operadora cadastrada.");
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nova Operadora</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nome_operadora">Nome da Operadora</Label>
          <Input id="nome_operadora" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Unimed" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cod_operadora">Código da Operadora</Label>
          <Input id="cod_operadora" value={codOperadora} onChange={(e) => setCodOperadora(e.target.value)} placeholder="Ex: 001" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prazo_contratual">Prazo Contratual Envio Recurso (dias)</Label>
          <Input id="prazo_contratual" type="number" value={prazoContratual} onChange={(e) => setPrazoContratual(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prazo_ideal">Prazo Ideal Envio Recurso (dias)</Label>
          <Input id="prazo_ideal" type="number" value={prazoIdeal} onChange={(e) => setPrazoIdeal(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditOperadoraDialog({ operadora, onClose }: { operadora: Operadora; onClose: () => void }) {
  const [nome, setNome] = useState(operadora.nome);
  const [codOperadora, setCodOperadora] = useState(operadora.cod_operadora || "");
  const [prazoContratual, setPrazoContratual] = useState(operadora.prazo_contratual_envio_recurso.toString());
  const [prazoIdeal, setPrazoIdeal] = useState(operadora.prazo_ideal_envio_recurso.toString());
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !prazoContratual || !prazoIdeal) return toast.error("Preencha todos os campos obrigatórios.");
    
    setLoading(true);
    const { error } = await supabase.from("operadoras")
      .update({
        nome: nome.trim(),
        cod_operadora: codOperadora.trim() || null,
        prazo_contratual_envio_recurso: parseInt(prazoContratual),
        prazo_ideal_envio_recurso: parseInt(prazoIdeal),
      })
      .eq("id", operadora.id);
    setLoading(false);
    
    if (error) return toast.error(error.message);
    toast.success("Operadora atualizada.");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar Operadora</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit_nome_operadora">Nome da Operadora</Label>
            <Input id="edit_nome_operadora" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_cod_operadora">Código da Operadora</Label>
            <Input id="edit_cod_operadora" value={codOperadora} onChange={(e) => setCodOperadora(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_prazo_contratual">Prazo Contratual Envio Recurso (dias)</Label>
            <Input id="edit_prazo_contratual" type="number" value={prazoContratual} onChange={(e) => setPrazoContratual(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_prazo_ideal">Prazo Ideal Envio Recurso (dias)</Label>
            <Input id="edit_prazo_ideal" type="number" value={prazoIdeal} onChange={(e) => setPrazoIdeal(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}



/* ---------- Glosa ---------- */

interface UploadRow { id: string; file_name: string; row_count: number; created_at: string; tipo_importacao: string | null; }

function GlosaAdmin() {
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [tipoImportacao, setTipoImportacao] = useState<"ZG" | "Manual" | null>(null);


  const ingest = useServerFn(ingestGlosaUpload);
  const delUp = useServerFn(deleteGlosaUpload);
  const grant = useServerFn(grantGlosaAccess);
  const listAcc = useServerFn(listGlosaAccess);
  const listUsers = useServerFn(listAllUsers);

  const reload = useCallback(async () => {
    const [{ data: ups }, u, acc] = await Promise.all([
      supabase.from("glosa_uploads").select("id, file_name, row_count, created_at, tipo_importacao").order("created_at", { ascending: false }).limit(10000),
      listUsers(),
      listAcc(),
    ]);
    setUploads((ups ?? []) as UploadRow[]);
    setUsers(u);
    setGranted(new Set(acc));
  }, [listUsers, listAcc]);
  useEffect(() => { reload(); }, [reload]);


  const onFile = async (file: File) => {
    setBusy(true);
    setProgress("Lendo arquivo…");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      // Some exports (Power BI) declare a wrong !ref like "A1:AV2" while the
      // sheet actually contains thousands of rows. Recompute the range from
      // the cell keys so sheet_to_json sees every row.
      const cellKeys = Object.keys(sheet).filter((k) => !k.startsWith("!"));
      let maxRow = 0, maxCol = 0;
      for (const k of cellKeys) {
        const ref = XLSX.utils.decode_cell(k);
        if (ref.r > maxRow) maxRow = ref.r;
        if (ref.c > maxCol) maxCol = ref.c;
      }
      if (maxRow > 0) {
        sheet["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });
      }
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
      if (rows.length === 0) {
        toast.error("Planilha vazia.");
        return;
      }
      setProgress(`Enviando ${rows.length} linhas…`);
      const chunkSize = 2000;
      let total = 0;
      const fileName = file.name;
      // First chunk creates the upload; subsequent chunks create separate upload entries
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const label = rows.length > chunkSize
          ? `${fileName} (parte ${Math.floor(i / chunkSize) + 1}/${Math.ceil(rows.length / chunkSize)})`
          : fileName;
        setProgress(`Enviando ${i + chunk.length} de ${rows.length}…`);
        const res = await ingest({ data: { file_name: label, rows: chunk, tipo_importacao: tipoImportacao } });
        total += res.count;
      }
      toast.success(`${total} registros importados.`);
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const removeUpload = async (id: string) => {
    if (!confirm("Remover este upload e todos os seus registros?")) return;
    try {
      await delUp({ data: { upload_id: id } });
      toast.success("Removido.");
      reload();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  const toggleAccess = async (uid: string) => {
    const has = granted.has(uid);
    try {
      await grant({ data: { user_id: uid, granted: !has } });
      const next = new Set(granted);
      if (has) next.delete(uid); else next.add(uid);
      setGranted(next);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="mb-2 text-sm font-semibold flex items-center gap-2"><Upload className="h-4 w-4 text-primary" />Importar planilha de análise</h3>
        <p className="text-xs text-muted-foreground mb-3">Envie um arquivo Excel (.xlsx, .xls) ou CSV exportado do sistema de análise de glosa. As colunas devem corresponder ao formato padrão.</p>
        <div className="flex items-center gap-4 mb-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={tipoImportacao === "ZG"}
              onCheckedChange={(v) => setTipoImportacao(v ? "ZG" : null)}
              disabled={busy}
            />
            ZG
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={tipoImportacao === "Manual"}
              onCheckedChange={(v) => setTipoImportacao(v ? "Manual" : null)}
              disabled={busy}
            />
            Manual
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                if (!tipoImportacao) {
                  toast.error("Selecione o tipo de importação (ZG ou Manual) antes de enviar.");
                  e.target.value = "";
                  return;
                }
                onFile(f);
              }
              e.target.value = "";
            }}
            className="max-w-md"
          />
          {progress && <span className="text-xs text-muted-foreground">{progress}</span>}
        </div>

      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-primary" />Uploads</h3>
        {uploads.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum upload realizado.</p>
        ) : (
          (() => {
            const tipos: Array<"ZG" | "Manual"> = ["ZG", "Manual"];
            const buckets: Record<"ZG" | "Manual", UploadRow[]> = { ZG: [], Manual: [] };
            for (const u of uploads) {
              if (u.tipo_importacao === "ZG") buckets.ZG.push(u);
              else if (u.tipo_importacao === "Manual") buckets.Manual.push(u);
            }
            const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
            const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);
            const removeDay = async (tipo: string, ups: UploadRow[]) => {
              if (!confirm(`Remover ${ups.length} upload(s) de ${tipo} deste dia e todos os seus registros?`)) return;
              try {
                for (const u of ups) await delUp({ data: { upload_id: u.id } });
                toast.success("Removidos.");
                reload();
              } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
            };
            return (
              <Tabs defaultValue="ZG" className="w-full">
                <TabsList className="grid w-full max-w-sm grid-cols-2">
                  <TabsTrigger value="ZG">ZG ({buckets.ZG.length})</TabsTrigger>
                  <TabsTrigger value="Manual">Manual ({buckets.Manual.length})</TabsTrigger>
                </TabsList>
                {tipos.map((tipo) => {
                  const list = buckets[tipo];
                  const byDay = new Map<string, UploadRow[]>();
                  for (const u of list) {
                    const k = dayKey(u.created_at);
                    if (!byDay.has(k)) byDay.set(k, []);
                    byDay.get(k)!.push(u);
                  }
                  return (
                    <TabsContent key={tipo} value={tipo} className="mt-4">
                      {list.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum upload do tipo {tipo}.</p>
                      ) : (
                        <div className="space-y-3">
                          {Array.from(byDay.entries()).map(([day, ups]) => (
                            <details key={day} className="group rounded-md border border-border">
                              <summary className="flex cursor-pointer items-center justify-between gap-3 border-b border-border bg-muted/30 px-3 py-2 list-none [&::-webkit-details-marker]:hidden">
                                <div className="flex items-center gap-2 text-xs font-medium">
                                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                                  {fmtDay(ups[0].created_at)} · {ups.length} upload{ups.length > 1 ? "s" : ""}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeDay(tipo, ups); }}
                                  className="h-7 gap-1 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Excluir todas as importações do dia
                                </Button>
                              </summary>
                              <div className="divide-y divide-border">
                                {ups.map((u) => (
                                  <div key={u.id} className="flex items-center gap-3 px-3 py-2">
                                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium truncate">{u.file_name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {u.row_count.toLocaleString("pt-BR")} linhas · {new Date(u.created_at).toLocaleString("pt-BR")}
                                      </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => removeUpload(u.id)}><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            );
          })()
        )}
      </Card>


      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Acesso ao painel de Ranking</h3>
        <p className="text-xs text-muted-foreground mb-3">Selecione quais clientes podem visualizar o painel.</p>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {users.filter((u) => u.role === "cliente").length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
          )}
          {users.filter((u) => u.role === "cliente").map((u) => (
            <label key={u.id} className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent/30">
              <Checkbox checked={granted.has(u.id)} onCheckedChange={() => toggleAccess(u.id)} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{u.full_name || u.email}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              </div>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}



/* ---------- Glosa Recuperada (Meta Batida) ---------- */

interface GlosaRecUploadRow { id: string; file_name: string; row_count: number; created_at: string; tipo_importacao: string | null; }
interface MetaRow { ano_mes: string; meta_valor: number }

function GlosaRecAdmin() {
  const [uploads, setUploads] = useState<GlosaRecUploadRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [tipoImportacao, setTipoImportacao] = useState<"ZG" | "Manual" | null>(null);

  const ingest = useServerFn(ingestGlosaRecUpload);
  const delUp = useServerFn(deleteGlosaRecUpload);
  const grant = useServerFn(grantGlosaRecAccess);
  const listAcc = useServerFn(listGlosaRecAccess);
  const listUsers = useServerFn(listAllUsers);

  const reload = useCallback(async () => {
    const [{ data: ups }, u, acc] = await Promise.all([
      supabase.from("glosa_rec_uploads").select("id, file_name, row_count, created_at, tipo_importacao").order("created_at", { ascending: false }).limit(500),
      listUsers(),
      listAcc(),
    ]);
    setUploads((ups ?? []) as GlosaRecUploadRow[]);
    setUsers(u);
    setGranted(new Set(acc));
  }, [listUsers, listAcc]);
  useEffect(() => { reload(); }, [reload]);

  const onFile = async (file: File) => {
    setBusy(true);
    setProgress("Lendo arquivo…");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const cellKeys = Object.keys(sheet).filter((k) => !k.startsWith("!"));
      let maxRow = 0, maxCol = 0;
      for (const k of cellKeys) {
        const ref = XLSX.utils.decode_cell(k);
        if (ref.r > maxRow) maxRow = ref.r;
        if (ref.c > maxCol) maxCol = ref.c;
      }
      if (maxRow > 0) sheet["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
      if (rows.length === 0) { toast.error("Planilha vazia."); return; }
      setProgress(`Enviando ${rows.length} linhas…`);
      const chunkSize = 2000;
      let total = 0;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const label = rows.length > chunkSize
          ? `${file.name} (parte ${Math.floor(i / chunkSize) + 1}/${Math.ceil(rows.length / chunkSize)})`
          : file.name;
        setProgress(`Enviando ${i + chunk.length} de ${rows.length}…`);
        const res = await ingest({ data: { file_name: label, rows: chunk, tipo_importacao: tipoImportacao } });
        total += res.count;
      }
      toast.success(`${total} registros importados.`);
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const removeUpload = async (id: string) => {
    if (!confirm("Remover este upload e todos os seus registros?")) return;
    try { await delUp({ data: { upload_id: id } }); toast.success("Removido."); reload(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  const toggleAccess = async (uid: string) => {
    const has = granted.has(uid);
    try {
      await grant({ data: { user_id: uid, granted: !has } });
      const next = new Set(granted);
      if (has) next.delete(uid); else next.add(uid);
      setGranted(next);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };


  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="mb-2 text-sm font-semibold flex items-center gap-2"><Upload className="h-4 w-4 text-primary" />Importar planilha</h3>
        <p className="text-xs text-muted-foreground mb-3">Envie a planilha do relatório Glosa Recuperada (.xlsx/.xls/.csv) com as colunas padrão.</p>
        <div className="flex items-center gap-4 mb-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={tipoImportacao === "ZG"}
              onCheckedChange={(v) => setTipoImportacao(v ? "ZG" : null)}
              disabled={busy}
            />
            ZG
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={tipoImportacao === "Manual"}
              onCheckedChange={(v) => setTipoImportacao(v ? "Manual" : null)}
              disabled={busy}
            />
            Manual
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                if (!tipoImportacao) {
                  toast.error("Selecione o tipo de importação (ZG ou Manual) antes de enviar.");
                  e.target.value = "";
                  return;
                }
                onFile(f);
              }
              e.target.value = "";
            }}
            className="max-w-md"
          />
          {progress && <span className="text-xs text-muted-foreground">{progress}</span>}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-primary" />Uploads</h3>
        {uploads.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum upload realizado.</p>
        ) : (
          (() => {
            const tipos: Array<"ZG" | "Manual"> = ["ZG", "Manual"];
            const buckets: Record<"ZG" | "Manual", GlosaRecUploadRow[]> = { ZG: [], Manual: [] };
            for (const u of uploads) {
              if (u.tipo_importacao === "ZG") buckets.ZG.push(u);
              else if (u.tipo_importacao === "Manual") buckets.Manual.push(u);
            }
            const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
            const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);
            const removeDay = async (tipo: string, ups: GlosaRecUploadRow[]) => {
              if (!confirm(`Remover ${ups.length} upload(s) de ${tipo} deste dia e todos os seus registros?`)) return;
              try {
                for (const u of ups) await delUp({ data: { upload_id: u.id } });
                toast.success("Removidos.");
                reload();
              } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
            };
            return (
              <Tabs defaultValue="ZG" className="w-full">
                <TabsList className="grid w-full max-w-sm grid-cols-2">
                  <TabsTrigger value="ZG">ZG ({buckets.ZG.length})</TabsTrigger>
                  <TabsTrigger value="Manual">Manual ({buckets.Manual.length})</TabsTrigger>
                </TabsList>
                {tipos.map((tipo) => {
                  const list = buckets[tipo];
                  const byDay = new Map<string, GlosaRecUploadRow[]>();
                  for (const u of list) {
                    const k = dayKey(u.created_at);
                    if (!byDay.has(k)) byDay.set(k, []);
                    byDay.get(k)!.push(u);
                  }
                  return (
                    <TabsContent key={tipo} value={tipo} className="mt-4">
                      {list.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum upload do tipo {tipo}.</p>
                      ) : (
                        <div className="space-y-3">
                          {Array.from(byDay.entries()).map(([day, ups]) => (
                            <details key={day} className="group rounded-md border border-border">
                              <summary className="flex cursor-pointer items-center justify-between gap-3 border-b border-border bg-muted/30 px-3 py-2 list-none [&::-webkit-details-marker]:hidden">
                                <div className="flex items-center gap-2 text-xs font-medium">
                                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                                  {fmtDay(ups[0].created_at)} · {ups.length} upload{ups.length > 1 ? "s" : ""}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeDay(tipo, ups); }}
                                  className="h-7 gap-1 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Excluir todas as importações do dia
                                </Button>
                              </summary>
                              <div className="divide-y divide-border">
                                {ups.map((u) => (
                                  <div key={u.id} className="flex items-center gap-3 px-3 py-2">
                                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium truncate">{u.file_name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {u.row_count.toLocaleString("pt-BR")} linhas · {new Date(u.created_at).toLocaleString("pt-BR")}
                                      </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => removeUpload(u.id)}><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            );
          })()
        )}
      </Card>


      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Acesso ao painel</h3>
        <p className="text-xs text-muted-foreground mb-3">Selecione quais clientes podem visualizar o dashboard.</p>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {users.filter((u) => u.role === "cliente").length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
          )}
          {users.filter((u) => u.role === "cliente").map((u) => (
            <label key={u.id} className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent/30">
              <Checkbox checked={granted.has(u.id)} onCheckedChange={() => toggleAccess(u.id)} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{u.full_name || u.email}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              </div>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Glosa Motivos (Análise Sintética) ---------- */

interface GlosaMotivosUploadRow { id: string; file_name: string; row_count: number; created_at: string; }

function GlosaMotivosAdmin() {
  const [uploads, setUploads] = useState<GlosaMotivosUploadRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ step: string; detail?: string } | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const ingest = useServerFn(ingestGlosaMotivosUpload);
  const delUp = useServerFn(deleteGlosaMotivosUpload);
  const grant = useServerFn(grantGlosaMotivosAccess);
  const listAcc = useServerFn(listGlosaMotivosAccess);
  const listUsers = useServerFn(listAllUsers);

  const reload = useCallback(async () => {
    const [{ data: ups }, u, acc] = await Promise.all([
      supabase.from("glosa_motivos_uploads").select("id, file_name, row_count, created_at").order("created_at", { ascending: false }).limit(500),
      listUsers(),
      listAcc(),
    ]);
    setUploads((ups ?? []) as GlosaMotivosUploadRow[]);
    setUsers(u);
    setGranted(new Set(acc));
  }, [listUsers, listAcc]);
  useEffect(() => { reload(); }, [reload]);

  const onFile = async (file: File) => {
    setBusy(true);
    setProgress({ step: "Lendo arquivo…", detail: "Extraindo dados da planilha Excel" });
    try {
      const buf = await file.arrayBuffer();
      setProgress({ step: "Processando estrutura…", detail: "Calculando dimensões da planilha" });
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const cellKeys = Object.keys(sheet).filter((k) => !k.startsWith("!"));
      let maxRow = 0, maxCol = 0;
      for (const k of cellKeys) {
        const ref = XLSX.utils.decode_cell(k);
        if (ref.r > maxRow) maxRow = ref.r;
        if (ref.c > maxCol) maxCol = ref.c;
      }
      if (maxRow > 0) {
        sheet["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });
      }
      setProgress({ step: "Convertendo dados…", detail: `Transformando ${maxRow} linhas em formato JSON` });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
      if (rows.length === 0) { toast.error("Planilha vazia."); return; }
      const chunkSize = 2000;
      let total = 0;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const label = rows.length > chunkSize
          ? `${file.name} (parte ${Math.floor(i / chunkSize) + 1}/${Math.ceil(rows.length / chunkSize)})`
          : file.name;
        setProgress({ 
          step: `Enviando para o banco…`, 
          detail: `Processando lote ${Math.floor(i / chunkSize) + 1} de ${Math.ceil(rows.length / chunkSize)} (${i + chunk.length} de ${rows.length} registros)` 
        });
        const res = await ingest({ data: { file_name: label, rows: chunk } });
        total += res.count;
      }
      setProgress({ step: "Finalizando…", detail: "Atualizando visão do dashboard" });
      toast.success(`${total} registros importados.`);
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const removeUpload = async (id: string) => {
    if (!confirm("Remover este upload e todos os seus registros?")) return;
    try {
      await delUp({ data: { upload_id: id } });
      toast.success("Removido.");
      reload();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  const removeUploadsByDay = async (day: string, dayUploads: GlosaMotivosUploadRow[]) => {
    if (!confirm(`Remover as ${dayUploads.length} importações do dia ${day} e todos os seus registros?`)) return;
    setBusy(true);
    try {
      for (const u of dayUploads) {
        await delUp({ data: { upload_id: u.id } });
      }
      toast.success(`Importações do dia ${day} removidas.`);
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    } finally {
      setBusy(false);
    }
  };

  const uploadsByDay = useMemo(() => {
    const groups: Record<string, GlosaMotivosUploadRow[]> = {};
    for (const u of uploads) {
      const day = new Date(u.created_at).toLocaleDateString("pt-BR");
      if (!groups[day]) groups[day] = [];
      groups[day].push(u);
    }
    return Object.entries(groups).sort((a, b) => {
      // Sort days descending
      const dateA = new Date(a[1][0].created_at);
      const dateB = new Date(b[1][0].created_at);
      return dateB.getTime() - dateA.getTime();
    });
  }, [uploads]);

  const toggleDay = (day: string) => {
    const next = new Set(expandedDays);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    setExpandedDays(next);
  };

  const toggleAccess = async (uid: string) => {
    const has = granted.has(uid);
    try {
      await grant({ data: { user_id: uid, granted: !has } });
      const next = new Set(granted);
      if (has) next.delete(uid); else next.add(uid);
      setGranted(next);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="mb-2 text-sm font-semibold flex items-center gap-2"><Upload className="h-4 w-4 text-primary" />Importar planilha de motivos de glosa</h3>
        <p className="text-xs text-muted-foreground mb-3">Envie um arquivo Excel (.xlsx, .xls) ou CSV com a análise sintética dos motivos de glosa. As colunas são identificadas automaticamente.</p>
        <div className="flex items-center gap-3">
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
            className="max-w-md"
          />
          {progress && (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-primary animate-pulse">{progress.step}</span>
              {progress.detail && <span className="text-xs text-muted-foreground">{progress.detail}</span>}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />Uploads
        </h3>
        {uploads.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum upload realizado.</p>
        ) : (
          <div className="space-y-3">
            {uploadsByDay.map(([day, dayUploads]) => {
              const isOpen = expandedDays.has(day);
              return (
                <div key={day} className="border border-border rounded-md overflow-hidden">
                  <div 
                    className="bg-muted/30 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleDay(day)}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      <span className="text-sm font-semibold">{day}</span>
                      <span className="text-xs text-muted-foreground">({dayUploads.length} importações)</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUploadsByDay(day, dayUploads);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir todas do dia
                    </Button>
                  </div>
                  
                  {isOpen && (
                    <div className="divide-y divide-border">
                      {dayUploads.map((u) => (
                        <div key={u.id} className="flex items-center gap-3 px-3 py-2 pl-9">
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{u.file_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {u.row_count.toLocaleString("pt-BR")} linhas · {new Date(u.created_at).toLocaleTimeString("pt-BR")}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeUpload(u.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>


      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Acesso ao painel</h3>
        <p className="text-xs text-muted-foreground mb-3">Selecione quais clientes podem visualizar a análise sintética.</p>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {users.filter((u) => u.role === "cliente").length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
          )}
          {users.filter((u) => u.role === "cliente").map((u) => (
            <label key={u.id} className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent/30">
              <Checkbox checked={granted.has(u.id)} onCheckedChange={() => toggleAccess(u.id)} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{u.full_name || u.email}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              </div>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Prazos Operadoras ---------- */

interface PrazosUploadRow { id: string; file_name: string; row_count: number; created_at: string | null; tipo_importacao: string | null; }

function PrazosAdmin() {
  const [uploads, setUploads] = useState<PrazosUploadRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [tipoImportacao, setTipoImportacao] = useState<"ZG" | "Manual" | null>(null);
  
  const listUsers = useServerFn(listAllUsers);

  const ingest = useServerFn(ingestPrazosUpload);
  const delUp = useServerFn(deletePrazosUpload);

  const reload = useCallback(async () => {
    const [{ data: ups }, u, acc] = await Promise.all([
      supabase.from("prazos_operadoras_uploads").select("*").order("created_at", { ascending: false }).limit(100),
      listUsers(),
      supabase.from("prazos_pagamento_dashboard_access").select("user_id"),
    ]);
    setUploads(ups ?? []);
    setUsers(u);
    setGranted(new Set(acc.data?.map(r => r.user_id) ?? []));
  }, [listUsers]);

  useEffect(() => { reload(); }, [reload]);

  const onFile = async (file: File) => {
    if (!tipoImportacao) return toast.error("Selecione o tipo de importação.");
    setBusy(true);
    setProgress("Lendo arquivo...");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      
      // Forçar o recálculo do range para garantir que todas as linhas sejam lidas
      const cellKeys = Object.keys(sheet).filter((k) => !k.startsWith("!"));
      let maxRow = 0, maxCol = 0;
      for (const k of cellKeys) {
        const ref = XLSX.utils.decode_cell(k);
        if (ref.r > maxRow) maxRow = ref.r;
        if (ref.c > maxCol) maxCol = ref.c;
      }
      if (maxRow > 0) {
        sheet["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
      
      const chunkSize = 2000;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        setProgress(`Enviando ${i + chunk.length} de ${rows.length}...`);
        await ingest({ data: { file_name: file.name, rows: chunk, tipo_importacao: tipoImportacao } });
      }
      toast.success("Importação concluída.");
      reload();
    } catch (e: any) {
      toast.error(e.message || "Erro na importação.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const removeUpload = async (id: string) => {
    if (!confirm("Remover este upload?")) return;
    try {
      await delUp({ data: { upload_id: id } });
      toast.success("Removido.");
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleAccess = async (uid: string) => {
    const has = granted.has(uid);
    try {
      if (has) {
        const { error } = await supabase.from("prazos_pagamento_dashboard_access").delete().eq("user_id", uid);
        if (error) throw error;
        granted.delete(uid);
      } else {
        const { error } = await supabase.from("prazos_pagamento_dashboard_access").insert({ user_id: uid });
        if (error) throw error;
        granted.add(uid);
      }
      setGranted(new Set(granted));
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="mb-2 text-sm font-semibold flex items-center gap-2"><Upload className="h-4 w-4 text-primary" />Importar Prazos</h3>
        <div className="flex items-center gap-4 mb-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox checked={tipoImportacao === "ZG"} onCheckedChange={(v) => setTipoImportacao(v ? "ZG" : null)} /> ZG
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox checked={tipoImportacao === "Manual"} onCheckedChange={(v) => setTipoImportacao(v ? "Manual" : null)} /> Manual
          </label>
        </div>
        <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} disabled={busy} />
        {progress && <p className="mt-2 text-xs text-muted-foreground">{progress}</p>}
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Uploads Realizados</h3>
        <div className="space-y-2">
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-2 border rounded text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{u.file_name}</div>
                <div className="text-xs text-muted-foreground">{u.row_count} linhas · {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeUpload(u.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {uploads.length === 0 && <p className="text-sm text-muted-foreground">Nenhum upload.</p>}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Acesso ao painel</h3>
        <p className="text-xs text-muted-foreground mb-3">Selecione quais clientes podem visualizar o painel de prazos.</p>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {users.filter((u) => u.role === "cliente").length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
          )}
          {users.filter((u) => u.role === "cliente").map((u) => (
            <label key={u.id} className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent/30">
              <Checkbox checked={granted.has(u.id)} onCheckedChange={() => toggleAccess(u.id)} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{u.full_name || u.email}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              </div>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}





/* ---------- CBHPM ---------- */

function CBHPMAdmin() {
  const [busy, setBusy] = useState(false);
  const ingestProcedimentos = useServerFn(ingestCBHPMProcedimentos);
  const ingestPortes = useServerFn(ingestCBHPMPortes);

  const onFileProcedimentos = async (file: File) => {
    setBusy(true);
    const toastId = toast.loading("Processando procedimentos...");
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as any[];
      
      const { count } = await ingestProcedimentos({ data: { rows } });
      toast.success(`${count} procedimentos importados/atualizados.`, { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Erro ao importar procedimentos", { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  const onFilePortes = async (file: File) => {
    setBusy(true);
    const toastId = toast.loading("Processando portes...");
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as any[];
      
      const { count } = await ingestPortes({ data: { rows } });
      toast.success(`${count} valores de portes importados/atualizados.`, { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Erro ao importar portes", { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Tabela de Procedimentos</h3>
          <p className="text-xs text-muted-foreground">Importe a tabela com colunas: Código, Descrição, Porte, Custo Operacional, UCO.</p>
          <Input 
            type="file" 
            accept=".xlsx,.xls" 
            disabled={busy} 
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFileProcedimentos(f);
              e.target.value = "";
            }}
          />
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Tabela de Portes (Valores)</h3>
          <p className="text-xs text-muted-foreground">Importe a tabela com colunas: Porte, Subporte, Valor.</p>
          <Input 
            type="file" 
            accept=".xlsx,.xls" 
            disabled={busy} 
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFilePortes(f);
              e.target.value = "";
            }}
          />
        </Card>
      </div>
    </div>
  );
}
