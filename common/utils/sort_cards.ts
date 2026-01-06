// =============================================================================
// LÓGICA DE ORDENAÇÃO DE CARTAS
// Este arquivo contém funções para ordenar a mão do jogador e, mais importante,
// para organizar visualmente os jogos na mesa.
// =============================================================================

import { type Card, PRIMARY_CARD_WEIGHTS } from "../types/card";
import { get_sequence_details } from "./rules_logic";

/**
 * @function sort_cards
 * @description Ordenação padrão para a mão do jogador: agrupa por naipe e depois por valor.
 */
export const sort_cards = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => {
    if (a.suit.name !== b.suit.name) {
      return a.suit.name.localeCompare(b.suit.name);
    }
    // Usa o peso primário (índice 0) para ordenação simples
    return PRIMARY_CARD_WEIGHTS[a.value] - PRIMARY_CARD_WEIGHTS[b.value];
  });
};

/**
 * @function organize_meld
 * @description Função principal e definitiva para organizar um jogo (meld) para exibição na mesa.
 *              Ela determina a sequência correta e posiciona os coringas nos "buracos".
 */
export const organize_meld = (cards: Card[]): Card[] => {
  if (cards.length < 3) return sort_cards(cards);

  const details = get_sequence_details(cards);

  if (!details.is_valid) {
    console.error("[organize_meld] Tentativa de organizar um meld inválido:", details.error);
    return sort_cards(cards);
  }

  const { start_weight, end_weight, assigned_weights } = details;
  const sequence_length = end_weight - start_weight + 1;
  
  if (sequence_length <= 0 || sequence_length > 14) {
    console.error("[organize_meld] Comprimento de sequência inválido:", sequence_length);
    return sort_cards(cards);
  }

  const final_meld: (Card | null)[] = new Array(sequence_length).fill(null);
  
  // Posiciona as cartas diretamente baseadas no peso atribuído pelo solver
  cards.forEach(card => {
    const weight = assigned_weights[card.id];
    // Se por acaso o peso não estiver no map (impossível se validado), ignora
    if (weight === undefined) return;

    const position = weight - start_weight;
    if (position >= 0 && position < sequence_length) {
      final_meld[position] = card;
    }
  });

  return final_meld.filter(Boolean) as Card[];
};