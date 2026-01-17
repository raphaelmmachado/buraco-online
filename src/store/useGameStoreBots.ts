// =============================================================================
// STORE ZUSTAND - MODO LOCAL COM BOTS
// Contém toda a lógica e estado para uma partida local.
// =============================================================================

import { create } from "zustand";
import type { Card } from "../../common/types/card";
import { distribute_cards, create_deck } from "../../common/utils/game_logic";
import { sort_cards, organize_meld } from "../../common/utils/sort_cards";
import {
  validate_sequence,
  type MeldValidation,
} from "../../common/utils/rules_logic";

import { calculate_score, type ScoreResult } from "../../common/utils/scoring";

type PlayerID = 1 | 2 | 3 | 4;
type TeamID = 1 | 2;
type GameMode = "1v1" | "2v2";

interface GameState {
  status: "LOBBY" | "PLAYING" | "FINISHED";
  mode: GameMode;
  deck: Card[];
  discard_pile: Card[];
  hands: Record<number, Card[]>;
  team_melds: Record<TeamID, Card[][]>;
  dead_piles: Card[][];
  has_taken_dead_pile: Record<TeamID, boolean>;
  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: PlayerID;
  last_drawn_card_id: string | null;
  final_score: { team_1: ScoreResult; team_2: ScoreResult } | null;
  last_error: string | null;
  showAnimations: boolean;
  recentEvents: {
    id: string;
    message: string;
    playerId?: number;
    type: "info" | "success" | "warning" | "error";
  }[];
  cardsPlayedThisTurn: number;
}

interface GameActions {
  start_game: (mode?: GameMode) => void;
  draw_card_from_deck: () => void;
  discard_card: (card_id: string) => void;
  sort_my_hand: () => void;
  meld_cards: (card_ids: string[]) => void;
  add_card_to_meld: (card_ids: string[], meld_index: number) => void;
  pick_up_discard_new_meld: (hand_card_ids: string[]) => void;
  pick_up_discard_add_to_meld: (
    meld_index: number,
    bridge_card_ids: string[]
  ) => void;
  clear_error: () => void;
  toggleAnimations: () => void;
  addEvent: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
    playerId?: number
  ) => void;
  internal_can_beat: () => boolean;
  internal_handle_empty_hand: (type: "DIRECT" | "INDIRECT") => void;
}

