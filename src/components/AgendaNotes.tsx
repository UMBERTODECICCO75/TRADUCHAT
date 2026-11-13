import { useEffect, useState } from "react";
import { AlarmClock, Bell, CalendarDays, Mail, MessageCircle, Mic, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { cancelAgendaEmail, scheduleAgendaEmail } from "@/lib/agenda.functions";
import { agendaWhatsAppUrl } from "@/lib/agenda-whatsapp";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { playBeep, requestAlertPermission, alertPermission } from "@/lib/message-alerts";

type Note = { id: string; text: string; date: string; time: string; alarm: boolean; fired?: boolean; email?: boolean; call?: boolean; sms?: boolean };
const KEY = "traduchat:agenda";

function load(): Note[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Note[];
  } catch {
    return [];
  }
}

function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/** Personal "da ricordare" agenda kept on this device, with in-app alarms. */
export function AgendaNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [listening, setListening] = useState(false);
  const [byEmail, setByEmail] = useState(false);
  const scheduleEmail = useServerFn(scheduleAgendaEmail);
  const cancelEmail = useServerFn(cancelAgendaEmail);

  useEffect(() => {
    setNotes(load());
    setDate(today());
  }, []);

  function save(next: Note[]) {
    setNotes(next);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = load();
      let changed = false;
      const now = Date.now();
      for (const n of current) {
        if (n.alarm && !n.fired && new Date(`${n.date}T${n.time}`).getTime() <= now) {
          n.fired = true;
          changed = true;
          playBeep();
          setTimeout(playBeep, 400);
          toast(`⏰ Da ricordare: ${n.text}`, { duration: 15000 });
          if (alertPermission() === "granted") {
            try {
              new Notification("TraduChat — Da ricordare", { body: n.text, icon: "/favicon.png" });
            } catch {
              /* beep and toast still fire */
            }
          }
        }
      }
      if (changed) save(current);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  function dictate() {
    const W = window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("La dettatura a voce non è disponibile in questo browser.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "it-IT";
    rec.onresult = (e: any) => setText((t) => `${t} ${e.results[0][0].transcript}`.trim().slice(0, 300));
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  async function add(alarm: boolean) {
    if (!text.trim() || !date || !time) return;
    if (alarm) await requestAlertPermission();
    const id = crypto.randomUUID();
    let email = false;
    if (byEmail) {
      const at = new Date(`${date}T${time}`);
      if (at.getTime() <= Date.now()) {
        toast.error("Per l'avviso email scegli una data e un'ora future.");
        return;
      }
      try {
        await scheduleEmail({ data: { id, text: text.trim(), remindAt: at.toISOString(), email: byEmail } });
        email = byEmail;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Non riesco a programmare l'avviso. Riprova.");
        return;
      }
    }
    const next = [...notes, { id, text: text.trim(), date, time, alarm, email }].sort((a, b) =>
      `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
    );
    save(next);
    setText("");
    toast.success(
      email
          ? "Appunto salvato: riceverai anche un'email"
          : alarm
              ? "Appunto salvato con allarme"
              : "Appunto salvato",
    );
  }

  return (
    <section className="mt-4 rounded-3xl surface-card p-4">
      <p className="flex items-center gap-2 font-display text-lg">
        <CalendarDays className="size-4 text-accent" /> Da ricordare
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {byEmail ? "Avviso email selezionato" : "Appunti personali"}
      </p>
      <div className="mt-3 flex gap-2">
        <Input value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="Es. Chiamare il medico" aria-label="Testo da ricordare" className="h-11" />
        <Button variant="outline" size="icon" className="size-11 shrink-0" onClick={dictate} aria-label="Detta a voce">
          <Mic className={listening ? "size-4 text-destructive" : "size-4 text-accent"} />
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Data" className="h-11" />
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Ora" className="h-11" />
      </div>
      <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 text-sm">
        <input type="checkbox" className="size-5 accent-[hsl(var(--primary))]" checked={byEmail} onChange={(e) => setByEmail(e.target.checked)} />
        <Mail className="size-4 text-accent" /> Avvisami anche via email (arriva anche ad app chiusa)
      </label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button className="h-11" disabled={!text.trim()} onClick={() => void add(true)}>
          <AlarmClock className="size-4" /> Salva con allarme
        </Button>
        <Button variant="outline" className="h-11" disabled={!text.trim()} onClick={() => void add(false)}>
          Salva senza allarme
        </Button>
      </div>
      {notes.length > 0 && (
        <ul className="mt-3 grid gap-2">
          {notes.map((n) => (
            <li key={n.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="min-w-0 flex-1">
                <p className={n.fired ? "text-sm text-muted-foreground line-through" : "text-sm font-semibold"}>{n.text}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  {new Date(`${n.date}T${n.time}`).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })} · {n.time}
                  {n.alarm && <Bell className="size-3 text-accent" aria-label="con allarme" />}
                  {n.email && <Mail className="size-3 text-accent" aria-label="con email" />}
                </p>
              </div>
              <Button variant="outline" size="icon" className="size-10 shrink-0" asChild>
                <a href={agendaWhatsAppUrl(n)} target="_blank" rel="noopener noreferrer" aria-label="Invia promemoria su WhatsApp" title="Invia su WhatsApp">
                  <MessageCircle className="size-4" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="size-10" aria-label="Elimina appunto" onClick={() => {
                if (n.email || n.call || n.sms) void cancelEmail({ data: { id: n.id } }).catch(() => undefined);
                save(notes.filter((x) => x.id !== n.id));
              }}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
