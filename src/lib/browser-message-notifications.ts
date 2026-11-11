export type BrowserNoticeStatus = "idle" | "granted" | "denied" | "unsupported" | "open-in-new-tab" | "failed";

/** Invoked directly by the Bip toggle, never during render or page load. */
export async function requestMessageNotices(): Promise<BrowserNoticeStatus> {
  if (!("Notification" in window)) return "unsupported";
  if (window.top !== window.self) return "open-in-new-tab";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission() === "granted" ? "granted" : "denied";
  } catch { return "failed"; }
}

export function shouldShowMessageNotice(enabled: boolean, visibility: DocumentVisibilityState, permission: NotificationPermission) {
  return enabled && visibility === "hidden" && permission === "granted";
}

/** Uses an existing messaging worker on mobile; does not create an app-shell worker. */
export async function showMessageNotice(stillAllowed: () => boolean): Promise<(() => void) | undefined> {
  if (!stillAllowed()) return;
  const options: NotificationOptions = {
    body: "Hai ricevuto un nuovo messaggio.",
    icon: "/icon-192.png", badge: "/favicon.png", tag: "traduchat-new-message", silent: true,
  };
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const messaging = registrations.find(r => r.active && new URL(r.active.scriptURL).pathname === "/firebase-messaging-sw.js");
      if (!stillAllowed()) return;
      if (messaging) {
        await messaging.showNotification("TraduChat", options);
        return () => { void messaging.getNotifications({ tag: "traduchat-new-message" }).then(rows => rows.forEach(n => n.close())).catch(() => {}); };
      }
    }
    if (!stillAllowed()) return;
    const notification = new Notification("TraduChat", options);
    notification.onclick = () => { window.focus(); notification.close(); };
    return () => notification.close();
  } catch { return; }
}