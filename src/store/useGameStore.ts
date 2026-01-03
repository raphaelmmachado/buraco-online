import { create } from "zustand";
import type { Card } from "../types/card";
import { distribute_cards, create_deck } from "../utils/game_logic";
import { sort_cards } from "../utils/sort_cards";
import { validate_sequence } from "../utils/rules_logic";
import { calculate_score, type ScoreResult } from "../utils/scoring";

type PlayerID = 1 | 2 | 3 | 4;
type TeamID = 1 | 2;
type GameMode = "1v1" | "2v2";

interface GameState {
  status: "LOBBY" | "PLAYING" | "FINISHED";
  mode: GameMode;

  deck: Card[];
  discard_pile: Card[];

  // Mãos individuais: { 1: Card[], 2: Card[], ... }
  hands: Record<number, Card[]>;

  // Jogos na mesa são compartilhados pelo TIME: { 1: Card[][], 2: Card[][] }
  team_melds: Record<TeamID, Card[][]>;

  dead_piles: Card[][];

  // Morto é pego pelo TIME. [Team1 pegou?, Team2 pegou?]
  has_taken_dead_pile: [boolean, boolean];

  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: PlayerID;

  // Placar final dos Times
  final_score: {
    team_1: number;
    team_2: number;
    details_t1: ScoreResult;
    details_t2: ScoreResult;
  } | null;
}

interface GameActions {
  start_game: (mode?: GameMode) => void;
  draw_card_from_deck: () => void;
  discard_card: (card_id: string) => void;
  sort_my_hand: () => void; // Apenas ordena a mão de quem está jogando

  meld_cards: (card_ids: string[]) => boolean;
  pick_up_discard_new_meld: (hand_card_ids: string[]) => boolean;
  pick_up_discard_add_to_meld: (meld_index: number) => boolean;
  add_card_to_meld: (card_id: string, meld_index: number) => boolean;

  sync_server_state: (server_state: Partial<GameState>) => void;
  internal_handle_empty_hand: (type: "DIRECT" | "INDIRECT") => void;
}

// --- HELPER: Descobre o time do jogador ---
// 1v1: P1->T1, P2->T2
// 2v2: P1->T1, P2->T2, P3->T1, P4->T2
const get_team = (player_id: number): TeamID => {
  return player_id % 2 !== 0 ? 1 : 2;
};

