// =============================================================================
// LÓGICA DE JOGO - CRIAÇÃO E DISTRIBUIÇÃO
// Este arquivo é responsável pela preparação inicial do jogo.
// =============================================================================

import {
  type Card,
  type JokerAbility,
  GAME_RULES,
  SUITS,
  VALUES,
  JOKER_SUIT,
} from "../types/card";
import { type GameRules, DEFAULT_RULES } from "../types/rules";

export interface InitialDistribution {
  hands: Record<number, Card[]>;
  dead_piles: Card[][];
  remaining_deck: Card[];
}

const ALL_JOKER_ABILITIES: JokerAbility[] = [
  "SURGICAL_SWAP",
  "VIEW_HAND",
];

const shuffle = (array: Card[]): Card[] => {
  const new_array = [...array];
  for (let i = new_array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = new_array[i]!;
    new_array[i] = new_array[j]!;
    new_array[j] = temp;
  }
  return new_array;
};

/**
 * Cria o baralho completo para o jogo de Buraco.
 * @returns {Card[]} - Um array com todas as cartas.
 */
export const create_deck = (rules: GameRules = DEFAULT_RULES): Card[] => {
  console.log(`[GAME] Criando baralho com ${GAME_RULES.DECKS_TO_USE} decks.`);
  const deck: Card[] = [];

  for (let i = 0; i < GAME_RULES.DECKS_TO_USE; i++) {
    // Cartas Normais
    for (const suit of SUITS) {
      for (const value of VALUES) {
        const newCard: Card = {
          id: `${value}_${suit.name}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          color: ["copas", "ouro"].includes(suit.name) ? "red" : "black",
          suit: suit,
          value: value,
          deckIndex: i,
        };
        deck.push(newCard);
      }
    }

    // Magic Jokers (2 por deck) - Apenas se ativado nas regras
    if (rules.useMagicJokers) {
      for (let j = 0; j < 2; j++) {
        const randomAbility =
          ALL_JOKER_ABILITIES[
            Math.floor(Math.random() * ALL_JOKER_ABILITIES.length)
          ];
        const jokerCard: Card = {
          id: `JOKER_${i}_${j}_${Math.random().toString(36).substring(2, 6)}`,
          color: "magic",
          suit: JOKER_SUIT,
          value: "JOKER",
          deckIndex: i,
          ability: randomAbility,
        };
        deck.push(jokerCard);
      }
    }
  }

  const shuffled_deck = shuffle(deck);
  console.log(
    `[GAME] Baralho criado e embaralhado com ${shuffled_deck.length} cartas.`,
  );
  return shuffled_deck;
};

export const distribute_cards = (
  shuffled_deck: Card[],
  mode: "1v1" | "2v2",
): InitialDistribution => {
  const temp_deck = [...shuffled_deck];
  const hands: Record<number, Card[]> = {};

  const num_players = mode === "1v1" ? 2 : 4;
  console.log(
    `[GAME] Distribuindo cartas para ${num_players} jogadores no modo ${mode}.`,
  );

  // 1. Distribui as cartas para cada jogador.
  for (let i = 1; i <= num_players; i++) {
    const new_hand = temp_deck.splice(0, GAME_RULES.CARDS_PER_HAND);
    hands[i] = new_hand;
    console.log(`[GAME] Jogador ${i} recebeu ${new_hand.length} cartas.`);
  }

  // 2. Separa os dois montes de "morto".
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
