import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, ChevronLeft, ChevronRight, LayoutDashboard, Settings, LogOut, Palette, UserCog, User, ClipboardList, Home, Calculator, Download } from "lucide-react";
import tawariIcon from "@/assets/tawari-icon.png";

const THEME_OPTIONS: { value: Theme; label: string; swatch: string }[] = [
  { value: "default", label: "Corporativo (escuro)", swatch: "linear-gradient(135deg,#1a1f3a,#3b4a8a)" },
  { value: "clean-blue", label: "Clean Azul", swatch: "linear-gradient(135deg,#ffffff,#3b82f6)" },
  { value: "clean-green", label: "Clean Verde", swatch: "linear-gradient(135deg,#ffffff,#10b981)" },
  { value: "clean-purple", label: "Clean Roxo", swatch: "linear-gradient(135deg,#ffffff,#8b5cf6)" },
  { value: "clean-pink", label: "Clean Rosa", swatch: "linear-gradient(135deg,#ffffff,#ec4899)" },
];

export function AppShell({ children, requireAdmin = false }: { children: ReactNode; requireAdmin?: boolean }) {
  const { session, role, loading, signOut, user, fullName, avatarUrl } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login" });
    else if (requireAdmin && role !== "admin") navigate({ to: "/dashboards" });
  }, [session, role, loading, requireAdmin, navigate]);

  useEffect(() => {
    try { localStorage.setItem("sidebar-collapsed", String(collapsed)); } catch { /* noop */ }
  }, [collapsed]);

  if (loading || !session) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando…</div>;
  }
  if (requireAdmin && role !== "admin") return null;

  const navItem = (to: string, icon: ReactNode, label: string) => {
    const active = path === to || path.startsWith(to + "/");
    return (
      <Link
        to={to}
        title={collapsed ? label : undefined}
        className={`flex items-center gap-3 rounded-md py-2 text-sm transition-colors ${
          collapsed ? "justify-center px-2" : "px-3"
        } ${
          active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        }`}
      >
        {icon}{!collapsed && label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen">
      <aside className={`hidden shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out md:flex md:flex-col ${collapsed ? "w-16" : "w-64"}`}>
        <div className={`flex items-center border-b border-sidebar-border ${collapsed ? "justify-center px-2 py-4" : "gap-2 px-5 py-5"}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-primary/30">
            <img src={tawariIcon} alt="Tawari Dev" className="h-8 w-8 object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold">Dashboards</div>
              <div className="text-xs text-muted-foreground">Portal Power BI</div>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItem("/home", <Home className="h-4 w-4" />, "Home")}
          {navItem("/dashboards", <LayoutDashboard className="h-4 w-4" />, "Meus Dashboards")}
          {navItem("/agendas-positivas", <ClipboardList className="h-4 w-4" />, "Agenda Positiva")}
          {navItem("/cbhpm", <Calculator className="h-4 w-4" />, "CBHPM")}
          
          {navItem("/profile", <UserCog className="h-4 w-4" />, "Alterar cadastro")}
          {role === "admin" && navItem("/admin", <Settings className="h-4 w-4" />, "Administração")}
          {role === "admin" && navItem("/export", <Download className="h-4 w-4" />, "Exportar Dados")}
        </nav>
        <div className="border-t border-sidebar-border p-3 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className={`w-full ${collapsed ? "justify-center px-0" : "justify-start"}`}
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="mr-2 h-4 w-4" /> Recolher menu</>}
          </Button>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2 px-2"}`}>
            <Avatar className={`shrink-0 ${collapsed ? "h-7 w-7" : "h-8 w-8"}`} title={fullName ?? user?.email ?? ""}>
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={fullName ?? user?.email ?? ""} />
              ) : (
                <AvatarFallback>
                  <User className={`${collapsed ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
                </AvatarFallback>
              )}
            </Avatar>
            {!collapsed && (
              <div className="min-w-0 text-xs">
                <div className="truncate text-sidebar-foreground">{fullName ?? user?.email}</div>
                <div className="text-muted-foreground capitalize">{role ?? "—"}</div>
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full ${collapsed ? "justify-center px-0" : "justify-start"}`}
                title="Alterar tema"
              >
                <Palette className={`h-4 w-4 ${collapsed ? "" : "mr-2"}`} />{!collapsed && "Tema"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <DropdownMenuLabel>Escolher tema</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {THEME_OPTIONS.map((opt) => (
                <DropdownMenuItem key={opt.value} onSelect={() => setTheme(opt.value)} className="gap-2">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-border"
                    style={{ background: opt.swatch }}
                  />
                  <span className="flex-1">{opt.label}</span>
                  {theme === opt.value && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            className={`w-full ${collapsed ? "justify-center px-0" : "justify-start"}`}
            onClick={() => signOut()}
          >
            <LogOut className={`h-4 w-4 ${collapsed ? "" : "mr-2"}`} />{!collapsed && "Sair"}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="border-b border-border bg-card/30 px-6 py-3 md:hidden flex items-center justify-between">
          <span className="text-sm font-semibold">Portal Dashboards</span>
          <Button variant="ghost" size="sm" onClick={() => signOut()}><LogOut className="h-4 w-4" /></Button>
        </div>
        {children}
      </main>
    </div>
  );
}
