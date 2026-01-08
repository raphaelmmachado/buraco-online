import { useState } from "react";
import { useGameStore } from "../../store/useGameStore";
import { RulesModal } from "./RulesModal";

interface GameMenuProps {
  onOpenRules: () => void;
}

export const GameMenu = ({ onOpenRules }: GameMenuProps) => {
  const store = useGameStore();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
          bg-white/5 backdrop-blur-xl border border-white/10 hover:border-yellow-500/50 shadow-2xl
          ${isOpen ? "rotate-90 border-yellow-500/50 bg-yellow-500/10" : ""}
        `}
        title="Menu Principal"
      >
        <span className={`text-xl transition-colors ${isOpen ? "text-yellow-500" : "text-white/70"}`}>
          {isOpen ? "✕" : "☰"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-4 w-56 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-2">
            <button
              onClick={() => {
                onOpenRules();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/10 hover:text-white rounded-xl transition-all flex items-center gap-3"
            >
              <span className="text-lg">📜</span> Regras
            </button>
            
            <div className="h-px bg-white/5 my-1 mx-2"></div>
            
            <button
              onClick={() => {
                store.leaveGame();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-400/70 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all flex items-center gap-3"
            >
              <span className="text-lg">🚪</span> Sair da Sala
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
