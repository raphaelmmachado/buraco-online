// =============================================================================
// LÓGICA DE REGRAS - O JUIZ
// Este arquivo é responsável por validar as jogadas de acordo com as
// regras do Buraco Fechado descritas no `RULES.md`.
// =============================================================================

import {
  type Card,
  CARD_VALUE_WEIGHTS,
  GAME_RULES,
  MELD_POINTS,
} from "../types/card";

// -----------------------------------------------------------------------------
// TIPOS DE RETORNO DA VALIDAÇÃO
// -----------------------------------------------------------------------------

/** Detalhes de uma sequência válida. */
export interface ValidSequence {
  is_valid: true;
  is_clean: boolean;
  canastra_type: keyof typeof MELD_POINTS;
  start_weight: number;
  end_weight: number;
  assigned_weights: Record<string, number>; // ID da carta -> Peso assumido
}

/** Detalhes de uma falha na validação. */
export interface InvalidSequence {
  is_valid: false;
  error: string;
}

/** O resultado da análise de uma sequência, pode ser válido ou inválido. */
export type SequenceDetails = ValidSequence | InvalidSequence;

/** O resultado público da validação, simplificado para a UI. */
export type MeldValidation =
  | Pick<ValidSequence, "is_valid" | "is_clean" | "canastra_type">
  | Pick<InvalidSequence, "is_valid" | "error">;

// -----------------------------------------------------------------------------
// HELPER: DETECÇÃO DE CURINGA
// -----------------------------------------------------------------------------

/**
 * Verifica se o uso de uma carta com um determinado peso constitui um uso de curinga.
 * - '2' usado como 2 do mesmo naipe = Natural.
 * - '2' usado como qualquer outra coisa ou outro naipe = Curinga.
 * - Qualquer outra carta = Natural (pois só '2' tem essa dualidade na regra atual).
 */
const is_wildcard_usage = (
  card: Card,
  weight: number,
  target_suit: string
): boolean => {
  if (card.value === "2") {
    // Se for '2', só é natural se o peso for 2 E o naipe bater.
    return !(weight === 2 && card.suit.name === target_suit);
  }
  return false;
};

// -----------------------------------------------------------------------------
// LÓGICA DE VALIDAÇÃO PRINCIPAL (SOLVER)
// -----------------------------------------------------------------------------

/**
 * @function get_sequence_details
 * @description Analisa um conjunto de cartas e retorna os detalhes da melhor sequência possível.
 * Utiliza um solver recursivo para testar combinações de pesos.
 */
export const get_sequence_details = (cards: Card[]): SequenceDetails => {
  // 1. Validações fundamentais e imediatas
  if (cards.length < GAME_RULES.MIN_CARDS_FOR_MELD) {
    return { is_valid: false, error: "Um jogo deve ter no mínimo 3 cartas." };
  }
  if (cards.length > 14) {
    return {
      is_valid: false,
      error: "Um jogo não pode ter mais de 14 cartas.",
    };
  }

  // Verifica duplicatas de ID (sanidade) e contagem por valor/naipe
  const cardCounts = new Map<string, number>();
  cards.forEach((c) => {
    const key = `${c.value}_${c.suit.name}`;
    cardCounts.set(key, (cardCounts.get(key) || 0) + 1);
  });

  for (const [key, count] of cardCounts.entries()) {
    // Regra: Máximo 2 cartas iguais (ex: dois 7 de ouros).
    if (count > 2) {
      return {
        is_valid: false,
        error: `A carta '${key}' não pode aparecer mais de 2 vezes.`,
      };
    }

    // Regra conforme MEMORIAS.md: Proibir dois '2' do mesmo naipe em uma sequência.
    if (count === 2 && key.startsWith("2_")) {
      return {
        is_valid: false,
        error: `Não são permitidos dois '2' do mesmo naipe ('${key}') no mesmo jogo.`,
      };
    }

    // Regra: Outras duplicatas (não A) são impossíveis de formar sequência de pesos únicos.
    if (count === 2 && !key.startsWith("A_")) {
      return {
        is_valid: false,
        error: `Cartas duplicadas inválidas ('${key}') no jogo.`,
      };
    }
  }

  // 2. Determinar o naipe alvo
  // Se houver cartas que não sejam '2', elas definem o naipe.
  const naturals = cards.filter((c) => c.value !== "2");
  if (naturals.length === 0) {
    return {
      is_valid: false,
      error: "O jogo não pode ser formado apenas por coringas (2).",
    };
  }

  const target_suit = naturals[0].suit.name;
  if (!naturals.every((c) => c.suit.name === target_suit)) {
    return {
      is_valid: false,
      error: "As cartas naturais do jogo devem ser do mesmo naipe.",
    };
  }

  // 3. Executar o Solver
  // Prepara as opções de peso para cada carta
  const card_options = cards.map((card) => {
    let weights: number[] = [];

    // Se for '2' de outro naipe, ele SÓ pode ser curinga (qualquer peso exceto, talvez, restrições?)
    // Na prática, curinga pode assumir qualquer peso de 2 a 14?
    // A definição diz: 2 tem weights [2..14].
    // Mas se for naipe diferente, ele DEVE ser curinga.
    // Se for naipe igual, pode ser 2 ou curinga.
    // A lista `CARD_VALUE_WEIGHTS['2']` já tem [2..14].
    // Então só precisamos filtrar pesos inválidos para cartas que NÃO são curingas?
    // Não, a definição `CARD_VALUE_WEIGHTS` é o que a carta PODE ser.

    if (card.value !== "2" && card.suit.name !== target_suit) {
      // Carta de outro naipe que não é 2 -> Inválido imediatamente.
      // (Isso já foi pego na verificação `naturals.every` acima).
      weights = [];
    } else {
      weights = [...CARD_VALUE_WEIGHTS[card.value]];
    }

    return { card, weights };
  });

  const best_solution = solve_recursive(card_options, {}, 0, target_suit);

  if (best_solution) {
    return build_valid_sequence(cards, best_solution, target_suit);
  }

  return {
    is_valid: false,
    error: "As cartas não formam uma sequência válida.",
  };
};

