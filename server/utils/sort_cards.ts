import { type Card, CARD_VALUE_WEIGHTS } from "../types/card";

/**
 * Ordenação padrão (Agrupa por naipe, depois por valor)
 * Usado para ordenar a MÃO do jogador.
 */
export const sort_cards = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => {
    if (a.symbol.name !== b.symbol.name) {
      return a.symbol.name.localeCompare(b.symbol.name);
    }
    return CARD_VALUE_WEIGHTS[a.value] - CARD_VALUE_WEIGHTS[b.value];
  });
};

/**
 * Ordenação Visual Inteligente para MESA (Melds).
 * - Encaixa o 2 nos buracos.
 * - Trata Ases nas pontas (A...A).
 * - Coloca coringas excedentes nas extremidades.
 */
export const organize_meld_visual = (cards: Card[]): Card[] => {
  if (cards.length < 3) return sort_cards(cards);

  // 1. Separa Curingas (2) de Naturais
  const twos = cards.filter((c) => c.value === "2");
  const naturals = cards.filter((c) => c.value !== "2");

  if (naturals.length === 0) return cards;

  // 2. Mapeia pesos dinâmicos (lida com A e K)
  const mapped = naturals.map((c) => ({
    card: c,
    weight: CARD_VALUE_WEIGHTS[c.value],
  }));

  const aces = mapped.filter((item) => item.card.value === "A");
  const hasKing = mapped.some((item) => item.card.value === "K");
  const hasQueen = mapped.some((item) => item.card.value === "Q");

  // Lógica de Ases
  if (aces.length > 1) {
    // Se tem 2 Ases (A...A), força um no inicio (1) e outro no fim (14)
    let firstFound = false;
    aces.forEach((ace) => {
      if (!firstFound) {
        ace.weight = 1;
        firstFound = true;
      } else {
        ace.weight = 14;
      }
    });
  } else if (aces.length === 1) {
    // Se tem Rei ou Dama, Ás vai pro final. Senão, início.
    if (hasKing || hasQueen) {
      aces[0].weight = 14;
    } else {
      aces[0].weight = 1;
    }
  }

  // 3. Ordena os naturais pelo peso ajustado
  mapped.sort((a, b) => a.weight - b.weight);

  // 4. Preenche buracos com os 2s
  const finalSequence: Card[] = [];
  const availableTwos = [...twos];

  if (mapped.length > 0) {
    finalSequence.push(mapped[0].card);

    for (let i = 0; i < mapped.length - 1; i++) {
      const current = mapped[i];
      const next = mapped[i + 1];
      const gap = next.weight - current.weight;

      // Se gap >= 2 (ex: 3 e 5 -> gap 2), cabe um curinga
      if (gap >= 2 && availableTwos.length > 0) {
        finalSequence.push(availableTwos.shift()!);
      }
      // Se o gap for muito grande, também preenche
      else if (gap > 2 && availableTwos.length > 0) {
        finalSequence.push(availableTwos.shift()!);
      }

      finalSequence.push(next.card);
    }
  }

  // 5. Sobras de 2 vão nas pontas
  availableTwos.forEach((two) => {
    const first = finalSequence[0];
    const last = finalSequence[finalSequence.length - 1];

    // Recalcula peso visual das pontas
    const getW = (c: Card, isLast: boolean) => {
      if (c.value === "A") return isLast ? 14 : 1;
      return CARD_VALUE_WEIGHTS[c.value];
    };

    // Se termina em K(13) ou A(14), só pode por no início (se início não for A-1)
    const lastW = getW(last, true);

    if (lastW >= 13) {
      finalSequence.unshift(two);
    } else {
      finalSequence.push(two);
    }
  });

  return finalSequence;
};
