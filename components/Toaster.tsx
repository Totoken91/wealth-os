"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          fontSize: "13px",
          fontFamily: "var(--font-sans)",
          borderRadius: "12px",
        },
      }}
    />
  );
}
