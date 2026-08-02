// =============================================================================
// STORE ZUSTAND - MODO LOCAL COM BOTS
// Contém toda a lógica e estado para uma partida local.
// =============================================================================

import { create } from "zustand";
import { type Card } from "../../common/types/card";
import { distribute_cards, create_deck } from "../../common/utils/game_logic";
import { sort_cards, organize_meld } from "../../common/utils/sort_cards";
import {
  validate_sequence,
  type MeldValidation,
  validate_discard_add_to_meld,
  validate_discard_pickup,
} from "../../common/utils/rules_logic";

import { calculate_score, type ScoreResult, type RoundHistoryItem } from "../../common/utils/scoring";
import { type WinCondition } from "./useGameStore";
import { type GameRules, DEFAULT_RULES } from "../../common/types/rules";

type PlayerID = 1 | 2 | 3 | 4;
type TeamID = 1 | 2;
type GameMode = "1v1" | "2v2";

interface GameState {
  status: "IDLE" | "LOBBY" | "PLAYING" | "ROUND_OVER" | "FINISHED";
  mode: GameMode;
  deck: Card[];
  discard_pile: Card[];
  hands: Record<number, Card[]>;
  team_melds: Record<TeamID, Card[][]>;
  dead_piles: Card[][];
  has_taken_dead_pile: Record<TeamID, boolean>;
  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: PlayerID;
  rules: GameRules;
  magic_joker: {
    direction: 1 | -1;
    is_discard_frozen: boolean;
    pending_skip: boolean;
    power_selection?: {
      player_id: number;
      target_player_id: number;
      ability: string;
      selected_card_id?: string;
      stage: "PICK_MY_CARD" | "PICK_THEIR_CARD";
    };
  };
  last_drawn_card_id: string | null;
  final_score: { team_1: ScoreResult; team_2: ScoreResult } | null;
  cumulative_score: { team_1: number; team_2: number };
  round_count: number;
  round_history: RoundHistoryItem[];
  win_condition?: WinCondition;
  last_error: string | null;
  last_info: string | null;
  showAnimations: boolean;
  showSortButton: boolean;
  showCardMarkers: boolean;
  cardMarkers: Record<string, string>;
  recentEvents: {
    id: string;
    message: string;
    playerId?: number;
    type: "info" | "success" | "warning" | "error";
  }[];
  cardsPlayedThisTurn: number;
}

interface GameActions {
  start_game: (config?: WinCondition | GameMode, rules?: GameRules) => void;
  next_round: () => void;
  draw_card_from_deck: () => void;
  discard_card: (card_id: string) => void;
  sort_my_hand: () => void;
  meld_cards: (card_ids: string[]) => void;
  add_card_to_meld: (card_ids: string[], meld_index: number) => void;
  pick_up_discard_new_meld: (hand_card_ids: string[]) => void;
  pick_up_discard_add_to_meld: (
    meld_index: number,
    bridge_card_ids: string[],
  ) => void;
  use_joker: (cardId: string) => void;
  power_pick_card: (cardId: string) => void;
  power_cancel: () => void;
  clear_error: () => void;
  set_error: (msg: string) => void;
  toggleAnimations: () => void;
  toggleSortButton: () => void;
  toggleCardMarkers: () => void;
  setCardMarker: (cardId: string, color: string | null) => void;
  addEvent: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
    playerId?: number,
  ) => void;
  internal_can_beat: () => boolean;
  internal_handle_empty_hand: (type: "DIRECT" | "INDIRECT") => void;
  reset_game: () => void;
  update_rules: (rules: GameRules) => void;
  clear_info: () => void;
}

const get_team = (player_id: number): TeamID => (player_id % 2 !== 0 ? 1 : 2);
const get_next_player = (
  current: number,
  mode: GameMode,
  direction: 1 | -1 = 1,
): PlayerID => {
  if (mode === "1v1") return current === 1 ? 2 : 1;
  let next = current + direction;
  if (next > 4) next = 1;
  if (next < 1) next = 4;
  return next as PlayerID;
};

