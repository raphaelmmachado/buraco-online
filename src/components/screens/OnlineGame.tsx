import { Suspense, lazy, useEffect, useRef } from "react";
import { useGameStore } from "../../store/useGameStore";
import { HomeScreen } from "./HomeScreen";
import { LobbyScreen } from "./LobbyScreen";
import { LoadingScreen } from "../ui/LoadingScreen";

// Dynamic Import
const GameScreen = lazy(() =>
  import("./GameScreen").then((module) => ({ default: module.GameScreen }))
);

/**
 * This component acts as a router, displaying the correct screen
 * based on the current game status from the WebSocket store.
 */
export const OnlineGame = ({ onBack }: { onBack: () => void }) => {
  const store = useGameStore();
  const status = store.status;
  const hasAttemptedAutoJoin = useRef(false);

  // Auto-join from URL
  useEffect(() => {
    if (hasAttemptedAutoJoin.current) return;
    
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("room");
    const nickFromUrl = params.get("nick")?.trim();
    
    // Prioritize nick from URL if it's a valid string, otherwise use saved name
    const savedName = localStorage.getItem("baralho_user_name");
    const userName = (nickFromUrl && nickFromUrl.length > 0) ? nickFromUrl : savedName;

    if (roomId && status === "IDLE" && userName && userName.length > 0) {
        console.log(`[AUTO-JOIN] Entrando na sala ${roomId} como ${userName}...`);
        
        // Persist the nick if it came from the URL and is valid
        if (nickFromUrl && nickFromUrl.length > 0) {
            localStorage.setItem("baralho_user_name", nickFromUrl.toUpperCase());
        }

        store.connect(roomId, "2v2", userName.toUpperCase());
        hasAttemptedAutoJoin.current = true;
        
        // Clean URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
  }, [status, store]);

  // The 'FINISHED' status can be handled here later, maybe showing a summary screen.
  if (status === "PLAYING" || status === "FINISHED" || status === "ROUND_OVER") {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <GameScreen game={store} />
      </Suspense>
    );
  }

  if (status === "LOBBY") {
    return <LobbyScreen />;
  }

  // Default view is the home screen (which is now just the Lobby entry)
  return <HomeScreen onBack={onBack} />;
};