// --- HELPER: Próximo Jogador ---
const get_next_player = (current: number, mode: GameMode): PlayerID => {
  if (mode === "1v1") return current === 1 ? 2 : 1;
  // 2v2 Rotação: 1 -> 2 -> 3 -> 4 -> 1
  return ((current % 4) + 1) as PlayerID;
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  status: "LOBBY",
  mode: "1v1",
  deck: [],
  discard_pile: [],
  hands: { 1: [], 2: [], 3: [], 4: [] },
  team_melds: { 1: [], 2: [] },
  dead_piles: [],
  has_taken_dead_pile: [false, false],
  turn_phase: "DRAW",
  current_player: 1,
  final_score: null,

  start_game: (mode = "1v1") => {
    const full_deck = create_deck();
    const setup = distribute_cards(full_deck, mode);

    set({
      status: "PLAYING",
      mode: mode,
      deck: setup.remaining_deck,
      hands: setup.hands,
      dead_piles: setup.dead_piles,
      has_taken_dead_pile: [false, false],
      discard_pile: [],
      team_melds: { 1: [], 2: [] },
      turn_phase: "DRAW",
      current_player: 1,
      final_score: null,
    });
  },

  draw_card_from_deck: () => {
    const {
      deck,
      hands,
      turn_phase,
      current_player,
      dead_piles,
      team_melds,
      mode,
    } = get();
    if (turn_phase !== "DRAW") return;

    let current_deck = deck;
    let current_dead_piles = dead_piles;

    if (current_deck.length === 0) {
      if (current_dead_piles.length > 0) {
        // Monte acabou -> Vira o morto
        const [new_deck, ...remaining] = current_dead_piles;
        current_deck = new_deck;
        current_dead_piles = remaining;

        set({ deck: current_deck, dead_piles: current_dead_piles });
        console.log("Monte virou com o morto!");
      } else {
        console.log("Fim de Jogo: Cartas Esgotadas");

        // FIM DE JOGO: Calcular Pontos (Ninguém bateu)
        let t1_hands: Card[][] = [];
        let t2_hands: Card[][] = [];

        if (mode === "1v1") {
          t1_hands = [hands[1]];
          t2_hands = [hands[2]];
        } else {
          t1_hands = [hands[1], hands[3]];
          t2_hands = [hands[2], hands[4]];
        }

        const t1_score = calculate_score(team_melds[1], t1_hands, false);
        const t2_score = calculate_score(team_melds[2], t2_hands, false);

        set({
          status: "FINISHED",
          final_score: {
            team_1: t1_score.total_score,
            team_2: t2_score.total_score,
            details_t1: t1_score,
            details_t2: t2_score,
          },
        });
        return;
      }
    }

    const [new_card, ...remaining_deck] = current_deck;
    const updated_hands = {
      ...hands,
      [current_player]: [...hands[current_player], new_card],
    };

    set({
      deck: remaining_deck,
      hands: updated_hands,
      turn_phase: "ACTION",
    });
  },

  pick_up_discard_new_meld: (hand_card_ids) => {
    const { discard_pile, hands, current_player, team_melds, turn_phase } =
      get();
    if (turn_phase !== "DRAW" || discard_pile.length === 0) return false;

    const my_hand = hands[current_player];
    const top_card = discard_pile[0];
    const selected_cards = my_hand.filter((c) => hand_card_ids.includes(c.id));

    const proposed = [...selected_cards, top_card];
    if (!validate_sequence(proposed).is_valid) return false;

    // Compra Explosiva
    const pile = [...discard_pile];
    let new_hand = [...my_hand, ...pile];

    // Remove as usadas no jogo
    const used_ids = proposed.map((c) => c.id);
    new_hand = new_hand.filter((c) => !used_ids.includes(c.id));

    // Atualiza mão e melds do TIME
    const team_id = get_team(current_player);
    const new_team_melds = [...team_melds[team_id], sort_cards(proposed)];

    set({
      hands: { ...hands, [current_player]: new_hand },
      discard_pile: [],
      team_melds: { ...team_melds, [team_id]: new_team_melds },
      turn_phase: "ACTION",
    });
    return true;
  },

  pick_up_discard_add_to_meld: (meld_index) => {
    const { discard_pile, hands, current_player, team_melds, turn_phase } =
      get();
    if (turn_phase !== "DRAW" || discard_pile.length === 0) return false;

    const team_id = get_team(current_player);
    const target_meld = team_melds[team_id][meld_index];
    if (!target_meld) return false;

    const top_card = discard_pile[0];
    const proposed = [...target_meld, top_card];

    if (!validate_sequence(proposed).is_valid) return false;

    const pile = [...discard_pile];
    let new_hand = [...hands[current_player], ...pile];
    new_hand = new_hand.filter((c) => c.id !== top_card.id);

    const new_melds_list = [...team_melds[team_id]];
    new_melds_list[meld_index] = sort_cards(proposed);

    set({
      hands: { ...hands, [current_player]: new_hand },
      discard_pile: [],
      team_melds: { ...team_melds, [team_id]: new_melds_list },
      turn_phase: "ACTION",
    });
    return true;
  },

  add_card_to_meld: (card_id, meld_index) => {
    const { hands, current_player, team_melds, turn_phase } = get();
    if (turn_phase !== "ACTION") return false;

    const team_id = get_team(current_player);
    const my_hand = hands[current_player];
    const card = my_hand.find((c) => c.id === card_id);
    const target_meld = team_melds[team_id][meld_index];

    if (!card || !target_meld) return false;

    const proposed = [...target_meld, card];
    if (!validate_sequence(proposed).is_valid) return false;

    const new_hand = my_hand.filter((c) => c.id !== card_id);
    const new_melds_list = [...team_melds[team_id]];
    new_melds_list[meld_index] = sort_cards(proposed);

    set({
      hands: { ...hands, [current_player]: new_hand },
      team_melds: { ...team_melds, [team_id]: new_melds_list },
    });

    const { hands: h_after } = get();
    if (h_after[current_player].length === 0) {
      get().internal_handle_empty_hand("DIRECT");
    }
    return true;
  },

  meld_cards: (card_ids) => {
    const { hands, current_player, team_melds, turn_phase } = get();
    if (turn_phase !== "ACTION") return false;

    const my_hand = hands[current_player];
    const cards = my_hand.filter((c) => card_ids.includes(c.id));
    if (!validate_sequence(cards).is_valid) return false;

    const new_hand = my_hand.filter((c) => !card_ids.includes(c.id));
    const team_id = get_team(current_player);

    const new_melds_list = [...team_melds[team_id], sort_cards(cards)];

    set({
      hands: { ...hands, [current_player]: new_hand },
      team_melds: { ...team_melds, [team_id]: new_melds_list },
    });

    const { hands: h_after } = get();
    if (h_after[current_player].length === 0) {
      get().internal_handle_empty_hand("DIRECT");
    }
    return true;
  },

  discard_card: (card_id) => {
    const { hands, current_player, discard_pile, turn_phase } = get();
    if (turn_phase !== "ACTION") return;

    const my_hand = hands[current_player];
    const card = my_hand.find((c) => c.id === card_id);
    if (!card) return;

    const new_hand = my_hand.filter((c) => c.id !== card_id);

    // Atualiza estado temporário e muda o turno
    set((state) => {
      const next = get_next_player(state.current_player, state.mode);
      return {
        hands: { ...state.hands, [current_player]: new_hand },
        discard_pile: [card, ...state.discard_pile],
        turn_phase: "DRAW",
        current_player: next,
      };
    });

    if (new_hand.length === 0) {
      get().internal_handle_empty_hand("INDIRECT");
    }
  },

  sort_my_hand: () => {
    const { hands, current_player } = get();
    const sorted = sort_cards(hands[current_player]);
    set({ hands: { ...hands, [current_player]: sorted } });
  },

  internal_handle_empty_hand: (type) => {
    const {
      dead_piles,
      has_taken_dead_pile,
      current_player,
      hands,
      team_melds,
      mode,
    } = get();

    // Morto é do TIME
    const team_id = get_team(current_player);
    const team_index = team_id - 1;

    // Se o time já pegou o morto -> BATIDA FINAL
    if (has_taken_dead_pile[team_index]) {
      console.log(`Time ${team_id} bateu final!`);

      const t1_did_beat = team_id === 1;

      let t1_hands: Card[][] = [];
      let t2_hands: Card[][] = [];

      if (mode === "1v1") {
        t1_hands = [hands[1]];
        t2_hands = [hands[2]];
      } else {
        t1_hands = [hands[1], hands[3]];
        t2_hands = [hands[2], hands[4]];
      }

      const t1_score = calculate_score(team_melds[1], t1_hands, t1_did_beat);
      const t2_score = calculate_score(team_melds[2], t2_hands, !t1_did_beat);

      set({
        status: "FINISHED",
        final_score: {
          team_1: t1_score.total_score,
          team_2: t2_score.total_score,
          details_t1: t1_score,
          details_t2: t2_score,
        },
      });
      return;
    }

    // Se tem morto disponível para pegar
    if (dead_piles.length > 0) {
      const [my_dead_pile, ...remaining] = dead_piles;
      const new_taken = [...has_taken_dead_pile] as [boolean, boolean];
      new_taken[team_index] = true; // Marca que o time pegou

      set({
        hands: { ...hands, [current_player]: my_dead_pile },
        dead_piles: remaining,
        has_taken_dead_pile: new_taken,
        turn_phase: type === "DIRECT" ? "ACTION" : "DRAW",
      });
    } else {
      // Sem morto e sem ter pego (caso raro) -> Fim
      set({ status: "FINISHED" });
    }
  },

  sync_server_state: (new_state) =>
    set((state) => ({ ...state, ...new_state })),
}));
