// =============================================================================
// REGRA DO JOGO - FONTE DA VERDADE
// Este arquivo centraliza todas as constantes e tipos fundamentais do jogo
// de Buraco Fechado, baseado no `RULES.md`.
// =============================================================================

// -----------------------------------------------------------------------------
// TIPOS DE DADOS FUNDAMENTAIS
// -----------------------------------------------------------------------------

export type JokerAbility =
  | "VIEW_HAND"
  | "STEAL_CARD"
  | "SKIP_TURN"
  | "SWAP_PARTNER"
  | "FREEZE_PILE"
  | "SHUFFLE_DISCARD"
  | "TAX_COLLECTOR"
  | "GIFT_CARD"
  | "SKIP_NEXT"
  | "REVERSE"
  | "SURGICAL_SWAP";

export type Suit = {
  icon: "♠" | "♣" | "♥" | "♦" | "🃏";
  name: "espadas" | "paus" | "copas" | "ouro" | "joker";
  color: "red" | "black" | "magic";
  emoji?: string;
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
  | "K"
  | "JOKER";

export interface Card {
  id: string;
  value: CardValue;
  suit: Suit;
  color: "red" | "black" | "magic";
  deckIndex?: number;
  ability?: JokerAbility;
}

// -----------------------------------------------------------------------------
// DEFINIÇÕES DAS CARTAS (VALORES, PESOS E PONTOS)
// -----------------------------------------------------------------------------

export const SUITS: Suit[] = [
  { icon: "♠", name: "espadas", color: "black", emoji: "♠️" },
  { icon: "♣", name: "paus", color: "black", emoji: "♣️" },
  { icon: "♥", name: "copas", color: "red", emoji: "♥️" },
  { icon: "♦", name: "ouro", color: "red", emoji: "♦️" },
];

export const JOKER_SUIT: Suit = {
  icon: "🃏",
  name: "joker",
  color: "magic",
  emoji: "🃏",
};

const CARD_DEFINITIONS = [
  { val: "A", weight: [1, 14], points: 15 },
  {
    val: "2",
    weight: [2, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
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
  {
    val: "JOKER",
    weight: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    points: 50,
  },
] as const;

// -----------------------------------------------------------------------------
// CONSTANTES DERIVADAS (Não mexer, são geradas automaticamente)
// -----------------------------------------------------------------------------

// Usado para criar o baralho (Apenas cartas normais para o loop básico)
export const VALUES: CardValue[] = CARD_DEFINITIONS.filter(
  (d) => d.val !== "JOKER",
).map((d) => d.val as CardValue);

// Usado para validação de sequências (Rules) - Agora suporta múltiplos pesos
export const CARD_VALUE_WEIGHTS: Record<CardValue, readonly number[]> =
  CARD_DEFINITIONS.reduce(
    (acc, curr) => ({ ...acc, [curr.val]: curr.weight }),
    {} as Record<CardValue, readonly number[]>,
  );

// Usado para ordenação simples (Sort) - Prioriza o peso natural ou o primeiro peso
export const PRIMARY_CARD_WEIGHTS: Record<CardValue, number> = {
  A: 1,
  "2": 2, // Antes estava pegando o primeiro do array [1, 2, ...], que era 1.
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  JOKER: 99, // Fica no final da mão
};

// Usado para calcular a pontuação (Scoring)
export const CARD_POINTS: Record<CardValue, number> = CARD_DEFINITIONS.reduce(
  (acc, curr) => ({ ...acc, [curr.val]: curr.points }),
  {} as Record<CardValue, number>,
);

/**
 * Converte uma carta ou uma chave de carta (ex: 'K_copas') em uma string amigável (ex: 'K ♥').
 */
export const format_card_name = (cardOrKey: Card | string): string => {
  if (typeof cardOrKey === "string") {
    const [value, suitName] = cardOrKey.split("_");
    const suit = SUITS.find((s) => s.name === suitName);
    return `${value} ${suit?.emoji || suit?.icon || ""}`;
  }
  return `${cardOrKey.value} ${cardOrKey.suit.emoji || cardOrKey.suit.icon}`;
};

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
  CLEAN: 200, // quero que valha 200
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
  MAX_LENGTH: 14,
} as const;