/**
 * @function solve_recursive
 * @description Tenta atribuir um peso para cada carta recursivamente.
 */
const solve_recursive = (
  options: { card: Card; weights: number[] }[],
  assigned: Record<string, number>,
  index: number,
  target_suit: string
): Record<string, number> | null => {
  if (index === options.length) {
    // Todas as cartas atribuídas. Verificar se formam sequência válida.
    if (
      validate_assignment(
        assigned,
        options.map((o) => o.card),
        target_suit
      )
    ) {
      return assigned;
    }
    return null;
  }

  const { card, weights } = options[index];

  // Otimização: Tentar pesos que estendam a sequência atual (se houver).
  // Mas como a ordem de `options` é arbitrária, apenas iteramos.
  // Poderíamos ordenar `weights` para priorizar sequências?
  // O array `weights` já vem ordenado do `card.ts`.

  for (const w of weights) {
    // Poda: Peso já usado?
    if (Object.values(assigned).includes(w)) continue;

    const new_assigned = { ...assigned, [card.id]: w };

    // Verificação rápida de continuidade (opcional, para performance)
    // Se tivermos gaps muito grandes já, pode podar.
    // Mas para N=14 é rápido o suficiente sem heuristicas complexas.

    // Recursão
    const result = solve_recursive(
      options,
      new_assigned,
      index + 1,
      target_suit
    );
    if (result) return result;
  }

  return null;
};

/**
 * @function validate_assignment
 * @description Valida se um conjunto de pesos atribuídos forma uma sequência legal (consecutiva e max 1 curinga).
 */
const validate_assignment = (
  assigned: Record<string, number>,
  cards: Card[],
  target_suit: string
): boolean => {
  const weights = Object.values(assigned).sort((a, b) => a - b);
  const min = weights[0];
  const max = weights[weights.length - 1];

  // 1. Deve ser consecutivo
  if (max - min + 1 !== weights.length) return false;

  // 2. Máximo 1 curinga
  let wildcard_count = 0;
  for (const card of cards) {
    const w = assigned[card.id];
    if (is_wildcard_usage(card, w, target_suit)) {
      wildcard_count++;
    }
  }

  if (wildcard_count > 1) return false;

  // 3. Regra especial: Curinga não pode ser usado se o peso que ele ocupa
  //    poderia ser ocupado por uma carta natural disponível?
  //    Não, a regra é apenas "máximo 1 curinga". Se eu tenho (3, 4) e uso um (2) como 5, ok.
  //    Se eu tenho (3, 4, 5) e uso um (2) como 5?
  //    O solver não permite pesos duplicados. Então se o 5 natural está lá, o 2 não pode ser 5.
  //    O 2 teria que ser 2 ou 6.

  return true;
};

/**
 * @function build_valid_sequence
 * @description Constrói o objeto de retorno final baseado na solução encontrada.
 */
const build_valid_sequence = (
  cards: Card[],
  assigned: Record<string, number>,
  target_suit: string
): ValidSequence => {
  const weights = Object.values(assigned).sort((a, b) => a - b);
  const start_weight = weights[0];
  const end_weight = weights[weights.length - 1];

  let wildcard_count = 0;
  for (const card of cards) {
    const w = assigned[card.id];
    if (is_wildcard_usage(card, w, target_suit)) {
      wildcard_count++;
    }
  }

  const is_clean = wildcard_count === 0;

  let canastra_type: ValidSequence["canastra_type"] = "INSUFFICIENT";

  if (cards.length >= GAME_RULES.MIN_CARDS_FOR_CANASTRA) {
    if (is_clean) {
      if (cards.length === 14) canastra_type = "ACE";
      if (cards.length === 13) canastra_type = "KING";
      if (cards.length <= 12) canastra_type = "CLEAN";
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

// -----------------------------------------------------------------------------
// FUNÇÕES PÚBLICAS EXPORTADAS
// -----------------------------------------------------------------------------

/**
 * @function validate_sequence
 * @description Valida uma sequência de cartas. Wrapper público para `get_sequence_details`.
 */
export const validate_sequence = (cards: Card[]): MeldValidation => {
  const details = get_sequence_details(cards);
  if (!details.is_valid) {
    return { is_valid: false, error: details.error };
  }
  return {
    is_valid: true,
    is_clean: details.is_clean,
    canastra_type: details.canastra_type,
  };
};

/**
 * @function validate_discard_pickup
 * @description Valida se um jogador pode pegar a carta do topo do lixo para formar um novo jogo.
 */
export const validate_discard_pickup = (
  discard_top_card: Card,
  selected_hand_cards: Card[]
): boolean => {
  if (selected_hand_cards.length < 2) {
    return false;
  }

  const potential_meld = [discard_top_card, ...selected_hand_cards];
  const validation_result = validate_sequence(potential_meld);

  return validation_result.is_valid && validation_result.is_clean;
};
