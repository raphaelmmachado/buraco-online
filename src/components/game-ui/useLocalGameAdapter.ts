import { useGameStore as useLocalStore } from "../../store/useGameStoreBots";
import { useMemo } from "react";
import type { Card } from "../../../common/types/card";
import type { ScoreResult } from "../../../common/utils/scoring";

// This interface mirrors the one in useGameStore (Online)
// We are making the Local Store look like the Online Store
export interface GameAdapterInterface {
  status: "LOBBY" | "PLAYING" | "FINISHED";
  mode: "1v1" | "2v2";
  
  // State
  roomId: string; // Mocked
  my_player_number: number | null;
  my_player_name: string | null;
  players_data: Record<number, { socketId: string; userName: string }>;
  
  deck: Card[];
  discard_pile: Card[];
  hands: Record<number, Card[]>;
  team_melds: { 1: Card[][]; 2: Card[][] };
  dead_piles: Card[][];
  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: number;
  final_score: {
    team_1: number;
    team_2: number;
    details_t1: ScoreResult;
    details_t2: ScoreResult;
  } | null;
  last_error: string | null;

  // Actions
  draw_card: () => void;
  discard_card: (card_id: string) => void;
  meld_cards: (card_ids: string[]) => void;
  add_to_meld: (card_ids: string[], meld_index: number) => void;
  pick_up_discard_new_meld: (card_ids: string[]) => void;
  pick_up_discard_add_to_meld: (meld_index: number, card_ids: string[]) => void;
  startGame: (mode?: "1v1" | "2v2") => void;
  leaveGame: () => void;
  sort_hand: () => void;
  clear_error: () => void;
}

export const useLocalGameAdapter = (): GameAdapterInterface => {
  const local = useLocalStore();

  const adapter = useMemo(() => {
    // Mock Players Data
    const players_data: Record<number, { socketId: string; userName: string }> = {
        1: { socketId: "local-1", userName: "Você" },
        2: { socketId: "local-2", userName: "Bot 1" },
    };

    if (local.mode === "2v2") {
        players_data[3] = { socketId: "local-3", userName: "Bot 2" };
        players_data[4] = { socketId: "local-4", userName: "Bot 3" };
    }

    return {
      // State
      status: local.status,
      mode: local.mode,
      roomId: "LOCAL_DEBUG",
      my_player_number: 1, // Always Player 1 in local mode
      my_player_name: "Você",
      players_data,
      
      deck: local.deck,
      discard_pile: local.discard_pile,
      hands: local.hands,
      team_melds: local.team_melds,
      dead_piles: local.dead_piles,
      turn_phase: local.turn_phase,
      current_player: local.current_player,
      final_score: local.final_score ? {
        team_1: local.final_score.team_1.total_score,
        team_2: local.final_score.team_2.total_score,
        details_t1: local.final_score.team_1,
        details_t2: local.final_score.team_2
      } : null,
      last_error: local.last_error,

      // Actions Mapped
      draw_card: local.draw_card_from_deck,
      discard_card: local.discard_card,
      meld_cards: local.meld_cards,
      add_to_meld: local.add_card_to_meld,
      pick_up_discard_new_meld: local.pick_up_discard_new_meld,
      pick_up_discard_add_to_meld: local.pick_up_discard_add_to_meld,
      startGame: local.start_game,
      leaveGame: () => {
          // Reset local store if needed, or just handle navigation in parent
          window.location.reload(); // Simple brute force for now, or we can add a reset action to local store
      },
      sort_hand: local.sort_my_hand,
      clear_error: local.clear_error
    };
  }, [local]);

  return adapter;
};
