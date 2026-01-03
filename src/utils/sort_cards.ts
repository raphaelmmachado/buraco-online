import { type Card, CARD_VALUE_WEIGHTS } from "../types/card";

/**
 * Ordena um array de cartas por naipe e depois por valor.
 */
export const sort_cards = (cards: Card[]): Card[] => {
  // Criamos uma cópia para manter a imutabilidade exigida pelo React/Zustand
  return [...cards].sort((a, b) => {
    // 1. Primeiro compara por nome do naipe (alfabético: copas, espadas, ouro, paus)
    if (a.symbol.name !== b.symbol.name) {
      return a.symbol.name.localeCompare(b.symbol.name);
    }

    // 2. Se for o mesmo naipe, compara pelo peso do valor importado
    return CARD_VALUE_WEIGHTS[a.value] - CARD_VALUE_WEIGHTS[b.value];
  });
};
