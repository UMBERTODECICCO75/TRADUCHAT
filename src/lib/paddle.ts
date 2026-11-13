import { resolvePaddlePrice } from "@/lib/payments.functions";
import { billingEnvironment } from "./credit-catalog";

const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"];

declare global {
  interface Window {
    Paddle: any;
  }
}

/** Single source of truth for which payments environment the client is in. */
export function getPaddleEnvironment(): "sandbox" | "live" {
  return billingEnvironment();
}

let paddleInitialized = false;
let initialization: Promise<void> | null = null;

export async function initializePaddle() {
  if (paddleInitialized) return;
  if (initialization) return initialization;

  if (!clientToken) {
    throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
  }

  initialization = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => {
      const paddleJsEnvironment =
        getPaddleEnvironment() === "sandbox" ? "sandbox" : "production";
      window.Paddle.Environment.set(paddleJsEnvironment);
      window.Paddle.Initialize({ token: clientToken, checkout: { settings: { locale: "it" } } });
      paddleInitialized = true;
      resolve();
    };
    script.onerror = () => { initialization = null; script.remove(); reject(new Error("Non riesco ad aprire il pagamento. Riprova.")); };
    document.head.appendChild(script);
  });
  return initialization;
}

export async function getPaddlePriceId(priceId: string): Promise<string> {
  const environment = getPaddleEnvironment();
  return resolvePaddlePrice({ data: { priceId, environment } });
}
