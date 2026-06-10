import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { listDemandResponsibles, listDemandAnnotations } from "@/lib/demands.functions";
import { uploadDemandAttachment, useRefreshedDemandContent } from "@/lib/demand-attachments";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Pencil,
  Trash2,
  FileText,
  History,
  RotateCcw,
  Timer,
  AlertTriangle,
  MessageSquare,
  Send
} from "lucide-react";
import { format, differenceInHours, differenceInMinutes, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";


export const Route = createFileRoute("/agendas-positivas")({
  component: AgendasPositivasPage,
  ssr: false,
});

const demandSchema = z.object({
  subject: z.string().min(3, "Assunto deve ter pelo menos 3 caracteres"),
  insurance: z.string().min(2, "Convênio é obrigatório"),
  responsible_sector: z.string().min(2, "Setor responsável é obrigatório"),
  description: z.string().min(5, "Descrição é obrigatória"),
  status: z.enum(["Pendente", "Em Atendimento", "Atendida"]),
  responsible_user: z.string().optional().nullable(),
  responsible_id: z.string().uuid().optional().nullable(),
  account_number: z.string().optional().nullable(),
  opening_date: z.string(),
  glosa_reason: z.string().optional().nullable(),
});

type DemandFormValues = z.infer<typeof demandSchema>;

function AgendasPositivasPage() {
  return (
    <AppShell>
      <AgendasPositivasInner />
    </AppShell>
  );
}

function AgendasPositivasInner() {
  const { user, role, login, fullName } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [responsibleFilter, setResponsibleFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [glosaSearch, setGlosaSearch] = useState("");
  const quillRef = useRef<any>(null);

  const { data: motivosGlosa } = useQuery({
    queryKey: ["motivos_glosa", glosaSearch],
    queryFn: async () => {
      let query = supabase.from("motivos_glosa").select("codigo, descricao");
      if (glosaSearch) {
        query = query.or(`codigo.ilike.%${glosaSearch}%,descricao.ilike.%${glosaSearch}%`);
      }
      const { data, error } = await query.limit(10);
      if (error) throw error;
      return data;
    },
    enabled: isDialogOpen,
  });

  const imageHandler = useMemo(() => {
    return () => {
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', 'image/*');
      input.click();

      input.onchange = async () => {
        const file = input.files?.[0];
        if (file) {
          if (!user) {
            toast.error("Sessão expirada. Faça login novamente.");
            return;
          }
          const fileExt = file.name.split('.').pop();
          toast.info("Enviando imagem...");
          try {
            const { signedUrl } = await uploadDemandAttachment(file, user.id, fileExt);
            const quill = quillRef.current.getEditor();
            const range = quill.getSelection();
            quill.insertEmbed(range.index, 'image', signedUrl);
            toast.success("Imagem inserida!");
          } catch (err: any) {
            toast.error("Erro ao enviar imagem: " + (err?.message ?? "desconhecido"));
          }
        }
      };
    };
  }, [user]);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline'],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), [imageHandler]);

  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<any>(null);
  const [selectedDemand, setSelectedDemand] = useState<any>(null);
  const [newAnnotation, setNewAnnotation] = useState("");

  const { data: allUsers } = useQuery({
    queryKey: ["all_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, login, email")
        .order("full_name");
        
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: operadoras } = useQuery({
    queryKey: ["operadoras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operadoras")
        .select("nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: setores } = useQuery({
    queryKey: ["setores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setores")
        .select("nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });



  const { data: demands, isLoading } = useQuery({
    queryKey: ["agendas_positivas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendas_positivas")
        .select(`
          *,
          creator:profiles!user_id(full_name, login),
          responsible:profiles!responsible_id(full_name, login),
          annotations:demand_annotations(id)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fetchResponsibles = useServerFn(listDemandResponsibles);
  const { data: responsibleUsers = [] } = useQuery({
    queryKey: ["demand_responsibles"],
    queryFn: () => fetchResponsibles(),
  });


  const createMutation = useMutation({
    mutationFn: async (values: DemandFormValues) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase.from("agendas_positivas").insert([{
        ...values,
        user_id: user.id,
        treatment_count: 1
      }]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendas_positivas"] });
      toast.success("Demanda registrada com sucesso!");
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao registrar demanda: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values, currentDemand }: { id: string; values: any; currentDemand: any }) => {
      const isReopening = currentDemand.status === "Atendida" && values.status !== "Atendida";
      const isResolving = values.status === "Atendida" && currentDemand.status !== "Atendida";
      
      // Filtrar apenas campos que existem na tabela para evitar erros de schema cache
      const updatePayload: any = { 
        subject: values.subject,
        insurance: values.insurance,
        responsible_sector: values.responsible_sector,
        description: values.description,
        status: values.status,
        responsible_user: values.responsible_user,
        responsible_id: values.responsible_id,
        account_number: values.account_number,
        opening_date: values.opening_date,
        glosa_reason: values.glosa_reason,
        treatment_count: (currentDemand.treatment_count || 0) + 1,
        reopening_count: isReopening ? (currentDemand.reopening_count || 0) + 1 : (currentDemand.reopening_count || 0),
        updated_at: new Date().toISOString()
      };

      if (isResolving && !currentDemand.resolved_at) {
        updatePayload.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase.from("agendas_positivas").update(updatePayload).eq("id", id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendas_positivas"] });
      toast.success("Demanda atualizada com sucesso!");
      setIsDialogOpen(false);
      setEditingDemand(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar demanda: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agendas_positivas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendas_positivas"] });
      toast.success("Demanda excluída com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir demanda: " + error.message);
    },
  });

  const fetchAnnotations = useServerFn(listDemandAnnotations);
  const { data: currentAnnotations, refetch: refetchAnnotations } = useQuery({
    queryKey: ["demand_annotations", selectedDemand?.id],
    queryFn: async () => {
      if (!selectedDemand?.id) return [];
      return await fetchAnnotations({ data: { demandId: selectedDemand.id } });
    },
    enabled: !!selectedDemand?.id,
  });

  const addAnnotationMutation = useMutation({
    mutationFn: async ({ demandId, content }: { demandId: string; content: string }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase.from("demand_annotations").insert([{
        demand_id: demandId,
        user_id: user.id,
        content
      }]);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["agendas_positivas"] });
      queryClient.invalidateQueries({ queryKey: ["demand_annotations", variables.demandId] });
      refetchAnnotations();
      setNewAnnotation("");
      toast.success("Anotação adicionada!");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar anotação: " + error.message);
    },
  });

  const form = useForm<DemandFormValues>({
    resolver: zodResolver(demandSchema),
    defaultValues: {
      subject: "",
      insurance: "",
      responsible_sector: "",
      description: "",
      status: "Pendente",
      responsible_user: "",
      responsible_id: null,
      account_number: "",
      opening_date: new Date().toISOString(),
      glosa_reason: "",
    },
  });

  const onSubmit = (values: DemandFormValues) => {
    if (editingDemand) {
      updateMutation.mutate({ id: editingDemand.id, values, currentDemand: editingDemand });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (demand: any) => {
    setEditingDemand(demand);
    form.reset({
      subject: demand.subject,
      insurance: demand.insurance,
      responsible_sector: demand.responsible_sector,
      description: demand.description,
      status: demand.status as any,
      responsible_user: demand.responsible_user || "",
      responsible_id: demand.responsible_id || null,
      account_number: demand.account_number || "",
      opening_date: demand.opening_date,
      glosa_reason: demand.glosa_reason || "",
    });
    setIsDialogOpen(true);
  };

  const handleFollowUp = (demand: any) => {
    setSelectedDemand(demand);
    setIsFollowUpOpen(true);
  };

  const handleAddNew = () => {
    setEditingDemand(null);
    const isCliente = role === "cliente";
    form.reset({
      subject: "",
      insurance: "",
      responsible_sector: "",
      description: "",
      status: "Pendente",
      responsible_user: isCliente ? (fullName || login || "") : "",
      responsible_id: isCliente ? (user?.id || null) : null,
      account_number: "",
      opening_date: new Date().toISOString(),
      glosa_reason: "",
    });
    setIsDialogOpen(true);
  };

  const filteredDemands = demands?.filter((d) => {
    const matchesSearch = 
      d.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.insurance.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.so_number.toString().includes(searchTerm) ||
      (d.account_number && d.account_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.responsible?.full_name && d.responsible.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.responsible?.login && d.responsible.login.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    const matchesResponsible = responsibleFilter === "all" || d.responsible_id === responsibleFilter;
    
    return matchesSearch && matchesStatus && matchesResponsible;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pendente":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="mr-1 h-3 w-3" /> Pendente</Badge>;
      case "Em Atendimento":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20"><AlertCircle className="mr-1 h-3 w-3" /> Em Atendimento</Badge>;
      case "Atendida":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="mr-1 h-3 w-3" /> Atendida</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const getResolutionTime = (openingDate: string, resolvedAt: string | null) => {
    if (!resolvedAt) return null;
    const start = new Date(openingDate);
    const end = new Date(resolvedAt);
    
    const days = differenceInDays(end, start);
    const hours = differenceInHours(end, start) % 24;
    const minutes = differenceInMinutes(end, start) % 60;
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}min`;
  };

  const isRecurrent = (demand: any) => {
    if (!demands) return false;
    return demands.some(d => 
      d.id !== demand.id && 
      d.subject.toLowerCase() === demand.subject.toLowerCase() && 
      d.insurance.toLowerCase() === demand.insurance.toLowerCase()
    );
  };

  const handleImagePaste = async (
    e: React.ClipboardEvent<HTMLTextAreaElement>, 
    setValue: (val: string) => void,
    currentValue: string
  ) => {
    const items = e.clipboardData.items;
    let imageFound = false;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        imageFound = true;
        const file = items[i].getAsFile();
        if (!file) continue;
        if (!user) {
          toast.error("Sessão expirada. Faça login novamente.");
          return;
        }

        toast.info("Enviando imagem...");
        try {
          const { signedUrl } = await uploadDemandAttachment(file, user.id, "png");
          const markdownImage = `\n![imagem](${signedUrl})\n`;
          setValue(currentValue + markdownImage);
          toast.success("Imagem anexada!");
        } catch (err: any) {
          toast.error("Erro ao enviar imagem: " + (err?.message ?? "desconhecido"));
          return;
        }
      }
    }
    
    if (imageFound) {
      e.preventDefault();
    }
  };

  const RenderedDemandContent = ({ content }: { content: string | null | undefined }) => {
    const resolved = useRefreshedDemandContent(content);
    if (!resolved) return null;

    // Check if it's HTML (from ReactQuill) or Markdown (legacy)
    if (resolved.trim().startsWith('<') || resolved.includes('<p>') || resolved.includes('<img')) {
      return <div className="prose prose-sm max-w-none dark:prose-invert [&_img]:max-w-full [&_img]:rounded-md [&_img]:border [&_img]:shadow-sm" dangerouslySetInnerHTML={{ __html: resolved }} />;
    }

    const parts = resolved.split(/(!\[.*?\]\(.*?\))/g);

    return (
      <>
        {parts.map((part, index) => {
          const match = part.match(/!\[(.*?)\]\((.*?)\)/);
          if (match) {
            const alt = match[1];
            const url = match[2];
            return (
              <div key={index} className="my-2">
                <img
                  src={url}
                  alt={alt}
                  className="max-w-full rounded-md border shadow-sm cursor-zoom-in hover:opacity-90 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(url, '_blank');
                  }}
                />
              </div>
            );
          }
          return <span key={index} className="whitespace-pre-wrap">{part}</span>;
        })}
      </>
    );
  };

  const stripImages = (text: string) => {
    if (!text) return "";
    // Handle HTML (ReactQuill)
    if (text.includes('<')) {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      return doc.body.textContent || "";
    }
    // Handle Markdown
    return text.replace(/!\[.*?\]\(.*?\)/g, '[Imagem]');
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda Positiva</h1>
          <p className="text-muted-foreground">Gestão de demandas e solicitações hospitalares</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Demanda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[85vw] w-full overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingDemand ? "Editar Demanda" : "Nova Demanda de Agenda Positiva"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assunto</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Ajuste de Agenda" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="insurance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Convênio</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a operadora" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {operadoras?.map((op) => (
                              <SelectItem key={op.nome} value={op.nome}>
                                {op.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responsible_sector"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor Responsável</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o setor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {setores?.map((setor) => (
                              <SelectItem key={setor.nome} value={setor.nome}>
                                {setor.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                            <SelectItem value="Em Atendimento">Em Atendimento</SelectItem>
                            <SelectItem value="Atendida">Atendida</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {role === "admin" ? (
                    <FormField
                      control={form.control}
                      name="responsible_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável pelo Atendimento</FormLabel>
                          <Select 
                            onValueChange={(val) => {
                              field.onChange(val);
                              // Sync responsible_user text for backward compatibility
                              const selectedUser = allUsers?.find(u => u.id === val);
                              if (selectedUser) {
                                form.setValue("responsible_user", selectedUser.full_name || selectedUser.login || selectedUser.email);
                              }
                            }} 
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o responsável" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {allUsers?.map((u: any) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.full_name || u.login} ({u.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="responsible_user"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável pelo Atendimento</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do responsável" {...field} value={field.value || ""} disabled />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="account_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Conta</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 123456" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-2">
                      <Label>Buscar Motivo de Glosa</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal border-dashed">
                            <Search className="mr-2 h-4 w-4" />
                            <span>Pesquisar código ou descrição...</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <div className="p-2 border-b">
                            <Input 
                              placeholder="Digite o código ou descrição..." 
                              value={glosaSearch}
                              onChange={(e) => setGlosaSearch(e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div className="max-h-[300px] overflow-y-auto p-1">
                            {motivosGlosa?.length === 0 ? (
                              <p className="p-4 text-center text-sm text-muted-foreground">Nenhum motivo encontrado</p>
                            ) : (
                              motivosGlosa?.map((glosa) => (
                                <button
                                  key={glosa.codigo}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent transition-colors flex flex-col gap-1 border-b last:border-0 border-border/40"
                                  onClick={() => {
                                    form.setValue("glosa_reason", `${glosa.codigo} - ${glosa.descricao}`);
                                    toast.success(`Motivo ${glosa.codigo} selecionado`);
                                  }}
                                >
                                  <span className="font-bold text-primary">Código: {glosa.codigo}</span>
                                  <span className="text-muted-foreground leading-tight">{glosa.descricao}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <FormField
                      control={form.control}
                      name="glosa_reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motivo de Glosa Selecionado</FormLabel>
                          <FormControl>
                            <Input placeholder="O motivo selecionado aparecerá aqui" {...field} value={field.value || ""} readOnly className="bg-muted/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="opening_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="mb-2">Data de Abertura</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full md:w-[220px] pl-3 text-left font-normal border-border/50 bg-background/50 hover:bg-background/80 transition-colors",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "dd/MM/yyyy HH:mm:ss")
                                ) : (
                                  <span>Selecione a data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  const currentTime = field.value ? new Date(field.value) : new Date();
                                  date.setHours(currentTime.getHours());
                                  date.setMinutes(currentTime.getMinutes());
                                  date.setSeconds(currentTime.getSeconds());
                                  field.onChange(date.toISOString());
                                }
                              }}
                              initialFocus
                              locale={ptBR}
                            />
                            <div className="p-3 border-t border-border bg-muted/20">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="time"
                                  step="1"
                                  value={field.value ? format(new Date(field.value), "HH:mm:ss") : ""}
                                  onChange={(e) => {
                                    const timeStr = e.target.value;
                                    if (!timeStr) return;
                                    const [hours, minutes, seconds] = timeStr.split(":").map(Number);
                                    const newDate = field.value ? new Date(field.value) : new Date();
                                    newDate.setHours(hours || 0);
                                    newDate.setMinutes(minutes || 0);
                                    newDate.setSeconds(seconds || 0);
                                    field.onChange(newDate.toISOString());
                                  }}
                                  className="h-8 text-xs bg-background"
                                />
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição da Demanda</FormLabel>
                      <FormControl>
                      <FormControl>
                        <Textarea 
                          placeholder="Detalhes da solicitação (você pode colar imagens aqui)..." 
                          className="min-h-[100px]" 
                          {...field} 
                          onPaste={(e) => handleImagePaste(e, (val) => field.onChange(val), field.value)}
                        />
                      </FormControl>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingDemand ? "Salvar Alterações" : "Criar Demanda"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Demandas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredDemands?.length || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {filteredDemands?.filter(d => d.status === "Pendente").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {filteredDemands?.filter(d => d.status === "Atendida").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none bg-card/30 shadow-none">
        <CardHeader className="px-0">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por SO, assunto ou convênio..."
                className="pl-9 bg-background/50 border-border/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-background/50 border-border/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Em Atendimento">Em Atendimento</SelectItem>
                  <SelectItem value="Atendida">Atendida</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                <SelectTrigger className="w-[180px] bg-background/50 border-border/50">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Responsáveis</SelectItem>
                  {responsibleUsers?.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.login}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="rounded-md border border-border/50 bg-background/20 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">SO</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Convênio</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Métricas</TableHead>
                  <TableHead>Abertura / Ult. Atu.</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">Carregando...</TableCell>
                  </TableRow>
                ) : filteredDemands?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">Nenhuma demanda encontrada.</TableCell>
                  </TableRow>
                ) : (
                  filteredDemands?.map((demand) => {
                    const recurrent = isRecurrent(demand);
                    const resolutionTime = getResolutionTime(demand.opening_date, demand.resolved_at);
                    
                    return (
                      <TableRow key={demand.id} className={`hover:bg-muted/30 transition-colors ${recurrent ? 'border-l-4 border-l-orange-500' : ''}`}>
                        <TableCell className="font-mono text-xs font-semibold">SO-{demand.so_number.toString().padStart(4, '0')}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-2">
                              {demand.subject}
                              {recurrent && (
                                <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-200 text-[10px] h-4 px-1">
                                  Recorrente
                                </Badge>
                              )}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="bg-muted px-1 rounded text-primary font-medium">Conta: {demand.account_number || "-"}</span>
                              <span className="line-clamp-1 flex-1">{stripImages(demand.description)}</span>
                            </div>
                            {demand.responsible && (
                              <div className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                                <Plus className="h-2 w-2" /> Resp: {demand.responsible.full_name || demand.responsible.login}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{demand.insurance}</TableCell>
                        <TableCell className="text-xs">{demand.responsible_sector}</TableCell>
                        <TableCell>{getStatusBadge(demand.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-[10px]">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <History className="h-3 w-3 text-blue-500" />
                              <span>{demand.treatment_count || 0} tratativas</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <MessageSquare className="h-3 w-3 text-purple-500" />
                              <span>{demand.annotations?.length || 0} anotações</span>
                            </div>
                            {(demand.reopening_count || 0) > 0 && (
                              <div className="flex items-center gap-1.5 text-orange-600 font-medium">
                                <RotateCcw className="h-3 w-3" />
                                <span>{demand.reopening_count} reaberturas</span>
                              </div>
                            )}
                            {resolutionTime && (
                              <div className="flex items-center gap-1.5 text-green-600 font-medium">
                                <Timer className="h-3 w-3" />
                                <span>Resolvido em {resolutionTime}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[10px] whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-col">
                              <span className="text-foreground/70 font-semibold">Criado por:</span>
                              <span>{demand.creator?.full_name || demand.creator?.login || "Sistema"}</span>
                            </div>
                            <div className="flex flex-col border-t border-border/30 pt-1">
                              <span className="text-foreground/70 font-semibold">Abertura:</span>
                              <span className="flex items-center gap-1"><CalendarIcon className="h-2.5 w-2.5" /> {format(new Date(demand.opening_date), 'dd/MM/yyyy HH:mm:ss')}</span>
                            </div>
                            <div className="flex flex-col border-t border-border/30 pt-1">
                              <span className="text-foreground/70">Última Atu:</span>
                              <span className="flex items-center gap-1 italic"><Clock className="h-2.5 w-2.5" /> {format(new Date(demand.updated_at), 'dd/MM/yyyy HH:mm:ss')}</span>
                            </div>
                          </div>
                        </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleFollowUp(demand)} className="gap-2 cursor-pointer">
                              <MessageSquare className="h-3.5 w-3.5" /> Acompanhar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(demand)} className="gap-2 cursor-pointer">
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              if(window.confirm("Tem certeza que deseja excluir esta demanda?")) {
                                deleteMutation.mutate(demand.id);
                              }
                            }} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
                              <Trash2 className="h-3.5 w-3.5" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFollowUpOpen} onOpenChange={setIsFollowUpOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Acompanhar Demanda: SO-{selectedDemand?.so_number.toString().padStart(4, '0')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-6 py-4">
            <div className="flex flex-col gap-6">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <h3 className="font-semibold text-sm border-b pb-2">Detalhes da Demanda</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-muted-foreground font-medium">Assunto:</div>
                  <div className="font-semibold text-foreground">{selectedDemand?.subject}</div>
                  <div className="text-muted-foreground font-medium">Conta:</div>
                  <div className="font-semibold text-primary">{selectedDemand?.account_number || "-"}</div>
                  <div className="text-muted-foreground font-medium">Convênio:</div>
                  <div className="font-semibold text-foreground">{selectedDemand?.insurance}</div>
                  <div className="text-muted-foreground font-medium">Status:</div>
                  <div>{selectedDemand && getStatusBadge(selectedDemand.status)}</div>
                  <div className="text-muted-foreground font-medium">Responsável:</div>
                  <div className="font-bold text-blue-600">{selectedDemand?.responsible?.full_name || selectedDemand?.responsible_user || "Não atribuído"}</div>
                  <div className="text-muted-foreground font-medium">Motivo Glosa:</div>
                  <div className="font-semibold text-foreground italic">{selectedDemand?.glosa_reason || "-"}</div>
                </div>
                <div className="pt-2">
                  <div className="text-xs text-muted-foreground mb-1">Descrição:</div>
                  <div className="text-xs bg-background p-3 rounded border shadow-sm max-h-[150px] overflow-y-auto">
                    <RenderedDemandContent content={selectedDemand?.description} />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-6 flex flex-col">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Histórico de Anotações ({currentAnnotations?.length || 0})
                </h3>
                
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {currentAnnotations?.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm italic border rounded-lg bg-muted/10">
                      Nenhuma anotação registrada.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentAnnotations?.map((annotation: any) => (
                        <div key={annotation.id} className="relative pl-4 border-l-2 border-primary/20">
                          <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-background border-2 border-primary/30" />
                          <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-2 h-full">
                            <div className="flex justify-between items-start border-b pb-1 mb-1 border-border/50">
                              <span className="font-bold text-primary">
                                {annotation.user?.full_name || annotation.full_name || annotation.user?.login || annotation.login || "Usuário"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(annotation.created_at), "dd/MM/yyyy HH:mm")}
                              </span>
                            </div>
                            <div className="text-foreground leading-relaxed">
                              <RenderedDemandContent content={annotation.content} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Nova Anotação</Label>
                <div className="flex flex-col gap-2">
                  <Textarea 
                    placeholder="Digite sua anotação aqui (você pode colar imagens aqui)..." 
                    value={newAnnotation}
                    onChange={(e) => setNewAnnotation(e.target.value)}
                    className="min-h-[100px] text-sm"
                    onPaste={(e) => handleImagePaste(e, (val) => setNewAnnotation(val), newAnnotation)}
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => {
                        if (!newAnnotation.trim()) return;
                        addAnnotationMutation.mutate({ 
                          demandId: selectedDemand.id, 
                          content: newAnnotation 
                        });
                      }}
                      disabled={addAnnotationMutation.isPending || !newAnnotation.trim()}
                      className="gap-2"
                      size="sm"
                    >
                      <Send className="h-4 w-4" /> Adicionar Anotação
                    </Button>
                  </div>
                </div>
                {selectedDemand?.status !== "Atendida" && (
                  <div className="flex justify-center border-t pt-4">
                    <Button 
                      variant="outline" 
                      className="w-full max-w-xs gap-2 border-green-500/50 text-green-600 hover:bg-green-500/10 hover:text-green-700 font-semibold"
                      onClick={() => {
                        updateMutation.mutate({ 
                          id: selectedDemand.id, 
                          values: { ...selectedDemand, status: "Atendida" }, 
                          currentDemand: selectedDemand 
                        });
                        setIsFollowUpOpen(false);
                      }}
                      disabled={
                        updateMutation.isPending || 
                        (role === "cliente" && selectedDemand?.responsible_id !== user?.id)
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" /> Demanda Atendida
                    </Button>
                  </div>
                )}
              </div>
            </div>

          </div>
          
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsFollowUpOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
