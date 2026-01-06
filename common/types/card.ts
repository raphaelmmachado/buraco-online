// =============================================================================
// REGRA DO JOGO - FONTE DA VERDADE
// Este arquivo centraliza todas as constantes e tipos fundamentais do jogo
// de Buraco Fechado, baseado no `RULES.md`.
// =============================================================================

// -----------------------------------------------------------------------------
// TIPOS DE DADOS FUNDAMENTAIS
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// DEFINIÇÕES DAS CARTAS (VALORES, PESOS E PONTOS)
// -----------------------------------------------------------------------------

export const SUITS: Suit[] = [
  { icon: "♠", name: "espadas" },
  { icon: "♣", name: "paus" },
  { icon: "♥", name: "copas" },
  { icon: "♦", name: "ouro" },
];

const CARD_DEFINITIONS = [
  { val: "A", weight: [1, 14], points: 15 },
  {
    val: "2",
    weight: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    points: 20,
  }, // Curinga
  { val: "3", weight: [3], points: 5 },
  { val: "4", weight: [4], points: 5 },
  { val: "5", weight: [5], points: 5 },
  { val: "6", weight: [6], points: 5 },
  { val: "7", weight: [7], points: 5 },
  { val: "8", weight: [8], points: 10 },
  { val: "9", weight: [9], points: 10 },
  { val: "10", weight: [10], points: 10 },
  { val: "J", weight: [11], points: 10 },
  { val: "Q", weight: [12], points: 10 },
  { val: "K", weight: [13], points: 10 },
] as const;

// -----------------------------------------------------------------------------
// CONSTANTES DERIVADAS (Não mexer, são geradas automaticamente)
// -----------------------------------------------------------------------------

// Usado para criar o baralho
export const VALUES: CardValue[] = CARD_DEFINITIONS.map(
  (d) => d.val as CardValue
);

// Usado para validação de sequências (Rules) - Agora suporta múltiplos pesos
export const CARD_VALUE_WEIGHTS: Record<CardValue, readonly number[]> =
  CARD_DEFINITIONS.reduce(
    (acc, curr) => ({ ...acc, [curr.val]: curr.weight }),
    {} as Record<CardValue, readonly number[]>
  );

// Usado para ordenação simples (Sort) - Prioriza o primeiro peso (índice 0)
export const PRIMARY_CARD_WEIGHTS: Record<CardValue, number> =
  CARD_DEFINITIONS.reduce(
    (acc, curr) => ({ ...acc, [curr.val]: curr.weight[0] }),
    {} as Record<CardValue, number>
  );

// Usado para calcular a pontuação (Scoring)
export const CARD_POINTS: Record<CardValue, number> = CARD_DEFINITIONS.reduce(
  (acc, curr) => ({ ...acc, [curr.val]: curr.points }),
  {} as Record<CardValue, number>
);

// -----------------------------------------------------------------------------
// PONTOS DE BÔNUS E PENALIDADES
// -----------------------------------------------------------------------------

export const BONUS_POINTS = {
  BEAT: 100,
  TAKE_DEAD_PILE: 0, // Bônus por pegar o morto é apenas não ser penalizado
  DID_NOT_TAKE_DEAD_PILE: -100,
} as const;

export const MELD_POINTS = {
  INSUFFICIENT: 0,
  DIRTY: 100,
  CLEAN: 200,
  KING: 500,
  ACE: 1000,
} as const;

// -----------------------------------------------------------------------------
// REGRAS GERAIS DO JOGO
// -----------------------------------------------------------------------------

export const GAME_RULES = {
  DECKS_TO_USE: 2,
  CARDS_PER_HAND: 11,
  CARDS_IN_DEAD_PILE: 11,
  MIN_CARDS_FOR_MELD: 3,
  MIN_CARDS_FOR_CANASTRA: 7,
} as const;
