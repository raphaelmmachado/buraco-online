/**
 * =============================================================================
 * LÓGICA DE REGRAS - O JUIZ
 * Este arquivo é responsável por validar todas as jogadas de acordo com as
 * regras do Buraco Fechado (conforme definido em RULES.md).
 * Ele garante que sequências sejam consecutivas, gerencia o uso de curingas
 * e valida a legalidade de pegar o lixo.
 * =============================================================================
 */

import {
  type Card,
  CARD_VALUE_WEIGHTS,
  GAME_RULES,
  MELD_POINTS,
} from "../types/card";

/** Detalhes de uma sequência que foi validada com sucesso. */
export interface ValidSequence {
  is_valid: true;
  is_clean: boolean; // True se não houver curingas (2 usado como curinga)
  canastra_type: keyof typeof MELD_POINTS; // Tipo: CLEAN, DIRTY, KING, ACE, etc.
  start_weight: number; // Peso da menor carta (ex: 3)
  end_weight: number;   // Peso da maior carta (ex: 5)
  assigned_weights: Record<string, number>; // Mapeamento de ID da carta para o peso que ela assumiu no jogo
}

/** Detalhes de uma falha na validação. */
export interface InvalidSequence {
  is_valid: false;
  error: string; // Mensagem amigável explicando por que o jogo é inválido
}

export type SequenceDetails = ValidSequence | InvalidSequence;

/** Resumo simplificado da validação para uso rápido na Interface (UI). */
export type MeldValidation =
  | Pick<ValidSequence, "is_valid" | "is_clean" | "canastra_type">
  | Pick<InvalidSequence, "is_valid" | "error">;

/**
 * Verifica se o uso de uma carta em uma posição específica constitui uso de curinga.
 * No Buraco:
 * - O '2' do mesmo naipe na posição 2 é considerado NATURAL.
 * - O '2' em qualquer outra posição ou de outro naipe é CURINGA.
 */
export const is_wildcard_usage = (
  card: Card,
  weight: number,
  target_suit: string
): boolean => {
  if (card.value === "2") {
    // Só é natural se o peso for 2 (sua posição real) E o naipe bater.
    return !(weight === 2 && card.suit.name === target_suit);
  }
  return false;
};

/**
 * Função principal para analisar um conjunto de cartas e determinar se formam um jogo válido.
 * Utiliza um solver (algoritmo de busca) para testar todas as formas possíveis de encaixar os curingas.
 */
export const get_sequence_details = (cards: Card[]): SequenceDetails => {
  // 1. Validações básicas de quantidade
  if (cards.length < GAME_RULES.MIN_CARDS_FOR_MELD) {
    return { is_valid: false, error: "Um jogo deve ter no mínimo 3 cartas." };
  }
  if (cards.length > GAME_RULES.MAX_LENGTH) {
    return { is_valid: false, error: "Um jogo não pode ter mais de 14 cartas (A a A)." };
  }

  // Verifica duplicatas e sanidade das cartas
  const cardCounts = new Map<string, number>();
  const idSet = new Set<string>();

  for (const c of cards) {
    if (idSet.has(c.id)) return { is_valid: false, error: "Erro: Cartas duplicadas." };
    idSet.add(c.id);

    const key = `${c.value}_${c.suit.name}`;
    cardCounts.set(key, (cardCounts.get(key) || 0) + 1);
  }

  // Valida regras de duplicatas (Buraco usa 2 baralhos, então pode haver dois 7 de ouros, mas não três)
  for (const [key, count] of cardCounts.entries()) {
    if (count > 2) return { is_valid: false, error: `Máximo de 2 cartas iguais (${key}).` };
    
    // O '2' não pode ser duplicado no mesmo jogo se for usado como natural (regra específica de sequência)
    if (count === 2 && !key.startsWith("A_")) {
      return { is_valid: false, error: `Cartas duplicadas inválidas no mesmo jogo.` };
    }
  }

  // 2. Determina o naipe alvo (baseado nas cartas naturais)
  const naturals = cards.filter((c) => c.value !== "2");
  if (naturals.length === 0) return { is_valid: false, error: "O jogo precisa de cartas naturais." };

  const target_suit = naturals[0]?.suit.name;
  if (!target_suit || !naturals.every((c) => c.suit.name === target_suit)) {
    return { is_valid: false, error: "Todas as cartas naturais devem ser do mesmo naipe." };
  }

  // 3. Executa o SOLVER recursivo para encontrar a melhor sequência
  const card_options = cards.map((card) => {
    let weights: number[] = [];
    if (card.value !== "2" && card.suit.name !== target_suit) weights = [];
    else weights = [...CARD_VALUE_WEIGHTS[card.value]]; // Pega pesos possíveis (ex: Ás pode ser 1 ou 14)
    return { card, weights };
  });

  const best_solution = solve_recursive(card_options, {}, 0, target_suit);

  if (best_solution) {
    return build_valid_sequence(cards, best_solution, target_suit);
  }

  return { is_valid: false, error: "As cartas não formam uma sequência consecutiva." };
};

/**
 * Algoritmo recursivo que tenta atribuir um peso (posição na sequência) para cada carta.
 */
