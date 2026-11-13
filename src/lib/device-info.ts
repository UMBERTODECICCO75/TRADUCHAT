// Classifica il dispositivo corrente (PC, tablet, telefono, orologio) dal browser
// e mantiene un identificativo stabile della sessione per «Dispositivi collegati».

const SESSION_KEY = "traduchat:device-session";

export type DeviceType = "computer" | "tablet" | "telefono" | "orologio";

function detectType(ua: string): DeviceType {
  if (/watch\s?os|android\s?wear|sm-r\d|watch\d/i.test(ua)) return "orologio";
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
  if (/Mobi|iPhone|iPod|Windows Phone|IEMobile/i.test(ua)) return "telefono";
  return "computer";
}

function detectOs(ua: string): string {
  if (/Windows/i.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X|Macintosh/i.test(ua)) return "Mac";
  if (/Android/i.test(ua)) return "Android";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Sistema sconosciuto";
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Browser";
}

export function currentDevice(): { type: DeviceType; label: string } {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const type = detectType(ua);
  const label = `${detectOs(ua)} · ${detectBrowser(ua)}`;
  return { type, label };
}

/** Identificativo stabile della sessione su questo dispositivo (salvato in locale). */
export function getDeviceSessionId(): string {
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = window.crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return window.crypto.randomUUID();
  }
}
