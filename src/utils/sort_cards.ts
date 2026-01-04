// src/utils/sort_cards.ts
import { type Card, CARD_VALUE_WEIGHTS } from "../types/card";

export const sort_cards = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => {
    if (a.symbol.name !== b.symbol.name) {
      return a.symbol.name.localeCompare(b.symbol.name);
    }
    return CARD_VALUE_WEIGHTS[a.value] - CARD_VALUE_WEIGHTS[b.value];
  });
};

// ESSA É A FUNÇÃO QUE ESTÁ FALTANDO:
export const organize_meld_visual = (cards: Card[]): Card[] => {
  if (cards.length < 3) return sort_cards(cards);

  const sorted = sort_cards(cards);

  // Lógica simplificada visual para o coringa (2)
  const non_twos = sorted.filter((c) => c.value !== "2");
  if (non_twos.length === 0) return sorted;

  const suit = non_twos[0].symbol.name;

  // Tenta achar um coringa (2 de outro naipe ou 2 sobrando)
  const joker =
    sorted.find((c) => c.value === "2" && c.symbol.name !== suit) ||
    sorted.find(
      (c) =>
        c.value === "2" &&
        c.symbol.name === suit &&
        non_twos.find((nc) => nc.value === "2")
    );

  if (!joker) return sorted;

  // Remove o coringa da lista para re-inserir no buraco
  const solid_cards = sorted.filter((c) => c.id !== joker.id);

  // Mapeia pesos (Ás pode ser 14 ou 1)
  // Simplificação: Assume sequencia crescente. Se tiver buraco > 1, enfia o coringa.
  const weights = solid_cards
    .map((c) => ({
      c,
      w: c.value === "A" ? 14 : CARD_VALUE_WEIGHTS[c.value],
    }))
    .sort((a, b) => a.w - b.w);

  // Ajuste fino para Ás baixo (A, 2, 3)
  if (weights.some((x) => x.w <= 3)) {
    weights.forEach((x) => {
      if (x.c.value === "A") x.w = 1;
    });
    weights.sort((a, b) => a.w - b.w);
  }

  let insert_index = -1;
  for (let i = 0; i < weights.length - 1; i++) {
    if (weights[i + 1].w - weights[i].w > 1) {
      insert_index = i + 1;
      break;
    }
  }

  const result = weights.map((w) => w.c);
  if (insert_index !== -1) {
    result.splice(insert_index, 0, joker);
  } else {
    // Sem buraco óbvio? Põe no final (ou início se for A, 2, 3)
    result.push(joker);
  }

  return result;
};
