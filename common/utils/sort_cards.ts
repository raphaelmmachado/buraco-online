import { type Card, CARD_VALUE_WEIGHTS } from "../types/card";

/**
 * Ordenação padrão (Agrupa por naipe, depois por valor)
 * Usado para ordenar a MÃO do jogador.
 */
export const sort_cards = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => {
    if (a.suit.name !== b.suit.name) {
      return a.suit.name.localeCompare(b.suit.name);
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
  if (cards.length === 0) return [];
  if (cards.length < 3) return sort_cards(cards);

  const getWeight = (card: Card, aceHigh: boolean): number => {
    if (card.value === "A" && aceHigh) return 14;
    return CARD_VALUE_WEIGHTS[card.value];
  };

  const naturals = cards.filter((c) => c.value !== "2");
  const wildcards = cards.filter((c) => c.value === "2");

  if (naturals.length === 0) return cards;

  let bestArrangement: Card[] = [];
  let bestArrangementScore = -1;

  for (let i = 0; i <= wildcards.length; i++) {
    for (const aceHigh of [false, true]) {
      // Lógica especial para canastra A-A
      const aces = naturals.filter((c) => c.value === "A");
      let tempNaturals = [...naturals];
      let weights: number[];

      if (aceHigh && aces.length === 2) {
        weights = [1, 14];
        const otherNaturals = naturals.filter((c) => c.value !== "A");
        weights.push(...otherNaturals.map((c) => getWeight(c, aceHigh)));
      } else {
        weights = naturals.map((c) => getWeight(c, aceHigh));
      }

      if (new Set(weights).size !== weights.length) continue;
      weights.sort((a, b) => a - b);

      const minNatural = weights[0];
      const maxNatural = weights[weights.length - 1];
      const start = minNatural - i;
      const end = start + cards.length - 1;

      if (start > minNatural || end < maxNatural) continue;

      const currentArrangement: Card[] = [];
      const availableNaturals = [...naturals];
      const availableWildcards = [...wildcards];
      let arrangementScore = 0;

      for (let w = start; w <= end; w++) {
        let added = false;
        for (let j = 0; j < availableNaturals.length; j++) {
          let cardWeight: number;
          // Lógica especial para A-A
          if (
            aceHigh &&
            aces.length === 2 &&
            availableNaturals[j].value === "A"
          ) {
            // Se o peso 'w' for 1 ou 14, e temos um Ás, consideramos um match
            if (w === 1 || w === 14) {
              const weightInSequence = w;
              const alreadyHas = currentArrangement.some(
                (c) => getWeight(c, true) === weightInSequence
              );
              if (!alreadyHas) {
                cardWeight = w;
              } else {
                cardWeight = w === 1 ? 14 : 1; // Pega o outro valor
              }
            } else {
              cardWeight = getWeight(availableNaturals[j], aceHigh);
            }
          } else {
            cardWeight = getWeight(availableNaturals[j], aceHigh);
          }

          if (cardWeight === w) {
            currentArrangement.push(availableNaturals[j]);
            availableNaturals.splice(j, 1);
            added = true;
            break;
          }
        }
        if (!added && availableWildcards.length > 0) {
          const cardToUse = availableWildcards.shift()!;
          currentArrangement.push(cardToUse);
          if (getWeight(cardToUse, aceHigh) === w) {
            arrangementScore++;
          }
        }
      }

      if (currentArrangement.length === cards.length) {
        if (arrangementScore > bestArrangementScore) {
          bestArrangement = currentArrangement;
          bestArrangementScore = arrangementScore;
        } else if (bestArrangement.length === 0) {
          bestArrangement = currentArrangement;
        }
      }
    }
  }
  return bestArrangement.length > 0 ? bestArrangement : sort_cards(cards);
};

/**
 * Organiza visualmente uma sequência para ser exibida na mesa.
 * Lógica: Cartas do naipe ordenadas por valor + Curinga (se for de outro naipe) no final.
 */
export const organize_sequence = (cards: Card[]): Card[] => {
  const non_twos = cards.filter((c) => c.value !== "2");

  // Se só tem 2s (improvável aqui pois já validou), pega o primeiro
  const sequence_suit =
    non_twos.length > 0 ? non_twos[0].suit.name : cards[0].suit.name;

  const naturals: Card[] = [];
  const wildcards: Card[] = [];

  cards.forEach((card) => {
    // É curinga visual se for 2 de OUTRO naipe.
    // O 2 do MESMO naipe fica junto com os naturais para ser ordenado (ex: A, 2, 3).
    if (card.value === "2" && card.suit.name !== sequence_suit) {
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
