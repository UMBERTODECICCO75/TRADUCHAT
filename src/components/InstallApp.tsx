import { useEffect, useState } from "react";
import { Download, Share2, SquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

/** Stato dell'installazione: prompt nativo se disponibile, istruzioni altrove. */
export function useInstallApp() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  /** Avvia l'installazione nativa; ritorna false se il prompt non è disponibile. */
  async function promptInstall(): Promise<boolean> {
    if (!promptEvent) return false;
    await promptEvent.prompt();
    setPromptEvent(null);
    return true;
  }

  return { canPrompt: promptEvent !== null, installed, promptInstall };
}

/** Istruzioni guidate per aggiungere l'app alla schermata Home (iPhone e altri). */
export function InstallHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayClassName="z-[110]" className="z-[110] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Aggiungi TraduChat alla schermata Home</DialogTitle>
        </DialogHeader>
        <ol className="space-y-3 text-sm text-foreground">
          <li className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-accent">
              1
            </span>
            <span className="flex items-center gap-1">
              Tocca il pulsante <Share2 className="size-4 text-accent" aria-hidden /> Condividi
              in basso (iPhone) o nel menu del browser (Android).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-accent">
              2
            </span>
            <span>
              Scegli <SquarePlus className="inline size-4 text-accent" aria-hidden />{" "}
              «Aggiungi a schermata Home».
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-accent">
              3
            </span>
            <span>Conferma con «Aggiungi»: l'icona TraduChat compare nella Home.</span>
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  );
}

/** Sezione "Installa l'app" della schermata iniziale. */
export function InstallApp() {
  const { installed, promptInstall } = useInstallApp();
  const [openHelp, setOpenHelp] = useState(false);

  if (installed) return null;

  async function install() {
    const started = await promptInstall();
    if (!started) setOpenHelp(true);
  }

  return (
    <section className="mt-4 rounded-3xl surface-card p-4">
      <p className="flex items-center gap-2 font-display text-lg">
        <Download className="size-4 text-accent" /> Installa l'app
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Metti TraduChat nella schermata Home di telefono, tablet o computer: si apre come
        un'app, senza passare dal browser.
      </p>
      <Button type="button" className="mt-3 w-full sm:w-auto" onClick={() => void install()}>
        <Download className="size-4" /> Installa app
      </Button>
      <a
        href="https://traduchat.app"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="TraduChat, sito ufficiale"
        className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        <img src="/logo-mark.png" alt="" width={16} height={16} className="size-4 shrink-0 rounded-[5px]" />
        <span>© TraduChat</span>
      </a>

      <InstallHelpDialog open={openHelp} onOpenChange={setOpenHelp} />
    </section>
  );
}
