import { type Card, CARD_VALUE_WEIGHTS } from "../types/card";

export interface MeldValidation {
  is_valid: boolean;
  is_clean: boolean;
  canastra_type: "none" | "dirty" | "clean" | "real_500" | "thousand";
}

/**
 * @function validate_sequence
 * @description Valida uma sequência de cartas para determinar se é um "jogo" válido no Buraco.
 */
export const validate_sequence = (cards: Card[]): MeldValidation => {
  // 1. Validação de Tamanho Mínimo
  if (cards.length < 3) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  const non_twos = cards.filter((c) => c.value !== "2");

  // 2. Validação de Jogo Apenas com Coringas
  if (non_twos.length === 0) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // O naipe do jogo é definido pela primeira carta que não é coringa.
  const suit_name = non_twos[0].symbol.name;

  // 3. Validação de Naipe Único (exceto coringas)
  const same_suit = non_twos.every((c) => c.symbol.name === suit_name);
  if (!same_suit) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // 4. Testes Matemáticos de Sequência

  // Tentativa 1: Ás vale 1 (A, 2, 3...) -> envia false (não é high)
  const attempt_low = check_math(cards, suit_name, false);
  if (attempt_low.is_valid) {
    return attempt_low;
  }

  // Tentativa 2: Ás vale 14 (Q, K, A) -> envia true (é high)
  // Nota: Isso também cobre a canastra de 1000 (A...A), pois teremos um A(1) e um A(14)
  const attempt_high = check_math(cards, suit_name, true);
  if (attempt_high.is_valid) {
    return attempt_high;
  }

  // 5. Falha Final
  return { is_valid: false, is_clean: false, canastra_type: "none" };
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
  // 1. A regra exige exatamente 2 cartas da mão.
  if (selected_hand_cards.length !== 2) {
    console.error("[PICKUP] A seleção deve conter exatamente 2 cartas da mão.");
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

const check_math = (
  cards: Card[],
  suit_name: string,
  ace_high: boolean
): MeldValidation => {
  // 1. Separar "Números Fixos" de "Curingas Potenciais" (todos os 2s)
  // Removemos TODOS os 2s da lista de números para evitar gaps falsos
  const numbers_cards = cards.filter((c) => c.value !== "2");
  const twos_cards = cards.filter((c) => c.value === "2");

  // Identifica curingas "reais" (de outro naipe)
  const real_wildcards = twos_cards.filter((c) => c.symbol.name !== suit_name);

  // REGRA DE OURO: Para formar um jogo (sequência), são necessárias pelo menos 2 cartas "naturais" (não curingas)
  // para estabelecer a base da sequência.
  if (numbers_cards.length < 2) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // REGRA: Apenas 1 curinga de naipe diferente permitido por jogo
  if (real_wildcards.length > 1) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  if (numbers_cards.length === 0) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // 2. Mapear para números (Pesos)
  // Se ace_high for true, o Ás vira 14. Se tiver outro Ás no jogo (caso de 1000),
  // ele pegará o peso padrão (1), permitindo a sequência 1...14.
  let numbers: number[] = [];
  const aces_in_natural_cards = numbers_cards.filter(c => c.value === "A");

  // Lógica específica para Canastra de 1000 (Ás a Ás)
  if (ace_high && aces_in_natural_cards.length === 2) {
    const other_natural_cards = numbers_cards.filter(c => c.value !== "A");
    numbers = [
      1, // Um Ás como 1
      14, // O outro Ás como 14
      ...other_natural_cards.map(c => CARD_VALUE_WEIGHTS[c.value])
    ];
  } else {
    // Lógica padrão para outros casos de Ás (baixo ou alto)
    numbers = numbers_cards
      .map((c) =>
        c.value === "A" && ace_high ? 14 : CARD_VALUE_WEIGHTS[c.value]
      );
  }
  numbers.sort((a, b) => a - b);

  // Verifica duplicidade de números exatos (ex: dois 7 de copas)
  if (new Set(numbers).size !== numbers.length) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // 3. Calcular "Buracos" (Gaps) na sequência numérica
  let gaps = 0;
  for (let i = 0; i < numbers.length - 1; i++) {
    gaps += numbers[i + 1] - numbers[i] - 1;
  }

  // 4. Validar se temos 2s suficientes para cobrir os buracos
  const total_twos = twos_cards.length;
  const is_valid = gaps <= total_twos;

  // 5. Verificar limpeza (Clean/Dirty)
  // É suja se tiver curinga de outro naipe OU se usou 2 para cobrir buraco (exceto gap natural do 2)
  const natural_gap_filled =
    gaps === 1 && numbers.includes(1) && numbers.includes(3);

  // Se gaps > 0 e NÃO for o buraco natural do 2 (entre A e 3), então é suja
  const used_wildcard_improperly = gaps > 0 && !natural_gap_filled;

  const is_clean = real_wildcards.length === 0 && !used_wildcard_improperly;

  // Definição do Tipo de Canastra
  let canastra_type: MeldValidation["canastra_type"] = "none";

  if (cards.length >= 7) {
    if (is_clean) {
      const has_low_ace = numbers.includes(1);
      const has_high_ace = numbers.includes(14);

      // Canastra de 1000: Limpa, de A a A (14 cartas)
      if (cards.length === 14 && has_low_ace && has_high_ace) {
        canastra_type = "thousand";
      }
      // Canastra de 500: Limpa, de A a K ou de 2 a A (13 cartas)
      else if (cards.length === 13) {
        const is_A_to_K = numbers[0] === 1 && numbers[numbers.length - 1] === 13;
        const is_2_to_A = numbers[0] === 2 && numbers[numbers.length - 1] === 14;
        if (is_A_to_K || is_2_to_A) {
          canastra_type = "real_500";
        } else {
          canastra_type = "clean"; // 13 cartas mas não é canastra real
        }
      }
      // Canastra Limpa Comum
      else {
        canastra_type = "clean";
      }
    } else {
      canastra_type = "dirty";
    }
  }

  return { is_valid, is_clean, canastra_type };
};
