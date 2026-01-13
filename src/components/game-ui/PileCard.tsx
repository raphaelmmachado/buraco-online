interface PileCardProps {
  onClick?: () => void;
  active?: boolean;
  mini?: boolean;
  quantity: number;
}

export const PileCard = ({
  onClick,
  active = false,
  mini = false,
  quantity,
}: PileCardProps) => {
  // Lógica para determinar quantas "camadas" mostrar atrás
  const showFirstLayer = quantity > 1;
  const showSecondLayer = quantity > 5;

  // Estilos comuns para garantir que as cartas de trás pareçam com a da frente
  const baseCardStyles = `
    rounded-md shadow-xl border-2 border-white/10 
    bg-gradient-to-br from-indigo-900 via-blue-950 to-slate-900
  `;

  return (
    // Wrapper relativo para conter as cartas posicionadas de forma absoluta
    <div
      className={`relative group ${
        mini ? "w-10 h-14" : "w-14 h-20 md:w-20 md:h-32"
      }`}
    >
      {/* --- Camada de fundo 2 (aparece se tiver muitas cartas) --- */}
      {showSecondLayer && !mini && (
        <div
          className={`
            absolute inset-0 ${baseCardStyles}
            translate-x-2 translate-y-1 rotate-6 opacity-60 z-0
            transition-transform duration-300 group-hover:rotate-12 group-hover:translate-x-3
          `}
        />
      )}

      {/* --- Camada de fundo 1 (aparece se tiver > 1 carta) --- */}
      {showFirstLayer && !mini && (
        <div
          className={`
            absolute inset-0 ${baseCardStyles}
            translate-x-1 translate-y-0.5 rotate-3 opacity-80 z-0
            transition-transform duration-300 group-hover:rotate-6 group-hover:translate-x-2
          `}
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
        <div className="text-white rounded-xl font-bold md:text-2xl drop-shadow-md z-20">
          {quantity}
        </div>

        {/* Borda brilhante quando ativo */}
        {active && onClick && (
          <div className="absolute inset-0 border-4 border-yellow-400 rounded-md animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
        )}
      </div>
    </div>
  );
};