const get_team = (player_id: number): TeamID => (player_id % 2 !== 0 ? 1 : 2);
const get_next_player = (current: number, mode: GameMode): PlayerID => {
  if (mode === "1v1") return current === 1 ? 2 : 1;
  return ((current % 4) + 1) as PlayerID;
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
  last_drawn_card_id: null,
  final_score: null,
  last_error: null,
  showAnimations: localStorage.getItem("baralho_show_animations") !== "false",
  recentEvents: [],
  cardsPlayedThisTurn: 0,

  clear_error: () => set({ last_error: null }),

  addEvent: (message, type = "info", playerId) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({
      recentEvents: [...state.recentEvents, { id, message, type, playerId }],
    }));

    // Auto-remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        recentEvents: state.recentEvents.filter((e) => e.id !== id),
      }));
    }, 3000);
  },

  toggleAnimations: () => {
    set((state) => {
      const newVal = !state.showAnimations;
      localStorage.setItem("baralho_show_animations", String(newVal));
      return { showAnimations: newVal };
    });
  },

  start_game: (mode = "1v1") => {
    const full_deck = create_deck();
    const setup = distribute_cards(full_deck, mode);

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
      last_drawn_card_id: null,
      final_score: null,
      last_error: null,
      recentEvents: [],
    });
  },

  draw_card_from_deck: () => {
    const { hands, current_player, dead_piles, team_melds, mode } = get();
    let { deck } = get();
    if (deck.length === 0) {
      if (dead_piles.length > 0) {
        const [new_deck, ...remaining_piles] = dead_piles;
        deck = new_deck;
        set({ dead_piles: remaining_piles });
      } else {
        const t1_score = calculate_score(
          team_melds[1],
          mode === "1v1" ? [hands[1]] : [hands[1], hands[3]],
          false,
          !get().has_taken_dead_pile[1]
        );
        const t2_score = calculate_score(
          team_melds[2],
          mode === "1v1" ? [hands[2]] : [hands[2], hands[4]],
          false,
          !get().has_taken_dead_pile[2]
        );
        set({
          status: "FINISHED",
          final_score: { team_1: t1_score, team_2: t2_score },
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
      potential_meld.map((c) => `${c.value}${c.suit.icon}`)
    );

    const validation = validate_sequence(potential_meld);
    console.log(
      `[LOCAL PICKUP RESULT] Valid: ${validation.is_valid}, Clean: ${
        validation.is_valid ? validation.is_clean : "N/A"
      }`
    );

    if (!validation.is_valid || !validation.is_clean) {
      set({
        last_error: validation.is_valid
          ? "Para pegar o lixo, o novo jogo deve ser limpo."
          : validation.error,
      });
      return;
    }

    const pile_to_take = [...discard_pile];
    pile_to_take.shift(); // Remove a carta do topo que vai para o jogo
    const hand_cards_for_meld_ids = selected_cards.map((c) => c.id);
    const remaining_hand = my_hand.filter(
      (c) => !hand_cards_for_meld_ids.includes(c.id)
    );
    const new_hand = sort_cards([...remaining_hand, ...pile_to_take]);

    const team_id = get_team(current_player);
    const is_clean_canasta = (v: MeldValidation) =>
      v.is_valid &&
      (v.canastra_type === "CLEAN" ||
        v.canastra_type === "KING" ||
        v.canastra_type === "ACE");

    const will_have_clean =
      get().internal_can_beat() || is_clean_canasta(validation);

    if (
      get().has_taken_dead_pile[team_id] &&
      new_hand.length <= 1 &&
      !will_have_clean
    ) {
      set({
        last_error:
          "Proibido bater sem canastra limpa (você ficaria apenas com uma carta na mão).",
      });
      return;
    }

    const organized_meld = organize_meld(potential_meld);
    const final_meld =
      organized_meld.length === potential_meld.length
        ? organized_meld
        : sort_cards(potential_meld);
    if (final_meld.length !== potential_meld.length) {
      console.error("CRITICAL: organize_meld lost cards in local store");
    }

    const new_melds = [...team_melds[team_id], final_meld];

    get().addEvent("Pegou o lixo", "info", current_player);

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
      proposed_meld.map((c) => `${c.value}${c.suit.icon}`)
    );

    const validation = validate_sequence(proposed_meld);
    console.log(`[LOCAL PICKUP ADD RESULT] Valid: ${validation.is_valid}`);

    if (!validation.is_valid) {
      set({ last_error: validation.error });
      return;
    }

    const pile_to_take = [...discard_pile];
    pile_to_take.shift();
    const hand_cards_for_meld_ids = bridge_cards.map((c) => c.id);
    const remaining_hand = my_hand.filter(
      (c) => !hand_cards_for_meld_ids.includes(c.id)
    );
    const new_hand = sort_cards([...remaining_hand, ...pile_to_take]);

    const is_clean_canasta = (v: MeldValidation) =>
      v.is_valid &&
      (v.canastra_type === "CLEAN" ||
        v.canastra_type === "KING" ||
        v.canastra_type === "ACE");

    const will_have_clean = team_melds[team_id].some((meld, idx) => {
      const v = idx === meld_index ? validation : validate_sequence(meld);
      return is_clean_canasta(v);
    });

    if (
      get().has_taken_dead_pile[team_id] &&
      new_hand.length <= 1 &&
      !will_have_clean
    ) {
      set({
        last_error:
          "Proibido bater sem canastra limpa (você ficaria apenas com uma carta na mão).",
      });
      return;
    }

    const new_melds = [...team_melds[team_id]];
    const organized_meld = organize_meld(proposed_meld);
    new_melds[meld_index] =
      organized_meld.length === proposed_meld.length
        ? organized_meld
        : sort_cards(proposed_meld);

    get().addEvent("Pegou o lixo", "info", current_player);

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
      proposed_meld.map((c) => `${c.value}${c.suit.icon}`)
    );
    const validation = validate_sequence(proposed_meld);
    console.log(`[LOCAL ADD RESULT] Valid: ${validation.is_valid}`);

    if (!validation.is_valid) {
      set({ last_error: validation.error });
      return;
    }

    const new_hand = sort_cards(
      my_hand.filter((c) => !card_ids.includes(c.id))
    );

    const is_clean_canasta = (v: MeldValidation) =>
      v.is_valid &&
      (v.canastra_type === "CLEAN" ||
        v.canastra_type === "KING" ||
        v.canastra_type === "ACE");

    const will_have_clean = team_melds[team_id].some((meld, idx) => {
      const v = idx === meld_index ? validation : validate_sequence(meld);
      return is_clean_canasta(v);
    });

    if (
      get().has_taken_dead_pile[team_id] &&
      new_hand.length <= 1 &&
      !will_have_clean
    ) {
      set({
        last_error:
          "Proibido bater sem canastra limpa (você ficaria apenas com uma carta na mão).",
      });
      return;
    }

    const new_melds = [...team_melds[team_id]];
    const organized_meld = organize_meld(proposed_meld);
    new_melds[meld_index] =
      organized_meld.length === proposed_meld.length
        ? organized_meld
        : sort_cards(proposed_meld);

    if (target_meld.length < 7 && proposed_meld.length >= 7) {
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
      cards.map((c) => `${c.value}${c.suit.icon}`)
    );
    const validation = validate_sequence(cards);
    console.log(`[LOCAL MELD RESULT] Valid: ${validation.is_valid}`);

    if (!validation.is_valid) {
      set({ last_error: validation.error });
      return;
    }

    const new_hand = sort_cards(
      my_hand.filter((c) => !card_ids.includes(c.id))
    );

    const team_id = get_team(current_player);
    const is_clean_canasta = (v: MeldValidation) =>
      v.is_valid &&
      (v.canastra_type === "CLEAN" ||
        v.canastra_type === "KING" ||
        v.canastra_type === "ACE");

    const will_have_clean =
      get().internal_can_beat() || is_clean_canasta(validation);

    if (
      get().has_taken_dead_pile[team_id] &&
      new_hand.length <= 1 &&
      !will_have_clean
    ) {
      set({
        last_error:
          "Proibido bater sem canastra limpa (você ficaria apenas com uma carta na mão).",
      });
      return;
    }

    const organized_meld = organize_meld(cards);
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

    const team_id = get_team(current_player);
    const new_hand = sort_cards(my_hand.filter((c) => c.id !== card.id));

    if (
      new_hand.length === 0 &&
      get().has_taken_dead_pile[team_id] &&
      !get().internal_can_beat()
    ) {
      set({
        last_error: "Proibido bater sem canastra limpa.",
      });
      return;
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

    if (get().status !== "FINISHED") {
      const next_player = get_next_player(current_player, mode);
      set({ current_player: next_player, turn_phase: "DRAW" });
    }
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
      const v = validate_sequence(meld);
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

    if (has_taken_dead_pile[team_id]) {
      console.log(`[GAME] Jogador ${current_player} bateu final!`);
      get().addEvent("Bateu!", "success", current_player);
      const t1_score = calculate_score(
        team_melds[1],
        mode === "1v1" || team_id === 2 ? [hands[1]] : [],
        team_id === 1,
        !has_taken_dead_pile[1]
      );
      const t2_score = calculate_score(
        team_melds[2],
        mode === "1v1" || team_id === 1 ? [hands[2]] : [],
        team_id === 2,
        !has_taken_dead_pile[2]
      );
      set({
        status: "FINISHED",
        final_score: { team_1: t1_score, team_2: t2_score },
      });
      return;
    }

    if (dead_piles.length > 0) {
      console.log(`[GAME] Jogador ${current_player} pegou o morto.`);
      get().addEvent("Pegou o morto!", "info", current_player);
      const [my_dead_pile, ...remaining_piles] = dead_piles;
      set({
        hands: { ...hands, [current_player]: sort_cards(my_dead_pile) },
        dead_piles: remaining_piles,
        has_taken_dead_pile: { ...has_taken_dead_pile, [team_id]: true },
        turn_phase: type === "DIRECT" ? "ACTION" : "DRAW",
      });
    } else {
      console.log("[GAME] Fim de jogo, não há mais mortos para pegar.");
      get().addEvent("Fim de Jogo!", "info");
      const t1_score = calculate_score(
        team_melds[1],
        mode === "1v1" ? [hands[1]] : [hands[1], hands[3]],
        false,
        !get().has_taken_dead_pile[1]
      );
      const t2_score = calculate_score(
        team_melds[2],
        mode === "1v1" ? [hands[2]] : [hands[2], hands[4]],
        false,
        !get().has_taken_dead_pile[2]
      );
      set({
        status: "FINISHED",
        final_score: { team_1: t1_score, team_2: t2_score },
      });
    }
  },
}));
