import { type Card, SYMBOLS, VALUES } from "../types/card";

/**
 * @interface InitialDistribution
 * @description Define a estrutura da distribuição inicial de cartas no começo do jogo.
 * @property {Record<number, Card[]>} hands - Mãos de cada jogador. Ex: { 1: [...], 2: [...] }
 * @property {Card[][]} dead_piles - Os dois montes de "morto".
 * @property {Card[]} remaining_deck - O baralho principal que sobrou após a distribuição.
 */
export interface InitialDistribution {
  hands: Record<number, Card[]>;
  dead_piles: Card[][];
  remaining_deck: Card[];
}

/**
 * @function shuffle
 * @description Embaralha um array de cartas usando o algoritmo Fisher-Yates.
 * @param {Card[]} array - O array de cartas a ser embaralhado.
 * @returns {Card[]} Um novo array com as cartas embaralhadas.
 */
const shuffle = (array: Card[]): Card[] => {
  const new_array = [...array];
  for (let i = new_array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [new_array[i], new_array[j]] = [new_array[j], new_array[i]];
  }
  return new_array;
};

/**
 * @function create_deck
 * @description Cria e embaralha o baralho para o jogo de Buraco.
 *              Por padrão, utiliza 2 baralhos completos (104 cartas).
 * @returns {Card[]} Um array de cartas que representa o baralho completo e embaralhado.
 */
export const create_deck = (): Card[] => {
  const NUMBER_OF_DECKS = 2; // O Buraco é jogado com 2 baralhos.
  console.log(`[GAME] Criando baralho com ${NUMBER_OF_DECKS} decks.`);

  const deck: Card[] = Array.from({ length: NUMBER_OF_DECKS }).flatMap(
    (_, deckIndex) =>
      SYMBOLS.flatMap((symbol) =>
        VALUES.map((value) => ({
          id: `${value}_${symbol.name}_${deckIndex}`, // ID único para cada carta.
          color: ["copas", "ouro"].includes(symbol.name) ? "red" : "black",
          symbol,
          value,
          isJoker: value === "2", // A carta '2' é o coringa.
          deckIndex,
        }))
      )
  );

  const shuffled_deck = shuffle(deck);
  console.log(`[GAME] Baralho criado e embaralhado com ${shuffled_deck.length} cartas.`);
  return shuffled_deck;
};

/**
 * @function distribute_cards
 * @description Distribui as cartas para os jogadores e separa os mortos.
 * @param {Card[]} shuffled_deck - O baralho completo, já embaralhado.
 * @param {"1v1" | "2v2"} mode - O modo de jogo, para determinar quantos jogadores receberão cartas.
 * @returns {InitialDistribution} Um objeto contendo as mãos dos jogadores, os mortos e o resto do baralho.
 */
export const distribute_cards = (
  shuffled_deck: Card[],
  mode: "1v1" | "2v2"
): InitialDistribution => {
  const temp_deck = [...shuffled_deck];
  const hands: Record<number, Card[]> = {};

  const num_players = mode === "1v1" ? 2 : 4;
  console.log(`[GAME] Distribuindo cartas para ${num_players} jogadores no modo ${mode}.`);

  // 1. Distribui 11 cartas para cada jogador.
  for (let i = 1; i <= num_players; i++) {
    hands[i] = temp_deck.splice(0, 11);
    console.log(`[GAME] Jogador ${i} recebeu ${hands[i].length} cartas.`);
  }

  // 2. Separa os dois montes de "morto", cada um com 11 cartas.
  const dead_pile_1 = temp_deck.splice(0, 11);
  const dead_pile_2 = temp_deck.splice(0, 11);
  console.log(`[GAME] Criados 2 mortos com ${dead_pile_1.length} cartas cada.`);

  console.log(`[GAME] Cartas restantes no monte: ${temp_deck.length}.`);

  return {
    hands,
    dead_piles: [dead_pile_1, dead_pile_2],
    remaining_deck: temp_deck,
  };
};
