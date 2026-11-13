import { useEffect, useState, useRef } from "react";
import { Coins, Loader2, Send, Sparkles, Square, Trash2, Volume2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { askAssistant } from "@/lib/assistant.functions";
import { speakReplyVoice } from "@/lib/email-reply.functions";
import { getAiCreditBalance, listAiCreditPurchases, createCreditCheckout } from "@/lib/payments.functions";
import { CREDIT_PACKS, formatCreditPrice, isBillingEmail } from "@/lib/credit-catalog";
import { getPaddleEnvironment, initializePaddle } from "@/lib/paddle";
import { supabase } from "@/integrations/supabase/client";
import { useTranslationTicket } from "@/lib/useTranslationTicket";
import { MicButton } from "@/components/MicButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assistantTextParts } from "@/lib/assistant-links";
import { AssistantAttachments } from "@/components/AssistantAttachments";
import type { AssistantPhoto } from "@/lib/assistant-images";
import { LANGUAGES, type Language } from "@/lib/languages";


/** Home bar: the visitor asks anything and reads the AI answer right below. */
export function AskAiBar() {
  const ask = useServerFn(askAssistant);
  const ensureTicket = useTranslationTicket();
  const [question, setQuestion] = useState("");
  const [tone, setTone] = useState<"informale" | "formale">("informale");
  const [replyLang, setReplyLang] = useState<Language>("Italiano");
  useEffect(() => {
    if (window.localStorage.getItem("traduchat:ai-tone") === "formale") setTone("formale");
    const saved = window.localStorage.getItem("traduchat:ai-lang");
    if (saved && (LANGUAGES as readonly string[]).includes(saved)) setReplyLang(saved as Language);
  }, []);
  function changeTone(value: "informale" | "formale") {
    setTone(value);
    window.localStorage.setItem("traduchat:ai-tone", value);
  }
  function changeLang(value: Language) {
    setReplyLang(value);
    window.localStorage.setItem("traduchat:ai-lang", value);
  }
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<AssistantPhoto | null>(null);
  const [imagePreparing, setImagePreparing] = useState(false);
  const speak = useServerFn(speakReplyVoice);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [player, setPlayer] = useState<HTMLAudioElement | null>(null);
  const readBalance = useServerFn(getAiCreditBalance);
  const checkout = useServerFn(createCreditCheckout);
  const history = useServerFn(listAiCreditPurchases);
  const [billingEmail, setBillingEmail] = useState("");
  const [needsEmail, setNeedsEmail] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const request = useRef<{ question: string; image: string | undefined; id: string } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [payBusy, setPayBusy] = useState(false);

  useEffect(() => {
    readBalance().then(result => setBalance(result.balance)).catch(err => setError(err instanceof Error ? err.message : "Saldo non disponibile."));
    void supabase.auth.getUser().then(({ data }) => setNeedsEmail(!isBillingEmail(data.user?.email)));
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order");
    if (params.get("checkout") === "success" && orderId && /^[0-9a-f-]{36}$/i.test(orderId)) {
      setPaymentStatus("Pagamento in elaborazione…");
      let attempts = 0;
      timer.current = setInterval(() => {
        attempts += 1;
        if (attempts >= 24 && timer.current) clearInterval(timer.current);
        history({ data: { offset: 0, orderId } }).then(async result => {
          if (result.purchases.length) {
            if (timer.current) clearInterval(timer.current);
            setBalance((await readBalance()).balance);
            setPaymentStatus("Ricarica accreditata.");
            toast.success("Ricarica accreditata.");
            window.history.replaceState({}, "", "/app");
          } else if (attempts >= 24) {
            if (timer.current) clearInterval(timer.current);
            setPaymentStatus("Accredito in ritardo: controlla Le mie ricariche prima di pagare di nuovo.");
          }
        }).catch(() => { if (attempts >= 24 && timer.current) { clearInterval(timer.current); setPaymentStatus("Non riesco a verificare la ricarica. Controlla lo storico."); } });
      }, 5000);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buy(priceId: string) {
    if (payBusy) return;
    setPayBusy(true);
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Accedi per ricaricare i crediti.");
      await initializePaddle();
      const order = await checkout({ data: { priceId: priceId as "ai_credits_50_eur" | "ai_credits_200_eur" | "ai_credits_1000_eur", billingEmail: needsEmail ? billingEmail : undefined } });
      window.Paddle.Checkout.open({
        transactionId: order.transactionId,
        customer: { email: order.email },
        customData: { userId: user.id },
        settings: {
          displayMode: "overlay",
          successUrl: `${window.location.origin}/app?checkout=success&order=${order.orderId}`,
          locale: "it",
          allowLogout: false,
          variant: "one-page",
        },
      });
      setPaymentStatus("Pagamento aperto: se lo chiudi senza pagare, nessun credito viene aggiunto.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pagamento non riuscito, riprova.");
    } finally {
      setPayBusy(false);
    }
  }

  function stopVoice() {
    player?.pause();
    setPlayer(null);
  }

  async function listen() {
    if (voiceBusy || !answer) return;
    stopVoice();
    setVoiceBusy(true);
    setError("");
    try {
      const { audio } = await speak({ data: { text: answer.slice(0, 700) } });
      const el = new Audio(`data:audio/wav;base64,${audio}`);
      el.onended = () => setPlayer(null);
      setPlayer(el);
      await el.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voce non riuscita, riprova.");
    } finally {
      setVoiceBusy(false);
    }
  }

  async function submit(raw?: string) {
    const text = (raw ?? question).trim() || (image ? "Descrivi questa immagine e il testo visibile." : "");
    if (text.length < 2 || busy || imagePreparing) return;
    setBusy(true);
    setError("");
    setAnswer("");
    stopVoice();
    let balanceUpdated = false;
    try {
      const ticket = await ensureTicket();
      const trimmed = text.slice(0, 1000);
      if (!request.current || request.current.question !== trimmed || request.current.image !== image?.dataUrl) request.current = { question: trimmed, image: image?.dataUrl, id: crypto.randomUUID() };
      const pendingRequest = request.current;
      if (!pendingRequest) throw new Error("Richiesta non disponibile.");
      const result = await ask({ data: { question: trimmed, ticket, requestId: pendingRequest.id, image: image ?? undefined, tone, language: replyLang } });
      request.current = null;
      setAnswer(result.answer);
      if (typeof result.balance === "number") {
        setBalance(result.balance);
        balanceUpdated = true;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Risposta non riuscita, riprova.";
      if (!message.includes("elaborazione") && !message.includes("Failed to fetch") && !message.includes("Network")) request.current = null;
      setError(message);
      if (message.includes("Crediti IA esauriti")) {
        setBalance(0);
        setRechargeOpen(true);
      }
    } finally {
      if (!balanceUpdated) void readBalance().then(result => setBalance(result.balance)).catch(() => undefined);
      setBusy(false);
    }
  }

  /** Hides the current question and answer from the screen. */
  function clearConversation() {
    if (busy || imagePreparing) return;
    stopVoice();
    request.current = null;
    setQuestion("");
    setImage(null);
    setAnswer("");
    setError("");
    toast.success("Conversazione cancellata.");
  }

  return (
    <section className="mt-10 w-full" aria-label="Chiedi all'assistente AI">
      <div className="rounded-3xl border border-border bg-card p-4 sm:p-5">
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
          <Sparkles className="size-4" />
          Chiedi all'assistente
        </p>
        {balance !== null && (
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Coins className="size-3.5" />
            Crediti IA{getPaddleEnvironment() === "sandbox" ? " di prova" : ""}: {balance}
            <Button variant="link" size="sm"
              type="button"
              onClick={() => setRechargeOpen((open) => !open)}
              className="font-medium text-primary underline underline-offset-2"
            >
              Ricarica crediti
            </Button>
          </p>
        )}
        {rechargeOpen && (
          <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-3">
            <p className="text-center text-xs font-medium text-foreground">
              Scegli un pacchetto: i crediti arrivano subito e non scadono.
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {CREDIT_PACKS.map((pack) => (
                <Button
                  key={pack.priceId}
                  type="button"
                  variant="outline"
                  disabled={payBusy}
                  onClick={() => void buy(pack.priceId)}
                  className="h-auto flex-col gap-0.5 rounded-xl py-2"
                >
                  <span className="text-sm font-semibold">{pack.credits} crediti</span>
                  <span className="text-xs text-muted-foreground">{formatCreditPrice(pack.amount)}</span>
                </Button>
              ))}
            </div>
            {needsEmail && <Input className="mt-3" type="email" aria-label="Email per la ricevuta" placeholder="Email per la ricevuta" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} />}
            {payBusy && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Apro il pagamento…
              </p>
            )}
            <p className="mt-2 text-center">
              <Link
                to="/ricariche"
                className="text-xs font-medium text-primary underline underline-offset-2"
              >
                Le mie ricariche
              </Link>
            </p>
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 text-xs" role="radiogroup" aria-label="Tono della traduzione">
          <span className="text-muted-foreground">Tono della traduzione:</span>
          {(["informale", "formale"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={tone === value}
              onClick={() => changeTone(value)}
              className={`min-h-9 rounded-full px-3 font-medium ${tone === value ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
            >
              {value === "informale" ? "Informale (tu)" : "Formale (Lei / usted)"}
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Lingua della risposta e del microfono:</span>
          <select
            value={replyLang}
            onChange={(event) => changeLang(event.target.value as Language)}
            className="min-h-9 rounded-full border border-border bg-background px-3 text-foreground"
          >
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Input
            disabled={busy || imagePreparing}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Come si dice “buongiorno” in arabo?"
            aria-label="Scrivi la tua domanda"
            maxLength={1000}
            className="h-12 min-w-0 flex-1 rounded-full px-5"
          />
          <MicButton
            language={replyLang}
            onText={(text) => {
              setQuestion(text);
              void submit(text);
            }}
            className="h-12 shrink-0 self-center"
          />
          <Button
            type="submit"
            size="lg"
            disabled={busy || imagePreparing || (!image && question.trim().length < 2) || question.trim().length === 1}
            className="h-12 rounded-full px-6"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {busy ? "Rispondo…" : "Chiedi"}
          </Button>
        </form>
        <div className="mt-2">
          <AssistantAttachments image={image} disabled={busy} onChange={photo => { request.current = null; setImage(photo); setAnswer(""); }} onError={setError} onPreparing={setImagePreparing} />
        </div>

        {paymentStatus && <p role="status" className="mt-3 text-sm text-muted-foreground">{paymentStatus}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        {answer && (
          <>
            <p className="mt-3 whitespace-pre-wrap break-words text-left text-sm text-foreground">
              {assistantTextParts(answer).map((part, index) => part.href ? (
                <a key={index} href={part.href} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2 [overflow-wrap:anywhere]">{part.text}</a>
              ) : <span key={index}>{part.text}</span>)}
            </p>
            <div className="mt-3 flex justify-start">
              {player ? (
                <Button type="button" variant="outline" className="rounded-full" onClick={stopVoice}>
                  <Square className="size-4" /> Ferma
                </Button>
              ) : (
                <Button type="button" variant="outline" className="rounded-full" disabled={voiceBusy} onClick={() => void listen()}>
                  {voiceBusy ? <Loader2 className="size-4 animate-spin" /> : <Volume2 className="size-4" />}
                  {voiceBusy ? "Preparo la voce…" : "Ascolta la risposta"}
                </Button>
              )}
            </div>
          </>
        )}
        {(answer || question || error || image) && (
          <div className="mt-3 flex justify-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || imagePreparing}
              onClick={clearConversation}
              className="rounded-full"
            >
              <Trash2 className="size-4" /> Cancella conversazione
            </Button>
          </div>
        )}
        {!answer && !error && (
          <p className="mt-3 text-xs text-muted-foreground">
            Traduzioni, frasi utili o dubbi sull'app: la risposta arriva in italiano.
          </p>
        )}
      </div>
    </section>
  );
}
