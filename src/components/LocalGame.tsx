import { Suspense, lazy, useEffect } from "react";
import { useGameStoreBots } from "../store/useGameStoreBots";
import { useGameBots } from "../hooks/useGameBots";
import { useLocalGameAdapter } from "./game-ui/useLocalGameAdapter";
import { LoadingScreen } from "./ui/LoadingScreen";

// Dynamic Import for Heavy GameScreen
const GameScreen = lazy(() =>
  import("./screens/GameScreen").then((module) => ({
    default: module.GameScreen,
  }))
);

export const LocalGame = ({ onBack }: { onBack?: () => void }) => {
  const store = useGameStoreBots();
  const gameAdapter = useLocalGameAdapter();

  // Initialize Bots Logic
  useGameBots();

  // Auto-start 2v2 for Offline Mode
  useEffect(() => {
    if (store.status === "LOBBY") {
        store.start_game("2v2");
    }
  }, [store]);

  // If in Lobby, show Loading instead of Menu (since we auto-start)
  if (store.status === "LOBBY") {
    return <LoadingScreen message="Iniciando Jogo Offline..." subMessage="Modo 2v2" />;
  }

  // If Playing or Finished, render the Unified Game Screen
  // GameScreen handles FINISHED state internally, but we might want to override onLeave

  // Custom wrapper for onLeave to support "Back to Menu"
  const gameAdapterWithBack = {
    ...gameAdapter,
    leaveGame: () => {
      store.reset_game();
      if (onBack) onBack();
    },
  };

  return (
    <Suspense fallback={<LoadingScreen />}>
      <GameScreen game={gameAdapterWithBack} />
    </Suspense>
  );
};
