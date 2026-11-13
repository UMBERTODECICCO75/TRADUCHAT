import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { getPreferredLanguage, onPreferredLanguageChange } from "@/lib/preferred-language";
import { translateMessage } from "@/lib/translate.functions";
import { useTranslationTicket } from "@/lib/useTranslationTicket";
import { isRtlLanguage } from "@/lib/useAutoTranslatedTexts";

const CACHE_PREFIX = "traduchat:ui-tr:";
const SEP = "\n@@@\n";
const ATTRS = ["placeholder", "aria-label", "title"] as const;

type Cache = Record<string, string>;

function loadCache(lang: string): Cache {
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_PREFIX + lang) || "{}") as Cache;
  } catch {
    return {};
  }
}

function saveCache(lang: string, cache: Cache) {
  try {
    window.localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(cache));
  } catch {
    /* storage full: keep in memory only */
  }
}

function worthTranslating(text: string) {
  const t = text.trim();
  return t.length > 1 && t.length < 1500 && /\p{L}{2,}/u.test(t);
}

function excluded(el: Element | null) {
  return !!el?.closest('[translate="no"], script, style, textarea, input, select, code, [contenteditable="true"]');
}

/**
 * Translates every visible Italian interface text (including legal pages and
 * guides) into the reader's preferred language. People's messages are marked
 * translate="no" and stay untouched. Translations are cached per language.
 */
export function PageTranslator() {
  const [language, setLanguage] = useState<string | null>(null);
  const ensureTicket = useTranslationTicket();
  const translate = useServerFn(translateMessage);
  const translateRef = useRef(translate);
  translateRef.current = translate;

  useEffect(() => {
    setLanguage(getPreferredLanguage());
    return onPreferredLanguageChange((value) => setLanguage(value));
  }, []);

  useEffect(() => {
    const root = document.body;
    const target = language && language !== "Italiano" ? language : null;
    // Originals per node, so switching language or back to Italian restores them.
    const textOrig = new WeakMap<Text, string>();
    const attrOrig = new WeakMap<Element, Record<string, string>>();
    const applied = new WeakMap<Text, string>();
    const cache: Cache = target ? loadCache(target) : {};
    const pending = new Set<string>();
    let timer: number | undefined;
    let busy = false;
    let stopped = false;

    document.documentElement.dir = target && isRtlLanguage(target) ? "rtl" : "ltr";

    function applyText(node: Text) {
      if (excluded(node.parentElement)) return;
      const current = node.data;
      if (applied.get(node) === current) return;
      const source = current;
      textOrig.set(node, source);
      if (!target || !worthTranslating(source)) return;
      const key = source.trim();
      const hit = cache[key];
      if (hit) {
        const out = source.replace(key, hit);
        applied.set(node, out);
        if (node.data !== out) node.data = out;
      } else pending.add(key);
    }

    function applyAttrs(el: Element) {
      if (excluded(el) && el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") return;
      if (el.closest('[translate="no"]')) return;
      const store = attrOrig.get(el) ?? {};
      for (const name of ATTRS) {
        const value = el.getAttribute(name);
        if (!value) continue;
        if (!(name in store) || (value !== store[name] && value !== cache[store[name]!.trim()])) store[name] = value;
        const source = store[name]!;
        if (!target || !worthTranslating(source)) continue;
        const hit = cache[source.trim()];
        if (hit) {
          if (value !== hit) el.setAttribute(name, hit);
        } else pending.add(source.trim());
      }
      attrOrig.set(el, store);
    }

    function scan(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) return applyText(node as Text);
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      applyAttrs(el);
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let n = walker.nextNode();
      while (n) {
        if (n.nodeType === Node.TEXT_NODE) applyText(n as Text);
        else applyAttrs(n as Element);
        n = walker.nextNode();
      }
    }

    async function flush() {
      if (!target || busy || stopped || pending.size === 0) return;
      busy = true;
      try {
        while (pending.size && !stopped) {
          const batch: string[] = [];
          let size = 0;
          for (const s of pending) {
            if (size + s.length + SEP.length > 5000 && batch.length) break;
            batch.push(s);
            size += s.length + SEP.length;
          }
          batch.forEach((s) => pending.delete(s));
          const ticket = await ensureTicket();
          const result = await translateRef.current({
            data: { text: batch.join(SEP), from: "Italiano", to: target, ticket },
          });
          const parts = result.translation.split("@@@").map((p) => p.trim());
          if (parts.length === batch.length) {
            batch.forEach((s, i) => {
              if (parts[i]) cache[s] = parts[i]!;
            });
          } else {
            // Fall back to one-by-one so a merged answer never mislabels texts.
            for (const s of batch.slice(0, 20)) {
              const one = await translateRef.current({ data: { text: s, from: "Italiano", to: target, ticket } });
              if (one.translation.trim()) cache[s] = one.translation.trim();
            }
          }
          saveCache(target, cache);
          if (!stopped) scan(root);
        }
      } catch {
        /* quota or network: keep Italian, retry on next change */
      } finally {
        busy = false;
      }
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void flush(), 250);
    }

    // Restore originals (when switching back to Italian) then translate.
    scan(root);
    schedule();

    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "characterData") applyText(r.target as Text);
        else if (r.type === "attributes") applyAttrs(r.target as Element);
        else r.addedNodes.forEach(scan);
      }
      if (pending.size) schedule();
    });
    if (target) {
      observer.observe(root, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: [...ATTRS],
      });
    }

    return () => {
      stopped = true;
      observer.disconnect();
      window.clearTimeout(timer);
      // Put Italian back so the next language starts from the originals.
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let n = walker.nextNode();
      while (n) {
        if (n.nodeType === Node.TEXT_NODE) {
          const o = textOrig.get(n as Text);
          if (o !== undefined && (n as Text).data !== o) (n as Text).data = o;
        } else {
          const store = attrOrig.get(n as Element);
          if (store) for (const [k, v] of Object.entries(store)) (n as Element).setAttribute(k, v);
        }
        n = walker.nextNode();
      }
    };
  }, [language, ensureTicket]);

  return null;
}
