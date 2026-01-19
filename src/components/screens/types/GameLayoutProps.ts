import { type MouseEventHandler, type TouchEventHandler } from "react";
import { type GameAdapterInterface } from "../../game-ui/useLocalGameAdapter";
import { type Card } from "../../../../common/types/card";
import { type ScreenDirection } from "../../../utils/animation_utils";

export interface GameLayoutProps {
  // Game State Adapter
  game: GameAdapterInterface;
  
  // Computed & Local State
  selectedCards: string[];
  isMyTurn: boolean;
  canDraw: boolean;
  canAction: boolean;
  myScore: number;
  oppScore: number;
  myTeam: number;
  opponentTeam: number;
  opponentHeight: number; // For resizable areas
  myTeamHasTaken: boolean;
  oppTeamHasTaken: boolean;
  
  // Handlers
  onDeckClick: () => void;
  onDiscardClick: () => void;
  onMeldClick: (teamId: number, meldIndex: number) => void;
  onNewMeldClick: () => void;
  toggleSelect: (id: string) => void;
  startDrag: MouseEventHandler | TouchEventHandler; // Type from useScreenDrag (React.MouseEventHandler | React.TouchEventHandler)

  // Visual Logic
  hoveredMeld: { teamId: number; index: number } | null;
  setHoveredMeld: (val: { teamId: number; index: number } | null) => void;
  showNewMeldAction: boolean;
  showNewMeldPickUp: boolean;
  isDiscardSelected: boolean;
  topDiscardCard: Card | undefined;
  
  // Animations
  discardOriginDirection: ScreenDirection;
  activePlayerDirection: ScreenDirection;
  
  // Helpers
  playerRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  
  // Aliases commonly used in layouts
  onCardClick: (id: string) => void;
}
