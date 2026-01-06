import { type Card, CARD_VALUE_WEIGHTS } from "../types/card";

export interface MeldValidation {
  is_valid: boolean;
  is_clean: boolean;
  canastra_type: "none" | "dirty" | "clean" | "real_500" | "thousand";
}

/**
 * @function validate_sequence
 * @description Valida uma sequência de cartas para determinar se é um "jogo" válido no Buraco,
 *              consolidando todas as regras de validação, limpeza e tipo de canastra.
 */

export const validate_sequence = (cards: Card[]): MeldValidation => {
  // 0. Validações prévias de regras fundamentais
  if (cards.length > 14)
    return { is_valid: false, is_clean: false, canastra_type: "none" };

  const cardCounts = new Map<string, number>();
  for (const card of cards) {
    const key = `${card.value}_${card.suit.name}`;
    cardCounts.set(key, (cardCounts.get(key) || 0) + 1);
  }

  for (const [key, count] of cardCounts.entries()) {
    if (count > 2)
      return { is_valid: false, is_clean: false, canastra_type: "none" };
    if (count === 2 && !key.startsWith("A_")) {
      return { is_valid: false, is_clean: false, canastra_type: "none" };
    }
  }

  // 1. Validação de Tamanho Mínimo
  if (cards.length < 3) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // 2. Separar cartas "naturais" (não-coringa) de coringas (todos os 2s)
  const non_twos = cards.filter((c) => c.value !== "2");
  const twos_cards = cards.filter((c) => c.value === "2");

  // REGRA: É preciso ao menos uma carta que não seja '2' para definir o naipe do jogo.
  if (non_twos.length === 0) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // 3. Validação de Naipe e Coringas
  const suit_name = non_twos[0].suit.name;

  // REGRA: Todas as cartas que não são '2' devem ser do mesmo naipe.
  if (!non_twos.every((c) => c.suit.name === suit_name)) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // REGRA: Jogo precisa de pelo menos 2 cartas do mesmo naipe para formar uma base.
  // (Isso inclui o '2' do mesmo naipe).
  const natural_suit_cards = cards.filter(
    (card) => card.suit.name === suit_name
  );
  if (natural_suit_cards.length < 2) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // REGRA: Apenas 1 coringa "real" (2 de outro naipe) é permitido por jogo.
  const real_wildcards = twos_cards.filter((c) => c.suit.name !== suit_name);
  if (real_wildcards.length > 1) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // 4. Testes Matemáticos de Sequência (com tratamento para o Ás)
  const has_ace = non_twos.some((c) => c.value === "A");
  const scenarios = has_ace ? [false, true] : [false];

  for (const ace_high of scenarios) {
    const result = check_sequence_math(
      cards,
      non_twos,
      twos_cards,
      real_wildcards,
      ace_high
    );
    if (result) {
      return result; // Encontrou uma sequência válida
    }
  }

  // 5. Falha Final se nenhum cenário produziu uma sequência válida
  return { is_valid: false, is_clean: false, canastra_type: "none" };
};

/**
 * @function check_sequence_math
 * @description Realiza a validação matemática para um cenário de sequência (Ás alto ou baixo).
 * @returns {MeldValidation | null} - Retorna a validação se for uma sequência válida, ou null caso contrário.
 */
