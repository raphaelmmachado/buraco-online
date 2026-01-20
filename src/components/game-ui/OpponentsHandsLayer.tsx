import { useMemo } from "react";
import { type GameAdapterInterface } from "./useLocalGameAdapter";
import { getPlayerDirection, type ScreenDirection } from "../../utils/animation_utils";
import { CardBack } from "./CardBack";
import Portal from "../ui/Portal";

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
    <Portal>
      <div className="fixed inset-0 pointer-events-none z-[100]">
        {othersHands.map((hand) => (
          <OpponentHand
            key={hand.id}
            count={hand.count}
            direction={hand.direction}
            isTeammate={hand.isTeammate}
          />
        ))}
      </div>
    </Portal>
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
    // Strategy:
    // 1. Position at the center of the edge (top: 50%, left: 0 for left hand).
    // 2. Center the element itself (translate -50%, -50%).
    // 3. Rotate.
    // 4. Adjust "Tuck" (Peek) using translateY in the LOCAL axis after rotation.
    //    - Card Height (56px) is the dimension perpendicular to the edge.
    //    - We start centered (28px visible).
    //    - We want ~15px visible.
    //    - Need to push "Out" by ~13px (approx 25% of 56px).
    //    - After 90deg rotation (CW), Y points Left (Out). So translateY(25%).
    //    - After -90deg rotation (CCW), Y points Right (Out). So translateY(25%).

    switch (direction) {
      case "top":
        return {
          top: "0", 
          left: "50%",
          transform: "translate(-50%, -75%)", 
          display: "flex",
          justifyContent: "center",
          gap: `${-spacing}px`, 
        };
      case "left":
        return {
          left: "0",
          top: "50%", 
          transformOrigin: "center center",
          transform: "translate(-50%, -50%) rotate(90deg) translateY(25%)", 
          display: "flex",
          justifyContent: "center",
          gap: `${-spacing}px`,
        };
      case "right":
        return {
          right: "0",
          top: "50%",
          transformOrigin: "center center",
          transform: "translate(50%, -50%) rotate(-90deg) translateY(25%)",
          display: "flex",
          justifyContent: "center",
          gap: `${-spacing}px`,
        };
      default:
        return { display: "none" };
    }
  };

  return (
    <div style={getContainerStyle()} className="absolute pointer-events-auto filter drop-shadow-md z-0 transition-transform duration-300">
       {Array.from({ length: count }).map((_, i) => (
         <div 
            key={i} 
            style={{ 
                width: cardWidth, 
                height: cardHeight,
                transform: `translateY(${i % 2 === 0 ? 0 : 4}px) rotate(${ (i - count/2) * 2 }deg)`, // Leve leque
                transformOrigin: "top center",
            }}
         >
            <CardBack color={color} />
         </div>
       ))}
    </div>
  );
};
