import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function ConversationPhoto({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="ghost" onClick={() => setOpen(true)} className="mt-2 h-auto w-full overflow-hidden p-0" aria-label={`${alt}. Apri e ingrandisci`}>
        <img src={src} alt={alt} loading="lazy" className="max-h-72 w-full rounded-xl object-cover" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="h-dvh max-h-dvh w-screen max-w-none gap-0 overflow-hidden border-0 bg-background p-0 sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[92vw] sm:max-w-6xl sm:rounded-lg">
          <DialogTitle className="sr-only">Foto condivisa</DialogTitle>
          <DialogDescription className="sr-only">Ingrandisci con due dita o con la rotella e trascina per spostare la foto.</DialogDescription>
          <TransformWrapper initialScale={1} minScale={1} maxScale={6} centerOnInit wheel={{ step: 0.12 }} doubleClick={{ mode: "toggle", step: 2 }}>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex h-16 shrink-0 items-center justify-center gap-2 border-b border-border px-16">
                  <Button type="button" size="icon" variant="secondary" onClick={() => zoomOut()} aria-label="Riduci foto" title="Riduci"><ZoomOut className="size-5" /></Button>
                  <Button type="button" size="icon" variant="secondary" onClick={() => resetTransform()} aria-label="Ripristina dimensione foto" title="Ripristina"><RotateCcw className="size-5" /></Button>
                  <Button type="button" size="icon" variant="secondary" onClick={() => zoomIn()} aria-label="Ingrandisci foto" title="Ingrandisci"><ZoomIn className="size-5" /></Button>
                </div>
                <TransformComponent wrapperClass="!h-full !w-full min-h-0 touch-none" contentClass="!h-full !w-full">
                  <div className="flex h-full w-full items-center justify-center p-3 sm:p-6">
                    <img src={src} alt={alt} className="max-h-full max-w-full select-none object-contain" draggable={false} />
                  </div>
                </TransformComponent>
              </div>
            )}
          </TransformWrapper>
        </DialogContent>
      </Dialog>
    </>
  );
}