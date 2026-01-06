export type Suit = {
  icon: "♠" | "♣" | "♥" | "♦";
  name: "espadas" | "paus" | "copas" | "ouro";
};
export type CardValue =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface Card {
  id: string;
  value: CardValue;
  suit: Suit;
  color: "red" | "black";
  deckIndex?: number;
}

export const SUITS: Suit[] = [
  { icon: "♠", name: "espadas" },
  { icon: "♣", name: "paus" },
  { icon: "♥", name: "copas" },
  { icon: "♦", name: "ouro" },
];

// --- FONTE DA VERDADE (Valor, Peso de Ordenação e Pontos) ---
const CARD_DEFINITIONS = [
  { val: "A", weight: 1, points: 15 },
  { val: "2", weight: 2, points: 20 },
  { val: "3", weight: 3, points: 5 },
  { val: "4", weight: 4, points: 5 },
  { val: "5", weight: 5, points: 5 },
  { val: "6", weight: 6, points: 5 },
  { val: "7", weight: 7, points: 5 },
  { val: "8", weight: 8, points: 10 },
  { val: "9", weight: 9, points: 10 },
  { val: "10", weight: 10, points: 10 },
  { val: "J", weight: 11, points: 10 },
  { val: "Q", weight: 12, points: 10 },
  { val: "K", weight: 13, points: 10 },
] as const;

// Derivação automática dos tipos e constantes

export const VALUES: CardValue[] = CARD_DEFINITIONS.map(
  (d) => d.val as CardValue
);

// Usado para ordenação (Sort) e lógica de sequência (Rules)
export const CARD_VALUE_WEIGHTS: Record<CardValue, number> =
  CARD_DEFINITIONS.reduce(
    (acc, curr) => ({ ...acc, [curr.val]: curr.weight }),
    {} as Record<CardValue, number>
  );

// NOVA EXPORTAÇÃO: Usado para calcular Score
export const CARD_POINTS: Record<CardValue, number> = CARD_DEFINITIONS.reduce(
  (acc, curr) => ({ ...acc, [curr.val]: curr.points }),
  {} as Record<CardValue, number>
);

// Pontos de Bônus por evento/canastra
export const BONUS_POINTS = {
  BATIDA: 100,
  CANASTRA_SUJA: 100,
  CANASTRA_LIMPA: 400, // Ajustado de 200 para 400
  CANASTRA_REAL_500: 500,
  CANASTRA_REAL_1000: 1000,
} as const;

// Regras Fundamentais do Jogo
export const GAME_RULES = {
  DECKS_TO_USE: 2,
  CARDS_PER_HAND: 11,
  CARDS_IN_DEAD_PILE: 11,
} as const;
