import { type Card, CARD_VALUE_WEIGHTS, SUITS } from "../types/card";
import { validate_sequence } from "./rules_logic";
import { sort_cards, organize_meld } from "./sort_cards";

// =============================================================================
// HELPER TYPES & CONSTANTS
// =============================================================================

const RANK_MAP: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "J": 11, "Q": 12, "K": 13, "A": 14 
};

const CARD_POINTS: Record<string, number> = {
  "A": 15, "2": 20, "3": 5, "4": 5, "5": 5, "6": 5, "7": 5,
  "8": 10, "9": 10, "10": 10, "J": 10, "Q": 10, "K": 10
};

// =============================================================================
// 1. ANÁLISE DE OFENSIVA (SEQUÊNCIAS)
// =============================================================================

const group_by_suit = (hand: Card[]) => {
  const suits: Record<string, Card[]> = {};
  SUITS.forEach(s => suits[s.name] = []);
  hand.forEach((c) => {
    if (suits[c.suit.name]) suits[c.suit.name].push(c);
  });
  return suits;
};

/**
 * Procura por sequências (mínimo 3 cartas do mesmo naipe).
 */
export const find_meld_in_hand = (hand: Card[]): Card[] | null => {
  const suits = group_by_suit(hand);
  const wildcards = hand.filter(c => c.value === "2");
  
  // 1. Tenta sequências LIMPAS
  for (const suitName in suits) {
    const cards = sort_cards(suits[suitName]); 
    if (cards.length < 3) continue;

    for (let len = cards.length; len >= 3; len--) {
        for (let i = 0; i <= cards.length - len; i++) {
            const sub = cards.slice(i, i + len);
            if (validate_sequence(sub).is_valid) return sub;
        }
    }
  }

  // 2. Tenta sequências COM CURINGA (mesmo naipe)
  // Só cria suja se não tiver opção limpa.
  if (wildcards.length > 0) {
      for (const wc of wildcards) {
          const hand_without_wc = hand.filter(c => c.id !== wc.id);
          const suits_clean = group_by_suit(hand_without_wc);

          for (const suitName in suits_clean) {
              const cards = sort_cards(suits_clean[suitName]);
              if (cards.length < 2) continue; 

              for (let i = 0; i < cards.length - 1; i++) {
                  for (let j = i + 1; j < cards.length; j++) {
                      const attempt = [cards[i], cards[j], wc];
                      if (validate_sequence(attempt).is_valid) {
                          return organize_meld(attempt);
                      }
                  }
              }
          }
      }
  }

  return null;
};

/**
 * Tenta adicionar carta a um jogo existente.
 * LÓGICA ATUALIZADA:
 * - Se NÃO pegou o morto: Vale tudo. Suja limpa, usa curinga, o importante é descer carta.
 * - Se JÁ pegou o morto: Protege a pureza (Clean), a menos que seja pra bater final.
 */
export const find_card_to_add = (
    hand: Card[], 
    meld: Card[], 
    has_taken_dead_pile: boolean, // Novo parametro crucial
    is_desperate_to_close: boolean = false
): Card | null => {
  const target_suit = meld.find(c => c.value !== "2")?.suit.name;
  if (!target_suit) return null;

  // Verifica o estado atual do meld
  const current_validation = validate_sequence(meld);
  const is_currently_clean = current_validation.is_valid && current_validation.is_clean;

  // Candidatos: Cartas do mesmo naipe ou Curingas (2)
  const candidates = hand.filter(c => c.suit.name === target_suit || c.value === "2");

  // Ordena candidatos: Naturais primeiro, Curingas depois.
  candidates.sort((a, b) => {
      if (a.value === "2" && b.value !== "2") return 1;
      if (a.value !== "2" && b.value === "2") return -1;
      return 0;
  });

  for (const card of candidates) {
    const attempt = [...meld, card];
    const validation = validate_sequence(attempt);

    if (validation.is_valid) {
        // LÓGICA DE PROTEÇÃO DE LIMPEZA
        // Se o jogo era limpo, e vai ficar sujo com essa carta...
        if (is_currently_clean && !validation.is_clean) {
            
            // Regra 1: Se ainda não peguei o morto, PODE SUJAR! (Prioridade é pegar o morto)
            if (!has_taken_dead_pile) {
                return card;
            }

            // Regra 2: Se estou desesperado para bater o jogo final, PODE SUJAR!
            if (is_desperate_to_close) {
                return card; 
            }

            // Se já peguei o morto e não estou batendo, NÃO SUJA.
            // Protege pontos de canastra limpa.
            continue; 
        }

        return card;
    }
  }
  return null;
};

