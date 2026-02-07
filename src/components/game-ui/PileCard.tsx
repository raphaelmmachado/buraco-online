interface PileCardProps {
  onClick?: () => void;
  active?: boolean;
  mini?: boolean;
  quantity: number;
  dead_piles: number;
  draw_phase: boolean;
}

export const PileCard = ({
  onClick,
  active = false,
  mini = false,
  quantity,
  dead_piles,
}: PileCardProps) => {
  const displayQuantity = quantity === 0 && dead_piles > 0 ? 11 : quantity;

  if (displayQuantity === 0) {
    return <EmptyPile mini={mini} onClick={onClick} />;
  }

  // Lógica para determinar quantas "camadas" mostrar atrás
  const showL1 = displayQuantity > 1;
  const showL2 = displayQuantity > 10;
  const showL3 = displayQuantity > 25;
  const showL4 = displayQuantity > 50;

  // Estilos comuns para garantir que as cartas de trás pareçam com a da frente
  const baseCardStyles = `
    rounded-md shadow-2xl border border-white/10 
    bg-gradient-to-br from-indigo-900 via-blue-950 to-slate-900
  `;

  return (
    // Wrapper relativo para conter as cartas posicionadas de forma absoluta
    <div
      className={`relative group ${
        mini ? "w-10 h-14" : "w-14 h-20 md:w-20 md:h-32"
      } flex items-center justify-center`}
    >
      {/* Camadas extras para dar volume (Monte) */}
      {showL4 && (
        <div
          className={`absolute inset-0 ${baseCardStyles} opacity-20 translate-x-2.5 translate-y-2 rotate-[5deg] z-0`}
        />
      )}
      {showL3 && (
        <div
          className={`absolute inset-0 ${baseCardStyles} opacity-40 translate-x-2 translate-y-1.5 rotate-[4deg] z-0`}
        />
      )}
      {showL2 && (
        <div
          className={`absolute inset-0 ${baseCardStyles} opacity-60 translate-x-1.5 translate-y-1 rotate-[3deg] z-0`}
        />
      )}
      {showL1 && (
        <div
          className={`absolute inset-0 ${baseCardStyles} opacity-80 translate-x-0.5 translate-y-0.5 rotate-[1.5deg] z-0`}
        />
      )}

      {/* --- Carta Principal (Topo) --- */}
      <div
        onClick={onClick}
        className={`
          relative z-10 w-full h-full
          ${baseCardStyles}
          flex items-center justify-center overflow-hidden transition-all duration-200
          ${
            onClick && active
              ? "cursor-pointer hover:brightness-110 active:scale-95 hover:-translate-y-1" // Pequeno pulo ao passar o mouse
              : "opacity-70 grayscale-[0.5]"
          }
        `}
      >
        {/* Padrão de fundo da carta */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
            backgroundSize: "10px 10px",
          }}
        ></div>

        {/* Número da quantidade */}
        <PileQuantity quantity={displayQuantity} />

        {/* Borda brilhante quando ativo */}
        {active && onClick && (
          <div className="absolute inset-0 border-4 border-yellow-400 rounded-md animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
        )}
      </div>

      {/* Dead Piles (Mortos) Indicator Pips - NEW VISUAL */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-20">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className={`w-3 md:w-4 h-1 rounded-full transition-colors duration-500 ${
              i < dead_piles
                ? "bg-red-600 opacity-100"
                : "bg-white/10 opacity-30"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const PileQuantity = ({ quantity }: { quantity: number }) => {
  return (
    <>
      <div className="text-white rounded-xl font-bold md:text-2xl drop-shadow-md z-20">
        {quantity}
      </div>
    </>
  );
};

const EmptyPile = ({
  onClick,
  mini,
}: {
  onClick?: () => void;
  mini: boolean;
}) => {
  return (
    <div
      onClick={onClick}
      className={`${mini ? "w-10 h-14" : "w-14 h-20 md:w-20 md:h-32"}
        text-xs tracking-wider md:text-base border-2 border-dashed border-white/10 rounded-md
        flex items-center justify-center font-black text-white/10 select-none
      `}
    >
      MONTE
    </div>
  );
};
