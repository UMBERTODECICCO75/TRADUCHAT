import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CookieBanner } from "../components/CookieBanner";
import { PaymentTestModeBanner } from "../components/PaymentTestModeBanner";
import { Toaster } from "@/components/ui/sonner";
import { PageTranslator } from "@/components/PageTranslator";
import { OpenAppAlerts } from "@/components/OpenAppAlerts";
import { Splash } from "@/components/Splash";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Pagina non trovata</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La pagina che cerchi non esiste o è stata spostata.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Torna alla home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google-site-verification", content: "yO-6pnJgKxJl9r4nBlIfwNoBGL4gwKbpRHER8yg1crI" },
       { name: "theme-color", content: "#ffffff" },
       { name: "apple-mobile-web-app-capable", content: "yes" },
       { name: "apple-mobile-web-app-status-bar-style", content: "default" },
       { name: "apple-mobile-web-app-title", content: "TraduChat" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Manrope:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
       { rel: "manifest", href: "/manifest.webmanifest" },
       { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('traduchat:theme');if(t==='dark'||t==='purple'){document.documentElement.classList.add(t)}var f=localStorage.getItem('traduchat:font');if(f==='lineare'||f==='classico'){document.documentElement.classList.add('font-'+f)}}catch(e){}`,
          }}
        />
      </head>
      <body>

        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const alertUser = useRouterState({ select: (state) => {
    const match = state.matches.find((item) => item.routeId === "/_authenticated");
    const context = match?.context as { user?: { id: string } } | undefined;
    return context?.user?.id;
  } });

  useEffect(() => {
    // Retire only the removed translation worker; preserve unrelated app data.
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        await Promise.all(registrations.filter((registration) =>
          [registration.active, registration.waiting, registration.installing].some((worker) =>
            worker && new URL(worker.scriptURL).pathname === "/offline-sw.js",
          ),
        ).map((registration) => registration.unregister()));
      }).catch(() => undefined);
    }
    if ("caches" in window) {
      void caches.keys().then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("traduchat-offline-")).map((key) => caches.delete(key)),
      )).catch(() => undefined);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PaymentTestModeBanner />
      <Toaster richColors position="top-center" />
      <PageTranslator />
      {alertUser && <OpenAppAlerts key={alertUser} me={alertUser} />}
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Splash>
        <Outlet />
      </Splash>
      <CookieBanner />
      <a
        href="https://traduchat.app"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="TraduChat, sito ufficiale"
        className="fixed bottom-2 left-2 z-50 inline-flex items-center gap-1.5 rounded-full bg-muted/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
      >
        <img src="/logo-mark.png" alt="" width={16} height={16} className="size-4 shrink-0 rounded-[5px]" />
        <span>© TraduChat</span>
      </a>
    </QueryClientProvider>
  );
}
