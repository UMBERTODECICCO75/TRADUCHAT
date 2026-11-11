import { useEffect, useRef, useState } from "react";
import { TRANSLATION_LANGUAGES } from "@/lib/languages";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ImagePlus, Languages, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { translateCamera } from "@/lib/camera.functions";
import { sendCameraTranslation } from "@/lib/camera-translations";
import { compressPhoto } from "@/lib/compress-photo";
import { chatPhotoError } from "@/lib/chat-photos";
import type { CameraTranslation } from "@/lib/camera-rules";
import { supabase } from "@/integrations/supabase/client";

// Italiano first: the default language of the app.
const languages: string[] = ["Italiano", ...TRANSLATION_LANGUAGES.filter((l) => l !== "Italiano")];

export function CameraTranslator({ people, recipientId, language, onClose, onSent }: {
  people: { id: string; name: string }[]; recipientId?: string | undefined; language?: string | undefined;
  onClose: () => void; onSent: (name: string) => void;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState("");
  const [target, setTarget] = useState(language ?? "Italiano");
  const [recipient, setRecipient] = useState(recipientId ?? "");
  const [result, setResult] = useState<CameraTranslation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const doTranslate = useServerFn(translateCamera);
  useEffect(() => {
    if (language) return;
    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase.from("profiles").select("my_lang").eq("id", data.user.id).maybeSingle();
      if (active && profile?.my_lang) setTarget(profile.my_lang);
    });
    return () => { active = false; };
  }, [language]);
  const selectPhoto = async (file: File) => {
    setError(""); setResult(null);
    const invalid = chatPhotoError(file);
    if (invalid) { setError(invalid); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Seleziona una foto JPEG, PNG o WebP"); return; }
    setBusy(true);
    try {
      const compressed = await compressPhoto(file, "chat");
      const dataURL = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Foto non leggibile")); reader.readAsDataURL(compressed);
      });
      setPhoto(dataURL);
    } catch (e) { setError(e instanceof Error ? e.message : "Foto non leggibile"); }
    finally { setBusy(false); }
  };
  const translate = async () => {
    setBusy(true); setError(""); setResult(null);
    try { const response = await doTranslate({ data: { image: photo, target } }); if (response.ok) setResult(response); else setError(response.error); }
    catch (e) { setError(e instanceof Error ? e.message : "Traduzione non riuscita"); }
    finally { setBusy(false); }
  };
  const send = async () => {
    const contact = people.find(p => p.id === recipient);
    if (!contact || !result) return;
    setBusy(true); setError("");
    try { await sendCameraTranslation(contact.id, result, target); onSent(contact.name); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "Invio non riuscito"); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent aria-describedby={undefined} className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg text-foreground">
      <DialogTitle className="pr-6">Traduci con la fotocamera</DialogTitle>
      <div className="flex gap-2">
        <Button variant="outline" disabled={busy} onClick={() => camera.current?.click()}><Camera /> Scatta foto</Button>
        <Button variant="outline" disabled={busy} onClick={() => gallery.current?.click()}><ImagePlus /> Scegli foto</Button>
      </div>
      <input ref={camera} aria-label="Foto da fotocamera" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void selectPhoto(f); }} />
      <input ref={gallery} aria-label="Foto da galleria" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void selectPhoto(f); }} />
      {photo && <img src={photo} alt="Testo da tradurre" className="max-h-52 w-full rounded-md object-contain" />}
      <label className="space-y-1 text-sm font-semibold">La mia lingua<select aria-label="Lingua della foto" disabled={busy} value={target} onChange={e => { setTarget(e.target.value); setResult(null); }} className="w-full rounded-md border border-input bg-card p-2 text-card-foreground">{languages.map(l => <option key={l}>{l}</option>)}</select></label>
      <Button disabled={!photo || busy} onClick={() => void translate()}><Languages /> {busy ? "Attendi…" : "Traduci foto"}</Button>
      {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
      {result && <>
        <label className="space-y-1 text-sm font-semibold">Traduzione<textarea aria-label="Traduzione della foto" value={result.translation} onChange={e => setResult({ ...result, translation: e.target.value })} className="min-h-28 w-full rounded-md border border-input bg-card p-2 text-card-foreground" /></label>
        <details><summary className="cursor-pointer text-sm">Testo originale</summary><p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{result.original}</p></details>
        <label className="space-y-1 text-sm font-semibold">Contatto<select aria-label="Invia a contatto" value={recipient} disabled={busy} onChange={e => setRecipient(e.target.value)} className="w-full rounded-md border border-input bg-card p-2 text-card-foreground"><option value="">Scegli contatto</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <Button disabled={busy || !recipient || !result.translation.trim()} onClick={() => void send()}><Send /> Invia al contatto</Button>
      </>}
    </DialogContent>
  </Dialog>;
}