// Componente da aggiungere al progetto Lovable di traduchatchat.com
// Installa la dipendenza:  npm i @twilio/voice-sdk
// Uso:  <TraduCall identity={user.id} lang="it-IT" />

import { useEffect, useRef, useState } from "react";
import { Device, Call } from "@twilio/voice-sdk";

const CALL_SERVER = "https://call.workoftraduchat.it"; // il tuo server (PUBLIC_HOST)
const DEMO_SECRET = "cambia-questa-chiave";            // solo per la demo: in produzione usa il token Supabase

type Line = { from: string; original: string; translated: string; ms: number };

export default function TraduCall({ identity, lang = "it-IT" }: { identity: string; lang?: string }) {
  const device = useRef<Device | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [incoming, setIncoming] = useState<Call | null>(null);
  const [status, setStatus] = useState("Collegamento…");
  const [to, setTo] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const getToken = async () => {
    const r = await fetch(`${CALL_SERVER}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity, lang, secret: DEMO_SECRET }),
    });
    if (!r.ok) throw new Error((await r.json()).error);
    return (await r.json()).token as string;
  };

  useEffect(() => {
    let es: EventSource | null = null;
    (async () => {
      try {
        const d = new Device(await getToken(), { codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU] });
        d.on("registered", () => setStatus("Pronto per chiamare"));
        d.on("error", (e) => setStatus("Errore: " + e.message));
        d.on("incoming", (c: Call) => { setIncoming(c); c.on("cancel", () => setIncoming(null)); });
        d.on("tokenWillExpire", async () => d.updateToken(await getToken()));
        await d.register();
        device.current = d;

        es = new EventSource(`${CALL_SERVER}/events?identity=${encodeURIComponent(identity)}&secret=${encodeURIComponent(DEMO_SECRET)}`);
        es.onmessage = (e) => setLines((l) => [...l, JSON.parse(e.data)]);
      } catch (e: any) {
        setStatus("Errore: " + e.message);
      }
    })();
    return () => { es?.close(); device.current?.destroy(); };
  }, [identity, lang]);

  const bind = (c: Call) => {
    setCall(c);
    c.on("accept", () => setStatus("In chiamata — parla nella tua lingua"));
    c.on("disconnect", () => { setCall(null); setStatus("Chiamata terminata"); });
  };

  const start = async () => {
    if (!device.current || !to) return;
    setLines([]);
    setStatus(`Chiamo ${to}…`);
    bind(await device.current.connect({ params: { To: to } }));
  };

  return (
    <div className="max-w-md mx-auto space-y-3 p-4">
      <p className="text-sm text-muted-foreground">{status}</p>

      {incoming && (
        <div className="rounded-xl border p-3 space-y-2">
          <p className="font-semibold">📞 Chiamata da {incoming.parameters.From?.replace("client:", "")}</p>
          <div className="flex gap-2">
            <button className="flex-1 rounded-lg bg-green-500 text-white py-2"
              onClick={() => { incoming.accept(); bind(incoming); setIncoming(null); setLines([]); }}>Rispondi</button>
            <button className="flex-1 rounded-lg bg-red-500 text-white py-2"
              onClick={() => { incoming.reject(); setIncoming(null); }}>Rifiuta</button>
          </div>
        </div>
      )}

      {!call ? (
        <div className="flex gap-2">
          <input className="flex-1 rounded-lg border px-3 py-2" placeholder="Utente da chiamare"
            value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="rounded-lg bg-primary text-primary-foreground px-4" onClick={start}>Chiama</button>
        </div>
      ) : (
        <button className="w-full rounded-lg bg-red-500 text-white py-2" onClick={() => call.disconnect()}>Riaggancia</button>
      )}

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {lines.map((l, i) => {
          const mine = l.from === identity;
          return (
            <div key={i} className={`rounded-xl px-3 py-2 text-sm ${mine ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}>
              {mine ? l.original : l.translated}
              <span className="block text-xs text-muted-foreground mt-1">
                {mine ? `Tradotto: ${l.translated}` : `Originale: ${l.original}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
