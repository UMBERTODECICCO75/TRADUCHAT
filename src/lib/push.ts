const appId = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID"] as string | undefined;
const vapidKey = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY"] as string | undefined;
const firebaseConfig = {
  apiKey: import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY"] as string | undefined,
  projectId: import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID"] as string | undefined,
  appId,
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export interface PushConfigKey {
  label: string;
  present: boolean;
}

/** Reports which Firebase web-push keys are configured, without exposing their values. */
export function pushConfigStatus(): PushConfigKey[] {
  return [
    { label: "Chiave API web", present: Boolean(firebaseConfig.apiKey) },
    { label: "ID progetto", present: Boolean(firebaseConfig.projectId) },
    { label: "ID app web", present: Boolean(appId) },
    { label: "ID mittente messaggi", present: Boolean(firebaseConfig.messagingSenderId) },
    { label: "Chiave VAPID (Web Push)", present: Boolean(vapidKey) },
  ];
}

export type PushResult =
  | { status: "registered"; token: string }
  | { status: "not-configured" | "unsupported" | "open-in-new-tab" | "denied" };

/** Call from a click handler: browsers ignore permission requests without a user gesture. */
export async function enablePush(): Promise<PushResult> {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !appId || !vapidKey || !firebaseConfig.messagingSenderId) {
    return { status: "not-configured" };
  }
  if (!("Notification" in window)) return { status: "unsupported" };
  const { initializeApp } = await import("firebase/app");
  const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
  if (!(await isSupported())) return { status: "unsupported" };
  if (window.top !== window.self) return { status: "open-in-new-tab" };

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const config = firebaseConfig as Record<string, string>;
  const query = new URLSearchParams(config).toString();
  const serviceWorkerRegistration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
  const messaging = getMessaging(initializeApp(config));
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
  return token ? { status: "registered", token } : { status: "denied" };
}
