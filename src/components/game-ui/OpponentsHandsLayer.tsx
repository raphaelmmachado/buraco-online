import { useMemo } from "react";
import { type GameAdapterInterface } from "./useLocalGameAdapter";
import {
  getPlayerDirection,
  type ScreenDirection,
} from "../../utils/animation_utils";
import { CardBack } from "./CardBack";
import Portal from "../ui/Portal";
import { useMobileCheck } from "../../hooks/useMobileCheck";

interface OpponentsHandsLayerProps {
  game: GameAdapterInterface;
  visible: boolean;
}

export const OpponentsHandsLayer = ({
  game,
  visible,
}: OpponentsHandsLayerProps) => {
  const myPlayerId = game.my_player_number ?? 1;
  const { isMobile } = useMobileCheck();
  const cardWidth = 40;
  const cardHeight = 56;

  const othersHands = useMemo(() => {
    return Object.keys(game.players_data)
      .map(Number)
      .filter((id) => id !== myPlayerId)
      .map((id) => {
        const direction = getPlayerDirection(id, myPlayerId, game.mode);
        const handData = game.hands[id];
        const count =
          typeof handData === "number" ? handData : handData?.length || 0;

        const myTeamMod = myPlayerId % 2;
        const playerTeamMod = id % 2;
        const isTeammate = game.mode === "2v2" && myTeamMod === playerTeamMod;

        return {
          id,
          count,
          direction,
          isTeammate,
        };
      });
  }, [game.players_data, game.hands, game.mode, myPlayerId]);

  const getContainerStyle = (
    direction: ScreenDirection,
  ): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: "absolute",
      width: `${cardWidth}px`,
      height: `${cardHeight}px`,
      zIndex: 100,
    };

    switch (direction) {
      case "top":
        return {
          ...baseStyle,
          top: "0",
          left: "50%",
          transform: `translate(-50%, ${isMobile ? "-90%" : "-85%"})`,
        };
      case "left":
        return {
          ...baseStyle,
          left: "0",
          // Alinhado com a barra separadora (inicia em 35% + metade da altura da barra)
          top: "37.5%",
          transformOrigin: "center center",
          transform: `translate(-50%, -50%) rotate(90deg) translateY(${isMobile ? "40%" : "35%"})`,
        };
      case "right":
        return {
          ...baseStyle,
          right: "0",
          top: "37.5%",
          transformOrigin: "center center",
          transform: `translate(50%, -50%) rotate(-90deg) translateY(${isMobile ? "40%" : "35%"})`,
        };
      default:
        return { display: "none" };
    }
  };

  if (!visible) return null;

  return (
    <Portal>
      <div className="fixed inset-0 pointer-events-none z-[100]">
        {othersHands.map((hand) => {
          const centerIndex = (hand.count - 1) / 2;
          return (
            <div
              key={hand.id}
              style={getContainerStyle(hand.direction)}
              className="pointer-events-auto filter drop-shadow-md transition-transform duration-300"
            >
              {Array.from({ length: hand.count }).map((_, i) => {
                const offset = i - centerIndex;
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      transformOrigin: "center center",
                      // Espalhamento linear bem mais perceptível (8px por carta)
                      transform: `translate(${offset * 8}px, 0)`,
                      zIndex: i,
                    }}
                  >
                    <CardBack color={hand.isTeammate ? "blue" : "red"} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </Portal>
  );
};
