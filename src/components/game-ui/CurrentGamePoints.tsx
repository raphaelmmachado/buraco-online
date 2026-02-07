import { Skull } from "lucide-react";
import { useMobileCheck } from "../../hooks/useMobileCheck";

export default function CurrentGamePoints({
  points,
  hasTakenDeadPile = false,
  className = "",
  showSkull = false,
  maxDeadPiles = 1,
  invert = false,
}: {
  points: number;
  hasTakenDeadPile?: boolean | boolean[];
  className?: string;
  showSkull?: boolean;
  maxDeadPiles?: number;
  invert?: boolean;
}) {
  // Convert boolean or array to a count of taken dead piles
  const takenCount = Array.isArray(hasTakenDeadPile)
    ? hasTakenDeadPile.filter(Boolean).length
    : hasTakenDeadPile
      ? 1
      : 0;

  const { isSmallMobile } = useMobileCheck();

  return (
    <div
      className={`flex ${invert ? "flex-col-reverse" : "flex-col"}
     items-center ${isSmallMobile ? "gap-0.5" : "gap-1"} ${className}`}
    >
      <div
        className={`flex items-center rounded-full border border-white/10 bg-black/40 shadow-inner ${isSmallMobile ? "gap-0.5 px-1.5 py-0" : "gap-1 px-2 py-0.5"}`}
      >
        <span
          className={`${isSmallMobile ? "text-[10px]" : "text-[11px]"} font-black font-mono text-white leading-none`}
        >
          {points}
          <span
            className={`${isSmallMobile ? "text-[7px]" : "text-[8px]"} text-white/40 uppercase ml-0.5 font-bold`}
          >
            pts
          </span>
        </span>
      </div>

      {showSkull && (
        <div className={isSmallMobile ? "flex gap-0.5" : "flex gap-1"}>
          {[...Array(maxDeadPiles)].map((_, i) => {
            const isTaken = i < takenCount;
            return (
              <div
                key={i}
                className={`transition-all duration-500 ${
                  isTaken
                    ? "text-red-500 scale-105 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]"
                    : "text-white/10"
                }`}
              >
                <Skull
                  size={isSmallMobile ? 10 : 12}
                  strokeWidth={
                    isTaken ? (isSmallMobile ? 2 : 3) : isSmallMobile ? 1.5 : 2
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
