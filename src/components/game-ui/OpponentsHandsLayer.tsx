import { useMemo, memo } from "react";
import { type GameAdapterInterface } from "./useLocalGameAdapter";
import {
  getPlayerDirection,
  type ScreenDirection,
} from "../../utils/animation_utils";
import { CardBack } from "./CardBack";
import Portal from "../ui/Portal";
import { useMobileCheck } from "../../hooks/useMobileCheck";
import { type Card } from "../../../common/types/card";
import { HandCard } from "./HandCard";
import { motion } from "framer-motion";

interface OpponentsHandsLayerProps {
  game: GameAdapterInterface;
  visible: boolean;
  onCardClick?: (id: string) => void;
}

interface OpponentHandData {
  id: number;
  count: number;
  cards: Card[];
  isRevealed: boolean;
  direction: ScreenDirection;
  isTeammate: boolean;
}

const MemoizedOpponentHand = memo(({ 
  hand, 
  isMobile, 
  onCardClick,
  getContainerStyle 
}: { 
  hand: OpponentHandData; 
  isMobile: boolean; 
  onCardClick?: (id: string) => void;
  getContainerStyle: (direction: ScreenDirection, isRevealed: boolean) => React.CSSProperties;
}) => {
  const centerIndex = (hand.count - 1) / 2;
  const spreadFactor = hand.isRevealed ? (isMobile ? 25 : 45) : 8;

  return (
    <div
      style={getContainerStyle(hand.direction, hand.isRevealed)}
      className={`filter drop-shadow-2xl ${hand.isRevealed ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      {hand.isRevealed && (
        <div className="absolute inset-0 -m-8 bg-violet-500/10 blur-3xl rounded-full animate-pulse" />
      )}

      {Array.from({ length: hand.count }).map((_, i) => {
        const offset = i - centerIndex;
        const card = hand.isRevealed ? hand.cards[i] : null;

        return (
          <motion.div
            key={card?.id || i}
            initial={false}
            animate={{
              x: offset * spreadFactor,
              zIndex: i,
            }}
            transition={{ duration: 0 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              transformOrigin: "center center",
            }}
          >
            {hand.isRevealed && card ? (
              <div className="hover:scale-110 hover:-translate-y-4 transition-transform duration-200 cursor-pointer">
                <HandCard
                  card={card}
                  isSelected={false}
                  onClick={() => onCardClick?.(card.id)}
                  className="w-full h-full p-0.5 shadow-xl border-violet-400/50"
                />
              </div>
            ) : (
              <CardBack color={hand.isTeammate ? "blue" : "red"} />
            )}
          </motion.div>
        );
      })}
    </div>
  );
});

export const OpponentsHandsLayer = ({
  game,
  visible,
  onCardClick,
}: OpponentsHandsLayerProps) => {
  const myPlayerId = game.my_player_number ?? 1;
  const { isMobile } = useMobileCheck();

  const othersHands = useMemo(() => {
    return Object.keys(game.players_data)
      .map(Number)
      .filter((id) => id !== myPlayerId)
      .map((id) => {
        const direction = getPlayerDirection(id, myPlayerId, game.mode);
        const handData = game.hands[id];

        const isRevealed = Array.isArray(handData);
        const cards = isRevealed ? (handData as Card[]) : [];
        const count = isRevealed ? cards.length : (handData as number) || 0;

        const myTeamMod = myPlayerId % 2;
        const playerTeamMod = id % 2;
        const isTeammate = game.mode === "2v2" && myTeamMod === playerTeamMod;

        return {
          id,
          count,
          cards,
          isRevealed,
          direction,
          isTeammate,
        };
      });
  }, [game.players_data, game.hands, game.mode, myPlayerId]);

  const getContainerStyle = (
    direction: ScreenDirection,
    isRevealed: boolean,
  ): React.CSSProperties => {
    // Se estiver revelada, aumentamos o tamanho base do container
    const width = isRevealed ? (isMobile ? 60 : 80) : 40;
    const height = isRevealed ? (isMobile ? 80 : 110) : 56;

    const baseStyle: React.CSSProperties = {
      position: "absolute",
      width: `${width}px`,
      height: `${height}px`,
      zIndex: isRevealed ? 150 : 100,
    };

    switch (direction) {
      case "top":
        return {
          ...baseStyle,
          top: isRevealed ? "20%" : "0", // Desce da borda se revelada
          left: "50%",
          transform: `translate(-50%, ${isRevealed ? "0" : isMobile ? "-90%" : "-85%"}) scale(${isRevealed ? 1.2 : 1})`,
        };
      case "left":
        return {
          ...baseStyle,
          left: isRevealed ? "15%" : "0",
          top: "37.5%",
          transformOrigin: "center center",
          transform: `translate(-50%, -50%) rotate(90deg) translateY(${isMobile ? "40%" : "35%"}) scale(${isRevealed ? 1.2 : 1})`,
        };
      case "right":
        return {
          ...baseStyle,
          right: isRevealed ? "15%" : "0",
          top: "37.5%",
          transformOrigin: "center center",
          transform: `translate(50%, -50%) rotate(-90deg) translateY(${isMobile ? "40%" : "35%"}) scale(${isRevealed ? 1.2 : 1})`,
        };
      default:
        return { display: "none" };
    }
  };

  if (!visible) return null;

  return (
    <Portal>
      <div className="fixed inset-0 pointer-events-none z-[100]">
        {othersHands.map((hand) => (
          <MemoizedOpponentHand
            key={hand.id}
            hand={hand}
            isMobile={isMobile}
            onCardClick={onCardClick}
            getContainerStyle={getContainerStyle}
          />
        ))}
      </div>
    </Portal>
  );
};
