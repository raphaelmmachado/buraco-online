import { type Card, CARD_VALUE_WEIGHTS } from "../types/card";

// Atualizei os tipos para facilitar a pontuação depois
export interface MeldValidation {
  is_valid: boolean;
  is_clean: boolean;
  canastra_type: "none" | "dirty" | "clean" | "real_500" | "thousand";
}

export const validate_sequence = (cards: Card[]): MeldValidation => {
  if (cards.length < 3)
    return { is_valid: false, is_clean: false, canastra_type: "none" };

  const non_twos = cards.filter((c) => c.value !== "2");
  if (non_twos.length === 0)
    return { is_valid: false, is_clean: false, canastra_type: "none" };

  const suit_name = non_twos[0].symbol.name;
  const same_suit = non_twos.every((c) => c.symbol.name === suit_name);
  if (!same_suit)
    return { is_valid: false, is_clean: false, canastra_type: "none" };

  // 1. Tenta validar Ás Baixo (A=1)
  const attempt_low = check_math(cards, suit_name, "low");
  if (attempt_low.is_valid) return attempt_low;

  // 2. Tenta validar Ás Alto (A=14)
  const attempt_high = check_math(cards, suit_name, "high");
  if (attempt_high.is_valid) return attempt_high;

  // 3. NOVA REGRA: Tenta validar Ás nas Duas Pontas (A=1 E A=14)
  // Só faz sentido tentar se tivermos pelo menos 2 Ás naturais
  const natural_aces = cards.filter(
    (c) => c.value === "A" && c.symbol.name === suit_name
  );
  if (natural_aces.length >= 2) {
    const attempt_both = check_math(cards, suit_name, "both");
    if (attempt_both.is_valid) return attempt_both;
  }

  return { is_valid: false, is_clean: false, canastra_type: "none" };
};

const check_math = (
  cards: Card[],
  suit_name: string,
  ace_mode: "low" | "high" | "both"
): MeldValidation => {
  const natural_two = cards.find(
    (c) => c.value === "2" && c.symbol.name === suit_name
  );

  // Filtra o "2 natural" para não contar duplicado na lógica numérica
  const others = cards.filter((c) => c.id !== natural_two?.id);

  let numbers: number[] = [];

  if (ace_mode === "both") {
    // Lógica Especial: Um Ás vira 1, outro Ás vira 14
    // Removemos 2 Ases da lista 'others' para tratá-los manualmente
    let aces_found = 0;
    const remaining_others: Card[] = [];

    for (const c of others) {
      if (c.value === "A" && aces_found < 2) {
        numbers.push(aces_found === 0 ? 1 : 14);
        aces_found++;
      } else {
        remaining_others.push(c);
      }
    }
    // Adiciona o resto das cartas (convertendo pesos normais)
    numbers.push(...remaining_others.map((c) => CARD_VALUE_WEIGHTS[c.value]));
  } else {
    // Lógica Padrão (Baixo ou Alto)
    numbers = others.map((c) =>
      c.value === "A" && ace_mode === "high" ? 14 : CARD_VALUE_WEIGHTS[c.value]
    );
  }

  numbers.sort((a, b) => a - b);

  // Validação básica de conjunto (sem números repetidos "naturais")
  if (new Set(numbers).size !== numbers.length) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  let gaps = 0;
  for (let i = 0; i < numbers.length - 1; i++) {
    gaps += numbers[i + 1] - numbers[i] - 1;
  }

  // Se o 2 natural existe, ele preenche o buraco entre 1 e 3?
  const fills_natural_gap =
    ace_mode !== "high" &&
    numbers.includes(1) &&
    numbers.includes(3) &&
    natural_two;

  const effective_gaps = fills_natural_gap ? gaps - 1 : gaps;

  const has_wildcard_used =
    effective_gaps > 0 ||
    cards.some((c) => c.value === "2" && c.symbol.name !== suit_name);

  const is_valid = effective_gaps <= 1;
  const is_clean = !has_wildcard_used;

  // --- LÓGICA DE PONTUAÇÃO (TIPO DE CANASTRA) ---
  let canastra_type: MeldValidation["canastra_type"] = "none";

  if (cards.length >= 7) {
    if (is_clean) {
      // Regra 1000 pontos: Limpa e vai de 1 a 14 (A a A)
      // Verifica se temos Ás(1) e Ás(14) no array numbers
      if (
        numbers.includes(1) &&
        numbers.includes(14) &&
        numbers.length === 14
      ) {
        canastra_type = "thousand";
      }
      // Regra 500 pontos: Limpa e vai até o Rei ou Ás Alto (ex: 2..A ou A..K depende da visão)
      // Geralmente A..K (sem o Ás baixo) é a Real de 500.
      else if (
        ace_mode === "high" &&
        numbers.includes(13) &&
        numbers.includes(14)
      ) {
        canastra_type = "real_500";
      } else {
        canastra_type = "clean"; // Canastra Limpa comum (200pts)
      }
    } else {
      canastra_type = "dirty"; // Canastra Suja (100pts)
    }
  }

  return {
    is_valid: is_valid && gaps <= 1,
    is_clean,
    canastra_type,
  };
};
