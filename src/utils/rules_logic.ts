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
  const numbers = numbers_cards
    .map((c) =>
      c.value === "A" && ace_high ? 14 : CARD_VALUE_WEIGHTS[c.value]
    )
    .sort((a, b) => a - b);

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
      // Se for limpa e for de A a A (1 e 14 presentes), é a de 1000
      const has_low_ace = numbers.includes(1);
      const has_high_ace = numbers.includes(14);

      if (has_low_ace && has_high_ace) {
        canastra_type = "thousand";
      } else {
        canastra_type = "clean"; // ou "real_500" dependendo da sua preferência
      }
    } else {
      canastra_type = "dirty";
    }
  }

  return { is_valid, is_clean, canastra_type };
};

/**
 * Organiza visualmente uma sequência para ser exibida na mesa.
 * Lógica: Cartas do naipe ordenadas por valor + Curinga (se for de outro naipe) no final.
 */
export const organize_sequence = (cards: Card[]): Card[] => {
  const non_twos = cards.filter((c) => c.value !== "2");

  // Se só tem 2s (improvável aqui pois já validou), pega o primeiro
  const sequence_suit =
    non_twos.length > 0 ? non_twos[0].symbol.name : cards[0].symbol.name;

  const naturals: Card[] = [];
  const wildcards: Card[] = [];

  cards.forEach((card) => {
    // É curinga visual se for 2 de OUTRO naipe.
    // O 2 do MESMO naipe fica junto com os naturais para ser ordenado (ex: A, 2, 3).
    if (card.value === "2" && card.symbol.name !== sequence_suit) {
      wildcards.push(card);
    } else {
      naturals.push(card);
    }
  });

  // Ordena as naturais pelo peso
  naturals.sort(
    (a, b) => CARD_VALUE_WEIGHTS[a.value] - CARD_VALUE_WEIGHTS[b.value]
  );

  return [...naturals, ...wildcards];
};
