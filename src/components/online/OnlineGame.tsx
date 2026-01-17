import { Suspense, lazy } from "react";
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
export const OnlineGame = ({ onPlayLocal }: { onPlayLocal?: () => void }) => {
  const store = useGameStore();
  const status = store.status;

  // The 'FINISHED' status can be handled here later, maybe showing a summary screen.
  if (status === "PLAYING" || status === "FINISHED") {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <GameScreen game={store} />
      </Suspense>
    );
  }

  if (status === "LOBBY") {
    return <LobbyScreen />;
  }

  // Default view is the home screen to join a game
  return <HomeScreen onPlayLocal={onPlayLocal} />;
};
