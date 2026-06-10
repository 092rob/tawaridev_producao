import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
// Função auxiliar para conversão numérica segura
const num = (v: any): number => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/R\$\s?/, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
};
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Calculator, Search, Info, Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cbhpm")({
  component: CBHPMPage,
  ssr: false,
});

interface Versao {
  id_tabela: string;
  nome_tabela: string;
}

interface Procedimento {
  id: string;
  id_tabela: string | null;
  id_grupo: string | null;
  descricao_grupo: string | null;
  id_subgrupo: string | null;
  descricao_subgrupo: string | null;
  codigo_anatomico: string | null;
  procedimento: string;
  fator_multiplicativo: number | null;
  porte: string | null;
  custo_operacional: number | null;
  num_auxiliares: number | null;
  porte_anestesico: string | null;
  filmes: string | null;
  incidencia: number | null;
  unidade_radiofarmaco: string | null;
  uco: number | null;
}

interface PorteValor {
  id_tabela: string | null;
  porte: string;
  valor: number;
}

function CBHPMPage() {
  const [search, setSearch] = useState("");
  const [selectedVersao, setSelectedVersao] = useState<string>("__all");
  const [versoes, setVersoes] = useState<Versao[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [portes, setPortes] = useState<PorteValor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Procedimento | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isApartamento, setIsApartamento] = useState(false);
  const [isUrgencia, setIsUrgencia] = useState(false);
  const [isDiferentesVias, setIsDiferentesVias] = useState(false);
  const [isMesmasVias, setIsMesmasVias] = useState(false);
  const itemsPerPage = 50;
  
  // Variáveis para cálculo customizado
  const [valorUCO, setValorUCO] = useState<number>(11.50); // Valor padrão comum, mas pode ser ajustado
  const [valorFilmeInput, setValorFilmeInput] = useState<string>("15,00");
  const valorFilme = useMemo(() => num(valorFilmeInput), [valorFilmeInput]);

  const fetchProcedimentos = async (searchTerm: string = "", versao: string = "__all") => {
    setLoading(true);
    try {
      let query = supabase.from("cbhpm_procedimentos").select("*").order("id_tabela", { ascending: true });
      
      if (searchTerm) {
        query = query.or(`codigo_anatomico.ilike.%${searchTerm}%,procedimento.ilike.%${searchTerm}%`);
      }

      if (versao !== "__all") {
        query = query.eq("id_tabela", versao);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      const adaptedProcs = (data || []).map(p => ({
        ...p,
        procedimento: p.procedimento || ""
      })) as Procedimento[];
      
      setProcedimentos(adaptedProcs);
      setCurrentPage(1);
    } catch (error) {
      console.error("Erro ao buscar procedimentos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function fetchInitialData() {
      const [{ data: porteData }, { data: versaoData }] = await Promise.all([
        supabase.from("cbhpm_portes").select("id_tabela, porte, valor"),
        supabase.from("cbhpm_versoes").select("id_tabela, nome_tabela")
      ]);

      const fetchedPortes = porteData || [];
      setPortes(fetchedPortes);

      const fetchedVersoes = versaoData || [];
      setVersoes(fetchedVersoes);
      
      // Set default valorFilme from cbhpm_portes where porte is 'filmes'
      const filmePorte = fetchedPortes.find(p => p.porte.toLowerCase() === 'filmes');
      if (filmePorte) {
        setValorFilmeInput(filmePorte.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      }
      
      await fetchProcedimentos(search, selectedVersao);
    }
    fetchInitialData();
  }, []);

  const filtered = procedimentos;

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const handleSearch = () => {
    fetchProcedimentos(search, selectedVersao);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const calculateTotal = (proc: Procedimento) => {
    if (!proc.porte) return null;
    
    // O porte já vem completo (ex: "1A") conforme a nova estrutura
    // Unindo com cbhpm_portes usando id_tabela e porte
    const porteValor = portes.find(pv => {
      const pvPorte = String(pv.porte || "").trim().toUpperCase();
      const procPorte = String(proc.porte || "").trim().toUpperCase();
      const pvTabela = String(pv.id_tabela || "").trim().toUpperCase();
      const procTabela = String(proc.id_tabela || "").trim().toUpperCase();
      return pvPorte === procPorte && pvTabela === procTabela;
    });
    const vPorte = porteValor ? porteValor.valor : 0;
    
    const custoOpValue = proc.custo_operacional || 0;
    const custoOpTotal = custoOpValue * valorUCO;

    // Cálculo do valor de filmes (quantidade em proc.filmes * valorFilme)
    const numFilmes = num(proc.filmes);
    const filmesTotal = numFilmes * valorFilme;

    const vFator = (proc.fator_multiplicativo !== null && proc.fator_multiplicativo !== undefined) ? Number(proc.fator_multiplicativo) : 1;
    // Se o fator for 0, tratamos como 1 para não zerar o cálculo, a menos que seja explicitamente intencional.
    // Na CBHPM, o fator_multiplicativo geralmente é 1 se não especificado.
    const effectiveFator = vFator === 0 ? 1 : vFator;
    const valorPorteCalculado = vPorte * effectiveFator;
    const valorTotal = valorPorteCalculado + custoOpTotal + filmesTotal;
    
    return {
      vPorte,
      vFator,
      valorPorteCalculado,
      custoOpTotal,
      filmesTotal,
      total: valorTotal
    };
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" /> Calculadora CBHPM
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulte procedimentos e realize cálculos baseados na Classificação Brasileira Hierarquizada.
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
                    Esta ferramenta utiliza dados das tabelas de Classificação CBHPM:
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm max-h-[60vh] overflow-auto pr-2">
                  <div className="space-y-2">
                    <h4 className="font-semibold border-b pb-1">Procedimentos (cbhpm_procedimentos)</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li><code className="text-primary">codigo_anatomico</code>: Código do procedimento</li>
                      <li><code className="text-primary">procedimento</code>: Descrição do ato</li>
                      <li><code className="text-primary">porte</code>: Classificação do porte (ex: 1A)</li>
                      <li><code className="text-primary">custo_operacional</code>: Valor em UCO</li>
                      <li><code className="text-primary">filmes</code>: Quantidade de filmes/películas</li>
                      <li><code className="text-primary">fator_multiplicativo</code>: Fator de ajuste</li>
                      <li><code className="text-primary">porte_anestesico</code>: Porte para anestesia</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold border-b pb-1">Valores e Versões</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li><code className="text-primary">cbhpm_portes.valor</code>: Valor monetário do porte</li>
                      <li><code className="text-primary">cbhpm_versoes.nome_tabela</code>: Edição da CBHPM</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setFiltersOpen(!filtersOpen)}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-4 w-4" /> Filtros
                  </CardTitle>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", filtersOpen && "rotate-180")} />
                </div>
              </CardHeader>
              <CardContent className={cn("space-y-4", !filtersOpen && "hidden")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 w-fit min-w-[200px]">
                    <Label>Versão da Tabela</Label>
                    <Select value={selectedVersao} onValueChange={(val) => {
                      setSelectedVersao(val);
                      fetchProcedimentos(search, val);
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione a versão" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all">Todas as Versões</SelectItem>
                        {versoes.map((v) => (
                          <SelectItem key={v.id_tabela} value={v.id_tabela}>
                            {v.nome_tabela}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col md:flex-row gap-8 items-start -ml-[40px]">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="apartamento" 
                          checked={isApartamento} 
                          onCheckedChange={(checked) => setIsApartamento(checked === true)} 
                        />
                        <Label htmlFor="apartamento" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Apartamento
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="urgencia" 
                          checked={isUrgencia} 
                        onCheckedChange={(checked) => setIsUrgencia(checked === true)} 
                      />
                      <Label htmlFor="urgencia" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 whitespace-nowrap">
                        Urgência/Emergência (+30%)
                      </Label>
                    </div>
                    </div>

                    <div className="hidden md:block w-px self-stretch bg-border" />

                    <div className="flex flex-col gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="diferentesVias" 
                          checked={isDiferentesVias} 
                          onCheckedChange={(checked) => {
                            setIsDiferentesVias(checked === true);
                            if (checked === true) setIsMesmasVias(false);
                          }} 
                        />
                        <Label htmlFor="diferentesVias" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Diferentes Vias (-30%)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="mesmasVias" 
                          checked={isMesmasVias} 
                          onCheckedChange={(checked) => {
                            setIsMesmasVias(checked === true);
                            if (checked === true) setIsDiferentesVias(false);
                          }} 
                        />
                        <Label htmlFor="mesmasVias" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Mesmas Vias (-50%)
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-muted-foreground mb-3">Rateio de Honorários (Base: Valor Total)</div>
                    <div className="flex flex-col gap-1.5 text-sm">
                      <div className="flex justify-between border-b border-dashed pb-1">
                        <span className="font-medium">Cirurgião:</span>
                        <span className="text-primary font-bold">
                          {selected ? fmt((calculateTotal(selected)?.total || 0) * (isApartamento ? 2 : 1) * (isUrgencia ? 1.3 : 1) * (isDiferentesVias ? 0.7 : 1) * (isMesmasVias ? 0.5 : 1)) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-dashed pb-1">
                        <span className="font-medium">1º Auxiliar:</span>
                        <span className="text-primary font-bold">
                          {selected ? fmt((calculateTotal(selected)?.total || 0) * 0.7 * (isApartamento ? 2 : 1) * (isUrgencia ? 1.3 : 1) * (isDiferentesVias ? 0.7 : 1) * (isMesmasVias ? 0.5 : 1)) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-dashed pb-1">
                        <span className="font-medium">2º ou 3º Auxiliar:</span>
                        <span className="text-primary font-bold">
                          {selected ? fmt((calculateTotal(selected)?.total || 0) * 0.5 * (isApartamento ? 2 : 1) * (isUrgencia ? 1.3 : 1) * (isDiferentesVias ? 0.7 : 1) * (isMesmasVias ? 0.5 : 1)) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-4 w-4" /> Buscar Procedimento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Digite o código ou nome do procedimento e clique em Consultar..." 
                      className="pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                  <Button onClick={handleSearch} className="flex gap-2">
                    <Search className="h-4 w-4" /> Consultar
                  </Button>
                </div>

              <div className="rounded-md border">
                <div className="max-h-[500px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="text-left text-xs uppercase text-muted-foreground font-semibold">
                        <th className="p-3">Cód. Anatômico</th>
                        <th className="p-3">Procedimento</th>
                        <th className="p-3 text-center">Fator Mult.</th>
                        <th className="p-3">Porte</th>
                        <th className="p-3">Custo Op.</th>
                        <th className="p-3">Filmes</th>
                        <th className="p-3">Porte Anest.</th>
                        <th className="p-3">Aux.</th>
                        <th className="p-3">Incid.</th>
                        <th className="p-3">ID Tabela</th>
                        <th className="p-3">Grupo</th>
                        <th className="p-3">Subgrupo</th>
                        <th className="p-3">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {loading ? (
                        <tr><td colSpan={13} className="p-8 text-center">Carregando procedimentos...</td></tr>
                      ) : paginated.length === 0 ? (
                        <tr><td colSpan={13} className="p-8 text-center text-muted-foreground">Nenhum procedimento encontrado.</td></tr>
                      ) : (
                        paginated.map(p => (
                          <tr key={p.id} className={`hover:bg-accent/50 cursor-pointer ${selected?.id === p.id ? "bg-accent" : ""}`} onClick={() => {
                            setSelected(p);
                            // Ao selecionar, atualiza o valor da UCO de acordo com o id_tabela do procedimento
                            const ucoPorte = portes.find(pv => 
                              String(pv.porte || "").trim().toUpperCase() === 'UCO' && 
                              String(pv.id_tabela || "").trim().toUpperCase() === String(p.id_tabela || "").trim().toUpperCase()
                            );
                            if (ucoPorte) {
                              setValorUCO(ucoPorte.valor);
                            }
                          }}>
                            <td className="p-3 font-mono">{p.codigo_anatomico}</td>
                            <td className="p-3 min-w-[300px]">{p.procedimento}</td>
                            <td className="p-3 text-center">{p.fator_multiplicativo !== null ? p.fator_multiplicativo.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : "—"}</td>
                            <td className="p-3">{p.porte || "—"}</td>
                            <td className="p-3">{p.custo_operacional !== null ? p.custo_operacional.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : "—"}</td>
                            <td className="p-3">{p.filmes !== null ? num(p.filmes).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : "—"}</td>
                            <td className="p-3">{p.porte_anestesico || "—"}</td>
                            <td className="p-3 text-center">{p.num_auxiliares}</td>
                            <td className="p-3 text-center">{p.incidencia}</td>
                            <td className="p-3 whitespace-nowrap">{p.id_tabela}</td>
                            <td className="p-3 whitespace-nowrap">{p.descricao_grupo}</td>
                            <td className="p-3 whitespace-nowrap">{p.descricao_subgrupo}</td>
                            <td className="p-3">
                              <Button size="sm" variant="ghost">Selecionar</Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} registros
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <div className="flex items-center px-2 text-sm font-medium">
                      Página {currentPage} de {totalPages}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Configurações de Valor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="uco">Valor da UCO (R$)</Label>
                  <Input 
                    id="uco" 
                    type="number" 
                    step="0.01" 
                    value={valorUCO.toFixed(2)} 
                    onChange={(e) => setValorUCO(parseFloat(e.target.value) || 0)} 
                  />
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="filme">Valor do Filme (R$)</Label>
                  <Input 
                    id="filme" 
                    type="text"
                    value={valorFilmeInput} 
                    onChange={(e) => {
                      const val = e.target.value;
                      // Permite apenas números e uma vírgula
                      if (/^[0-9]*\,?[0-9]*$/.test(val)) {
                        setValorFilmeInput(val);
                      }
                    }} 
                  />
                  <p className="text-[10px] text-muted-foreground">Valor por m² ou unidade de filme (conforme tabela).</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  Resumo do Cálculo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selected ? (
                  <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                    <Info className="h-8 w-8 opacity-20" />
                    <p className="text-sm">Selecione um procedimento para calcular o valor total.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold uppercase text-primary">
                        {versoes.find(v => v.id_tabela === selected.id_tabela)?.nome_tabela || selected.id_tabela}
                      </div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Procedimento
                      </div>
                      <div className="text-sm font-bold leading-tight">
                        {selected.codigo_anatomico} - {selected.procedimento}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Porte</div>
                        <div className="font-semibold">{selected.porte || "Não inf."}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Custo Op.</div>
                        <div className="font-semibold">{(selected.custo_operacional || 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Fator Mult.</div>
                        <div className="font-semibold">{(selected.fator_multiplicativo || 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Qtde. Filmes</div>
                        <div className="font-semibold">{num(selected.filmes).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div>
                      </div>
                    </div>

                    <div className="space-y-3 border-t pt-4">
                      {calculateTotal(selected) ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Valor do Porte (x Fator):</span>
                            <span className="font-medium">{fmt(calculateTotal(selected)!.valorPorteCalculado)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Custo Operacional (x UCO):</span>
                            <span className="font-medium">{fmt(calculateTotal(selected)!.custoOpTotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Filmes (x Valor Filme):</span>
                            <span className="font-medium">{fmt(calculateTotal(selected)!.filmesTotal)}</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-primary/20 pt-3 mt-2">
                            <span className="font-bold text-primary">VALOR TOTAL:</span>
                            <span className="text-xl font-black text-primary">
                              {fmt(calculateTotal(selected)!.total)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-destructive">Impossível calcular: Porte "{selected.porte}" inválido ou sem valor correspondente na tabela de portes.</p>
                      )}
                    </div>

                    <div className="pt-2 text-[10px] text-muted-foreground italic">
                      Fórmula: (Valor Porte x Fator Mult.) + (Custo Operacional x UCO) + (Filmes x Valor Filme)
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
