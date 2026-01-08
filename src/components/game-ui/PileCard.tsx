interface PileCardProps {
  onClick?: () => void;
  active?: boolean;
}

export const PileCard = ({ onClick, active = false }: PileCardProps) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-lg shadow-xl border-2 border-white/10 bg-linear-to-br from-indigo-900 via-blue-950 to-slate-900
        flex items-center justify-center overflow-hidden transition-all duration-200
        w-16 h-24 md:w-20 md:h-32
        ${
          onClick && active
            ? "cursor-pointer hover:brightness-110 active:scale-95"
            : "opacity-70 grayscale-[0.5]"
        }
      `}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
          backgroundSize: "10px 10px",
        }}
      ></div>
      <div className="text-white/20 text-4xl">🃏</div>
      {active && onClick && (
        <div className="absolute inset-0 border-4 border-yellow-400 rounded-lg animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
      )}
    </div>
  );
};
