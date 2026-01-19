import { Hand, ShoppingCart, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { useGameStore } from "../../store/useGameStore";

interface PlayerTimerBadgeProps {
  playerId: number;
  userName: string;
  handSize: number;
  isCurrentPlayer: boolean;
  isMyTeam: boolean;
  turnPhase: "DRAW" | "ACTION" | "DISCARD";
  innerRef?: (el: HTMLDivElement | null) => void;
}

export const PlayerTimerBadge = ({
  userName,
  handSize,
  isCurrentPlayer,
  isMyTeam,
  turnPhase,
  innerRef,
}: PlayerTimerBadgeProps) => {
  const turn_start_time = useGameStore((s) => s.turn_start_time);
  const status = useGameStore((s) => s.status);

  const duration = turnPhase === "DRAW" ? 30 : 60;
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    const update = () => {
        if (!turn_start_time || status !== "PLAYING" || !isCurrentPlayer) {
            setTimeLeft(duration);
            return;
        }
        const now = Date.now();
        const elapsed = (now - turn_start_time) / 1000;
        setTimeLeft(Math.max(0, duration - elapsed));
    };

    const timeoutId = setTimeout(update, 0);
    const intervalId = setInterval(update, 200);

    return () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
    };
  }, [turn_start_time, status, isCurrentPlayer, duration]);

  const progress = Math.min(100, Math.max(0, (timeLeft / duration) * 100));
  const isCritical = timeLeft <= 10;

  // Visual Styles
  const baseClasses = "relative flex items-center gap-2 px-3 py-1.5 rounded-lg overflow-hidden transition-all duration-300 border backdrop-blur-md shadow-sm";
  
  let colorClasses = "";
  let glowClasses = "";
  
  if (isCurrentPlayer) {
      // Jogador da vez: Fundo escuro com borda dourada/vermelha
      colorClasses = "bg-black/60 border-yellow-500/50 text-yellow-50";
      glowClasses = "shadow-[0_0_10px_rgba(234,179,8,0.15)] ring-1 ring-yellow-500/20";
      
      if (isCritical) {
          colorClasses = "bg-red-950/80 border-red-500/80 text-white";
          glowClasses = "shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse ring-red-500/40";
      }
  } else {
      // Outros jogadores: Estilo mais apagado/glass
      if (isMyTeam) {
          colorClasses = "bg-blue-950/30 border-blue-500/20 text-blue-100/80";
      } else {
          colorClasses = "bg-red-950/30 border-red-500/20 text-red-100/80";
      }
  }

  return (
    <div 
      ref={innerRef}
      className="relative shrink-0 flex items-center justify-center mx-1"
    >
      <div className={`${baseClasses} ${colorClasses} ${glowClasses}`}>
        
        {/* Progress Bar (Background Fill) */}
        {isCurrentPlayer && (
          <div 
            className={`absolute inset-0 origin-left transition-transform duration-200 linear opacity-20
                ${isCritical ? 'bg-red-500' : 'bg-yellow-400'}
            `}
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        )}

        {/* Content Container */}
        <div className="relative flex items-center gap-2 z-10 w-full justify-between min-w-[90px]">
            {/* Name */}
            <span className="text-[10px] md:text-xs font-bold tracking-wide truncate max-w-[80px]">
                {userName.substring(0, 10).toUpperCase()}
            </span>

            <div className="w-px h-3 bg-white/10 mx-0.5"></div>

            {/* Hand & Icons */}
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] md:text-xs flex gap-1 items-center font-mono font-bold opacity-90">
                    <Hand size={11} className="opacity-70" /> {handSize}
                </span>
                
                {isCurrentPlayer && (
                    <span className={`flex items-center ml-1 ${isCritical ? 'text-red-200' : 'text-yellow-200'}`}>
                        {turnPhase === "DRAW" 
                            ? <ShoppingCart size={11} /> 
                            : <Trash size={11} />
                        }
                    </span>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
