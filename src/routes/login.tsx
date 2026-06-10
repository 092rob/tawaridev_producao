import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import tawariLogo from "@/assets/tawari-logo.png";

export const Route = createFileRoute("/login")({ component: LoginPage });

const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(1, "Informe a senha").max(72),
});

function hasNoSequential(p: string) {
  const lower = p.toLowerCase();
  for (let i = 0; i < lower.length - 2; i++) {
    const a = lower.charCodeAt(i);
    const b = lower.charCodeAt(i + 1);
    const c = lower.charCodeAt(i + 2);
    if (b - a === 1 && c - b === 1) return false;
  }
  return true;
}

const passwordRules = [
  { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Pelo menos uma letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Pelo menos um caractere especial", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  { label: "Não pode conter sequências (ex: abc, 123)", test: (p: string) => hasNoSequential(p) },
];

const signUpSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().max(72).refine(
    (p) => passwordRules.every((r) => r.test(p)),
    "A senha não atende aos critérios"
  ),
});

function LoginPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (session) navigate({ to: "/home" }); }, [session, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={tawariLogo} alt="Tawari Dev" className="mx-auto mb-4 h-24 w-auto" />
          <h1 className="text-2xl font-semibold tracking-tight">Data Analytics e Dashboards</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesso seguro aos seus painéis</p>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-6"><SignInForm /></TabsContent>
            <TabsContent value="signup" className="mt-6"><SignUpForm /></TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) {
        console.error("[Login] Auth error:", error);
        toast.error(error.message);
      } else {
        toast.success("Bem-vindo!");
        navigate({ to: "/home" });
      }
    } catch (err) {
      console.error("[Login] Unexpected error:", err);
      toast.error("Erro ao tentar conectar. Verifique sua internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email-in">E-mail</Label>
        <Input id="email-in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pwd-in">Senha</Label>
        <Input id="pwd-in" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: name.trim() },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Faça login.");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name-up">Nome</Label>
        <Input id="name-up" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-up">E-mail</Label>
        <Input id="email-up" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pwd-up">Senha</Label>
        <Input id="pwd-up" type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} required />
        <ul className="mt-2 space-y-1 text-xs">
          {passwordRules.map((r) => {
            const ok = r.test(password);
            return (
              <li key={r.label} className={`flex items-center gap-2 ${ok ? "text-primary" : "text-muted-foreground"}`}>
                {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                <span>{r.label}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Novos cadastros recebem o papel <span className="text-foreground">cliente</span>.</p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Criando…" : "Criar conta"}
      </Button>
    </form>
  );
}
