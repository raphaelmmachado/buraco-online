import { type Card, SYMBOLS, VALUES } from "../types/card";

export interface InitialDistribution {
  hands: Record<number, Card[]>; // Ex: { 1: [...], 2: [...] }
  dead_piles: Card[][];
  remaining_deck: Card[];
}

const shuffle = (array: Card[]): Card[] => {
  const new_array = [...array];
  for (let i = new_array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [new_array[i], new_array[j]] = [new_array[j], new_array[i]];
  }
  return new_array;
};

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
  shuffled_deck: Card[],
  mode: "1v1" | "2v2"
): InitialDistribution => {
  const temp_deck = [...shuffled_deck];
  const hands: Record<number, Card[]> = {};

  const num_players = mode === "1v1" ? 2 : 4;

  // Distribui 11 cartas para cada jogador (seja 2 ou 4)
  for (let i = 1; i <= num_players; i++) {
    hands[i] = temp_deck.splice(0, 11);
  }

  // Dois mortos de 11 cartas
  const dead_pile_1 = temp_deck.splice(0, 11);
  const dead_pile_2 = temp_deck.splice(0, 11);

  return {
    hands,
    dead_piles: [dead_pile_1, dead_pile_2],
    remaining_deck: temp_deck,
  };
};
