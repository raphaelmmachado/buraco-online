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
export const sort_cards = (cards: Card[], randomize_suits: boolean = false): Card[] => {
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

  // 3. Se for aleatório, embaralha a ordem dos naipes e retorna
  if (randomize_suits) {
      const all_groups = Object.values(suits_map);
      // Fisher-Yates shuffle simples para os grupos
      for (let i = all_groups.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [all_groups[i], all_groups[j]] = [all_groups[j]!, all_groups[i]!];
      }
      return all_groups.flat();
  }

  // 4. Lógica Padrão: Intercala Vermelho/Preto (Determinístico)
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
    return sort_cards(cards);
  }

  const { start_weight, end_weight, assigned_weights } = details;
  const sequence_length = end_weight - start_weight + 1;
  
  if (sequence_length <= 0 || sequence_length > 14) {
    return sort_cards(cards);
  }

  // Criamos um array fixo para o tamanho da sequência
  const final_meld: (Card | null)[] = new Array(sequence_length).fill(null);
  
  // Usamos um Set para garantir que não processamos o mesmo ID de carta duas vezes
  // (caso o array de entrada tenha duplicatas acidentais)
  const processed_ids = new Set<string>();

  // Posiciona as cartas diretamente baseadas no peso atribuído pelo solver
  cards.forEach(card => {
    if (processed_ids.has(card.id)) return;
    
    const weight = assigned_weights[card.id];
    if (weight === undefined) return;

    const position = weight - start_weight;
    if (position >= 0 && position < sequence_length) {
      final_meld[position] = card;
      processed_ids.add(card.id);
    }
  });

  // Se houver "buracos" (null), o filter(Boolean) vai colapsar a sequência.
  // Em um jogo válido isso NÃO deve acontecer, mas se acontecer, mantemos
  // a integridade do array resultante.
  return final_meld.filter((c): c is Card => c !== null);
};