import { useGameStoreBots as useLocalStore } from "../../store/useGameStoreBots";
import { useMemo } from "react";
import type { Card } from "../../../common/types/card";
import type { ScoreResult, RoundHistoryItem } from "../../../common/utils/scoring";
import type { WinCondition } from "../../store/useGameStore";
import { type GameRules } from "../../../common/types/rules";

// This interface mirrors the one in useGameStore (Online)
// We are making the Local Store look like the Online Store
export interface GameAdapterInterface {
  status: "IDLE" | "LOBBY" | "PLAYING" | "ROUND_OVER" | "FINISHED";
  mode: "1v1" | "2v2";

  // State
  roomId: string; // Mocked
  my_player_number: number | null;
  my_player_name: string | null;
  players_data: Record<number, { socketId: string; userName: string; isBot?: boolean }>;
  rules: GameRules;

  deck_count: number;
  discard_pile: Card[];
  hands: Record<number, Card[] | number>;
  team_melds: { 1: Card[][]; 2: Card[][] };
  dead_piles_count: number;
  has_taken_dead_pile?: [boolean, boolean];
  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: number;
  last_drawn_card_id: string | null;
  magic_joker: {
    direction: 1 | -1;
    is_discard_frozen: boolean;
    power_selection?: {
      player_id: number;
      target_player_id: number;
      ability: string;
      selected_card_id?: string;
      stage: "PICK_MY_CARD" | "PICK_THEIR_CARD";
    };
  };
  final_score: {
    team_1: number;
    team_2: number;
    details_t1: ScoreResult;
    details_t2: ScoreResult;
  } | null;
  cumulative_score: { team_1: number; team_2: number };
  round_count: number;
  round_history?: RoundHistoryItem[];
  win_condition?: WinCondition;
  rematch_votes?: Record<string, boolean>;
  last_error: string | null;
  last_info: string | null;
  showAnimations: boolean;
  showSortButton: boolean;
  showCardMarkers: boolean;
  cardMarkers: Record<string, string>;
  cardsPlayedThisTurn: number;
  recentEvents: {
    id: string;
    message: string;
    playerId?: number;
    type: "info" | "success" | "warning" | "error";
  }[];

  // Actions
  draw_card: () => void;
  discard_card: (card_id: string) => void;
  meld_cards: (card_ids: string[]) => void;
  add_to_meld: (card_ids: string[], meld_index: number) => void;
  pick_up_discard_new_meld: (card_ids: string[]) => void;
  pick_up_discard_add_to_meld: (meld_index: number, card_ids: string[]) => void;
  useJoker: (cardId: string) => void;
  power_pick_card: (cardId: string) => void;
  power_cancel: () => void;
  startGame: (winCondition?: WinCondition) => void;
  nextRound: () => void;
  voteNext: () => void;
  leaveGame: () => void;
  closeRoom: () => void;
  setRules: (rules: GameRules) => void;
  sort_hand: () => void;
  clear_error: () => void;
  set_error: (msg: string) => void;
  clear_info: () => void;
  toggleAnimations: () => void;
  toggleSortButton: () => void;
  toggleCardMarkers: () => void;
  setCardMarker: (cardId: string, color: string | null) => void;
}

export const useLocalGameAdapter = (): GameAdapterInterface => {
  const local = useLocalStore();

  const players_data = useMemo(() => {
    const data: Record<number, { socketId: string; userName: string; isBot?: boolean }> = {
      1: { socketId: "local-1", userName: "Você", isBot: false },
      2: { socketId: "local-2", userName: "Bot 1", isBot: true },
    };

    if (local.mode === "2v2") {
      data[3] = { socketId: "local-3", userName: "Bot 2", isBot: true };
      data[4] = { socketId: "local-4", userName: "Bot 3", isBot: true };
    }
    return data;
  }, [local.mode]);

  const adapter = useMemo(() => {
    // Sanitização local: Esconde as cartas dos bots a menos que um poder as revele
    const sanitizedHands: Record<number, Card[] | number> = {};
    const myPlayerId = 1;

    Object.keys(local.hands).forEach((idStr) => {
      const id = Number(idStr);
      const isMe = id === myPlayerId;
      const isPowerTarget = 
        local.magic_joker.power_selection?.player_id === myPlayerId && 
        local.magic_joker.power_selection?.target_player_id === id;

      if (isMe || isPowerTarget) {
        sanitizedHands[id] = local.hands[id];
      } else {
        sanitizedHands[id] = local.hands[id]?.length || 0;
      }
    });

    return {
      // State
      status: local.status,
      mode: local.mode,
      roomId: "LOCAL_DEBUG",
      my_player_number: myPlayerId, 
      my_player_name: "Você",
      players_data,
      rules: local.rules,

      deck_count: local.deck.length,
      discard_pile: local.discard_pile,
      hands: sanitizedHands,
      team_melds: local.team_melds,
      dead_piles_count: local.dead_piles.length,
      has_taken_dead_pile: [
        local.has_taken_dead_pile[1],
        local.has_taken_dead_pile[2],
      ] as [boolean, boolean],
      turn_phase: local.turn_phase,
      current_player: local.current_player,
      last_drawn_card_id: local.last_drawn_card_id,
      magic_joker: local.magic_joker,
      final_score: local.final_score
        ? {
            team_1: local.final_score.team_1.total_score,
            team_2: local.final_score.team_2.total_score,
            details_t1: local.final_score.team_1,
            details_t2: local.final_score.team_2,
          }
        : null,
      cumulative_score: local.cumulative_score || { team_1: 0, team_2: 0 },
      round_count: local.round_count || 1,
      round_history: local.round_history || [],
      win_condition: local.win_condition,
      rematch_votes: {},
      last_error: local.last_error,
      last_info: local.last_info,
      showAnimations: local.showAnimations,
      showSortButton: local.showSortButton,
      showCardMarkers: local.showCardMarkers,
      cardMarkers: local.cardMarkers,
      cardsPlayedThisTurn: local.cardsPlayedThisTurn,
      recentEvents: local.recentEvents,

      // Actions Mapped
      draw_card: local.draw_card_from_deck,
      discard_card: local.discard_card,
      meld_cards: local.meld_cards,
      add_to_meld: local.add_card_to_meld,
      pick_up_discard_new_meld: local.pick_up_discard_new_meld,
      pick_up_discard_add_to_meld: local.pick_up_discard_add_to_meld,
      useJoker: local.use_joker,
      power_pick_card: local.power_pick_card,
      power_cancel: local.power_cancel,
      startGame: local.start_game,
      nextRound: local.next_round,
      voteNext: () => {
        if (local.status === "ROUND_OVER") local.next_round();
        else if (local.status === "FINISHED") local.start_game(local.win_condition);
      },
      leaveGame: () => {
        window.location.reload();
      },
      closeRoom: () => {
        window.location.reload();
      },
      setRules: (newRules: GameRules) => {
        local.update_rules(newRules);
      },
      sort_hand: local.sort_my_hand,
      clear_error: local.clear_error,
      set_error: local.set_error,
      clear_info: local.clear_info,
      toggleAnimations: local.toggleAnimations,
      toggleSortButton: local.toggleSortButton,
      toggleCardMarkers: local.toggleCardMarkers,
      setCardMarker: local.setCardMarker,
    };
  }, [local, players_data]);

  return adapter;
};