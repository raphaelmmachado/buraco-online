import { Suspense, lazy } from "react";
import { useGameStoreBots } from "../store/useGameStoreBots";
import { useGameBots } from "../hooks/useGameBots";
import { useLocalGameAdapter } from "./game-ui/useLocalGameAdapter";
import { StyledButton } from "./ui/StyledButton";
import { LoadingScreen } from "./ui/LoadingScreen";
import { User, Users, ArrowLeft } from "lucide-react";

// Dynamic Import for Heavy GameScreen
const GameScreen = lazy(() =>
  import("./online/GameScreen").then((module) => ({
    default: module.GameScreen,
  }))
);

export const LocalGame = ({ onBack }: { onBack?: () => void }) => {
  const store = useGameStoreBots();
  const gameAdapter = useLocalGameAdapter();

  // Initialize Bots Logic
  useGameBots();

  // If in Lobby, show the local lobby (similar to what DebugGame had)
  if (store.status === "LOBBY") {
    return (
      <div className="min-h-screen bg-[#0f2e1a] flex flex-col gap-8 items-center justify-center text-white font-sans relative overflow-hidden">
        {/* Background Texture */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 pointer-events-none"></div>

        <div className="text-center relative z-10 animate-fade-in">
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 mb-2 drop-shadow-2xl">
            BURACO
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-8 bg-white/20"></div>
            <p className="text-sm text-slate-300 tracking-[0.5em] uppercase font-bold text-shadow-sm">
              Offline Mode
            </p>
            <div className="h-[1px] w-8 bg-white/20"></div>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/10 relative z-10 w-full max-w-md group hover:border-purple-500/20 transition-colors">
          <div className="flex flex-col gap-4">
            <StyledButton
              variant="secondary"
              size="xl"
              fullWidth
              icon={<User size={32} />}
              onClick={() => store.start_game("1v1")}
              className="bg-blue-600/80 hover:bg-blue-500" // Custom overwrite if needed, but variant handles it
            >
              1 vs 1
            </StyledButton>
            
            <StyledButton
              variant="secondary"
              size="xl"
              fullWidth
              icon={<Users size={32} />}
              onClick={() => store.start_game("2v2")}
              className="bg-purple-600/80 hover:bg-purple-500 shadow-purple-900/20"
            >
              2 vs 2
            </StyledButton>
          </div>

          {onBack && (
            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <StyledButton
                variant="ghost"
                size="sm"
                icon={<ArrowLeft size={14} />}
                onClick={onBack}
              >
                Voltar ao Menu Principal
              </StyledButton>
            </div>
          )}
        </div>
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

  return (
    <Suspense fallback={<LoadingScreen />}>
      <GameScreen game={gameAdapterWithBack} />
    </Suspense>
  );
};
