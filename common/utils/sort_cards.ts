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
  // 1. Agrupa as cartas por naipe
  const suits_map: Record<string, Card[]> = {};
  
  cards.forEach(card => {
    const sName = card.suit.name;
    if (!suits_map[sName]) suits_map[sName] = [];
    suits_map[sName]!.push(card);
  });

  // 2. Ordena as cartas dentro de cada grupo de naipe por valor
  Object.values(suits_map).forEach(group => {
    group.sort((a, b) => PRIMARY_CARD_WEIGHTS[a.value] - PRIMARY_CARD_WEIGHTS[b.value]);
  });

  // 3. Separa os grupos de naipes por cor
  const red_suit_groups: Card[][] = [];
  const black_suit_groups: Card[][] = [];

  const sorted_suit_names = Object.keys(suits_map).sort();

  sorted_suit_names.forEach(name => {
    const group = suits_map[name];
    if (group && group.length > 0) {
      if (group[0]!.suit.color === "red") {
        red_suit_groups.push(group);
      } else {
        black_suit_groups.push(group);
      }
    }
  });

  // 4. Intercala os grupos de naipes
  const result: Card[] = [];
  const max_groups = Math.max(red_suit_groups.length, black_suit_groups.length);

  for (let i = 0; i < max_groups; i++) {
    if (i < red_suit_groups.length) {
        result.push(...red_suit_groups[i]!);
    }
    if (i < black_suit_groups.length) {
        result.push(...black_suit_groups[i]!);
    }
  }

  return result;
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