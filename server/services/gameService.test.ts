import { expect, test, describe } from "bun:test";
import {
  create_meld_undo_snapshot,
  handle_empty_hand,
  has_clean_canastra,
  is_final_beat,
  restore_meld_undo_snapshot,
} from "./gameService";
import { type ServerGameState } from "../state";
import {
  type Card,
  type CardValue,
  type Suit,
  SUITS,
} from "../../common/types/card";
import { DEFAULT_RULES } from "../../common/types/rules";

const hearts = SUITS.find((s) => s.name === "copas")!;
const clubs = SUITS.find((s) => s.name === "paus")!;

const createCard = (value: string, suit: Suit, id: string): Card => ({
  id,
  value: value as CardValue,
  suit,
  color: suit.color,
});

describe("gameService Rules Logic", () => {
  describe("is_final_beat", () => {
    const mockGame: Partial<ServerGameState> = {
      rules: { ...DEFAULT_RULES },
      dead_piles: [[], []],
      has_taken_dead_pile: [false, false],
    };

    test("Team 1 has NOT taken dead pile and mortos ARE available -> NOT final beat", () => {
      const game = {
        ...mockGame,
        dead_piles: [[], []],
        has_taken_dead_pile: [false, false],
      } as ServerGameState;
      expect(is_final_beat(game, 1)).toBe(false);
    });

    test("Team 1 has NOT taken dead pile but NO mortos available -> IS final beat", () => {
      const game = {
        ...mockGame,
        dead_piles: [],
        has_taken_dead_pile: [false, false],
      } as ServerGameState;
      expect(is_final_beat(game, 1)).toBe(true);
    });

    test("Team 1 HAS taken dead pile and team CANNOT take both -> IS final beat", () => {
      const game = {
        ...mockGame,
        dead_piles: [[]],
        has_taken_dead_pile: [true, false],
        rules: { ...DEFAULT_RULES, team_can_take_both_dead_piles: false },
      } as ServerGameState;
      expect(is_final_beat(game, 1)).toBe(true);
    });

    test("Team 1 HAS taken dead pile, team CAN take both, and 1 morto left -> NOT final beat", () => {
      const game = {
        ...mockGame,
        dead_piles: [[]],
        has_taken_dead_pile: [true, false],
        rules: { ...DEFAULT_RULES, team_can_take_both_dead_piles: true },
      } as ServerGameState;
      expect(is_final_beat(game, 1)).toBe(false);
    });

    test("Team 1 HAS taken dead pile, team CAN take both, but NO mortos left -> IS final beat", () => {
      const game = {
        ...mockGame,
        dead_piles: [],
        has_taken_dead_pile: [true, false],
        rules: { ...DEFAULT_RULES, team_can_take_both_dead_piles: true },
      } as ServerGameState;
      expect(is_final_beat(game, 1)).toBe(true);
    });
  });

  describe("has_clean_canastra", () => {
    test("Team has a clean canastra -> true", () => {
      const game: Partial<ServerGameState> = {
        rules: DEFAULT_RULES,
        team_melds: {
          1: [
            [
              createCard("3", hearts, "3h"),
              createCard("4", hearts, "4h"),
              createCard("5", hearts, "5h"),
              createCard("6", hearts, "6h"),
              createCard("7", hearts, "7h"),
              createCard("8", hearts, "8h"),
              createCard("9", hearts, "9h"),
            ],
          ],
          2: [],
        },
      };
      expect(has_clean_canastra(game as ServerGameState, 1)).toBe(true);
    });

    test("Team only has a dirty canastra -> false", () => {
      const game: Partial<ServerGameState> = {
        rules: DEFAULT_RULES,
        team_melds: {
          1: [
            [
              createCard("3", hearts, "3h"),
              createCard("4", hearts, "4h"),
              createCard("5", hearts, "5h"),
              createCard("6", hearts, "6h"),
              createCard("7", hearts, "7h"),
              createCard("8", hearts, "8h"),
              createCard("2", clubs, "2c"),
            ],
          ],
          2: [],
        },
      };
      expect(has_clean_canastra(game as ServerGameState, 1)).toBe(false);
    });

    test("Team has a dirty canastra AND a clean canastra -> true", () => {
      const game: Partial<ServerGameState> = {
        rules: DEFAULT_RULES,
        team_melds: {
          1: [
            [
              createCard("3", hearts, "3h"),
              createCard("4", hearts, "4h"),
              createCard("5", hearts, "5h"),
              createCard("6", hearts, "6h"),
              createCard("7", hearts, "7h"),
              createCard("8", hearts, "8h"),
              createCard("2", clubs, "2c"),
            ],
            [
              createCard("10", hearts, "10h"),
              createCard("J", hearts, "jh"),
              createCard("Q", hearts, "qh"),
              createCard("K", hearts, "kh"),
              createCard("A", hearts, "ah"),
              createCard("9", hearts, "9h"),
              createCard("8", hearts, "8h_2"), // Dummy to make 7
            ],
          ],
          2: [],
        },
      };
      expect(has_clean_canastra(game as ServerGameState, 1)).toBe(true);
    });
  });

  describe("meld undo snapshots", () => {
    test("clears undo snapshots when a direct meld takes the dead pile", () => {
      const deadCard = createCard("3", hearts, "dead-3h");
      const game = {
        mode: "1v1",
        status: "PLAYING",
        turn_phase: "ACTION",
        rules: { ...DEFAULT_RULES, allow_undo_melds: true },
        hands: { 1: [], 2: [] },
        team_melds: { 1: [], 2: [] },
        dead_piles: [[deadCard]],
        has_taken_dead_pile: [false, false],
        cumulative_score: { team_1: 0, team_2: 0 },
        round_history: [],
        round_count: 1,
        final_score: null,
        players_data: {},
        undo_meld_stack: [],
      } as unknown as ServerGameState;
      game.undo_meld_stack = [create_meld_undo_snapshot(game, 1)];

      handle_empty_hand(game, 1, "DIRECT");

      expect(game.undo_meld_stack).toEqual([]);
      expect(game.has_taken_dead_pile).toEqual([true, false]);
      expect(game.hands[1]).toEqual([deadCard]);
    });

    test("restores the hand and melds during the action phase", () => {
      const card = createCard("3", hearts, "3h");
      const game = {
        status: "PLAYING",
        turn_phase: "ACTION",
        rules: { ...DEFAULT_RULES, allow_undo_melds: true },
        hands: { 1: [card], 2: [] },
        team_melds: { 1: [], 2: [] },
        dead_piles: [[card]],
        has_taken_dead_pile: [false, false],
        cumulative_score: { team_1: 0, team_2: 0 },
        round_history: [],
        final_score: null,
        undo_meld_stack: [],
      } as unknown as ServerGameState;

      game.undo_meld_stack = [create_meld_undo_snapshot(game, 1)];
      game.hands[1] = [];
      game.team_melds[1] = [[card]];

      expect(restore_meld_undo_snapshot(game, 1)).toBe(true);
      expect(game.hands[1]).toEqual([card]);
      expect(game.team_melds[1]).toEqual([]);
      expect(game.dead_piles).toEqual([[card]]);
      expect(game.has_taken_dead_pile).toEqual([false, false]);
      expect(game.status).toBe("PLAYING");
      expect(game.cumulative_score.team_1).toBe(0);
      expect(game.undo_meld_stack).toEqual([]);
    });

    test("cannot restore a meld after the round has ended", () => {
      const game = {
        status: "ROUND_OVER",
        turn_phase: "ACTION",
        rules: { ...DEFAULT_RULES, allow_undo_melds: true },
        hands: { 1: [], 2: [] },
        team_melds: { 1: [], 2: [] },
        dead_piles: [],
        has_taken_dead_pile: [true, false],
        cumulative_score: { team_1: 0, team_2: 0 },
        round_history: [],
        final_score: null,
        undo_meld_stack: [],
      } as unknown as ServerGameState;
      game.undo_meld_stack = [create_meld_undo_snapshot(game, 1)];

      expect(restore_meld_undo_snapshot(game, 1)).toBe(false);
      expect(game.undo_meld_stack).toHaveLength(1);
    });

    test("does not consume another player's snapshot", () => {
      const game = {
        status: "PLAYING",
        turn_phase: "ACTION",
        rules: DEFAULT_RULES,
        hands: { 1: [], 2: [] },
        team_melds: { 1: [], 2: [] },
        dead_piles: [],
        has_taken_dead_pile: [false, false],
        cumulative_score: { team_1: 0, team_2: 0 },
        round_history: [],
        final_score: null,
        undo_meld_stack: [],
      } as unknown as ServerGameState;
      game.undo_meld_stack = [create_meld_undo_snapshot(game, 1)];

      expect(restore_meld_undo_snapshot(game, 2)).toBe(false);
      expect(game.undo_meld_stack).toHaveLength(1);
    });
  });
});
