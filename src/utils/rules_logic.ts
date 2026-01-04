import { type Card, CARD_VALUE_WEIGHTS } from "../types/card";

// Atualizei os tipos para facilitar a pontuação depois
export interface MeldValidation {
  is_valid: boolean;
  is_clean: boolean;
  canastra_type: "none" | "dirty" | "clean" | "real_500" | "thousand";
}

export const validate_sequence = (cards: Card[]): MeldValidation => {
  // 1. Validação de Tamanho
  if (cards.length < 3) {
    console.warn("Inválido: A sequência deve ter no mínimo 3 cartas.");
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  const non_twos = cards.filter((c) => c.value !== "2");

  // 2. Validação de Apenas Coringas
  if (non_twos.length === 0) {
    console.warn(
      "Inválido: A sequência não pode ser formada apenas por cartas '2' (coringas)."
    );
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  const suit_name = non_twos[0].symbol.name;

  // 3. Validação de Naipe
  const same_suit = non_twos.every((c) => c.symbol.name === suit_name);
  if (!same_suit) {
    console.warn(
      `Inválido: Cartas misturadas. Esperado apenas naipe ${suit_name}, mas encontrou outros.`
    );
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // 4. Testes Matemáticos de Sequência

  // Tenta validar Ás Baixo (A=1)
  const attempt_low = check_math(cards, suit_name, "low");
  if (attempt_low.is_valid) return attempt_low;

  // Tenta validar Ás Alto (A=14)
  const attempt_high = check_math(cards, suit_name, "high");
  if (attempt_high.is_valid) return attempt_high;

  // Tenta validar Ás nas Duas Pontas (A=1 E A=14)
  const natural_aces = cards.filter(
    (c) => c.value === "A" && c.symbol.name === suit_name
  );
  if (natural_aces.length >= 2) {
    const attempt_both = check_math(cards, suit_name, "both");
    if (attempt_both.is_valid) return attempt_both;
  }

  // 5. Falha Final (Se passou pelos filtros básicos mas falhou na matemática)
  console.warn(
    "Inválido: As cartas não formam uma sequência numérica contínua válida (excesso de buracos ou ordem errada)."
  );

  return { is_valid: false, is_clean: false, canastra_type: "none" };
};

// src/utils/rules_logic.ts

const check_math = (
  cards: Card[],
  suit_name: string,
  ace_mode: "low" | "high" | "both"
): MeldValidation => {
  const natural_two = cards.find(
    (c) => c.value === "2" && c.symbol.name === suit_name
  );

  const others = cards.filter((c) => c.id !== natural_two?.id);

  let numbers: number[] = [];

  if (ace_mode === "both") {
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
    numbers.push(...remaining_others.map((c) => CARD_VALUE_WEIGHTS[c.value]));
  } else {
    numbers = others.map((c) =>
      c.value === "A" && ace_mode === "high" ? 14 : CARD_VALUE_WEIGHTS[c.value]
    );
  }

  numbers.sort((a, b) => a - b);

  if (new Set(numbers).size !== numbers.length) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  let gaps = 0;
  for (let i = 0; i < numbers.length - 1; i++) {
    gaps += numbers[i + 1] - numbers[i] - 1;
  }

  const fills_natural_gap =
    ace_mode !== "high" &&
    numbers.includes(1) &&
    numbers.includes(3) &&
    natural_two;

  // Se o 2 natural preenche o buraco (ex: A, 2, 3), descontamos esse buraco da conta
  const effective_gaps = fills_natural_gap ? gaps - 1 : gaps;

  // CORREÇÃO CRÍTICA AQUI:
  // Verificamos se existe ALGUM "2" (seja natural ou de outro naipe) disponível para atuar como coringa
  const has_any_two = cards.some((c) => c.value === "2");

  // Regra Final:
  // 1. Não pode ter mais de 1 buraco efetivo.
  // 2. Se tiver 1 buraco efetivo, OBRIGATORIAMENTE tem que ter um "2" para preenchê-lo.
  if (effective_gaps > 1) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }
  if (effective_gaps === 1 && !has_any_two) {
    // O bug estava aqui: permitia buraco mesmo sem coringa
    console.warn(
      "Sequência tem um buraco e não há coringa (2) para preenchê-lo."
    );
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  const has_wildcard_used =
    effective_gaps > 0 ||
    cards.some((c) => c.value === "2" && c.symbol.name !== suit_name);

  const is_valid = true; // Se passou pelos ifs acima, é válido
  const is_clean = !has_wildcard_used;

  let canastra_type: MeldValidation["canastra_type"] = "none";

  if (cards.length >= 7) {
    if (is_clean) {
      if (
        numbers.includes(1) &&
        numbers.includes(14) &&
        numbers.length === 14
      ) {
        canastra_type = "thousand";
      } else if (
        ace_mode === "high" &&
        numbers.includes(13) &&
        numbers.includes(14)
      ) {
        canastra_type = "real_500";
      } else {
        canastra_type = "clean";
      }
    } else {
      canastra_type = "dirty";
    }
  }

  return {
    is_valid,
    is_clean,
    canastra_type,
  };
};