const solve_recursive = (
  options: { card: Card; weights: number[] }[],
  assigned: Record<string, number>,
  index: number,
  target_suit: string
): Record<string, number> | null => {
  if (index === options.length) {
    // Se chegamos ao fim, verifica se a atribuição atual é uma sequência válida
    if (validate_assignment(assigned, options.map((o) => o.card), target_suit)) return assigned;
    return null;
  }

  const opt = options[index];
  if (!opt) return null;
  const { card, weights } = opt;

  for (const w of weights) {
    // Se o peso já foi usado por outra carta no jogo, pula (evita sobreposição)
    if (Object.values(assigned).includes(w)) continue;

    const new_assigned = { ...assigned, [card.id]: w };
    const result = solve_recursive(options, new_assigned, index + 1, target_suit);
    if (result) return result;
  }

  return null;
};

/**
 * Valida se um conjunto de pesos atribuídos forma uma sequência legal (consecutiva e com no máximo 1 curinga).
 */
const validate_assignment = (
  assigned: Record<string, number>,
  cards: Card[],
  target_suit: string
): boolean => {
  const weights = Object.values(assigned).sort((a, b) => a - b);
  const min = weights[0];
  const max = weights[weights.length - 1];

  if (min === undefined || max === undefined) return false;

  // Deve ser consecutivo: a diferença entre o maior e o menor deve bater com a quantidade de cartas
  if (max - min + 1 !== weights.length) return false;

  let wildcard_count = 0;
  for (const card of cards) {
    // Cartas naturais fora do naipe invalidam o jogo
    if (card.value !== "2" && card.suit.name !== target_suit) return false;

    const w = assigned[card.id];
    if (w !== undefined && is_wildcard_usage(card, w, target_suit)) {
      wildcard_count++;
    }
  }

  // Regra fundamental: Máximo de 1 curinga por jogo (exceto se o 2 for usado como natural)
  if (wildcard_count > 1) return false;

  return true;
};

/**
 * Constrói o objeto final de sequência válida, calculando pontos e tipo de canastra.
 */
const build_valid_sequence = (
  cards: Card[],
  assigned: Record<string, number>,
  target_suit: string
): ValidSequence => {
  const weights = Object.values(assigned).sort((a, b) => a - b);
  const start_weight = weights[0]!;
  const end_weight = weights[weights.length - 1]!;

  let wildcard_count = 0;
  for (const card of cards) {
    const w = assigned[card.id];
    if (w !== undefined && is_wildcard_usage(card, w, target_suit)) wildcard_count++;
  }

  const is_clean = wildcard_count === 0;
  let canastra_type: ValidSequence["canastra_type"] = "INSUFFICIENT";

  // Se tem 7 ou mais cartas, é canastra
  if (cards.length >= GAME_RULES.MIN_CARDS_FOR_CANASTRA) {
    if (is_clean) {
      if (cards.length === 14) canastra_type = "ACE"; // De Ás a Ás
      else if (cards.length === 13) canastra_type = "KING"; // De Ás a K
      else canastra_type = "CLEAN";
    } else {
      canastra_type = "DIRTY";
    }
  }

  return {
    is_valid: true,
    is_clean,
    canastra_type,
    start_weight,
    end_weight,
    assigned_weights: assigned,
  };
};

/** Valida se uma combinação de cartas é válida (versão simplificada para exportação). */
export const validate_sequence = (cards: Card[]): MeldValidation => {
  const details = get_sequence_details(cards);
  if (!details.is_valid) return { is_valid: false, error: details.error };
  return { is_valid: true, is_clean: details.is_clean, canastra_type: details.canastra_type };
};

/** Valida se o jogador pode pegar o lixo para criar um NOVO jogo. */
export const validate_discard_pickup = (
  discard_top_card: Card,
  selected_hand_cards: Card[]
): boolean => {
  if (selected_hand_cards.length < GAME_RULES.MIN_CARDS_FOR_MELD - 1) return false;
  const potential_meld = [discard_top_card, ...selected_hand_cards];
  const validation_result = validate_sequence(potential_meld);
  // REGRA: Pegar lixo para novo jogo exige que ele seja LIMPO.
  return validation_result.is_valid && validation_result.is_clean;
};

/** Valida se a adição de cartas do lixo a um jogo já existente na mesa é legal. */
export const validate_discard_add_to_meld = (
  target_meld: Card[],
  bridge_cards: Card[],
  discard_card: Card
): { valid: boolean; error?: string } => {
  const proposed_meld = [...target_meld, ...bridge_cards, discard_card];
  const details = get_sequence_details(proposed_meld);

  if (!details.is_valid) return { valid: false, error: details.error };

  // REGRA ESPECIAL: "Proibido pegar lixo com curinga da mão" se o jogo original era limpo.
  const original_details = get_sequence_details(target_meld);
  if (original_details.is_valid && !original_details.is_clean) return { valid: true };

  const naturals = proposed_meld.filter((c) => c.value !== "2");
  const target_suit = naturals[0]?.suit.name;
  if (!target_suit) return { valid: false, error: "Erro interno." };

  for (const card of bridge_cards) {
    const w = details.assigned_weights[card.id];
    if (w !== undefined && is_wildcard_usage(card, w, target_suit)) {
       return { valid: false, error: "Proibido usar curinga da mão para realizar a pegada do lixo." };
    }
  }

  return { valid: true };
};