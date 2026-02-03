import { Hand, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useEffect, useState, useMemo, useRef } from "react";
import { useGameStore } from "../../store/useGameStore";
import { useMobileCheck } from "../../hooks/useMobileCheck";
import tic_tac_sound from "../../assets/sound/tic-tac.mp3";

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
  const isMuted = useGameStore((s) => s.isMuted);
  const isAccessibilityMode = useGameStore((s) => s.isAccessibilityMode);
  const { isMobile } = useMobileCheck();

  const ticTacAudio = useMemo(() => new Audio(tic_tac_sound), []);
  const lastTickRef = useRef<number | null>(null);

  const duration = turnPhase === "DRAW" ? 20 : 60;
  const criticalThreshold = turnPhase === "DRAW" ? 5 : 10;
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    const update = () => {
      if (!turn_start_time || status !== "PLAYING" || !isCurrentPlayer) {
        setTimeLeft(duration);
        lastTickRef.current = null;
        ticTacAudio.pause();
        ticTacAudio.currentTime = 0;
        return;
      }
      const now = Date.now();
      const elapsed = (now - turn_start_time) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);

      // Audio Logic: Play every second when <= threshold
      if (remaining <= criticalThreshold && remaining > 0 && !isMuted) {
        const currentSecond = Math.ceil(remaining);
        if (lastTickRef.current !== currentSecond) {
          ticTacAudio.currentTime = 0;
          ticTacAudio.play().catch((e) => console.warn("Audio play blocked:", e));
          lastTickRef.current = currentSecond;
        }
      } else {
        lastTickRef.current = null;
        // Pause if we are above threshold (e.g. if timer reset but still playing)
        // Though logically we only play short clips, for safety:
        // ticTacAudio.pause(); 
      }
    };

    const timeoutId = setTimeout(update, 0);
    const intervalId = setInterval(update, 200);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      ticTacAudio.pause();
      ticTacAudio.currentTime = 0;
    };
  }, [turn_start_time, status, isCurrentPlayer, duration, isMuted, ticTacAudio, criticalThreshold]);

  const progress = Math.min(100, Math.max(0, (timeLeft / duration) * 100));
  const isCritical = timeLeft <= criticalThreshold;

  // --- MOBILE DESIGN ---
  if (isMobile) {
    return (
      <div ref={innerRef} className="relative mx-0.5">
        <div
          className={`
          relative flex items-center gap-1.5 px-2 py-1 rounded-full border backdrop-blur-md transition-all duration-300
          ${
            isCurrentPlayer
              ? isCritical
                ? "bg-red-950/80 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                : "bg-black/60 border-yellow-500/50 shadow-[0_0_8px_rgba(234,179,8,0.2)]"
              : isMyTeam
                ? "bg-blue-950/30 border-blue-500/20"
                : "bg-red-950/30 border-red-500/20"
          }
        `}
        >
          {/* Progress fill (Circular-ish background) */}
          {isCurrentPlayer && (
            <div
              className={`absolute inset-0 rounded-full origin-left opacity-20 ${isCritical ? "bg-red-500" : "bg-yellow-400"}`}
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          )}

          {/* Initials or Short Name */}
          <span
            className={`${
              isAccessibilityMode ? "text-xs" : "text-[10px]"
            } font-black ${
              isCurrentPlayer ? "text-white" : "opacity-70 text-white"
            }`}
          >
            {userName.substring(0, 3).toUpperCase()}
          </span>

          {/* Cards Count Badge */}
          <div className="flex items-center gap-0.5 bg-white/10 px-1 rounded-md">
            <Hand
              size={isAccessibilityMode ? 12 : 10}
              className="opacity-60"
            />
            <span
              className={`${
                isAccessibilityMode ? "text-xs" : "text-[10px]"
              } font-mono font-bold`}
            >
              {handSize}
            </span>
          </div>

          {/* Turn Icon */}
          {isCurrentPlayer && (
            <span
              className={
                isCritical ? "text-red-400 animate-pulse" : "text-yellow-400"
              }
            >
              {turnPhase === "DRAW" ? (
                <ArrowDownToLine size={isAccessibilityMode ? 12 : 10} />
              ) : (
                <ArrowUpFromLine size={isAccessibilityMode ? 12 : 10} />
              )}
            </span>
          )}
        </div>
      </div>
    );
  }

  // --- DESKTOP DESIGN (ORIGINAL IMPROVED) ---
  const baseClasses =
    "relative flex items-center gap-2 px-3 py-1.5 rounded-lg overflow-hidden transition-all duration-300 border backdrop-blur-md shadow-sm";
  const colorClasses = isCurrentPlayer
    ? isCritical
      ? "bg-red-950/80 border-red-500/80 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
      : "bg-black/60 border-yellow-500/50 text-yellow-50 shadow-[0_0_10px_rgba(234,179,8,0.15)]"
    : isMyTeam
      ? "bg-blue-950/30 border-blue-500/20 text-blue-100/80"
      : "bg-red-950/30 border-red-500/20 text-red-100/80";

  return (
    <div
      ref={innerRef}
      className="relative shrink-0 flex items-center justify-center mx-1"
    >
      <div className={`${baseClasses} ${colorClasses}`}>
        {isCurrentPlayer && (
          <div
            className={`absolute inset-0 origin-left transition-transform duration-200 linear opacity-20 ${isCritical ? "bg-red-500" : "bg-yellow-400"}`}
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        )}
        <div className="relative flex items-center gap-2 z-10 w-full justify-between min-w-[90px]">
          <span
            className={`${
              isAccessibilityMode ? "text-xs md:text-sm" : "text-[10px] md:text-xs"
            } font-bold tracking-wide truncate max-w-[80px]`}
          >
            {userName.toUpperCase()}
          </span>
          <div className="w-px h-3 bg-white/10 mx-0.5"></div>
          <div className="flex items-center gap-1.5">
            <span
              className={`${
                isAccessibilityMode ? "text-xs md:text-sm" : "text-[10px] md:text-xs"
              } flex gap-1 items-center font-mono font-bold opacity-90`}
            >
              <Hand
                size={isAccessibilityMode ? 13 : 11}
                className="opacity-70"
              />{" "}
              {handSize}
            </span>
            {isCurrentPlayer && (
              <span
                className={`flex items-center ml-1 ${
                  isCritical ? "text-red-200" : "text-yellow-200"
                }`}
              >
                {turnPhase === "DRAW" ? (
                  <ArrowDownToLine size={isAccessibilityMode ? 13 : 11} />
                ) : (
                  <ArrowUpFromLine size={isAccessibilityMode ? 13 : 11} />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
