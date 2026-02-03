import { expect, test, describe } from "bun:test";
import { validate_discard_add_to_meld, validate_sequence, type MeldValidation } from "./rules_logic";
import { type Card, type CardValue, type Suit, SUITS } from "../types/card";

const hearts = SUITS.find(s => s.name === "copas")!;
const clubs = SUITS.find(s => s.name === "paus")!;

type SuccessMeld = Extract<MeldValidation, { is_valid: true }>;

const createCard = (value: CardValue, suit: Suit, id: string): Card => ({
  id,
  value,
  suit,
  color: suit.color,
});

describe("validate_discard_add_to_meld", () => {
  test("ILLEGAL: Using joker from hand to pick up discard for a clean meld", () => {
    // Meld: 10H, JH, QH, KH (Clean)
    const target_meld = [
      createCard("10", hearts, "10h"),
      createCard("J", hearts, "jh"),
      createCard("Q", hearts, "qh"),
      createCard("K", hearts, "kh"),
    ];
    // Hand: 2H (used as Joker for 9H)
    const bridge_cards = [createCard("2", hearts, "2h_joker")];
    // Discard: 8H
    const discard_card = createCard("8", hearts, "8h");

    const result = validate_discard_add_to_meld(target_meld, bridge_cards, discard_card);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Proibido pegar lixo com coringa.");
  });

  test("LEGAL: Adding to an already dirty meld", () => {
    // Meld: 2C (as 9H), 10H, JH, QH, KH (Dirty)
    const target_meld = [
      createCard("2", clubs, "2c_joker"),
      createCard("10", hearts, "10h"),
      createCard("J", hearts, "jh"),
      createCard("Q", hearts, "qh"),
      createCard("K", hearts, "kh"),
    ];
    // Hand: empty bridge
    const bridge_cards: Card[] = [];
    // Discard: 8H
    const discard_card = createCard("8", hearts, "8h");

    const result = validate_discard_add_to_meld(target_meld, bridge_cards, discard_card);
    
    expect(result.valid).toBe(true);
  });

  test("LEGAL: Using a natural 2 from hand to pick up discard", () => {
    // Meld: 4H, 5H, 6H (Clean)
    const target_meld = [
      createCard("4", hearts, "4h"),
      createCard("5", hearts, "5h"),
      createCard("6", hearts, "6h"),
    ];
    // Hand: 2H (Natural)
    const bridge_cards = [createCard("2", hearts, "2h_natural")];
    // Discard: 3H
    const discard_card = createCard("3", hearts, "3h");

    const result = validate_discard_add_to_meld(target_meld, bridge_cards, discard_card);
    
    expect(result.valid).toBe(true);
  });

  test("LEGAL: 'Pushing' a joker that becomes natural (Scenário do usuário)", () => {
    // Original state: 2H (as joker for 3H), 4H, 5H (Dirty)
    // Wait, if it's 2H in Hearts, it COULD be natural. 
    // Let's use 2C as joker for 3H.
    // Meld: 2C (as 3H), 4H, 5H (Dirty)
    const target_meld = [
      createCard("2", clubs, "2c_joker"),
      createCard("4", hearts, "4h"),
      createCard("5", hearts, "5h"),
    ];
    // Hand: 2H (Natural)
    const bridge_cards = [createCard("2", hearts, "2h_natural")];
    // Discard: 3H
    const discard_card = createCard("3", hearts, "3h");

    // Proposed Result: 2H, 3H, 4H, 5H + 2C (as 6H) -> Valid Dirty
    // Since original was dirty, it should be LEGAL.
    const result = validate_discard_add_to_meld(target_meld, bridge_cards, discard_card);
    
    expect(result.valid).toBe(true);
  });

  test("ILLEGAL: Using off-suit 2 from hand to pick up discard for clean meld", () => {
    // Meld: 10H, JH, QH, KH (Clean)
    const target_meld = [
      createCard("10", hearts, "10h"),
      createCard("J", hearts, "jh"),
      createCard("Q", hearts, "qh"),
      createCard("K", hearts, "kh"),
    ];
    // Hand: 2C (Joker)
    const bridge_cards = [createCard("2", clubs, "2c_joker")];
    // Discard: 8H
    const discard_card = createCard("8", hearts, "8h");

    const result = validate_discard_add_to_meld(target_meld, bridge_cards, discard_card);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Proibido pegar lixo com coringa.");
  });
});