// =============================================================================
// 2. INTELIGÊNCIA DE DESCARTE E COMPRA (REGRAS DE SEQUÊNCIA)
// =============================================================================

export const analyze_discard_pickup = (
  hand: Card[],
  top_discard: Card,
  pile_size: number = 1 
): Card[] | null => {
  const same_suit = hand.filter((c) => c.suit.name === top_discard.suit.name && c.value !== "2");
  
  if (same_suit.length < 2) return null;

  for (let i = 0; i < same_suit.length; i++) {
    for (let j = i + 1; j < same_suit.length; j++) {
      const attempt = [top_discard, same_suit[i], same_suit[j]];
      const validation = validate_sequence(attempt);
      
      if (validation.is_valid && validation.is_clean) {
        return [same_suit[i], same_suit[j]]; 
      }
    }
  }
  return null;
};

const calculate_discard_risk = (card: Card, opponent_melds: Card[][]): number => {
    let risk = 0;
    if (card.value === "2") return 95; 

    for (const meld of opponent_melds) {
        const meld_suit = meld.find(c => c.value !== "2")?.suit.name;
        if (meld_suit !== card.suit.name) continue;

        const attempt = [...meld, card];
        if (validate_sequence(attempt).is_valid) {
            risk = 100; 
            break;
        }
    }
    return risk;
};

const calculate_hand_utility = (card: Card, hand: Card[], has_taken_dead_pile: boolean): number => {
    if (card.value === "2") return 100;

    const my_suit_cards = hand.filter(c => c.suit.name === card.suit.name && c.id !== card.id);
    
    if (my_suit_cards.length === 0) return 0; 

    let score = 0;
    const my_val = RANK_MAP[card.value] || 0;

    for (const other of my_suit_cards) {
        const other_val = RANK_MAP[other.value];
        if (!other_val) continue;

        const diff = Math.abs(my_val - other_val);
        
        if (diff === 1) {
            score += 50; 
        }
        else if (diff === 2) {
            score += 25; 
        }
        else if (diff === 0) {
            score += 15; 
        }
    }

    if (!has_taken_dead_pile && score > 30) {
        score += 10; 
    }

    return Math.min(score, 100);
};

export const choose_discard = (
    hand: Card[], 
    opponent_melds: Card[][] = [],
    discard_pile_top: Card | null = null,
    has_taken_dead_pile: boolean = false
): Card => {
  let best_card: Card | null = null;
  let min_score = Infinity; 
  
  const candidates = hand.length > 1 ? hand.filter(c => c.value !== "2") : hand;
  const pool = candidates.length > 0 ? candidates : hand;

  pool.forEach(card => {
      const utility = calculate_hand_utility(card, hand, has_taken_dead_pile);
      const risk = calculate_discard_risk(card, opponent_melds);
      
      let penalty = 0;
      if (discard_pile_top && card.value === discard_pile_top.value && card.suit.name === discard_pile_top.suit.name) {
          penalty = 40; 
      }

      const card_val_points = CARD_POINTS[card.value] || 0;

      const score = (utility * 3) + (risk * 25) + penalty - (card_val_points / 20);

      if (score < min_score) {
          min_score = score;
          best_card = card;
      }
  });

  return best_card || pool[0]; 
};