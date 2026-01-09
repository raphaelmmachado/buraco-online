import { useGameStore } from "../store/useGameStoreBots";
import { useGameBots } from "../hooks/useGameBots";
import { GameScreen } from "./online/GameScreen";
import { useLocalGameAdapter } from "./game-ui/useLocalGameAdapter";

export const LocalGame = ({ onBack }: { onBack?: () => void }) => {
  const store = useGameStore();
  const gameAdapter = useLocalGameAdapter();

  // Initialize Bots Logic
  useGameBots();

  // If in Lobby, show the local lobby (similar to what DebugGame had)
  if (store.status === "LOBBY") {
    return (
      <div className="min-h-screen bg-green-800 flex flex-col gap-8 items-center justify-center text-white font-sans">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-yellow-400 to-orange-600">
          BURACO OFFLINE
        </h1>
        <p className="text-slate-300 -mt-6">Modo vs Computador</p>

        <div className="flex gap-4">
          <button
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-6 rounded-xl text-xl font-bold shadow-xl transition-transform active:scale-95"
            onClick={() => store.start_game("1v1")}
          >
            👤 1 vs 1
          </button>
          <button
            className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-6 rounded-xl text-xl font-bold shadow-xl transition-transform active:scale-95"
            onClick={() => store.start_game("2v2")}
          >
            👥 2 vs 2
          </button>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-8 text-white/50 hover:text-white underline"
          >
            Voltar ao Menu Principal
          </button>
        )}
      </div>
    );
  }

  // If Playing or Finished, render the Unified Game Screen
  // GameScreen handles FINISHED state internally, but we might want to override onLeave

  // Custom wrapper for onLeave to support "Back to Menu"
  const gameAdapterWithBack = {
    ...gameAdapter,
    leaveGame: () => {
      store.start_game("1v1"); // Reset or just re-render lobby?
      // Actually, we want to go back to LOBBY state of local store
      // But local store doesn't have a "reset to lobby" easily exposed?
      // `start_game` resets state to PLAYING.
      // We can force a reload or just call onBack if we want to exit completely.
      if (onBack) onBack();
    },
  };

  return <GameScreen game={gameAdapterWithBack} />;
};
