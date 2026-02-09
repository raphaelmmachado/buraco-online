import { useGameStore } from "../../store/useGameStore";
import { EventBar } from "../game-ui/EventBar";
import { Bot, Globe } from "lucide-react";

interface StartMenuProps {
  onPlayOnline: () => void;
  onPlayLocal: () => void;
}

export const StartMenu = ({ onPlayOnline, onPlayLocal }: StartMenuProps) => {
  const recentEvents = useGameStore((state) => state.recentEvents);

  return (
    <div className="min-h-screen bg-[#0f2e1a] flex flex-col items-center justify-center text-white p-6 font-sans relative overflow-hidden">
      {/* Event Display */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4 flex flex-col gap-2 pointer-events-none">
        {recentEvents.map((event) => (
          <EventBar key={event.id} message={event.message} type={event.type} />
        ))}
      </div>

      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col gap-8 max-w-md w-full animate-fade-in">
        <div className="text-center mb-4">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 mb-2 uppercase tracking-tighter drop-shadow-xl">
            Buraco Resenha
          </h1>
          <p className="text-slate-400 text-xs uppercase tracking-[0.5em]">
            Fechado, sem trinca e vulnerável.
          </p>
        </div>

        <button
          onClick={onPlayLocal}
          className="group bg-black/40 hover:bg-purple-900/20 backdrop-blur-md p-8 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all hover:scale-[1.02] active:scale-95 flex flex-col items-center gap-4 shadow-2xl"
        >
          <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/20 group-hover:border-purple-500 group-hover:bg-purple-500 group-hover:text-black transition-all text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.1)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]">
            <Bot size={40} />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase text-purple-100 mb-1">
              Jogar Offline
            </h2>
            <p className="text-[10px] text-purple-300/60 font-mono uppercase tracking-widest">
              Contra o Computador
            </p>
          </div>
        </button>

        <button
          onClick={onPlayOnline}
          className="group bg-black/40 hover:bg-blue-900/20 backdrop-blur-md p-8 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all hover:scale-[1.02] active:scale-95 flex flex-col items-center gap-4 shadow-2xl"
        >
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 group-hover:border-blue-500 group-hover:bg-blue-500 group-hover:text-black transition-all text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]">
            <Globe size={40} />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase text-blue-100 mb-1">
              Jogar Online
            </h2>
            <p className="text-[10px] text-blue-300/60 font-mono uppercase tracking-widest">
              Multijogador em tempo real
            </p>
          </div>
        </button>
      </div>

      <div className="fixed bottom-4 left-4 text-[10px] text-white/20 font-mono pointer-events-none z-50">
        v{__APP_VERSION__} - BETA
      </div>
    </div>
  );
};
