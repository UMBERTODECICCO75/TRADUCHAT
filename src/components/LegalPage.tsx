import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> Torna alla home
        </Link>
        <h1 className="mt-6 font-sans text-2xl font-extrabold tracking-tight">{title}</h1>
        <div className="mt-4 space-y-6 text-sm text-muted-foreground [&_h2]:mb-2 [&_h2]:font-sans [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:text-primary [&_a]:underline">
          {children}
        </div>
        <p className="mt-10 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
          <Link to="/termini">Termini</Link>
          <Link to="/rimborsi">Rimborsi</Link>
          <Link to="/prezzi">Prezzi</Link>
          <Link to="/privacy">Privacy</Link>
        </p>
      </main>
    </div>
  );
}

export function legalHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — TraduChat` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — TraduChat` },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
