import { useEffect, useState } from "react";
import logoUrl from "@/assets/logo-traduchat-master.png";

const SHOW_MS = 1400;
const FADE_MS = 350;

export function Splash({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFading(true), SHOW_MS);
    const hideTimer = window.setTimeout(() => setVisible(false), SHOW_MS + FADE_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {children}
      {visible && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity"
          style={{ opacity: fading ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
        >
          <img
            src={logoUrl}
            alt="TraduChat"
            className="h-28 w-28 rounded-3xl shadow-lg sm:h-36 sm:w-36"
          />
          <p className="mt-5 text-2xl font-bold tracking-tight text-foreground">TraduChat</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Chat · Traduzione istantanea · Videocall
          </p>
        </div>
      )}
    </>
  );
}
