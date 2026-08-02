import { expect, test, describe } from "bun:test";
import { validate_discard_add_to_meld, validate_sequence, type MeldValidation } from "./rules_logic";
import { find_card_to_add, find_meld_in_hand } from "./bot_logic";
import { type Card, type CardValue, type Suit, SUITS } from "../types/card";
import { DEFAULT_RULES } from "../types/rules";

const hearts = SUITS.find(s => s.name === "copas")!;
const clubs = SUITS.find(s => s.name === "paus")!;

type SuccessMeld = Extract<MeldValidation, { is_valid: true }>;
type FailMeld = Extract<MeldValidation, { is_valid: false }>;

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
    
    expect(result.is_valid).toBe(false);
    expect((result as FailMeld).error).toBe("Proibido usar curinga da mão para realizar a pegada do lixo.");
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
    
    expect(result.is_valid).toBe(true);
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
    
    expect(result.is_valid).toBe(true);
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
    
    expect(result.is_valid).toBe(true);
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
    
    expect(result.is_valid).toBe(false);
    expect((result as FailMeld).error).toBe("Proibido usar curinga da mão para realizar a pegada do lixo.");
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

  test("VALID: Canastra de 500 (13 cards, no joker)", () => {
    const cards: Card[] = [];
    const values: CardValue[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    values.forEach((v, i) => cards.push(createCard(v, hearts, `h_${i}`)));
    
    const result = validate_sequence(cards);
    expect(result.is_valid).toBe(true);
    expect((result as SuccessMeld).is_clean).toBe(true);
    expect((result as SuccessMeld).canastra_type).toBe("KING");
  });

  test("VALID: Canastra Real (14 cards, no joker)", () => {
    const cards: Card[] = [];
    // A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A
    const values: CardValue[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    values.forEach((v, i) => cards.push(createCard(v, hearts, `h_${i}`)));
    
    const result = validate_sequence(cards);
    expect(result.is_valid).toBe(true);
    expect((result as SuccessMeld).is_clean).toBe(true);
    expect((result as SuccessMeld).canastra_type).toBe("ACE");
  });
});

