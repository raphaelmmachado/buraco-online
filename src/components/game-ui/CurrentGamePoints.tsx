import { Skull } from "lucide-react";

export default function CurrentGamePoints({
  points,
  hasTakenDeadPile = false,
  className = "",
  showSkull = false,
  maxDeadPiles = 1,
  invert = false,
  horizontal = false,
}: {
  points: number;
  hasTakenDeadPile?: boolean | boolean[];
  className?: string;
  showSkull?: boolean;
  maxDeadPiles?: number;
  invert?: boolean;
  horizontal?: boolean;
}) {
  // Convert boolean or array to a count of taken dead piles
  const takenCount = Array.isArray(hasTakenDeadPile)
    ? hasTakenDeadPile.filter(Boolean).length
    : hasTakenDeadPile
      ? 1
      : 0;

  if (horizontal) {
    return (
      <div className={`flex items-center gap-3 px-3 py-1 ${className}`}>
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-black font-mono text-white leading-none">
            {points}
            <span className="text-[8px] text-white/40 uppercase ml-0.5 font-bold">
              pts
            </span>
          </span>
        </div>

        {showSkull && (
          <div className="flex gap-1.5">
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
                  <Skull size={14} strokeWidth={isTaken ? 3 : 2} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex ${invert ? "flex-col-reverse" : "flex-col"}
     items-center gap-1 ${className}`}
    >
      <div className="flex items-center rounded-full border border-white/10 bg-black/40 shadow-inner gap-1 px-2 py-0.5">
        <span className="text-[11px] font-black font-mono text-white leading-none">
          {points}
          <span className="text-[8px] text-white/40 uppercase ml-0.5 font-bold">
            pts
          </span>
        </span>
      </div>

      {showSkull && (
        <div className="flex gap-1">
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
                <Skull size={12} strokeWidth={isTaken ? 3 : 2} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
