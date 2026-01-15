import { type Card, SUITS } from "../types/card";
import { validate_sequence, get_sequence_details, type ValidSequence } from "./rules_logic";
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

export interface PotentialMeld {
  cards: Card[];
  validation: ValidSequence;
  // Add other scoring/strategic properties here later
}

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

export const find_meld_in_hand = (
  hand: Card[],
  team_melds: Card[][] = [],
  has_taken_dead_pile: boolean = false,
  has_clean_canastra: boolean = false
): Card[] | null => {
  const all_potential_melds: PotentialMeld[] = [];
  const suits = group_by_suit(hand);
  const wildcards = hand.filter(c => c.value === "2");
  
  // 1. Tenta sequências LIMPAS
  for (const suitName in suits) {
    const cards = sort_cards(suits[suitName]); 
    if (cards.length < 3) continue;

    for (let len = cards.length; len >= 3; len--) {
        for (let i = 0; i <= cards.length - len; i++) {
            const sub = cards.slice(i, i + len);
            const validation = get_sequence_details(sub); // Use get_sequence_details for full info
            if (validation.is_valid) {
                all_potential_melds.push({ cards: sub, validation: validation as ValidSequence });
            }
        }
    }
  }

  // 2. Tenta sequências COM CURINGA (mesmo naipe)
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
                      const validation = get_sequence_details(attempt); // Use get_sequence_details
                      if (validation.is_valid) {
                          all_potential_melds.push({ cards: organize_meld(attempt), validation: validation as ValidSequence });
                      }
                  }
              }
          }
      }
  }

  // Now, evaluate all potential melds and choose the best one
  const bestMeld = evaluate_potential_melds(all_potential_melds, hand, team_melds, has_taken_dead_pile, has_clean_canastra);

  return bestMeld ? bestMeld.cards : null;
};

// Helper to remove cards from hand
const remove_cards_from_hand = (hand: Card[], cardsToRemove: Card[]): Card[] => {
  const handCopy = [...hand];
  for (const cardToRemove of cardsToRemove) {
    const index = handCopy.findIndex(c => c.id === cardToRemove.id);
    if (index !== -1) {
      handCopy.splice(index, 1);
    }
  }
  return handCopy;
};

// Helper to analyze the "connectedness" or "potential sequences" in a hand
const analyze_hand_for_potential_sequences = (hand: Card[]): number => {
    let connectedness_score = 0;
    const suits = group_by_suit(hand);

    for (const suitName in suits) {
        const cards = sort_cards(suits[suitName]);
        if (cards.length < 2) continue;

        let current_sequence_length = 1;
        for (let i = 0; i < cards.length - 1; i++) {
            const current_rank = RANK_MAP[cards[i].value];
            const next_rank = RANK_MAP[cards[i+1].value];

            if (next_rank && current_rank && next_rank === current_rank + 1) {
                current_sequence_length++;
            } else {
                if (current_sequence_length >= 2) {
                    connectedness_score += (current_sequence_length * 10);
                }
                current_sequence_length = 1;
            }
        }
        if (current_sequence_length >= 2) {
            connectedness_score += (current_sequence_length * 10);
        }
    }
    return connectedness_score;
};

