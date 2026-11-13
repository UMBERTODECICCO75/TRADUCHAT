import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ASSISTANT_IMAGE_ACCEPT, prepareAssistantPhoto, type AssistantPhoto } from "@/lib/assistant-images";

export function AssistantAttachments({ image, disabled, onChange, onError, onPreparing }: {
  image: AssistantPhoto | null; disabled: boolean;
  onChange: (photo: AssistantPhoto | null) => void; onError: (message: string) => void;
  onPreparing: (value: boolean) => void;
}) {
  const gallery = useRef<HTMLInputElement>(null);
  const capture = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [cameraError, setCameraError] = useState("");
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReady(false); setCameraError("");
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }).then(media => {
      if (cancelled) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      if (video.current) video.current.srcObject = media;
    }).catch(() => setCameraError("Fotocamera non disponibile o permesso negato. Puoi scegliere una foto."));
    return () => { cancelled = true; stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; };
  }, [open]);
  async function select(file?: File) {
    if (!file || disabled || preparing) return;
    setPreparing(true); onPreparing(true); onError("");
    try { onChange(await prepareAssistantPhoto(file)); }
    catch (error) { onError(error instanceof Error ? error.message : "Foto non disponibile."); }
    finally { setPreparing(false); onPreparing(false); }
  }
  function camera() {
    if (window.matchMedia("(pointer: coarse)").matches || !navigator.mediaDevices?.getUserMedia) capture.current?.click();
    else setOpen(true);
  }
  function takePhoto() {
    const element = video.current;
    if (!element || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = element.videoWidth; canvas.height = element.videoHeight;
    canvas.getContext("2d")?.drawImage(element, 0, 0);
    canvas.toBlob(blob => {
      if (blob) { setOpen(false); void select(new File([blob], "Fotocamera.jpg", { type: "image/jpeg" })); }
      else setCameraError("Scatto non riuscito. Riprova.");
    }, "image/jpeg", 0.9);
  }
  return <>
    <input ref={gallery} type="file" accept={ASSISTANT_IMAGE_ACCEPT} aria-label="Seleziona foto o screenshot" className="hidden" onChange={event => { void select(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={capture} type="file" accept="image/*" capture="environment" aria-label="Scatta foto per l’assistente" className="hidden" onChange={event => { void select(event.target.files?.[0]); event.target.value = ""; }} />
    <div className="flex flex-wrap items-center gap-2">
      <TooltipProvider>
        <Tooltip><TooltipTrigger asChild><Button type="button" variant="outline" size="icon" disabled={disabled || preparing} aria-label="Apri fotocamera" onClick={camera}><Camera className="size-4" /></Button></TooltipTrigger><TooltipContent>Scatta una foto</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild><Button type="button" variant="outline" size="icon" disabled={disabled || preparing} aria-label="Allega foto o screenshot" onClick={() => gallery.current?.click()}><ImagePlus className="size-4" /></Button></TooltipTrigger><TooltipContent>Foto o screenshot</TooltipContent></Tooltip>
      </TooltipProvider>
      {preparing && <Loader2 aria-label="Preparo la foto" className="size-4 animate-spin text-muted-foreground" />}
      {image && <div className="flex min-w-0 max-w-full items-center gap-2">
        <img src={image.dataUrl} alt="Foto allegata all’assistente" className="size-16 shrink-0 rounded-md border border-border object-contain" />
        <span className="max-w-40 truncate text-xs text-muted-foreground">{image.name}</span>
        <Button type="button" size="icon" variant="ghost" disabled={disabled || preparing} aria-label="Rimuovi foto" onClick={() => onChange(null)} title="Rimuovi foto"><X className="size-4" /></Button>
      </div>}
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg" aria-describedby={undefined}><DialogHeader><DialogTitle>Fotocamera</DialogTitle></DialogHeader>
      <video ref={video} autoPlay muted playsInline onLoadedData={() => setReady(true)} className="aspect-[4/3] w-full rounded-md bg-muted object-contain" />
      {cameraError && <p role="alert" className="text-sm text-destructive">{cameraError}</p>}
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setOpen(false); gallery.current?.click(); }}><ImagePlus className="size-4" /> Scegli foto</Button><Button type="button" disabled={!ready} onClick={takePhoto}><Camera className="size-4" /> Scatta</Button></div>
    </DialogContent></Dialog>
  </>;
}