describe("Bot AI logic for jokers and sequences", () => {
  test("Bot correctly adds 7 to sequence 2,3,4,5 by leveraging existing 2 as joker bridge", () => {
    // Jogo na mesa: 2H (posição natural), 3H, 4H, 5H (limpo)
    const table_meld = [
      createCard("2", hearts, "2h"),
      createCard("3", hearts, "3h"),
      createCard("4", hearts, "4h"),
      createCard("5", hearts, "5h"),
    ];
    // Bot tem um 7H e outras cartas na mão (longe do final da partida)
    const bot_hand = [
      createCard("7", hearts, "7h"),
      createCard("10", clubs, "10c"),
      createCard("9", clubs, "9c"),
      createCard("8", clubs, "8c"),
    ];

    const card_to_add = find_card_to_add(bot_hand, table_meld, false);
    expect(card_to_add).not.toBeNull();
    expect(card_to_add?.value).toBe("7");
  });

  test("Bot lowers duplicate sequence (4,5,6) when team already has a completed Canastra (A to 7)", () => {
    const completed_canastra = [
      createCard("A", hearts, "ah"),
      createCard("2", hearts, "2h_nat"),
      createCard("3", hearts, "3h"),
      createCard("4", hearts, "4h_1"),
      createCard("5", hearts, "5h_1"),
      createCard("6", hearts, "6h_1"),
      createCard("7", hearts, "7h_1"),
    ];
    const bot_hand = [
      createCard("4", hearts, "4h_2"),
      createCard("5", hearts, "5h_2"),
      createCard("6", hearts, "6h_2"),
      createCard("10", clubs, "10c"),
      createCard("9", clubs, "9c"),
    ];

    const meld = find_meld_in_hand(bot_hand, [completed_canastra], false, true, false, false, DEFAULT_RULES, 2);
    expect(meld).not.toBeNull();
    expect(meld?.map((c) => c.value)).toEqual(["4", "5", "6"]);
  });

  test("Bot refuses to open split/nearby sequence (4,5,6) when table sequence (7,8,9) is incomplete, to avoid killing canastra", () => {
    const incomplete_meld = [
      createCard("7", hearts, "7h_1"),
      createCard("8", hearts, "8h_1"),
      createCard("9", hearts, "9h_1"),
    ];
    const bot_hand = [
      createCard("4", hearts, "4h_2"),
      createCard("5", hearts, "5h_2"),
      createCard("6", hearts, "6h_2"),
      createCard("10", clubs, "10c"),
      createCard("9", clubs, "9c"),
    ];

    const meld = find_meld_in_hand(bot_hand, [incomplete_meld], false, false, false, false, DEFAULT_RULES, 2);
    expect(meld).toBeNull();
  });

  test("Bot HOLDS nearby sequence (10,J,Q) when table has A-to-8 during midgame, waiting to bridge them", () => {
    const completed_canastra_to_8 = [
      createCard("A", hearts, "ah"),
      createCard("2", hearts, "2h_nat"),
      createCard("3", hearts, "3h"),
      createCard("4", hearts, "4h_1"),
      createCard("5", hearts, "5h_1"),
      createCard("6", hearts, "6h_1"),
      createCard("7", hearts, "7h_1"),
      createCard("8", hearts, "8h_1"),
    ];
    const bot_hand = [
      createCard("10", hearts, "10h_1"),
      createCard("J", hearts, "jh_1"),
      createCard("Q", hearts, "qh_1"),
      createCard("10", clubs, "10c"),
      createCard("9", clubs, "9c"),
    ];

    const meld = find_meld_in_hand(bot_hand, [completed_canastra_to_8], false, true, false, false, DEFAULT_RULES, 2);
    expect(meld).toBeNull();
  });

  test("Bot LOWERS nearby sequence (10,J,Q) at endgame/desperados to clear hand", () => {
    const completed_canastra_to_8 = [
      createCard("A", hearts, "ah"),
      createCard("2", hearts, "2h_nat"),
      createCard("3", hearts, "3h"),
      createCard("4", hearts, "4h_1"),
      createCard("5", hearts, "5h_1"),
      createCard("6", hearts, "6h_1"),
      createCard("7", hearts, "7h_1"),
      createCard("8", hearts, "8h_1"),
    ];
    const bot_hand = [
      createCard("10", hearts, "10h_1"),
      createCard("J", hearts, "jh_1"),
      createCard("Q", hearts, "qh_1"),
      createCard("10", clubs, "10c"),
      createCard("9", clubs, "9c"),
    ];

    const meld = find_meld_in_hand(bot_hand, [completed_canastra_to_8], false, true, true, false, DEFAULT_RULES, 0);
    expect(meld).not.toBeNull();
    expect(meld?.map((c) => c.value)).toEqual(["10", "J", "Q"]);
  });

  test("Bot HOLDS playable card from table to guarantee a safe discard when discard pile is large (12+) and other discards would give away the lixo", () => {
    // Nosso time tem 8, 9, 10 de Copas na mesa
    const team_meld = [
      createCard("8", hearts, "8h_table"),
      createCard("9", hearts, "9h_table"),
      createCard("10", hearts, "10h_table"),
    ];
    // Adversário tem 6, 7, 8 de Espadas na mesa
    const opponent_meld = [
      createCard("6", clubs, "6s_table"), // Usando clubs/spades como exemplo
      createCard("7", clubs, "7s_table"),
      createCard("8", clubs, "8s_table"),
    ];
    // O bot tem o 7 de Copas (que entraria perfeito na nossa mesa, mas é descarte seguro!),
    // e o 5 e 9 de Espadas/Clubs (que se descartados entregariam de bandeja o lixo para o adversário!)
    const bot_hand = [
      createCard("7", hearts, "7h_safe"),
      createCard("5", clubs, "5c_risky"),
      createCard("9", clubs, "9c_risky"),
    ];

    // Com um lixo grande de 15 cartas, o bot deve RECUSAR gastar o 7 de copas no jogo da mesa para ter garantia de descarte seguro!
    const result_with_large_discard = find_card_to_add(
      bot_hand,
      team_meld,
      false,
      false,
      false, // is_desperate_to_close
      [],
      false,
      DEFAULT_RULES,
      2,
      [opponent_meld],
      15, // discard_pile_size >= 12
    );
    expect(result_with_large_discard).toBeNull(); // Segurou o 7 de copas para ter descarte seguro!

    // Com lixo vazio ou pequeno (ex: 2 cartas), o bot joga o 7 de copas na mesa sem medo
    const result_with_small_discard = find_card_to_add(
      bot_hand,
      team_meld,
      false,
      false,
      false,
      [],
      false,
      DEFAULT_RULES,
      2,
      [opponent_meld],
      2, // discard_pile_size
    );
    expect(result_with_small_discard?.value).toBe("7"); // Adiciona na mesa!
  });
});
