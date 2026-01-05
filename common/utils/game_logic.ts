import { type Card, GAME_RULES, SYMBOLS, VALUES } from "../types/card";

export interface InitialDistribution {
  hands: Record<number, Card[]>;
  dead_piles: Card[][];
  remaining_deck: Card[];
}

const shuffle = (array: Card[]): Card[] => {
  const new_array = [...array];
  for (let i = new_array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    
    // Explicitly check for undefined before swapping
    const card_i = new_array[i];
    const card_j = new_array[j];

    if (card_i !== undefined && card_j !== undefined) {
      new_array[i] = card_j;
      new_array[j] = card_i;
    }
  }
  return new_array;
};

export const create_deck = (): Card[] => {
  console.log(`[GAME] Criando baralho com ${GAME_RULES.DECKS_TO_USE} decks.`);
  const deck: Card[] = [];

  for (let i = 0; i < GAME_RULES.DECKS_TO_USE; i++) {
    for (const symbol of SYMBOLS) {
      for (const value of VALUES) {
        const newCard: Card = {
          id: `${value}_${symbol.name}_${i}`,
          color: ["copas", "ouro"].includes(symbol.name) ? "red" : "black",
          symbol: symbol,
          value: value,
          isJoker: value === "2",
          deckIndex: i,
        };
        deck.push(newCard);
      }
    }
  }

  const shuffled_deck = shuffle(deck);
  console.log(
    `[GAME] Baralho criado e embaralhado com ${shuffled_deck.length} cartas.`
  );
  return shuffled_deck;
};

export const distribute_cards = (
  shuffled_deck: Card[],
  mode: "1v1" | "2v2"
): InitialDistribution => {
  const temp_deck = [...shuffled_deck];
  const hands: Record<number, Card[]> = {};

  const num_players = mode === "1v1" ? 2 : 4;
  console.log(
    `[GAME] Distribuindo cartas para ${num_players} jogadores no modo ${mode}.`
  );

  // 1. Distribui 11 cartas para cada jogador.
  for (let i = 1; i <= num_players; i++) {
    const new_hand = temp_deck.splice(0, GAME_RULES.CARDS_PER_HAND);
    hands[i] = new_hand;
    console.log(`[GAME] Jogador ${i} recebeu ${new_hand.length} cartas.`);
  }

  // 2. Separa os dois montes de "morto", cada um com 11 cartas.
  const dead_pile_1 = temp_deck.splice(0, GAME_RULES.CARDS_IN_DEAD_PILE);
  const dead_pile_2 = temp_deck.splice(0, GAME_RULES.CARDS_IN_DEAD_PILE);
  console.log(`[GAME] Criados 2 mortos com ${dead_pile_1.length} cartas cada.`);

  console.log(`[GAME] Cartas restantes no monte: ${temp_deck.length}.`);

  return {
    hands,
    dead_piles: [dead_pile_1, dead_pile_2],
    remaining_deck: temp_deck,
  };
};
