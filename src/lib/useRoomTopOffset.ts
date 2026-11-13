import { useEffect } from "react";

/**
 * La chat occupa la parte di schermo rimasta sotto l'intestazione della pagina.
 *
 * L'intestazione non è fissa: scorre via con la pagina. Per questo la sua
 * altezza va misurata (non si può indovinare) e passata alla chat come
 * variabile `--room-top`, che la chat sottrae all'altezza totale dello schermo.
 *
 * Si misura l'intestazione e non la chat: misurare la chat darebbe un valore
 * che dipende da sé stesso e, a ogni controllo, si allontanerebbe sempre più
 * dal valore giusto. Con l'intestazione il conteggio resta fermo e l'area di
 * scrittura resta sempre raggiungibile in fondo alla pagina.
 *
 * Viene usata un'altezza fissa: così l'elenco dei messaggi scorre al suo
 * interno e l'area di scrittura resta sempre visibile in fondo.
 */
export function useRoomTopOffset(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const main = document.querySelector("main");
    if (!main) return;
    const header = main.previousElementSibling;
    if (!header) return;

    const fit = () => {
      const offset = Math.max(0, Math.round(header.getBoundingClientRect().bottom));
      main.style.setProperty("height", `calc(100dvh - ${offset}px)`);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(header);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
      main.style.removeProperty("height");
    };
  }, [enabled]);
}
