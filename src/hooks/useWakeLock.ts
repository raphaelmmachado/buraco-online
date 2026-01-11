import { useEffect } from "react";
import {
  type WakeLockSentinel,
  type Navigator as WakeLockNavigator,
} from "../../common/types/wake-lock";

export const useWakeLock = () => {
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      try {
        const nav = navigator as unknown as WakeLockNavigator;
        if (!("wakeLock" in navigator) || !nav.wakeLock) return;

        wakeLock = await nav.wakeLock.request("screen");
        console.log("Wake Lock ativo");

        wakeLock.addEventListener("release", () => {
          wakeLock = null;
          console.log("Wake Lock liberado");
        });
      } catch (err) {
        console.warn("Erro ao ativar Wake Lock", err);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && wakeLock === null) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
      }
    };
  }, []);
};
