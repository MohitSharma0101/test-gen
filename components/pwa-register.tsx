"use client";

import { useEffect } from "react";

// Registers public/sw.js (offline screen only). Production only: in dev a
// service worker gets in the way of hot reload.
export const PwaRegister = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not fatal: the app works the same without it
    });
  }, []);
  return null;
};
