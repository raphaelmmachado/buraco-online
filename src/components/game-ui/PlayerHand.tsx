import { type Card as CardType } from "../../../common/types/card";
import { HandCard } from "./HandCard";

interface PlayerHandProps {
  cards: CardType[];
  selectedCardIds: string[];
  lastDrawnCardId?: string | null;
  onCardClick: (id: string) => void;
  onSortHand: () => void;
  isMobile: boolean;
  windowWidth: number;
}

export const PlayerHand = ({
  cards,
  selectedCardIds,
  lastDrawnCardId,
  onCardClick,
  onSortHand,
  isMobile,
  windowWidth,
}: PlayerHandProps) => {
  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      id="player-hand"
      className="flex-1 h-full flex items-end justify-center touch-manipulation
      group/hand px-2 relative scrollbar-hide pointer-events-none"
    >
      <div
        className={`flex transition-all duration-500 items-end origin-bottom md:pb-2`}
      >
        {cards.map((card, i, arr) => {
          // --- LÓGICA DE ESPAÇAMENTO DINÂMICO ---
          const totalCards = arr.length;
          let spacing = -45; // Padrão Desktop (apertado)

          if (isMobile) {
            // Largura base da carta (w-14 = 56px)
            const cardWidth = 56;
            // Espaço disponível na tela (menos margens laterais ~40px)
            const availableWidth = windowWidth - 40;

            // Espaçamento inicial confortável (-25px)
            const comfortableSpacing = -25;

            // Quanto espaço a mão ocuparia no modo confortável?
            const widthIfComfortable =
              cardWidth + (totalCards - 1) * (cardWidth + comfortableSpacing);

            if (widthIfComfortable > availableWidth && totalCards > 1) {
              // Se estourar a tela, calcula o aperto necessário
              // Fórmula: (LarguraDisponivel - LarguraUltimaCarta) / (RestoDasCartas) - LarguraCarta
              const neededOverlap =
                (availableWidth - cardWidth) / (totalCards - 1) - cardWidth;
              spacing = neededOverlap;
            } else {
              spacing = comfortableSpacing;
            }
          } else {
            // Desktop: Lógica similar, mas mais suave
            const cardWidth = 80; // w-20
            const availableWidth = windowWidth * 0.6; // ~60% da tela para a mão
            const widthIfComfortable =
              cardWidth + (totalCards - 1) * (cardWidth - 55);

            if (widthIfComfortable > availableWidth && totalCards > 1) {
              const neededOverlap =
                (availableWidth - cardWidth) / (totalCards - 1) - cardWidth;
              spacing = neededOverlap;
            } else {
              spacing = -55;
            }
          }

          return (
            <div
              key={card.id}
              style={{
                marginLeft: i === 0 ? 0 : `${spacing}px`,
                transition: "margin 0.3s ease-out",
                zIndex: i, // Garante ordem de empilhamento
              }}
              className="pointer-events-auto"
            >
              <HandCard
                card={card}
                isSelected={selectedCardIds.includes(card.id)}
                isLastDrawn={card.id === lastDrawnCardId}
                onClick={() => onCardClick(card.id)}
                index={i}
                totalCards={arr.length}
                isMobile={isMobile}
              />
            </div>
          );
        })}
      </div>

      {/* ORGANIZAR CARTAS (Centered below hand) */}
      <div
        id="player-controls"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-full z-50 mb-1 pointer-events-auto"
      >
        <button
          onClick={onSortHand}
          className="bg-gray-800/90 hover:bg-gray-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-md border border-white/10 shadow-lg transition-all active:scale-95 flex items-center gap-1"
          title="Organizar Mão"
        >
          <span>🪄 Organizar</span>
        </button>
      </div>
    </div>
  );
};
