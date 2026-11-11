export type Purpose = "analytics" | "advertising";
export type Choice = "granted" | "denied";

const PURPOSES = {
  analytics: ["analytics_storage"],
  advertising: ["ad_storage", "ad_user_data", "ad_personalization"],
} satisfies Record<Purpose, string[]>;
const LEGACY_KEY = "cookie_consent";
const MAX_AGE_DAYS: Record<Choice, number> = { denied: 183, granted: 365 };
const DAY_MS = 86_400_000;
const CHANGE_EVENT = "consent-change";
const CONSENT_COUNTRIES = "AT,BE,BG,HR,CY,CZ,DK,EE,FI,FR,DE,GR,HU,IE,IT,LV,LT,LU,MT,NL,PL,PT,RO,SK,SI,ES,SE,IS,LI,NO,GB,CH,RE,GP,MQ,GF,YT,MF,AX,CA".split(",");
let consentRegion: Promise<boolean> | undefined;
const unsaved: Partial<Record<Purpose, Choice>> = {};

function isPurpose(purpose: string): purpose is Purpose {
  return Object.prototype.hasOwnProperty.call(PURPOSES, purpose);
}

function keyOf(purpose: Purpose): string {
  return `cookie_consent_${purpose}`;
}

function gtag(...args: unknown[]) {
  (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.(...args);
}

function isConsentRequiredRegion(): Promise<boolean> {
  return (consentRegion ??= lookupConsentRegion());
}

async function lookupConsentRegion(): Promise<boolean> {
  try {
    const res = await fetch("/cdn-cgi/trace", { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return true;
    const trace = await res.text();
    // Behind a rewrite proxy the trace answers for the proxy's connection under another host.
    const host = trace
      .match(/^h=(.+)$/m)?.[1]
      ?.trim()
      .toLowerCase()
      .replace(/:\d+$/, "");
    if (host !== location.hostname) return true;
    const country = trace.match(/^loc=([A-Z0-9]{2})$/m)?.[1];
    if (!country || country === "XX" || country === "T1") return true;
    return CONSENT_COUNTRIES.includes(country);
  } catch {
    return true;
  }
}

function storedAnswer(purpose: Purpose): { choice: Choice; stale: boolean } | null {
  const pending = unsaved[purpose];
  if (pending) return { choice: pending, stale: false };
  try {
    const saved = JSON.parse(localStorage.getItem(keyOf(purpose)) ?? "null");
    const choice = saved?.choice;
    if ((choice !== "granted" && choice !== "denied") || typeof saved.at !== "number") return null;
    return { choice, stale: Date.now() - saved.at >= MAX_AGE_DAYS[choice as Choice] * DAY_MS };
  } catch {
    return null;
  }
}

function storedChoice(purpose: Purpose): Choice | null {
  const answer = storedAnswer(purpose);
  // An old refusal lets the banner ask again but never turns tracking back on.
  return answer && !(answer.stale && answer.choice === "granted") ? answer.choice : null;
}

function globalPrivacyControl(): boolean {
  return (
    typeof navigator !== "undefined" &&
    (navigator as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}

export function readChoice(purpose: Purpose): Choice | null {
  return globalPrivacyControl() ? "denied" : storedChoice(purpose);
}

export async function canTrack(purpose: Purpose): Promise<boolean> {
  const choice = readChoice(purpose);
  if (choice !== null) return choice === "granted";
  const required = await isConsentRequiredRegion();
  const latest = readChoice(purpose);
  return latest !== null ? latest === "granted" : !required;
}

export function applySignals(purpose: Purpose, choice: Choice) {
  if (!isPurpose(purpose)) return;
  if (globalPrivacyControl()) choice = "denied";
  if (purpose === "advertising" && choice === "denied") gtag("set", "user_data", null);
  gtag("consent", "update", Object.fromEntries(PURPOSES[purpose].map((signal) => [signal, choice])));
}

function restoreChoices(purposes: Purpose[]) {
  for (const purpose of purposes) {
    const choice = readChoice(purpose);
    if (choice) {
      applySignals(purpose, choice);
      continue;
    }
    // A cleared answer falls back to the regional default.
    void isConsentRequiredRegion().then((required) => {
      if (readChoice(purpose) === null) applySignals(purpose, required ? "denied" : "granted");
    });
  }
}

/** Persists only the purposes passed, so one answer never stands in for another. */
export function saveChoices(choices: Partial<Record<Purpose, Choice>>) {
  for (const [purpose, choice] of Object.entries(choices) as [Purpose, Choice][]) {
    if (!isPurpose(purpose)) continue;
    try {
      localStorage.setItem(keyOf(purpose), JSON.stringify({ choice, at: Date.now() }));
      // Code from before the per-purpose answers still reads the legacy key, so a refusal reaches it too.
      if (choice === "denied" && localStorage.getItem(LEGACY_KEY) !== null) localStorage.setItem(LEGACY_KEY, "denied");
      delete unsaved[purpose];
    } catch {
      unsaved[purpose] = choice;
    }
    applySignals(purpose, readChoice(purpose) ?? choice);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export async function needsAnswer(purposes: Purpose[]): Promise<boolean> {
  const required = await isConsentRequiredRegion();
  return required && !globalPrivacyControl() && purposes.some((purpose) => storedAnswer(purpose)?.stale ?? true);
}

/** Fires on changes from this tab and from other tabs. */
export function onConsentChange(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    const changed = (Object.keys(PURPOSES) as Purpose[]).filter(
      (purpose) => event.key === null || keyOf(purpose) === event.key,
    );
    if (changed.length === 0) return;
    for (const purpose of changed) delete unsaved[purpose];
    restoreChoices(changed);
    listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