const evaluate_potential_melds = (
  potentialMelds: PotentialMeld[],
  currentHand: Card[],
  team_melds: Card[][],
  hasTakenDeadPile: boolean,
  hasCleanCanastra: boolean
): PotentialMeld | null => {
  let bestMeld: PotentialMeld | null = null;
  let highestScore = -Infinity;

  const initialConnectedness = analyze_hand_for_potential_sequences(currentHand);

  for (const meld of potentialMelds) {
    let score = 0;
    const { cards, validation } = meld;

    // 1. Basic Scoring: Length and Canastra Type
    score += cards.length * 10;

    if (validation.canastra_type === 'CLEAN' || validation.canastra_type === 'KING' || validation.canastra_type === 'ACE') {
      score += 500;
      if (validation.is_clean) score += 200;
    } else if (validation.is_clean) {
      score += 50;
    } else {
      score -= 20;
    }

    // 2. Soft Lock Prevention
    const remainingHand = remove_cards_from_hand(currentHand, cards);
    if (hasTakenDeadPile && !hasCleanCanastra && remainingHand.length < 2) {
      score -= 1000;
    }

    // 3. Joker Preservation & Strategy
    const jokersInMeld = cards.filter(c => c.value === "2");
    if (jokersInMeld.length > 0) {
        if (!validation.is_clean) {
            const meldSuit = validation.start_weight > 0 ? cards.find(c => c.value !== "2")?.suit.name : undefined;
            const isCleanable = jokersInMeld.some(joker => meldSuit && joker.suit.name === meldSuit);
            if (isCleanable) score += 35;
        }
        
        const jokersInHandBefore = currentHand.filter(c => c.value === "2").length;
        const jokersInHandAfter = remainingHand.filter(c => c.value === "2").length;
        if (jokersInHandBefore === 1 && jokersInHandAfter === 0) {
            if (! (validation.canastra_type === 'CLEAN' || validation.canastra_type === 'KING' || validation.canastra_type === 'ACE')) score -= 150;
        }
        if (!validation.is_clean && cards.length < 5) score -= 30;
    }

    // 4. "Hand Gap" Logic: Evaluate impact on hand connectedness
    const remainingConnectedness = analyze_hand_for_potential_sequences(remainingHand);
    const connectednessChange = initialConnectedness - remainingConnectedness;
    score -= connectednessChange * 2;

    // 5. NEW "Table Gap" Logic: Penalize creating melds close to existing ones
    const meldSuit = cards.find(c => c.value !== "2")?.suit.name;
    if (meldSuit) {
      for (const existingMeld of team_melds) {
        const existingMeldDetails = get_sequence_details(existingMeld);
        if (!existingMeldDetails.is_valid) continue;

        const existingMeldSuit = existingMeld.find(c => c.value !== "2")?.suit.name;
        if (existingMeldSuit === meldSuit) {
          const gap = Math.min(
            Math.abs(validation.start_weight - existingMeldDetails.end_weight),
            Math.abs(existingMeldDetails.start_weight - validation.end_weight)
          );

          if (gap > 0 && gap <= 3) { // Gap of 1, 2 or 3 cards
            score -= (100 / gap); // Heavy penalty for small gaps
          }
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMeld = meld;
    }
  }

  // ADDED: Minimum score threshold
  // If the best play is still heavily penalized (e.g., for creating a gapped meld),
  // it might be better to do nothing.
  if (highestScore < 40) { // Threshold, can be tuned
      console.log(`[BOT LOGIC] Best meld score (${highestScore.toFixed(1)}) is below threshold. Holding cards.`);
      return null;
  }

  return bestMeld;
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
    has_taken_dead_pile: boolean,
    has_clean_canastra: boolean = false,
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

  if (candidates.length > 0) {
      console.log(`[BOT LOGIC] Checking ${candidates.length} candidates for meld (${meld.length} cards, clean=${is_currently_clean})`);
  }

  for (const card of candidates) {
    const attempt = [...meld, card];
    const validation = validate_sequence(attempt);

    if (validation.is_valid) {
        // SOFT LOCK PROTECTION
        if (has_taken_dead_pile && !has_clean_canastra) {
            const is_now_canastra = validation.is_valid && (validation.canastra_type === 'CLEAN' || validation.canastra_type === 'KING' || validation.canastra_type === 'ACE');
            // Se jogar esta carta me deixar com 1 na mão (que terei que descartar), e não for pra bater com canastra, REJEITA.
            if (!is_now_canastra && hand.length < 2) { // hand.length < 2 significa que já só tem 1 carta (estranho, mas possível se algo falhou)
                 console.log(`[BOT LOGIC] Card ${card.value} rejected: Already at minimum hand size (1).`);
                 continue;
            }
            // Se jogar esta carta me deixar com 1 na mão (hand.length-1 === 1), e não for pra bater com canastra, REJEITA.
            if (!is_now_canastra && hand.length === 2) {
                 console.log(`[BOT LOGIC] Card ${card.value} rejected to avoid soft lock (Hand would become 1).`);
                 continue;
            }
        }

        // LÓGICA DE PROTEÇÃO DE LIMPEZA
        // Se o jogo era limpo, e vai ficar sujo com essa carta...
        if (is_currently_clean && !validation.is_clean) {
            
            // REGRA DE OURO: NUNCA sujar uma Canastra Limpa já feita (7+ cartas)
            // Não importa se precisa de morto ou bater, estragar 200/400 pontos para virar 100 é proibido.
            if (meld.length >= 7) {
                console.log(`[BOT LOGIC] REJECTED ${card.value}: Would dirty a Clean Canastra!`);
                continue;
            }

            // Regra 1: Se ainda não peguei o morto, PODE SUJAR! (Prioridade é pegar o morto)
            if (!has_taken_dead_pile) {
                console.log(`[BOT LOGIC] Dirtying clean meld with ${card.value} because need Dead Pile.`);
                return card;
            }

            // Regra 2: Se estou desesperado para bater o jogo final, PODE SUJAR!
            if (is_desperate_to_close) {
                console.log(`[BOT LOGIC] Dirtying clean meld with ${card.value} to CLOSE GAME.`);
                return card; 
            }

            // Se já peguei o morto e não estou batendo, NÃO SUJA.
            // Protege pontos de canastra limpa.
            console.log(`[BOT LOGIC] REJECTED ${card.value} to protect Clean Canastra (Taken Dead Pile = true).`);
            continue; 
        }

        console.log(`[BOT LOGIC] Adding ${card.value} to meld.`);
        return card;
    }
  }
  return null;
};

// =============================================================================
// 2. INTELIGÊNCIA DE DESCARTE E COMPRA (REGRAS DE SEQUÊNCIA)
// =============================================================================

export type PickupAction = 
  | { type: 'NEW_MELD'; cards: Card[] }
  | { type: 'ADD_TO_MELD'; meld_index: number; cards: Card[] };

export const analyze_discard_pickup = (
  hand: Card[],
  top_discard: Card,
  team_melds: Card[][] = [],
  has_taken_dead_pile: boolean = false,
  has_clean_canastra: boolean = false,
  discard_pile_size: number = 0,
  deck_size: number = 0, 
  all_played_cards: Card[] = [] 
): PickupAction | null => {
  console.log(`[BOT LOGIC] analyze_discard_pickup: Cards played so far: ${all_played_cards.length}`);
  
  // Desperation factor for end game
  const desperation_factor = deck_size < 10 ? (10 - deck_size) * 5 : 0; // Increases as deck size decreases
  
  // 1. TENTA ADICIONAR DIRETO EM UM JOGO EXISTENTE
  for (let i = 0; i < team_melds.length; i++) {
    const meld = team_melds[i];
    const target_suit = meld.find(c => c.value !== "2")?.suit.name;
    
    // Se a carta do lixo não é curinga e nem do naipe do jogo, ignora (otimização)
    if (top_discard.value !== "2" && top_discard.suit.name !== target_suit) continue;

    const attempt = [...meld, top_discard];
    const validation = validate_sequence(attempt);
    
    if (validation.is_valid) {
       // Proteção de Canastra Limpa
       const meld_val = validate_sequence(meld);
       const was_clean = meld_val.is_valid && meld_val.is_clean;
       
       // REGRA DE OURO: NUNCA sujar uma Canastra Limpa já feita (7+ cartas)
       if (was_clean && !validation.is_clean && meld.length >= 7) {
           console.log(`[BOT LOGIC] Pickup Rejected: Would dirty a finished Clean Canastra.`);
           continue;
       }

       if (was_clean && !validation.is_clean && has_taken_dead_pile && desperation_factor === 0) { // Only protect if not desperate
           console.log(`[BOT LOGIC] Pickup Rejected: Would dirty clean meld ${i} with ${top_discard.value}`);
           continue; 
       }

       // Proteção contra Soft Lock
       if (has_taken_dead_pile && !has_clean_canastra) {
           const is_now_canastra = validation.is_valid && (validation.canastra_type === 'CLEAN' || validation.canastra_type === 'KING' || validation.canastra_type === 'ACE');
           const new_hand_size = hand.length + (discard_pile_size - 1); // Ganha o lixo todo, mas perde 1 que vai pro jogo
           if (!is_now_canastra && new_hand_size < 2 && desperation_factor === 0) { // Only protect if not desperate
               console.log(`[BOT LOGIC] Pickup Rejected: Direct add would cause soft lock.`);
               continue;
           }
       }
       
       console.log(`[BOT LOGIC] Pickup Discard: Direct add to meld ${i} (${top_discard.value})`);
       return { type: 'ADD_TO_MELD', meld_index: i, cards: [] }; // Nenhuma carta da mão necessária
    }
  }

  // 2. TENTA "PONTE" (Lixo + 1 da mão -> Jogo Existente)
  for (let i = 0; i < team_melds.length; i++) {
      const meld = team_melds[i];
      const target_suit = meld.find(c => c.value !== "2")?.suit.name;

      // Filtra candidatos da mão que podem ajudar
      const candidates = hand.filter(c => c.suit.name === target_suit || c.value === "2");
      
      for (const card of candidates) {
          const attempt = [...meld, card, top_discard];
          const validation = validate_sequence(attempt);

          if (validation.is_valid) {
              const meld_val = validate_sequence(meld);
              const was_clean = meld_val.is_valid && meld_val.is_clean;

              // REGRA DE OURO: NUNCA sujar uma Canastra Limpa já feita (7+ cartas)
              if (was_clean && !validation.is_clean && meld.length >= 7) {
                  continue;
              }

              if (was_clean && !validation.is_clean && has_taken_dead_pile && desperation_factor === 0) { // Only protect if not desperate
                  continue;
              }

              // Proteção contra Soft Lock
              if (has_taken_dead_pile && !has_clean_canastra) {
                  const is_now_canastra = validation.is_valid && (validation.canastra_type === 'CLEAN' || validation.canastra_type === 'KING' || validation.canastra_type === 'ACE');
                  const new_hand_size = hand.length + (discard_pile_size - 1) - 1; // Ganha lixo, perde 1 da ponte, perde 1 pro meld
                  if (!is_now_canastra && new_hand_size < 2 && desperation_factor === 0) { // Only protect if not desperate
                      continue;
                  }
              }

              console.log(`[BOT LOGIC] Pickup Discard: Bridge add to meld ${i} using ${card.value} + ${top_discard.value}`);
              return { type: 'ADD_TO_MELD', meld_index: i, cards: [card] };
          }
      }
  }

  // 3. TENTA CRIAR NOVO JOGO (NEW MELD)
  const same_suit = hand.filter((c) => c.suit.name === top_discard.suit.name && c.value !== "2");
  
  if (same_suit.length >= 2) {
    for (let i = 0; i < same_suit.length; i++) {
      for (let j = i + 1; j < same_suit.length; j++) {
        const attempt = [top_discard, same_suit[i], same_suit[j]];
        const validation = validate_sequence(attempt);
        
        // Regra: Pegar lixo para novo jogo exige jogo LIMPO (sem curinga)
        // A validação 'is_clean' já garante isso, mas reforçando:
        if (validation.is_valid && validation.is_clean) {
          // Proteção contra Soft Lock
          if (has_taken_dead_pile && !has_clean_canastra) {
              const is_now_canastra = validation.is_valid && (validation.canastra_type === 'CLEAN' || validation.canastra_type === 'KING' || validation.canastra_type === 'ACE');
              const new_hand_size = hand.length + (discard_pile_size - 1) - 2; // Ganha lixo, perde 2 da mão, perde 1 pro meld
              if (!is_now_canastra && new_hand_size < 2 && desperation_factor === 0) { // Only protect if not desperate
                  continue;
              }
          }

          console.log(`[BOT LOGIC] Pickup Discard: Found new clean sequence ${top_discard.value}-${same_suit[i].value}-${same_suit[j].value}`);
          return { type: 'NEW_MELD', cards: [same_suit[i], same_suit[j]] }; 
        }
      }
    }
  }

  return null;
};

const calculate_discard_risk = (card: Card, opponent_melds: Card[][], all_played_cards: Card[] = []): number => {
    let max_risk = 0;
    if (card.value === "2") return 95; // Curinga é sempre arriscado

    const my_val = RANK_MAP[card.value];
    if (!my_val) return 0;

    for (const meld of opponent_melds) {
        const meld_suit = meld.find(c => c.value !== "2")?.suit.name;
        if (meld_suit !== card.suit.name) continue;

        // 1. Risco Imediato (Encaixa perfeitamente)
        const attempt = [...meld, card];
        if (validate_sequence(attempt).is_valid) {
            return 100; // Risco Máximo: Entrega o jogo
        }

        // 2. Risco de Proximidade (Defensiva)
        let min_rank = 15;
        let max_rank = 0;
        
        for (const c of meld) {
            if (c.value === "2") continue;
            const r = RANK_MAP[c.value] || 0;
            if (r < min_rank) min_rank = r;
            if (r > max_rank) max_rank = r;
        }

        if (max_rank === 0) continue;

        const dist_down = my_val - min_rank;
        const dist_up = max_rank - my_val;

        // Distância 1: Perigoso
        if (Math.abs(dist_down) === 1 || Math.abs(dist_up) === 1) {
            max_risk = Math.max(max_risk, 85);
        }
        // Distância 2: Risco de "ponte"
        else if (Math.abs(dist_down) === 2) { // Ex: Descarta 3, oponente tem 5-6...
            const gap_card_rank = min_rank - 1;
            const is_gap_card_played = all_played_cards.some(c => c.suit.name === card.suit.name && RANK_MAP[c.value] === gap_card_rank);
            if (!is_gap_card_played) {
                max_risk = Math.max(max_risk, 50);
            }
        }
        else if (Math.abs(dist_up) === 2) { // Ex: Descarta 8, oponente tem 5-6...
            const gap_card_rank = max_rank + 1;
            const is_gap_card_played = all_played_cards.some(c => c.suit.name === card.suit.name && RANK_MAP[c.value] === gap_card_rank);
            if (!is_gap_card_played) {
                max_risk = Math.max(max_risk, 50);
            }
        }
    }
    return max_risk;
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
    has_taken_dead_pile: boolean = false,
    deck_size: number = 0, 
    all_played_cards: Card[] = [] 
): Card => {
  let best_card: Card | null = null;
  let min_score = Infinity; 
  
  const candidates = hand.length > 1 ? hand.filter(c => c.value !== "2") : hand;
  const pool = candidates.length > 0 ? candidates : hand;

  // Desperation factor for end game
  const desperation_factor = deck_size < 10 ? (10 - deck_size) * 5 : 0; // Increases as deck size decreases

  pool.forEach((card: Card) => {
      const utility = calculate_hand_utility(card, hand, has_taken_dead_pile);
      const risk = calculate_discard_risk(card, opponent_melds, all_played_cards);
      
      let penalty = 0;
      if (discard_pile_top && card.value === discard_pile_top.value && card.suit.name === discard_pile_top.suit.name) {
          penalty = 40; 
      }

      const card_val_points = CARD_POINTS[card.value] || 0;

      // Adjust score with desperation factor
      const score = (utility * 3) + (risk * 25) + penalty - (card_val_points / 20) - (desperation_factor * (card_val_points / 10));

      if (score < min_score) {
          min_score = score;
          best_card = card;
      }
  });
  
  const chosen: Card | null = best_card;
  if (chosen) {
      console.log(`[BOT LOGIC] Discard choice: ${(chosen as any).value}${(chosen as any).suit.icon} (Score: ${min_score.toFixed(1)})`);
  }

  return chosen || pool[0]; 
};