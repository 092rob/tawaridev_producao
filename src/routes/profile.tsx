import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, User, Check, X } from "lucide-react";
import { AvatarCropper } from "@/components/avatar-cropper";

function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length === 1) return `(${digits}`;
  if (digits.length === 2) return `(${digits}) `;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function hasNoSequential(p: string): boolean {
  const lower = p.toLowerCase();
  for (let i = 0; i < lower.length - 2; i++) {
    const a = lower.charCodeAt(i);
    const b = lower.charCodeAt(i + 1);
    const c = lower.charCodeAt(i + 2);
    if (b - a === 1 && c - b === 1) return false;
    if (a - b === 1 && b - c === 1) return false;
  }
  return true;
}

const passwordRules = [
  { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Pelo menos uma letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Pelo menos um caractere especial", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  { label: "Não pode conter sequências (ex: abc, 123)", test: (p: string) => hasNoSequential(p) },
];

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

const profileSchema = z.object({
  full_name: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").max(255),
  login: z
    .string()
    .trim()
    .max(50)
    .regex(/^[a-zA-Z0-9._-]*$/, "Use apenas letras, números, ponto, hífen ou sublinhado")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(16)
    .regex(/^[\d\s()\-]*$/, "Telefone inválido")
    .optional()
    .or(z.literal("")),
});

function ProfilePage() {
  return (
    <AppShell>
      <ProfileForm />
    </AppShell>
  );
}

function ProfileForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(false);
  const [loginAvailable, setLoginAvailable] = useState<boolean | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [login, setLogin] = useState("");
  const [originalLogin, setOriginalLogin] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [allOperadoras, setAllOperadoras] = useState<{nome: string, cod: string}[]>([]);
  const [selectedOperadoras, setSelectedOperadoras] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profileRes, operadorasRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, email, login, phone, avatar_url, operadoras_responsaveis")
          .eq("id", user.id)
          .single(),
        supabase
          .from("operadoras")
          .select("nome, cod_operadora")
          .order("nome", { ascending: true })
      ]);

      if (profileRes.error) {
        toast.error("Erro ao carregar perfil");
      } else if (profileRes.data) {
        setFullName(profileRes.data.full_name ?? "");
        setEmail(profileRes.data.email ?? user.email ?? "");
        setLogin(profileRes.data.login ?? "");
        setOriginalLogin(profileRes.data.login ?? "");
        setPhone(formatPhoneBR(profileRes.data.phone ?? ""));
        setAvatarUrl(profileRes.data.avatar_url ?? null);
        setSelectedOperadoras((profileRes.data.operadoras_responsaveis as string[]) ?? []);
      }

      if (operadorasRes.error) {
        toast.error("Erro ao carregar operadoras");
      } else if (operadorasRes.data) {
        setAllOperadoras(operadorasRes.data.map(o => ({ nome: o.nome, cod: o.cod_operadora })).filter(o => o.nome) as any[]);
      }
      setLoading(false);
    })();
  }, [user]);

  // Debounced login availability check
  useEffect(() => {
    if (!user) return;
    const trimmed = login.trim();
    if (!trimmed || trimmed === originalLogin) {
      setLoginAvailable(null);
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
      setLoginAvailable(null);
      return;
    }
    setCheckingLogin(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("login", trimmed)
        .neq("id", user.id)
        .maybeSingle();
      setLoginAvailable(!data);
      setCheckingLogin(false);
    }, 400);
    return () => clearTimeout(t);
  }, [login, originalLogin, user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5 MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Arquivo deve ser uma imagem");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCroppedUpload = async (blob: Blob) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/avatar-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (uploadError) {
      toast.error("Erro ao enviar imagem");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    setUploading(false);
    setCropSrc(null);
    toast.success("Foto carregada. Salve para confirmar.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsed = profileSchema.safeParse({ full_name: fullName, email, login, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    const trimmedLogin = login.trim();
    if (trimmedLogin && trimmedLogin !== originalLogin) {
      const { data: exists } = await supabase
        .from("profiles")
        .select("id")
        .eq("login", trimmedLogin)
        .neq("id", user.id)
        .maybeSingle();
      if (exists) {
        toast.error("Este login já está em uso");
        return;
      }
    }

    setSaving(true);

    const updates = {
      full_name: fullName.trim() || null,
      email: email.trim(),
      login: trimmedLogin || null,
      phone: phone.replace(/\D/g, "") || null,
      avatar_url: avatarUrl,
      operadoras_responsaveis: selectedOperadoras,
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (profileError) {
      toast.error("Erro ao salvar perfil: " + profileError.message);
      setSaving(false);
      return;
    }

    // Update auth email if changed
    if (email.trim() && email.trim() !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
      if (emailError) {
        toast.warning("Perfil salvo. E-mail de autenticação: " + emailError.message);
      } else {
        toast.success("Perfil atualizado. Confirme o novo e-mail na sua caixa de entrada.");
        setSaving(false);
        return;
      }
    }

    toast.success("Cadastro atualizado com sucesso");
    setOriginalLogin(trimmedLogin);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  const initials =
    (fullName || email || "?")
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Alterar cadastro</CardTitle>
          <CardDescription>Atualize suas informações pessoais</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Foto de perfil" />
                ) : (
                  <AvatarFallback>
                    {initials || <User className="h-8 w-8" />}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Trocar foto
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">Opcional · até 2 MB</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                E-mail <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
              />
              {email.trim() && email.trim() !== user?.email && (
                <p className="text-xs text-muted-foreground">
                  Será enviado um e-mail de confirmação ao novo endereço.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login">Login</Label>
              <Input
                id="login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                maxLength={50}
                placeholder="opcional"
              />
              {login.trim() && login.trim() !== originalLogin && (
                <p className="text-xs">
                  {checkingLogin ? (
                    <span className="text-muted-foreground">Verificando disponibilidade…</span>
                  ) : loginAvailable === true ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Login disponível</span>
                  ) : loginAvailable === false ? (
                    <span className="text-destructive">Login já está em uso</span>
                  ) : (
                    <span className="text-muted-foreground">
                      Use apenas letras, números, ponto, hífen ou sublinhado
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                maxLength={16}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex flex-col gap-2">
                <Label>Operadoras sob responsabilidade</Label>
                <p className="text-xs text-muted-foreground">Selecione as operadoras que este analista é responsável</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Operadoras Disponíveis</Label>
                  <div className="border rounded-md h-[250px] overflow-y-auto p-2 bg-muted/20 space-y-1">
                    {allOperadoras
                      .filter(op => !selectedOperadoras.includes(op.cod))
                      .map(op => (
                        <button
                          key={op.cod}
                          type="button"
                          onClick={() => setSelectedOperadoras(prev => [...prev, op.cod].sort())}
                          className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors flex items-center justify-between group"
                        >
                          {op.nome}
                          <Check className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50" />
                        </button>
                      ))}
                    {allOperadoras.filter(op => !selectedOperadoras.includes(op.cod)).length === 0 && (
                      <p className="text-center text-xs text-muted-foreground pt-10">Nenhuma operadora disponível</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Operadoras Selecionadas</Label>
                  <div className="border rounded-md h-[250px] overflow-y-auto p-2 bg-primary/5 space-y-1">
                    {selectedOperadoras.map(cod => {
                      const op = allOperadoras.find(o => o.cod === cod);
                      return (
                        <button
                          key={cod}
                          type="button"
                          onClick={() => setSelectedOperadoras(prev => prev.filter(item => item !== cod))}
                          className="w-full text-left px-3 py-1.5 text-sm rounded bg-primary/10 hover:bg-destructive/10 hover:text-destructive transition-colors flex items-center justify-between group"
                        >
                          {op?.nome || cod}
                          <X className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
                        </button>
                      );
                    })}
                    {selectedOperadoras.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground pt-10">Nenhuma operadora selecionada</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={
                  saving ||
                  uploading ||
                  (login.trim() !== originalLogin && loginAvailable === false)
                }
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
              <Button type="button" variant="ghost" onClick={() => navigate({ to: "/dashboards" })}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ChangePasswordCard />

      <AvatarCropper
        open={!!cropSrc}
        imageSrc={cropSrc}
        onCancel={() => setCropSrc(null)}
        onConfirm={handleCroppedUpload}
      />
    </div>
  );
}

function ChangePasswordCard() {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const allValid = passwordRules.every((r) => r.test(pwd));
  const matches = pwd.length > 0 && pwd === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) {
      toast.error("A senha não atende aos critérios");
      return;
    }
    if (!matches) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
      return;
    }
    toast.success("Senha alterada com sucesso");
    setPwd("");
    setConfirm("");
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Alterar senha</CardTitle>
        <CardDescription>Defina uma nova senha de acesso</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="new-pwd">Nova senha</Label>
            <Input
              id="new-pwd"
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              maxLength={72}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-pwd">Repetir nova senha</Label>
            <Input
              id="confirm-pwd"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              maxLength={72}
              autoComplete="new-password"
              required
            />
            {confirm.length > 0 && !matches && (
              <p className="text-xs text-destructive">As senhas não coincidem</p>
            )}
          </div>

          <ul className="space-y-1 text-xs">
            {passwordRules.map((r) => {
              const ok = r.test(pwd);
              return (
                <li
                  key={r.label}
                  className={`flex items-center gap-2 ${ok ? "text-primary" : "text-muted-foreground"}`}
                >
                  {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  <span>{r.label}</span>
                </li>
              );
            })}
          </ul>

          <Button type="submit" disabled={saving || !allValid || !matches}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Alterar senha
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
