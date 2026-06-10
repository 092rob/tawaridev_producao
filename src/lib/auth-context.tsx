import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "cliente" | null;

interface AuthCtx {
  session: Session | null;
  user: User | null;
  role: Role;
  fullName: string | null;
  login: string | null;
  avatarUrl: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null, user: null, role: null, fullName: null, login: null, avatarUrl: null, loading: true, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [login, setLogin] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, login, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    
    if (error) {
      console.error("[AuthContext] Error loading profile:", error.message);
      return;
    }
    setFullName(data?.full_name ?? null);
    setLogin(data?.login ?? null);
    setAvatarUrl(data?.avatar_url ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(async () => {
          const [{ data: roleData }, _profile] = await Promise.all([
            supabase.from("user_roles").select("role").eq("user_id", s.user.id),
            loadProfile(s.user.id),
          ]);
          const roles = roleData?.map((r) => r.role) ?? [];
          setRole(roles.includes("admin") ? "admin" : roles.includes("cliente") ? "cliente" : null);
        }, 0);
      } else {
        setRole(null);
        setFullName(null);
        setLogin(null);
        setAvatarUrl(null);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, role, fullName, login, avatarUrl, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
