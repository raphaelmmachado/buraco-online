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

    const lastW = getW(last, true);

    if (lastW >= 13) {
      finalSequence.unshift(two);
    } else {
      finalSequence.push(two);
    }
  });

  return finalSequence;
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
