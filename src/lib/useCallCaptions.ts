import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { useServerFn } from "@tanstack/react-start";
import type Peer from "simple-peer";

import { decodeCaption, encodeCaption, isFatalRecognitionError, keepRecent } from "./call-captions";
import { queueSpeech, voiceLang } from "./speak";
import { translateMessage } from "./translate.functions";
import { useTranslationTicket } from "./useTranslationTicket";

type RecognitionResult = { isFinal: boolean; 0?: { transcript?: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};

function recognitionConstructor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export type CaptionLine = { id: number; mine: boolean; text: string; other: string };

type Options = {
  /** True while this device owns a connected call. */
  active: boolean;
  peer: MutableRefObject<Peer.Instance | null>;
  /** Language this participant speaks. */
  from: string;
  /** Language the other participant reads. */
  to: string;
};

/**
 * Translated captions during a one-to-one call: recognise my speech on this
 * device, translate it for the other participant and send it over the peer
 * data channel; show (and optionally read aloud) what arrives from them.
 */
export function useCallCaptions({ active, peer, from, to }: Options) {
  const translate = useServerFn(translateMessage);
  const ensureTicket = useTranslationTicket();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [lines, setLines] = useState<CaptionLine[]>([]);
  const [problem, setProblem] = useState("");
  const nextId = useRef(0);
  const readAloudRef = useRef(readAloud);
  readAloudRef.current = readAloud;
  const chain = useRef(Promise.resolve());
  const settings = useRef({ from, to, translate, ensureTicket });
  settings.current = { from, to, translate, ensureTicket };

  useEffect(() => {
    setSupported(recognitionConstructor() !== null);
  }, []);

  // A finished or dropped call resets captions for the next one.
  useEffect(() => {
    if (active) return;
    setEnabled(false);
    setLines([]);
    setProblem("");
  }, [active]);

  const add = useCallback((line: Omit<CaptionLine, "id">) => {
    nextId.current += 1;
    const id = nextId.current;
    setLines((list) => keepRecent(list, { ...line, id }));
  }, []);

  /** Called with every payload received on the call's data channel. */
  const receive = useCallback(
    (data: unknown) => {
      const caption = decodeCaption(data);
      if (!caption) return;
      add({ mine: false, text: caption.translated, other: caption.original });
      if (readAloudRef.current)
        queueSpeech(caption.translated, settings.current.from, () => undefined);
    },
    [add],
  );

  useEffect(() => {
    if (!enabled || !active) return;
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    let running = true;
    let restartTimer = 0;
    const recognition = new Constructor();
    recognition.lang = voiceLang(settings.current.from);
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const handle = (spoken: string) => {
      chain.current = chain.current
        .then(async () => {
          if (!running) return;
          const {
            from: source,
            to: target,
            translate: run,
            ensureTicket: ticket,
          } = settings.current;
          let translated = spoken;
          if (source !== target) {
            try {
              translated = (
                await run({
                  data: { text: spoken, from: source, to: target, ticket: await ticket() },
                })
              ).translation;
            } catch (reason) {
              setProblem(reason instanceof Error ? reason.message : "Traduzione non disponibile.");
            }
          }
          const channel = peer.current;
          if (channel?.connected) {
            try {
              channel.send(encodeCaption(spoken, translated));
            } catch {
              /* il canale si è appena chiuso */
            }
          }
          add({ mine: true, text: spoken, other: translated });
        })
        .catch(() => undefined);
    };

    recognition.onresult = (event) => {
      // Ignore what the phone itself is reading aloud, so translations never loop back.
      if (typeof window !== "undefined" && window.speechSynthesis?.speaking) return;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const spoken = result?.isFinal ? result[0]?.transcript?.trim() : "";
        if (spoken) handle(spoken);
      }
    };
    recognition.onerror = (event) => {
      if (!isFatalRecognitionError(event.error)) return;
      running = false;
      setEnabled(false);
      setProblem(
        event.error === "language-not-supported"
          ? "Sottotitoli non disponibili per questa lingua su questo dispositivo."
          : "Su questo dispositivo il microfono non può dettare i sottotitoli durante la chiamata. Prova con Chrome o usa il messaggio vocale.",
      );
    };
    // Browsers stop listening after a pause: restart while captions are on.
    recognition.onend = () => {
      if (!running) return;
      restartTimer = window.setTimeout(() => {
        if (running) {
          try {
            recognition.start();
          } catch {
            /* già avviato */
          }
        }
      }, 300);
    };
    try {
      recognition.start();
      setProblem("");
    } catch {
      running = false;
      setEnabled(false);
      setProblem("Non riesco ad avviare i sottotitoli. Riprova.");
    }
    return () => {
      running = false;
      window.clearTimeout(restartTimer);
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        /* già fermo */
      }
    };
  }, [active, add, enabled, peer]);

  return {
    supported,
    enabled,
    toggle: () => {
      setProblem("");
      setEnabled((value) => !value);
    },
    readAloud,
    toggleReadAloud: () => {
      setReadAloud((value) => {
        if (value && typeof window !== "undefined") window.speechSynthesis?.cancel();
        return !value;
      });
    },
    lines,
    problem,
    receive,
  };
}