const check_sequence_math = (
  cards: Card[],
  non_twos: Card[],
  twos_cards: Card[],
  real_wildcards: Card[],
  ace_high: boolean
): MeldValidation | null => {
  // Mapeia cartas para pesos numéricos
  let numbers: number[] = [];
  const aces_in_natural_cards = non_twos.filter((c) => c.value === "A");

  if (ace_high && aces_in_natural_cards.length === 2) {
    // Lógica específica para Canastra de 1000 (Ás a Ás)
    const other_natural_cards = non_twos.filter((c) => c.value !== "A");
    numbers = [
      1, // Um Ás como 1
      14, // O outro Ás como 14
      ...other_natural_cards.map((c) => CARD_VALUE_WEIGHTS[c.value]),
    ];
  } else {
    numbers = non_twos.map((c) =>
      c.value === "A" && ace_high ? 14 : CARD_VALUE_WEIGHTS[c.value]
    );
  }
  numbers.sort((a, b) => a - b);

  // Verifica duplicidade de cartas (ex: dois 7 de copas)
  if (new Set(numbers).size !== numbers.length) {
    return null; // Cenário inválido
  }

  // Calcula "buracos" na sequência
  let gaps = 0;
  for (let i = 0; i < numbers.length - 1; i++) {
    gaps += numbers[i + 1] - numbers[i] - 1;
  }

  // Valida se os coringas cobrem os buracos
  if (gaps > twos_cards.length) {
    return null; // Cenário inválido
  }

  // SEQUÊNCIA VÁLIDA ENCONTRADA! Agora, determinar limpeza e tipo de canastra.
  const is_natural_two_gap =
    gaps === 1 && numbers.includes(1) && numbers.includes(3);
  const used_two_as_wildcard = gaps > 0 && !is_natural_two_gap;

  // IMPLEMENTAÇÃO DA REGRA: "Máximo 1 '2' por canastra como curinga"
  let effective_wildcards_used = real_wildcards.length; // Coringas de naipe diferente
  if (used_two_as_wildcard) {
    // Se um 2 do mesmo naipe foi usado para preencher um buraco não-natural, ele conta como curinga
    effective_wildcards_used++;
  }

  if (effective_wildcards_used > 1) {
    console.warn(`[check_math] Regra violada: Mais de um '2' atuando como curinga.`);
    return null; // Cenário inválido, pois excedeu 1 coringa efetivo
  }

  const is_clean = effective_wildcards_used === 0;

  let canastra_type: MeldValidation["canastra_type"] = "none";
  if (cards.length >= 7) {
    if (is_clean) {
      const has_low_ace = numbers.includes(1);
      const has_high_ace = numbers.includes(14);

      if (cards.length === 14 && has_low_ace && has_high_ace) {
        canastra_type = "thousand";
      } else if (cards.length === 13) {
        const is_A_to_K =
          numbers[0] === 1 && numbers[numbers.length - 1] === 13;
        const is_2_to_A =
          numbers[0] === 2 && numbers[numbers.length - 1] === 14;
        if (is_A_to_K || is_2_to_A) {
          canastra_type = "real_500";
        } else {
          canastra_type = "clean";
        }
      } else {
        canastra_type = "clean";
      }
    } else {
      canastra_type = "dirty";
    }
  }

  return { is_valid: true, is_clean, canastra_type };
};

/**
 * @function validate_discard_pickup
 * @description Valida se um jogador pode pegar a carta do topo do lixo.
 *              A regra exige que a carta do lixo + 2 cartas da mão formem um jogo limpo.
 * @param {Card} discard_top_card - A carta no topo do lixo.
 * @param {Card[]} selected_hand_cards - As 2 cartas selecionadas da mão do jogador.
 * @returns {boolean} - True se a compra for válida, false caso contrário.
 */
export const validate_discard_pickup = (
  discard_top_card: Card,
  selected_hand_cards: Card[]
): boolean => {
  // 1. A regra exige pelo menos 2 cartas da mão.
  if (selected_hand_cards.length < 2) {
    console.warn("[PICKUP] A seleção deve conter pelo menos 2 cartas da mão.");
    return false;
  }

  // 2. Monta o jogo potencial com as 3 cartas.
  const potential_meld = [discard_top_card, ...selected_hand_cards];

  // 3. Usa a função de validação de sequência existente.
  const validation_result = validate_sequence(potential_meld);

  // 4. A compra só é válida se o resultado for um jogo válido E LIMPO.
  if (validation_result.is_valid && validation_result.is_clean) {
    return true;
  }

  return false;
};
