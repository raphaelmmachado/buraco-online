import { type Card } from "../common/types/card";
import { type ScoreResult } from "../common/utils/scoring";
import { type PlayerData, type GameMode, type TeamID, type PlayerID } from "./types";

export interface ServerGameState {
  mode: GameMode;
  status: "LOBBY" | "PLAYING" | "FINISHED";
  deck: Card[];
  discard_pile: Card[];
  dead_piles: Card[][];
  hands: Record<number, Card[]>;
  team_melds: Record<TeamID, Card[][]>;
  has_taken_dead_pile: [boolean, boolean];
  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: number;
  players_connected: string[];
  players_data: Record<PlayerID, PlayerData>;
  last_drawn_card_id: string | null;
  final_score: {
    team_1: number;
    team_2: number;
    details_t1: ScoreResult;
    details_t2: ScoreResult;
  } | null;
  disconnectTimeout?: NodeJS.Timeout | null;
}

// In-memory database
export const games: Record<string, ServerGameState> = {};
