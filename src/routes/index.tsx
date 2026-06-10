import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate({ to: session ? "/home" : "/login" });
  }, [session, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-muted-foreground">Carregando…</div>
    </div>
  );
}
