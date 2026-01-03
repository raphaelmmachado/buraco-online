import { type Card, SYMBOLS, VALUES } from "../types/card";

export interface InitialDistribution {
  player_1_hand: Card[];
  player_2_hand: Card[];
  dead_pile_1: Card[];
  dead_pile_2: Card[];
  remaining_deck: Card[]; // renomeado de draw_pile para manter consistência
}

const shuffle = (array: Card[]): Card[] => {
  const new_array = [...array];
  for (let i = new_array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [new_array[i], new_array[j]] = [new_array[j], new_array[i]];
  }
  return new_array;
};

// Trouxemos para cá para não depender de config/deck.ts
export const create_deck = (): Card[] => {
  const NUMBER_OF_DECKS = 2;
  const deck: Card[] = Array.from({ length: NUMBER_OF_DECKS }).flatMap(
    (_, deckIndex) =>
      SYMBOLS.flatMap((symbol) =>
        VALUES.map((value) => ({
          id: `${value}_${symbol.name}_${deckIndex}`,
          color: ["copas", "ouro"].includes(symbol.name) ? "red" : "black",
          symbol,
          value,
          isJoker: value === "2",
          deckIndex,
        }))
      )
  );
  return shuffle(deck);
};

export const distribute_cards = (
  shuffled_deck: Card[]
): InitialDistribution => {
  const temp_deck = [...shuffled_deck];
  return {
    player_1_hand: temp_deck.splice(0, 11),
    player_2_hand: temp_deck.splice(0, 11),
    dead_pile_1: temp_deck.splice(0, 11),
    dead_pile_2: temp_deck.splice(0, 11),
    remaining_deck: temp_deck,
  };
};
