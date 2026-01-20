import { useMemo } from "react";
import { type GameAdapterInterface } from "./useLocalGameAdapter";
import { getPlayerDirection, type ScreenDirection } from "../../utils/animation_utils";
import { CardBack } from "./CardBack";

interface OpponentsHandsLayerProps {
  game: GameAdapterInterface;
  visible: boolean;
}

export const OpponentsHandsLayer = ({ game, visible }: OpponentsHandsLayerProps) => {
  const myPlayerId = game.my_player_number ?? 1;

  // Filter out my hand, process others
  const othersHands = useMemo(() => {
    return Object.keys(game.players_data)
      .map(Number)
      .filter((id) => id !== myPlayerId)
      .map((id) => {
        const direction = getPlayerDirection(id, myPlayerId, game.mode);
        const handData = game.hands[id];
        const count = typeof handData === "number" ? handData : handData?.length || 0;
        
        // Teammate Logic
        // 1v1: No teammates.
        // 2v2: My Team is (MyID % 2). Teammate has same modulus.
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

  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {othersHands.map((hand) => (
        <OpponentHand
          key={hand.id}
          count={hand.count}
          direction={hand.direction}
          isTeammate={hand.isTeammate}
        />
      ))}
    </div>
  );
};

interface OpponentHandProps {
  count: number;
  direction: ScreenDirection;
  isTeammate: boolean;
}

const OpponentHand = ({ count, direction, isTeammate }: OpponentHandProps) => {
  if (count === 0) return null;

  // Color logic
  const color = isTeammate ? "blue" : "red";

  // Position logic
  // Top: Centered Top.
  // Left: Centered Left (Vertical).
  // Right: Centered Right (Vertical).
  
  // "Showing only the top tip"
  // We can achieve this by negative margins or translation.
  
  // Dimensions
  const cardWidth = 40; // Small representation
  const cardHeight = 56;
  const spacing = 15;

  // Fan calculations
  // Just a simple row/column for now
  
  const getContainerStyle = (): React.CSSProperties => {
    switch (direction) {
      case "top":
        return {
          top: "-30px", // Pull up to show only tip
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          justifyContent: "center",
          gap: `${-spacing}px`, // Overlap
        };
      case "left":
        return {
          left: "-30px",
          top: "40%", // Slightly above center to avoid footer overlap
          transform: "translateY(-50%) rotate(90deg)",
          display: "flex",
          justifyContent: "center",
          gap: `${-spacing}px`,
        };
      case "right":
        return {
          right: "-30px",
          top: "40%",
          transform: "translateY(-50%) rotate(-90deg)",
          display: "flex",
          justifyContent: "center",
          gap: `${-spacing}px`,
        };
      default:
        return { display: "none" };
    }
  };

  return (
    <div style={getContainerStyle()} className="absolute pointer-events-auto filter drop-shadow-md">
       {Array.from({ length: count }).map((_, i) => (
         <div 
            key={i} 
            style={{ 
                width: cardWidth, 
                height: cardHeight,
                // Simple fan rotation effect could go here
                transform: `translateY(${i % 2 === 0 ? 0 : 2}px)` // Little jiggle
            }}
         >
            <CardBack color={color} />
         </div>
       ))}
    </div>
  );
};
