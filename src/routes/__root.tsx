import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-4 text-muted-foreground">Página não encontrada.</p>
        <a href="/" className="mt-6 inline-block text-primary hover:underline">
          Voltar ao início
        </a>
      </div>
    </div>
  );
}

function ErrorComponent(props?: { error?: Error; reset?: () => void }) {
  const error = props?.error;
  const reset = props?.reset;
  if (error) console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error?.message ?? "Erro desconhecido"}</p>
        <button
          onClick={() => { router.invalidate(); reset?.(); }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Tawari DEV | Data Analytics" },
      { name: "description", content: "Dashboards e Analise de Dados" },
      { property: "og:title", content: "Tawari DEV | Data Analytics" },
      { name: "twitter:title", content: "Tawari DEV | Data Analytics" },
      { property: "og:description", content: "Dashboards e Analise de Dados" },
      { name: "twitter:description", content: "Dashboards e Analise de Dados" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/6SHxXGpUBTP8OjnKQXhiHJ0VXIm2/social-images/social-1779468509093-Gemini_Generated_Image_od0hojod0hojod0h.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/6SHxXGpUBTP8OjnKQXhiHJ0VXIm2/social-images/social-1779468509093-Gemini_Generated_Image_od0hojod0hojod0h.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Outlet />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
