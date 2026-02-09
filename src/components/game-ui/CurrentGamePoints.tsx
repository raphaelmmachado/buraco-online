import { Skull } from "lucide-react";

export default function CurrentGamePoints({
  points,
  hasTakenDeadPile = false,
  className = "",
  showSkull = false,
  invert = false,
  horizontal = false,
  label = "",
}: {
  points: number;
  hasTakenDeadPile?: boolean | boolean[];
  className?: string;
  showSkull?: boolean;
  maxDeadPiles?: number;
  invert?: boolean;
  horizontal?: boolean;
  label?: string;
}) {
  // Convert boolean or array to a count of taken dead piles
  const takenCount = Array.isArray(hasTakenDeadPile)
    ? hasTakenDeadPile.filter(Boolean).length
    : hasTakenDeadPile
      ? 1
      : 0;

  if (horizontal) {
    return (
      <div
        className={`flex ${invert ? "flex-row-reverse" : "flex-row"} items-center gap-2 px-3 py-1 ${className}`}
      >
        {label && (
          <span
            className={`text-[9px] font-black uppercase tracking-wider opacity-70 ${invert ? "ml-1" : "mr-1"}`}
          >
            {label}
          </span>
        )}
        <div className="flex items-center gap-1">
          <span className="text-[14px] font-black font-mono text-white leading-none">
            {points}
            <span className="text-[9px] text-white/40 uppercase ml-0.5 font-bold">
              pts
            </span>
          </span>
        </div>

        {showSkull && takenCount > 0 && (
          <div className="flex gap-1.5">
            {[...Array(takenCount)].map((_, i) => {
              return (
                <div
                  key={i}
                  className="transition-all duration-500 text-red-500 scale-105 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]"
                >
                  <Skull size={16} strokeWidth={1.5} />
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

      {showSkull && takenCount > 0 && (
        <div className="flex gap-1">
          {[...Array(takenCount)].map((_, i) => {
            return (
              <div
                key={i}
                className="transition-all duration-500 text-red-500 scale-105 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]"
              >
                <Skull size={12} strokeWidth={1.5} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
