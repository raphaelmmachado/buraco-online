import { Suspense, lazy, useState } from "react";
import { useGameStoreBots } from "../store/useGameStoreBots";
import { useGameBots } from "../hooks/useGameBots";
import { useLocalGameAdapter } from "./game-ui/useLocalGameAdapter";
import { LoadingScreen } from "./ui/LoadingScreen";
import { GameRulesModal } from "./game-ui/GameRulesModal";
import { DEFAULT_RULES } from "../../common/types/rules";
import { Settings2 } from "lucide-react";
import { StyledButton } from "./ui/StyledButton";

// Dynamic Import for Heavy GameScreen
const GameScreen = lazy(() =>
  import("./screens/GameScreen").then((module) => ({
    default: module.GameScreen,
  })),
);

export const LocalGame = ({ onBack }: { onBack?: () => void }) => {
  const store = useGameStoreBots();
  const gameAdapter = useLocalGameAdapter();
  const [rules, setRules] = useState({ ...DEFAULT_RULES });
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Initialize Bots Logic
  useGameBots();

  // If in Lobby, show Setup Screen instead of Loading (to allow rule changes)
  if (store.status === "LOBBY") {
    return (
      <div className="min-h-screen bg-[#0f2e1a] flex flex-col items-center justify-center text-white p-6 font-sans relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        ></div>

        <div className="bg-black/40 backdrop-blur-md p-8 rounded-3xl border border-white/10 w-full max-w-sm flex flex-col gap-6 animate-scale-in">
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-yellow-500 mb-1">
              Partida Local
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              Configure antes de começar
            </p>
          </div>

          <div className="flex flex-col gap-3 relative">
            <div
              className="animate-pulse text-[8px] flex gap-x-3
             uppercase tracking-widest absolute top-1 right-1 bg-blue-500 font-bold px-1 rounded-2xl"
            >
              novidade
            </div>

            <button
              onClick={() => setShowRulesModal(true)}
              className="w-full bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
            >
              <Settings2 size={18} /> Regras da Mesa
            </button>

            <StyledButton
              onClick={() => store.start_game("2v2", rules)}
              className="w-full h-16 text-xl"
            >
              INICIAR JOGO
            </StyledButton>

            <button
              onClick={onBack}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest mt-2 hover:underline underline-offset-4 transition-all"
            >
              Voltar ao Menu
            </button>
          </div>
        </div>

        {showRulesModal && (
          <GameRulesModal
            rules={rules}
            onRulesChange={setRules}
            onClose={() => setShowRulesModal(false)}
            isHost={true}
          />
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
      store.reset_game();
      if (onBack) onBack();
    },
    closeRoom: () => {
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
