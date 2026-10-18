"use client";
import { useSyncExternalStore } from "react";
// Shared clock gives SSR a stable snapshot and refreshes visible expiry states.
const subscribe = (notify: () => void) => {
  const id = setInterval(notify, 30000);
  return () => clearInterval(id);
};
export const useClock = () =>
  useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 30000) * 30000,
    () => 0,
  );