export const useGameStoreBots = create<GameState & GameActions>((set, get) => ({
  status: "LOBBY",
  mode: "1v1",
  deck: [],
  discard_pile: [],
  hands: {},
  team_melds: { 1: [], 2: [] },
  dead_piles: [],
  has_taken_dead_pile: { 1: false, 2: false },
  turn_phase: "DRAW",
  current_player: 1,
  rules: { ...DEFAULT_RULES },
  magic_joker: {
    direction: 1,
    is_discard_frozen: false,
    pending_skip: false,
  },
  last_drawn_card_id: null,
  final_score: null,
  cumulative_score: { team_1: 0, team_2: 0 },
  round_count: 1,
  round_history: [],
  last_error: null,
  last_info: null,
  showAnimations: localStorage.getItem("baralho_show_animations") !== "false",
  showSortButton: localStorage.getItem("baralho_show_sort") === "true",
  showCardMarkers: localStorage.getItem("baralho_show_card_markers") === "true",
  cardMarkers: {},
  recentEvents: [],
  cardsPlayedThisTurn: 0,

  clear_error: () => set({ last_error: null }),
  set_error: (msg: string) => set({ last_error: msg }),
  clear_info: () => set({ last_info: null }),

  reset_game: () => {
    set({
      status: "LOBBY",
      mode: "1v1",
      deck: [],
      discard_pile: [],
      hands: {},
      team_melds: { 1: [], 2: [] },
      dead_piles: [],
      has_taken_dead_pile: { 1: false, 2: false },
      turn_phase: "DRAW",
      current_player: 1,
      rules: { ...DEFAULT_RULES },
      magic_joker: {
        direction: 1,
        is_discard_frozen: false,
        pending_skip: false,
      },
      last_drawn_card_id: null,
      final_score: null,
      cumulative_score: { team_1: 0, team_2: 0 },
      round_count: 1,
      round_history: [],
      last_error: null,
      last_info: null,
      recentEvents: [],
      cardsPlayedThisTurn: 0,
      cardMarkers: {},
    });
  },

  update_rules: (rules: GameRules) => {
    set({ rules });
  },

  addEvent: (message, type = "info", playerId) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({
      recentEvents: [...state.recentEvents, { id, message, type, playerId }],
    }));

    // Auto-remove after 2 seconds
    setTimeout(() => {
      set((state) => ({
        recentEvents: state.recentEvents.filter((e) => e.id !== id),
      }));
    }, 2000);
  },

  toggleAnimations: () => {
    set((state) => {
      const newVal = !state.showAnimations;
      localStorage.setItem("baralho_show_animations", String(newVal));
      return { showAnimations: newVal };
    });
  },

  toggleSortButton: () => {
    set((state) => {
      const newVal = !state.showSortButton;
      localStorage.setItem("baralho_show_sort", String(newVal));
      return { showSortButton: newVal };
    });
  },

  toggleCardMarkers: () => {
    set((state) => {
      const newVal = !state.showCardMarkers;
      localStorage.setItem("baralho_show_card_markers", String(newVal));
      return { showCardMarkers: newVal };
    });
  },

  setCardMarker: (cardId, color) => {
    set((state) => {
      const newMarkers = { ...state.cardMarkers };
      if (color) newMarkers[cardId] = color;
      else delete newMarkers[cardId];
      return { cardMarkers: newMarkers };
    });
  },

  start_game: (config, customRules) => {
    let mode = get().mode;
    let winCondition: WinCondition = { type: "POINTS", value: 3000 };
    const rules = customRules || get().rules;

    if (typeof config === "string") {
      mode = config as GameMode;
    } else if (config) {
      winCondition = config as WinCondition;
    }

    const full_deck = create_deck(rules);
    const setup = distribute_cards(full_deck, mode, rules);

    // Organiza as mãos automaticamente
    const sorted_hands: Record<number, Card[]> = {};
    Object.entries(setup.hands).forEach(([id, hand]) => {
      sorted_hands[Number(id)] = sort_cards(hand);
    });

    set({
      status: "PLAYING",
      mode,
      deck: setup.remaining_deck,
      hands: sorted_hands,
      dead_piles: setup.dead_piles,
      has_taken_dead_pile: { 1: false, 2: false },
      discard_pile: [],
      team_melds: { 1: [], 2: [] },
      turn_phase: "DRAW",
      current_player: 1,
      rules,
      magic_joker: {
        direction: 1,
        is_discard_frozen: false,
        pending_skip: false,
      },
      last_drawn_card_id: null,
      final_score: null,
      cumulative_score: { team_1: 0, team_2: 0 },
      round_count: 1,
      round_history: [],
      win_condition: winCondition,
      last_error: null,
      last_info: null,
      recentEvents: [],
      cardMarkers: {},
    });
  },

  next_round: () => {
    const { mode, round_count, rules } = get();
    const full_deck = create_deck(rules);
    const setup = distribute_cards(full_deck, mode, rules);

    // Organiza as mãos automaticamente
    const sorted_hands: Record<number, Card[]> = {};
    Object.entries(setup.hands).forEach(([id, hand]) => {
      sorted_hands[Number(id)] = sort_cards(hand);
    });

    set({
      status: "PLAYING",
      deck: setup.remaining_deck,
      hands: sorted_hands,
      dead_piles: setup.dead_piles,
      has_taken_dead_pile: { 1: false, 2: false },
      discard_pile: [],
      team_melds: { 1: [], 2: [] },
      turn_phase: "DRAW",
      current_player: 1,
      magic_joker: {
        direction: 1,
        is_discard_frozen: false,
        pending_skip: false,
      },
      last_drawn_card_id: null,
      final_score: null,
      round_count: round_count + 1,
      last_error: null,
      last_info: null,
      cardMarkers: {},
    });
  },

  draw_card_from_deck: () => {
    const { hands, current_player, dead_piles, team_melds, mode } = get();
    let { deck } = get();
    if (deck.length === 0) {
      if (dead_piles.length > 0) {
        const [new_deck, ...remaining_piles] = dead_piles;
        deck = new_deck;
        set({
          dead_piles: remaining_piles,
          last_info: "Morto foi para a mesa",
        });
      } else {
        const t1_score = calculate_score(
          team_melds[1],
          mode === "1v1" ? [hands[1]] : [hands[1], hands[3]],
          false,
          !get().has_taken_dead_pile[1],
          get().rules,
        );
        const t2_score = calculate_score(
          team_melds[2],
          mode === "1v1" ? [hands[2]] : [hands[2], hands[4]],
          false,
          !get().has_taken_dead_pile[2],
          get().rules,
        );

        const next_cumulative = {
          team_1: get().cumulative_score.team_1 + t1_score.total_score,
          team_2: get().cumulative_score.team_2 + t2_score.total_score,
        };

        const win_condition = get().win_condition;
        let is_finished = false;
        if (win_condition?.type === "POINTS") {
          if (
            next_cumulative.team_1 >= win_condition.value ||
            next_cumulative.team_2 >= win_condition.value
          ) {
            is_finished = true;
          }
        } else if (win_condition?.type === "ROUNDS") {
          if (get().round_count >= win_condition.value) {
            is_finished = true;
          }
        }

        set({
          status: is_finished ? "FINISHED" : "ROUND_OVER",
          final_score: { team_1: t1_score, team_2: t2_score },
          cumulative_score: next_cumulative,
          round_history: [
            ...get().round_history,
            {
              round_number: get().round_count,
              team_1_score: t1_score.total_score,
              team_2_score: t2_score.total_score,
              details_t1: t1_score,
              details_t2: t2_score,
            },
          ],
          cardMarkers: {},
        });
        return;
      }
    }
    const [new_card, ...remaining_deck] = deck;
    const updated_hands = {
      ...hands,
      [current_player]: sort_cards([...hands[current_player], new_card]),
    };

    set({
      deck: remaining_deck,
      hands: updated_hands,
      last_drawn_card_id: new_card.id,
      turn_phase: "ACTION",
      last_error: null,
      cardsPlayedThisTurn: 0,
    });
  },

  pick_up_discard_new_meld: (hand_card_ids) => {
    const { discard_pile, hands, current_player, team_melds } = get();
    if (discard_pile.length === 0) return;

    const my_hand = hands[current_player];
    const top_card = discard_pile[0];
    const selected_cards = my_hand.filter((c) => hand_card_ids.includes(c.id));

    const potential_meld = [top_card, ...selected_cards];
    console.log(
      `[LOCAL PICKUP] Player ${current_player} attempt with:`,
      potential_meld.map((c) => `${c.value}${c.suit.icon}`),
    );

    const validation = validate_sequence(potential_meld, get().rules);
    const is_valid_pickup = validate_discard_pickup(
      top_card,
      selected_cards,
      get().rules,
    );

    if (!is_valid_pickup) {
      set({
        last_error: !validation.is_valid
          ? validation.error
          : "Para pegar o lixo, o novo jogo deve ser limpo.",
      });
      return;
    }

    const pile_to_take = [...discard_pile];
    pile_to_take.shift(); // Remove a carta do topo que vai para o jogo
    const hand_cards_for_meld_ids = selected_cards.map((c) => c.id);
    const remaining_hand = my_hand.filter(
      (c) => !hand_cards_for_meld_ids.includes(c.id),
    );
    const new_hand = sort_cards([...remaining_hand, ...pile_to_take]);

    const team_id = get_team(current_player);
    const has_taken_dead = get().has_taken_dead_pile[team_id];
    const dead_piles = get().dead_piles;
    const can_take_extra =
      has_taken_dead &&
      get().rules.team_can_take_both_dead_piles &&
      dead_piles.length > 0;

    const is_final_beat =
      (has_taken_dead && !can_take_extra) ||
      (!has_taken_dead && dead_piles.length === 0);

    const is_clean_canasta = (v: MeldValidation) =>
      v.is_valid &&
      (v.canastra_type === "CLEAN" ||
        v.canastra_type === "KING" ||
        v.canastra_type === "ACE");

    const will_have_clean =
      get().internal_can_beat() || is_clean_canasta(validation);

    if (new_hand.length === 0 || new_hand.length === 1) {
      if (
        get().rules.must_have_clean_canastra_to_beat &&
        is_final_beat &&
        !will_have_clean
      ) {
        set({ last_error: "Proibido bater ou ficar com 1 carta sem canastra limpa." });
        return;
      }
      if (is_final_beat && has_taken_dead && !will_have_clean) {
        set({ last_error: "Proibido bater após morto sem canastra limpa." });
        return;
      }
    }

    const organized_meld = organize_meld(potential_meld, get().rules);
    const final_meld =
      organized_meld.length === potential_meld.length
        ? organized_meld
        : sort_cards(potential_meld);
    if (final_meld.length !== potential_meld.length) {
      console.error("CRITICAL: organize_meld lost cards in local store");
    }

    const new_melds = [...team_melds[team_id], final_meld];

    get().addEvent(`Pegou ${discard_pile.length} ${discard_pile.length === 1 ? "carta" : "cartas"} do lixo`, "info", current_player);

    set({
      hands: { ...hands, [current_player]: new_hand },
      team_melds: { ...team_melds, [team_id]: new_melds },
      discard_pile: [],
      turn_phase: "ACTION",
      last_error: null,
      cardsPlayedThisTurn: get().cardsPlayedThisTurn + selected_cards.length,
    });

    if (new_hand.length === 0) get().internal_handle_empty_hand("DIRECT");
  },

  pick_up_discard_add_to_meld: (meld_index, bridge_card_ids) => {
    const { discard_pile, hands, current_player, team_melds, turn_phase } =
      get();
    if (turn_phase !== "DRAW" || discard_pile.length === 0) return;

    const team_id = get_team(current_player);
    const my_hand = hands[current_player];
    const target_meld = team_melds[team_id]?.[meld_index];
    if (!target_meld) return;

    const top_card = discard_pile[0];
    const bridge_cards = my_hand.filter((c) => bridge_card_ids.includes(c.id));

    const proposed_meld = [...target_meld, ...bridge_cards, top_card];
    console.log(
      `[LOCAL PICKUP ADD] Player ${current_player} adding to meld ${meld_index}:`,
      proposed_meld.map((c) => `${c.value}${c.suit.icon}`),
    );

    const validation = validate_discard_add_to_meld(
      target_meld,
      bridge_cards,
      top_card,
      get().rules,
    );
    console.log(`[LOCAL PICKUP ADD RESULT] Valid: ${validation.is_valid}`);

    if (!validation.is_valid) {
      set({ last_error: validation.error });
      return;
    }

    const pile_to_take = [...discard_pile];
    pile_to_take.shift();
    const hand_cards_for_meld_ids = bridge_cards.map((c) => c.id);
    const remaining_hand = my_hand.filter(
      (c) => !hand_cards_for_meld_ids.includes(c.id),
    );
    const new_hand = sort_cards([...remaining_hand, ...pile_to_take]);

    const is_clean_canasta = (v: MeldValidation) =>
      v.is_valid &&
      (v.canastra_type === "CLEAN" ||
        v.canastra_type === "KING" ||
        v.canastra_type === "ACE");

    const has_taken_dead = get().has_taken_dead_pile[team_id];
    const dead_piles = get().dead_piles;
    const can_take_extra =
      has_taken_dead &&
      get().rules.team_can_take_both_dead_piles &&
      dead_piles.length > 0;

    const is_final_beat =
      (has_taken_dead && !can_take_extra) ||
      (!has_taken_dead && dead_piles.length === 0);

    const will_have_clean = team_melds[team_id].some((meld, idx) => {
      const v =
        idx === meld_index
          ? validate_sequence(proposed_meld, get().rules)
          : validate_sequence(meld, get().rules);
      return is_clean_canasta(v);
    });

    if (new_hand.length === 0 || new_hand.length === 1) {
      if (
        get().rules.must_have_clean_canastra_to_beat &&
        is_final_beat &&
        !will_have_clean
      ) {
        set({ last_error: "Proibido bater ou ficar com 1 carta sem canastra limpa." });
        return;
      }
      if (is_final_beat && has_taken_dead && !will_have_clean) {
        set({ last_error: "Proibido bater após morto sem canastra limpa." });
        return;
      }
    }

    const new_melds = [...team_melds[team_id]];
    const organized_meld = organize_meld(proposed_meld, get().rules);
    new_melds[meld_index] =
      organized_meld.length === proposed_meld.length
        ? organized_meld
        : sort_cards(proposed_meld);

    get().addEvent(`Pegou ${discard_pile.length} ${discard_pile.length === 1 ? "carta" : "cartas"} do lixo`, "info", current_player);

    set({
      hands: { ...hands, [current_player]: new_hand },
      team_melds: { ...team_melds, [team_id]: new_melds },
      discard_pile: [],
      turn_phase: "ACTION",
      last_error: null,
      cardsPlayedThisTurn: get().cardsPlayedThisTurn + bridge_cards.length,
    });

    if (new_hand.length === 0) get().internal_handle_empty_hand("DIRECT");
  },

  add_card_to_meld: (card_ids, meld_index) => {
    const { hands, current_player, team_melds } = get();
    const team_id = get_team(current_player);
    const my_hand = hands[current_player];
    const cards_to_add = my_hand.filter((c) => card_ids.includes(c.id));
    const target_meld = team_melds[team_id]?.[meld_index];

    if (!target_meld || cards_to_add.length === 0) return;
    const proposed_meld = [...target_meld, ...cards_to_add];

    console.log(
      `[LOCAL ADD] Player ${current_player} adding to meld ${meld_index}:`,
      proposed_meld.map((c) => `${c.value}${c.suit.icon}`),
    );
    const validation = validate_sequence(proposed_meld, get().rules);
    console.log(`[LOCAL ADD RESULT] Valid: ${validation.is_valid}`);

    if (!validation.is_valid) {
      set({ last_error: validation.error });
      return;
    }

    const new_hand = sort_cards(
      my_hand.filter((c) => !card_ids.includes(c.id)),
    );

    const is_clean_canasta = (v: MeldValidation) =>
      v.is_valid &&
      (v.canastra_type === "CLEAN" ||
        v.canastra_type === "KING" ||
        v.canastra_type === "ACE");

    const has_taken_dead = get().has_taken_dead_pile[team_id];
    const dead_piles = get().dead_piles;
    const can_take_extra =
      has_taken_dead &&
      get().rules.team_can_take_both_dead_piles &&
      dead_piles.length > 0;

    const is_final_beat =
      (has_taken_dead && !can_take_extra) ||
      (!has_taken_dead && dead_piles.length === 0);

    const will_have_clean = team_melds[team_id].some((meld, idx) => {
      const v =
        idx === meld_index ? validation : validate_sequence(meld, get().rules);
      return is_clean_canasta(v);
    });

    if (new_hand.length === 0 || new_hand.length === 1) {
      if (
        get().rules.must_have_clean_canastra_to_beat &&
        is_final_beat &&
        !will_have_clean
      ) {
        set({ last_error: "Proibido bater ou ficar com 1 carta sem canastra limpa." });
        return;
      }
      if (is_final_beat && has_taken_dead && !will_have_clean) {
        set({ last_error: "Proibido bater após morto sem canastra limpa." });
        return;
      }
    }

    const new_melds = [...team_melds[team_id]];

    const organized_meld = organize_meld(proposed_meld, get().rules);
    new_melds[meld_index] =
      organized_meld.length === proposed_meld.length
        ? organized_meld
        : sort_cards(proposed_meld);

    if (
      target_meld.length < get().rules.min_cards_for_canastra &&
      proposed_meld.length >= get().rules.min_cards_for_canastra
    ) {
      get().addEvent("Canastra!", "success", current_player);
    }

    set({
      hands: { ...hands, [current_player]: new_hand },
      team_melds: { ...team_melds, [team_id]: new_melds },
      last_error: null,
      cardsPlayedThisTurn: get().cardsPlayedThisTurn + cards_to_add.length,
    });

    if (new_hand.length === 0) get().internal_handle_empty_hand("DIRECT");
  },

  meld_cards: (card_ids) => {
    const { hands, current_player, team_melds } = get();
    const my_hand = hands[current_player];
    const cards = my_hand.filter((c) => card_ids.includes(c.id));

    console.log(
      `[LOCAL MELD] Player ${current_player} attempt with:`,
      cards.map((c) => `${c.value}${c.suit.icon}`),
    );
    const validation = validate_sequence(cards, get().rules);
    console.log(`[LOCAL MELD RESULT] Valid: ${validation.is_valid}`);

    if (!validation.is_valid) {
      set({ last_error: validation.error });
      return;
    }

    const new_hand = sort_cards(
      my_hand.filter((c) => !card_ids.includes(c.id)),
    );

    const team_id = get_team(current_player);
    const has_taken_dead = get().has_taken_dead_pile[team_id];
    const dead_piles = get().dead_piles;
    const can_take_extra =
      has_taken_dead &&
      get().rules.team_can_take_both_dead_piles &&
      dead_piles.length > 0;

    const is_final_beat =
      (has_taken_dead && !can_take_extra) ||
      (!has_taken_dead && dead_piles.length === 0);

    const is_clean_canasta = (v: MeldValidation) =>
      v.is_valid &&
      (v.canastra_type === "CLEAN" ||
        v.canastra_type === "KING" ||
        v.canastra_type === "ACE");

    const will_have_clean =
      get().internal_can_beat() || is_clean_canasta(validation);

    if (new_hand.length === 0 || new_hand.length === 1) {
      if (
        get().rules.must_have_clean_canastra_to_beat &&
        is_final_beat &&
        !will_have_clean
      ) {
        set({ last_error: "Proibido bater ou ficar com 1 carta sem canastra limpa." });
        return;
      }
      if (is_final_beat && has_taken_dead && !will_have_clean) {
        set({ last_error: "Proibido bater após morto sem canastra limpa." });
        return;
      }
    }

    const organized_meld = organize_meld(cards, get().rules);
    const final_meld =
      organized_meld.length === cards.length
        ? organized_meld
        : sort_cards(cards);

    if (
      validation.canastra_type === "CLEAN" ||
      validation.canastra_type === "KING" ||
      validation.canastra_type === "ACE"
    ) {
      get().addEvent("Canastra!", "success", current_player);
    }

    set({
      hands: { ...hands, [current_player]: new_hand },
      team_melds: {
        ...team_melds,
        [team_id]: [...team_melds[team_id], final_meld],
      },
      last_error: null,
      cardsPlayedThisTurn: get().cardsPlayedThisTurn + cards.length,
    });

    if (new_hand.length === 0) get().internal_handle_empty_hand("DIRECT");
  },

  discard_card: (card_id) => {
    const { hands, current_player, discard_pile, mode } = get();
    const my_hand = hands[current_player];
    const card = my_hand.find((c) => c.id === card_id);
    if (!card) return;

    const new_hand = sort_cards(my_hand.filter((c) => c.id !== card.id));

    const team_id = get_team(current_player);
    const has_taken_dead = get().has_taken_dead_pile[team_id];
    const dead_piles = get().dead_piles;
    const can_take_extra =
      has_taken_dead &&
      get().rules.team_can_take_both_dead_piles &&
      dead_piles.length > 0;

    const is_final_beat =
      (has_taken_dead && !can_take_extra) ||
      (!has_taken_dead && dead_piles.length === 0);

    const has_clean = get().internal_can_beat();

    if (new_hand.length === 0) {
      if (
        get().rules.must_have_clean_canastra_to_beat &&
        is_final_beat &&
        !has_clean
      ) {
        set({ last_error: "Proibido bater sem canastra limpa." });
        return;
      }
      if (is_final_beat && has_taken_dead && !has_clean) {
        set({ last_error: "Proibido bater após morto sem canastra limpa." });
        return;
      }
    }

    set({
      hands: { ...hands, [current_player]: new_hand },
      discard_pile: [card, ...discard_pile],
      last_drawn_card_id: null,
      last_error: null,
    });

    if (new_hand.length === 0) {
      get().internal_handle_empty_hand("INDIRECT");
    }

    if (get().status === "PLAYING") {
      let next_player = get_next_player(
        current_player,
        mode,
        get().magic_joker.direction,
      );
      const skipActive = get().magic_joker.pending_skip;

      if (skipActive) {
        next_player = get_next_player(
          next_player,
          mode,
          get().magic_joker.direction,
        );
        get().addEvent("Vez pulada!", "info");
      }

      set({
        current_player: next_player,
        turn_phase: "DRAW",
        magic_joker: {
          ...get().magic_joker,
          pending_skip: false,
        },
      });
    }
  },

  use_joker: (cardId) => {
    const { hands, current_player, turn_phase, mode } = get();
    if (turn_phase === "DRAW") {
      set({ last_error: "Você deve comprar uma carta antes de usar o Joker." });
      return;
    }

    const my_hand = hands[current_player];
    const joker = my_hand.find((c) => c.id === cardId);
    if (!joker || joker.value !== "JOKER" || !joker.ability) return;

    // Consome o Joker
    const new_hand_after_joker = my_hand.filter((c) => c.id !== cardId);

    // Determina o Alvo (Próximo Jogador)
    const next_player = get_next_player(
      current_player,
      mode,
      get().magic_joker.direction,
    );
    const target_hand = hands[next_player];

    let finalHands = { ...hands, [current_player]: new_hand_after_joker };
    let finalDirection = get().magic_joker.direction;
    const finalIsFrozen = get().magic_joker.is_discard_frozen;
    let powerSelection = undefined;

    switch (joker.ability) {
      case "STEAL_CARD": {
        if (target_hand.length > 0) {
          const randomIdx = Math.floor(Math.random() * target_hand.length);
          const stolenCard = target_hand[randomIdx];
          const newTargetHand = target_hand.filter((_, i) => i !== randomIdx);
          const newMyHand = sort_cards([...new_hand_after_joker, stolenCard]);

          finalHands = {
            ...hands,
            [current_player]: newMyHand,
            [next_player]: newTargetHand,
          };

          get().addEvent(
            `ROUBOU uma carta do Jogador ${next_player}`,
            "success",
            current_player,
          );
        }
        break;
      }

      case "SKIP_TURN": {
        get().addEvent(`PULOU o descarte!`, "info", current_player);
        const nextP = get_next_player(
          current_player,
          mode,
          get().magic_joker.direction,
        );
        set({
          hands: finalHands,
          current_player: nextP,
          turn_phase: "DRAW",
          last_error: null,
        });
        return;
      }

      case "SAFE": {
        const teammate =
          mode === "2v2"
            ? current_player <= 2
              ? current_player + 2
              : current_player - 2
            : null;

        const currentDeck = [...get().deck];
        const currentDiscard = [...get().discard_pile];

        const giveCards = (
          pId: number,
          count: number,
          handsObj: Record<number, Card[]>,
        ) => {
          const hand = [...(handsObj[pId] || [])];
          for (let i = 0; i < count; i++) {
            let card = currentDeck.shift();
            if (!card && currentDiscard.length > 0) {
              card = currentDiscard.shift(); // Pega do topo do lixo
            }
            if (card) hand.push(card);
          }
          handsObj[pId] = sort_cards(hand);
        };

        const updatedHands = {
          ...hands,
          [current_player]: new_hand_after_joker,
        };

        // Dá 3 cartas para quem usou
        giveCards(current_player, 3, updatedHands);

        // Dá 3 cartas para o parceiro (se existir)
        if (teammate) {
          giveCards(teammate, 3, updatedHands);
        }

        finalHands = updatedHands;
        set({ deck: currentDeck, discard_pile: currentDiscard });
        get().addEvent(`SEGURO ATIVADO!`, "success", current_player);
        break;
      }

      case "SKIP_NEXT": {
        const victim = get_next_player(
          current_player,
          mode,
          get().magic_joker.direction,
        );
        get().addEvent(`BLOQUEOU Jogador ${victim}!`, "info", current_player);
        set({
          hands: finalHands,
          magic_joker: {
            ...get().magic_joker,
            pending_skip: true,
          },
          last_error: null,
        });
        return;
      }

      case "REVERSE": {
        finalDirection = finalDirection === 1 ? -1 : 1;
        get().addEvent(`INVERTEU o jogo!`, "info", current_player);
        break;
      }

      case "SHUFFLE_DISCARD": {
        if (get().discard_pile.length > 1) {
          const cards_to_return = [...get().discard_pile];
          const top_card = cards_to_return.shift()!;
          const new_deck = sort_cards([...get().deck, ...cards_to_return]); // Simplified shuffle for local
          set({ deck: new_deck, discard_pile: [top_card] });
          get().addEvent(`LIMPOU o lixo!`, "info", current_player);
        }
        break;
      }

      case "TAX_COLLECTOR": {
        get().addEvent(`IMPOSTO COLETIVO!`, "warning", current_player);
        const updatedHands = {
          ...hands,
          [current_player]: new_hand_after_joker,
        };
        const newDiscard = [...get().discard_pile];

        Object.keys(updatedHands).forEach((pId) => {
          const h = updatedHands[Number(pId)];
          if (h && h.length > 1) {
            const idx = Math.floor(Math.random() * h.length);
            const discarded = h.splice(idx, 1)[0];
            if (discarded) newDiscard.unshift(discarded);
            updatedHands[Number(pId)] = sort_cards(h);
          }
        });
        finalHands = updatedHands;
        set({ discard_pile: newDiscard });
        break;
      }

      case "VIEW_HAND": {
        const victim = get_next_player(
          current_player,
          mode,
          get().magic_joker.direction,
        );
        powerSelection = {
          player_id: current_player,
          target_player_id: victim,
          ability: "VIEW_HAND",
          stage: "PICK_MY_CARD" as const,
        };
        get().addEvent(`ESPIANDO ADVERSÁRIO!`, "info", current_player);

        setTimeout(() => {
          const { magic_joker: mj } = get();
          if (mj.power_selection?.ability === "VIEW_HAND") {
            set({
              magic_joker: { ...mj, power_selection: undefined },
            });
          }
        }, 3000);
        break;
      }

      case "SURGICAL_SWAP": {
        if (mode === "2v2") {
          const partner =
            current_player <= 2 ? current_player + 2 : current_player - 2;
          powerSelection = {
            player_id: current_player,
            target_player_id: partner,
            ability: "SURGICAL_SWAP",
            stage: "PICK_MY_CARD" as const,
          };
          get().addEvent(`TROCA CIRÚRGICA ATIVA!`, "info", current_player);
        } else {
          set({ last_error: "Troca Cirúrgica só funciona em duplas (2v2)." });
          return;
        }
        break;
      }
    }

    set({
      hands: finalHands,
      magic_joker: {
        ...get().magic_joker,
        direction: finalDirection,
        is_discard_frozen: finalIsFrozen,
        power_selection: powerSelection,
      },
      last_error: null,
    });

    if (finalHands[current_player].length === 0)
      get().internal_handle_empty_hand("DIRECT");
  },

  power_pick_card: (cardId) => {
    const { magic_joker, hands, current_player } = get();
    if (!magic_joker.power_selection) return;

    const selection = magic_joker.power_selection;

    if (selection.stage === "PICK_MY_CARD") {
      const my_hand = hands[current_player];
      if (!my_hand.some((c) => c.id === cardId)) {
        set({ last_error: "Carta não encontrada na sua mão." });
        return;
      }
      set({
        magic_joker: {
          ...magic_joker,
          power_selection: {
            ...selection,
            selected_card_id: cardId,
            stage: "PICK_THEIR_CARD",
          },
        },
      });
    } else if (selection.stage === "PICK_THEIR_CARD") {
      const target_hand = hands[selection.target_player_id];
      const theirCardIdx = target_hand.findIndex((c) => c.id === cardId);

      if (theirCardIdx === -1) {
        set({ last_error: "Carta não encontrada na mão do parceiro." });
        return;
      }

      const myHand = [...hands[current_player]];
      const myCardIdx = myHand.findIndex(
        (c) => c.id === selection.selected_card_id,
      );

      if (myCardIdx !== -1) {
        const newTargetHand = [...target_hand];
        const myCard = myHand.splice(myCardIdx, 1)[0]!;
        const theirCard = newTargetHand.splice(theirCardIdx, 1)[0]!;

        myHand.push(theirCard);
        newTargetHand.push(myCard);

        set({
          hands: {
            ...hands,
            [current_player]: sort_cards(myHand),
            [selection.target_player_id]: sort_cards(newTargetHand),
          },
          magic_joker: {
            ...magic_joker,
            power_selection: undefined,
          },
        });
        get().addEvent("Troca Cirúrgica concluída!", "success", current_player);
      }
    }
  },

  power_cancel: () => {
    set((state) => ({
      magic_joker: {
        ...state.magic_joker,
        power_selection: undefined,
      },
    }));
  },

  sort_my_hand: () => {
    const { hands, current_player } = get();
    set({
      hands: {
        ...hands,
        [current_player]: sort_cards(hands[current_player], true),
      },
    });
  },

  internal_can_beat: () => {
    const { team_melds, current_player } = get();
    const team_id = get_team(current_player);
    return team_melds[team_id].some((meld) => {
      const v = validate_sequence(meld, get().rules);
      return (
        v.is_valid &&
        (v.canastra_type === "CLEAN" ||
          v.canastra_type === "KING" ||
          v.canastra_type === "ACE")
      );
    });
  },

  internal_handle_empty_hand: (type: "DIRECT" | "INDIRECT") => {
    const {
      dead_piles,
      has_taken_dead_pile,
      current_player,
      hands,
      team_melds,
      mode,
    } = get();
    const team_id = get_team(current_player);
    const has_taken = has_taken_dead_pile[team_id];
    const can_take_extra =
      has_taken &&
      get().rules.team_can_take_both_dead_piles &&
      dead_piles.length > 0;

    if (has_taken && !can_take_extra) {
      console.log(`[GAME] Jogador ${current_player} bateu final!`);
      get().addEvent("Bateu!", "success", current_player);
      const t1_score = calculate_score(
        team_melds[1],
        mode === "1v1" ? [hands[1]] : [hands[1], hands[3]],
        team_id === 1,
        !get().has_taken_dead_pile[1],
        get().rules,
      );
      const t2_score = calculate_score(
        team_melds[2],
        mode === "1v1" ? [hands[2]] : [hands[2], hands[4]],
        team_id === 2,
        !get().has_taken_dead_pile[2],
        get().rules,
      );

      const next_cumulative = {
        team_1: get().cumulative_score.team_1 + t1_score.total_score,
        team_2: get().cumulative_score.team_2 + t2_score.total_score,
      };

      const win_condition = get().win_condition;
      let is_finished = false;
      if (win_condition?.type === "POINTS") {
        if (
          next_cumulative.team_1 >= win_condition.value ||
          next_cumulative.team_2 >= win_condition.value
        ) {
          is_finished = true;
        }
      } else if (win_condition?.type === "ROUNDS") {
        if (get().round_count >= win_condition.value) {
          is_finished = true;
        }
      }

      set({
        status: is_finished ? "FINISHED" : "ROUND_OVER",
        final_score: { team_1: t1_score, team_2: t2_score },
        cumulative_score: next_cumulative,
        round_history: [
          ...get().round_history.filter((r) => r.round_number !== get().round_count),
          {
            round_number: get().round_count,
            team_1_score: t1_score.total_score,
            team_2_score: t2_score.total_score,
            details_t1: t1_score,
            details_t2: t2_score,
          },
        ],
        cardMarkers: {},
      });
      return;
    }

    if (dead_piles.length > 0) {
      console.log(`[GAME] Jogador ${current_player} pegou o morto.`);
      get().addEvent("Pegou morto", "info", current_player);
      const [my_dead_pile, ...remaining_piles] = dead_piles;
      set({
        hands: { ...hands, [current_player]: sort_cards(my_dead_pile) },
        dead_piles: remaining_piles,
        has_taken_dead_pile: { ...has_taken_dead_pile, [team_id]: true },
        turn_phase: type === "DIRECT" ? "ACTION" : "DRAW",
      });
    } else {
      console.log("[GAME] Fim de jogo por batida (sem mortos disponíveis).");
      get().addEvent("Bateu!", "success", current_player);

      const t1_score = calculate_score(
        team_melds[1],
        mode === "1v1" ? [hands[1]] : [hands[1], hands[3]],
        team_id === 1,
        !get().has_taken_dead_pile[1],
        get().rules,
      );
      const t2_score = calculate_score(
        team_melds[2],
        mode === "1v1" ? [hands[2]] : [hands[2], hands[4]],
        team_id === 2,
        !get().has_taken_dead_pile[2],
        get().rules,
      );

      const next_cumulative = {
        team_1: get().cumulative_score.team_1 + t1_score.total_score,
        team_2: get().cumulative_score.team_2 + t2_score.total_score,
      };

      const win_condition = get().win_condition;
      let is_finished = false;
      if (win_condition?.type === "POINTS") {
        if (
          next_cumulative.team_1 >= win_condition.value ||
          next_cumulative.team_2 >= win_condition.value
        ) {
          is_finished = true;
        }
      } else if (win_condition?.type === "ROUNDS") {
        if (get().round_count >= win_condition.value) {
          is_finished = true;
        }
      }

      set({
        status: is_finished ? "FINISHED" : "ROUND_OVER",
        final_score: { team_1: t1_score, team_2: t2_score },
        cumulative_score: next_cumulative,
        round_history: [
          ...get().round_history.filter((r) => r.round_number !== get().round_count),
          {
            round_number: get().round_count,
            team_1_score: t1_score.total_score,
            team_2_score: t2_score.total_score,
            details_t1: t1_score,
            details_t2: t2_score,
          },
        ],
        cardMarkers: {},
      });
    }
  },
}));
