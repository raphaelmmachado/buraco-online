import { type Card, CARD_VALUE_WEIGHTS } from "../types/card";

/**
 * @interface MeldValidation
 * @description Define a estrutura do retorno da validação de um jogo (meld).
 * @property {boolean} is_valid - Indica se a sequência de cartas é um jogo válido.
 * @property {boolean} is_clean - Se o jogo é limpo (sem coringas) ou não.
 * @property {"none" | "dirty" | "clean" | "real_500" | "thousand"} canastra_type - O tipo de canastra formada (se aplicável).
 */
export interface MeldValidation {
  is_valid: boolean;
  is_clean: boolean;
  canastra_type: "none" | "dirty" | "clean" | "real_500" | "thousand";
}

/**
 * @function validate_sequence
 * @description Valida uma sequência de cartas para determinar se é um "jogo" válido no Buraco.
 *              Esta é a função principal de validação de regras.
 * @param {Card[]} cards - Um array de objetos de carta a serem validados.
 * @returns {MeldValidation} Um objeto indicando se a sequência é válida, se é limpa e o tipo de canastra.
 */
export const validate_sequence = (cards: Card[]): MeldValidation => {
  // 1. Validação de Tamanho Mínimo
  if (cards.length < 3) {
    console.warn(
      "[RULE] Inválido: A sequência deve ter no mínimo 3 cartas.",
      cards
    );
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // Filtra as cartas que não são "2" para checar o naipe e a base do jogo.
  const non_twos = cards.filter((c) => c.value !== "2");

  // 2. Validação de Jogo Apenas com Coringas
  if (non_twos.length === 0) {
    console.warn(
      "[RULE] Inválido: A sequência não pode ser formada apenas por coringas '2'.",
      cards
    );
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // O naipe do jogo é definido pela primeira carta que não é coringa.
  const suit_name = non_twos[0].symbol.name;

  // 3. Validação de Naipe Único (exceto coringas)
  const same_suit = non_twos.every((c) => c.symbol.name === suit_name);
  if (!same_suit) {
    console.warn(
      `[RULE] Inválido: Cartas de naipes misturados. Esperado ${suit_name}.`,
      cards
    );
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // 4. Testes Matemáticos de Sequência
  // O Buraco tem regras complexas para o Ás (A), que pode valer 1 ou 14.
  // Tentamos todas as combinações possíveis.

  // Tentativa 1: Ás vale 1 (A, 2, 3...)
  const attempt_low = check_math(cards, suit_name, "low");
  if (attempt_low.is_valid) {
    console.log("[RULE] Válido como sequência com Ás baixo (A=1).", cards);
    return attempt_low;
  }

  // Tentativa 2: Ás vale 14 (Q, K, A)
  const attempt_high = check_math(cards, suit_name, "high");
  if (attempt_high.is_valid) {
    console.log("[RULE] Válido como sequência com Ás alto (A=14).", cards);
    return attempt_high;
  }

  // Tentativa 3: Canastra de 1000 pontos (A a A, de ponta a ponta)
  // Só é possível se houver pelo menos dois Ases do naipe.
  const natural_aces = cards.filter(
    (c) => c.value === "A" && c.symbol.name === suit_name
  );
  if (natural_aces.length >= 2) {
    const attempt_both = check_math(cards, suit_name, "both");
    if (attempt_both.is_valid) {
      console.log("[RULE] Válido como sequência de Ás a Ás (ponta a ponta).", cards);
      return attempt_both;
    }
  }

  // 5. Falha Final
  // Se nenhuma das tentativas acima funcionou, a sequência é inválida.
  console.warn(
    "[RULE] Inválido: A sequência numérica não é contínua ou possui 'buracos' não preenchidos.",
    cards
  );

  return { is_valid: false, is_clean: false, canastra_type: "none" };
};

/**
 * @function check_math
 * @description Função auxiliar que realiza a verificação matemática de uma sequência de cartas.
 * @param {Card[]} cards - O array de cartas a ser verificado.
 * @param {string} suit_name - O naipe principal do jogo (ex: "clubs").
 * @param {"low" | "high" | "both"} ace_mode - Como o Ás deve ser tratado na verificação ('low' para 1, 'high' para 14, 'both' para ambos).
 * @returns {MeldValidation} O resultado da validação matemática.
 */
const check_math = (
  cards: Card[],
  suit_name: string,
  ace_mode: "low" | "high" | "both"
): MeldValidation => {
  // Encontra se há um '2' do mesmo naipe do jogo (será tratado como carta '2' e não coringa).
  const natural_two = cards.find(
    (c) => c.value === "2" && c.symbol.name === suit_name
  );

  // Remove o '2' natural para a lógica de ordenação numérica.
  const others = cards.filter((c) => c.id !== natural_two?.id);

  let numbers: number[] = [];

  // Converte o valor das cartas para números (pesos) para a validação.
  if (ace_mode === "both") {
    // Lógica para canastra de 1000 (Ás a Ás).
    let aces_found = 0;
    const remaining_others: Card[] = [];
    for (const c of others) {
      if (c.value === "A" && aces_found < 2) {
        numbers.push(aces_found === 0 ? 1 : 14); // Primeiro Ás vira 1, segundo vira 14.
        aces_found++;
      } else {
        remaining_others.push(c);
      }
    }
    numbers.push(...remaining_others.map((c) => CARD_VALUE_WEIGHTS[c.value]));
  } else {
    // Lógica para sequências normais.
    numbers = others.map((c) =>
      c.value === "A" && ace_mode === "high" ? 14 : CARD_VALUE_WEIGHTS[c.value]
    );
  }

  numbers.sort((a, b) => a - b);

  // Se houver números duplicados (ex: dois '5' de ouros), é inválido.
  if (new Set(numbers).size !== numbers.length) {
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // Calcula os "buracos" na sequência. Ex: [3, 5] tem 1 buraco (o '4').
  let gaps = 0;
  for (let i = 0; i < numbers.length - 1; i++) {
    gaps += numbers[i + 1] - numbers[i] - 1;
  }

  // Verifica se o '2' natural do naipe está preenchendo um buraco.
  // Ex: A, 2, 3 de ouros. O '2' é natural, não coringa.
  const fills_natural_gap =
    ace_mode !== "high" &&
    numbers.includes(1) &&
    numbers.includes(3) &&
    natural_two;

  // Se o 2 natural preenche um buraco, ele não conta como coringa.
  const effective_gaps = fills_natural_gap ? gaps - 1 : gaps;

  // Verifica se há alguma carta '2' (de qualquer naipe) para ser usada como coringa.
  const has_any_two_wildcard = cards.some((c) => c.value === "2");

  // Regras Finais de Validação:
  // 1. Não pode haver mais de 1 buraco. (Não se pode usar dois coringas para preencher a mesma sequência)
  if (effective_gaps > 1) {
    console.warn(`[MATH] Inválido: Sequência com ${effective_gaps} buracos.`, numbers);
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }
  // 2. Se houver 1 buraco, é OBRIGATÓRIO ter um coringa '2' disponível.
  if (effective_gaps === 1 && !has_any_two_wildcard) {
    console.warn("[MATH] Inválido: Sequência com buraco, mas sem coringa '2' para preencher.", numbers);
    return { is_valid: false, is_clean: false, canastra_type: "none" };
  }

  // Determina se o jogo é "sujo" (contém coringa).
  const has_wildcard_used =
    effective_gaps > 0 || // Um buraco foi preenchido por um coringa.
    cards.some((c) => c.value === "2" && c.symbol.name !== suit_name); // Um '2' de outro naipe foi usado.

  const is_valid = true; // Se passou por todas as validações, é válido.
  const is_clean = !has_wildcard_used;

  let canastra_type: MeldValidation["canastra_type"] = "none";

  // Se o jogo tem 7 ou mais cartas, é uma canastra.
  if (cards.length >= 7) {
    if (is_clean) {
      if (ace_mode === "both" && numbers.length === 14) {
        canastra_type = "thousand"; // Canastra de 1000 (limpa, de A a A)
      } else if (ace_mode === "high" && numbers.includes(13) && numbers.includes(14)) {
        canastra_type = "real_500"; // Canastra Real (limpa, termina em K, A)
      } else {
        canastra_type = "clean"; // Canastra Limpa
      }
    } else {
      canastra_type = "dirty"; // Canastra Suja
    }
  }

  return {
    is_valid,
    is_clean,
    canastra_type,
  };
};