describe("General Game Rules", () => {
  test("VALID: Simple clean sequence (3 cards)", () => {
    const cards = [
      createCard("3", hearts, "3h"),
      createCard("4", hearts, "4h"),
      createCard("5", hearts, "5h"),
    ];
    const result = validate_sequence(cards);
    expect(result.is_valid).toBe(true);
    expect((result as SuccessMeld).is_clean).toBe(true);
  });

  test("VALID: Simple dirty sequence (with same-suit joker acting as wildcard)", () => {
    const cards = [
      createCard("4", hearts, "4h"),
      createCard("5", hearts, "5h"),
      createCard("2", hearts, "2h_joker"), // Cannot be natural 2 (gap 2..4), must be 3 or 6
    ];
    const result = validate_sequence(cards);
    expect(result.is_valid).toBe(true);
    expect((result as SuccessMeld).is_clean).toBe(false);
  });

  test("VALID: Simple dirty sequence (with off-suit joker)", () => {
    const cards = [
      createCard("3", hearts, "3h"),
      createCard("4", hearts, "4h"),
      createCard("2", clubs, "2c_joker"), // Used as 5H
    ];
    const result = validate_sequence(cards);
    expect(result.is_valid).toBe(true);
    expect((result as SuccessMeld).is_clean).toBe(false);
  });

  test("INVALID: Too few cards (<3)", () => {
    const cards = [
      createCard("3", hearts, "3h"),
      createCard("4", hearts, "4h"),
    ];
    const result = validate_sequence(cards);
    expect(result.is_valid).toBe(false);
  });

  test("INVALID: Non-consecutive cards", () => {
    const cards = [
      createCard("3", hearts, "3h"),
      createCard("5", hearts, "5h"),
      createCard("6", hearts, "6h"),
    ];
    const result = validate_sequence(cards);
    expect(result.is_valid).toBe(false); // Missing 4
  });

  test("INVALID: Different suits (naturals)", () => {
    const cards = [
      createCard("3", hearts, "3h"),
      createCard("4", clubs, "4c"),
      createCard("5", hearts, "5h"),
    ];
    const result = validate_sequence(cards);
    expect(result.is_valid).toBe(false);
  });

  test("INVALID: Two jokers (both off-suit)", () => {
    const cards = [
      createCard("3", hearts, "3h"),
      createCard("2", clubs, "2c_joker"),
      createCard("2", clubs, "2d_joker"), // Using same suit for simplicity of object creation, ID differs
    ];
    const result = validate_sequence(cards);
    expect(result.is_valid).toBe(false);
  });

  test("VALID: Ace usage (A-2-3)", () => {
    const cards = [
      createCard("A", hearts, "ah"),
      createCard("2", hearts, "2h"), // Natural 2
      createCard("3", hearts, "3h"),
    ];
    const result = validate_sequence(cards);
    expect(result.is_valid).toBe(true);
    expect((result as SuccessMeld).is_clean).toBe(true);
  });

  test("VALID: Ace usage (Q-K-A)", () => {
    const cards = [
      createCard("Q", hearts, "qh"),
      createCard("K", hearts, "kh"),
      createCard("A", hearts, "ah"),
    ];
    const result = validate_sequence(cards);
    expect(result.is_valid).toBe(true);
    expect((result as SuccessMeld).is_clean).toBe(true);
  });
  
  test("VALID: Canastra Limpa (7 cards, no joker)", () => {
    const cards = [
        createCard("3", hearts, "3h"),
        createCard("4", hearts, "4h"),
        createCard("5", hearts, "5h"),
        createCard("6", hearts, "6h"),
        createCard("7", hearts, "7h"),
        createCard("8", hearts, "8h"),
        createCard("9", hearts, "9h"),
    ];
    const result = validate_sequence(cards);
    expect(result.is_valid).toBe(true);
    expect((result as SuccessMeld).is_clean).toBe(true);
    expect((result as SuccessMeld).canastra_type).toBe("CLEAN");
  });

  test("VALID: Canastra Suja (7 cards, with joker)", () => {
    const cards = [
        createCard("3", hearts, "3h"),
        createCard("4", hearts, "4h"),
        createCard("5", hearts, "5h"),
        createCard("6", hearts, "6h"),
        createCard("7", hearts, "7h"),
        createCard("8", hearts, "8h"),
        createCard("2", clubs, "2c"), // Joker
    ];
    const result = validate_sequence(cards);
    expect(result.is_valid).toBe(true);
    expect((result as SuccessMeld).is_clean).toBe(false);
    expect((result as SuccessMeld).canastra_type).toBe("DIRTY");
  });
});
