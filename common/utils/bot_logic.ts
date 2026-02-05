import { type Card, SUITS } from "../types/card";
import { validate_sequence, get_sequence_details, type ValidSequence, validate_discard_add_to_meld, validate_discard_pickup } from "./rules_logic";
import { sort_cards, organize_meld } from "./sort_cards";
import { type GameRules, DEFAULT_RULES } from "../types/rules";

/**
 * =============================================================================
 * LÓGICA DE INTELIGÊNCIA ARTIFICIAL (BOTS)
 * Este arquivo contém as regras de decisão, avaliação de risco e estratégias
 * que os bots utilizam para jogar.
 * =============================================================================
 */

// Mapeamento de valores das cartas para pesos numéricos para facilitar cálculos de sequência
const RANK_MAP: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "J": 11, "Q": 12, "K": 13, "A": 14 
};

// Pontuação individual de cada carta para cálculos de "peso" na mão
const CARD_POINTS: Record<string, number> = {
  "A": 15, "2": 20, "3": 5, "4": 5, "5": 5, "6": 5, "7": 5,
  "8": 10, "9": 10, "10": 10, "J": 10, "Q": 10, "K": 10
};

/** Representa um jogo potencial que o bot está analisando se deve ou não baixar. */
export interface PotentialMeld {
  cards: Card[];
  validation: ValidSequence;
}

/** Agrupa as cartas da mão por naipe para facilitar a busca de sequências. */
const group_by_suit = (hand: Card[]) => {
  const suits: Record<string, Card[]> = {};
  SUITS.forEach(s => suits[s.name] = []);
  hand.forEach((c) => {
    const s = suits[c.suit.name];
    if (s) s.push(c);
  });
  return suits;
};

/**
 * Procura na mão do bot o melhor jogo (meld) para baixar.
 * @param hand Cartas atuais na mão do bot.
 * @param team_melds Jogos que já estão na mesa para a equipe do bot.
 * @param has_taken_dead_pile Se a equipe já pegou o morto.
 * @param has_clean_canastra Se a equipe já tem uma canastra limpa (necessário para bater).
 * @param is_desperate_to_close Se o bot está em modo "desespero" (fim de jogo).
 * @param is_2v2 Se o jogo é em dupla.
 */
export const find_meld_in_hand = (
  hand: Card[],
  team_melds: Card[][] = [],
  has_taken_dead_pile: boolean = false,
  has_clean_canastra: boolean = false,
  is_desperate_to_close: boolean = false,
  is_2v2: boolean = false,
  rules: GameRules = DEFAULT_RULES
): Card[] | null => {
  const all_potential_melds: PotentialMeld[] = [];
  const suits = group_by_suit(hand);
  const wildcards = hand.filter(c => c.value === "2");
  
  // ESTRATÉGIA 1: Tenta encontrar sequências LIMPAS (sem curingas)
  for (const suitName in suits) {
    const suitCards = suits[suitName];
    if (!suitCards) continue;
    const cards = sort_cards(suitCards); 
    if (cards.length < 3) continue;

    // Varre todas as combinações possíveis de tamanho decrescente
    for (let len = cards.length; len >= 3; len--) {
        for (let i = 0; i <= cards.length - len; i++) {
            const sub = cards.slice(i, i + len);
            const validation = get_sequence_details(sub); 
            if (validation.is_valid) {
                all_potential_melds.push({ cards: sub, validation: validation as ValidSequence });
            }
        }
    }
  }

  // ESTRATÉGIA 2: Tenta sequências COM CURINGA (mesmo naipe)
  // Nota: O bot foi instruído a preferir curingas do mesmo naipe para permitir "limpar" o jogo depois.
  if (wildcards.length > 0) {
      for (const wc of wildcards) {
          const hand_without_wc = hand.filter(c => c.id !== wc.id);
          const suits_clean = group_by_suit(hand_without_wc);

          for (const suitName in suits_clean) {
              // REGRA ESTRITA: Curinga deve ser do mesmo naipe da sequência
              if (wc.suit.name !== suitName) continue;

              const suitCards = suits_clean[suitName];
              if (!suitCards) continue;
              const cards = sort_cards(suitCards);
              if (cards.length < 2) continue;

              // Tenta encontrar cartas próximas que o curinga possa unir (ex: 4-joker-6)
              let current_cluster: Card[] = [cards[0]!];
              
              for (let i = 0; i < cards.length - 1; i++) {
                  const c1 = cards[i]!;
                  const c2 = cards[i+1]!;
                  const curr_rank = RANK_MAP[c1.value] || 0;
                  const next_rank = RANK_MAP[c2.value] || 0;
                  
                  if (curr_rank && next_rank && (next_rank - curr_rank) <= 2) {
                      current_cluster.push(c2);
                  } else {
                      if (current_cluster.length >= 2) {
                          const attempt = [...current_cluster, wc];
                          const validation = get_sequence_details(attempt);
                          if (validation.is_valid) {
                              all_potential_melds.push({ cards: organize_meld(attempt), validation: validation as ValidSequence });
                          }
                      }
                      current_cluster = [c2];
                  }
              }
              // Verifica o último cluster encontrado
              if (current_cluster.length >= 2) {
                  const attempt = [...current_cluster, wc];
                  const validation = get_sequence_details(attempt);
                  if (validation.is_valid) {
                      all_potential_melds.push({ cards: organize_meld(attempt), validation: validation as ValidSequence });
                  }
              }
          }
      }
  }

  // Avalia todos os jogos potenciais encontrados e escolhe o que tem maior pontuação estratégica
  const bestMeld = evaluate_potential_melds(all_potential_melds, hand, team_melds, has_taken_dead_pile, has_clean_canastra, is_desperate_to_close, is_2v2, rules);

  return bestMeld ? bestMeld.cards : null;
};

/** Remove cartas específicas da mão (helper). */
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

/** Calcula o quão "conectada" está a mão (ajuda o bot a não desfazer sequências futuras). */
const analyze_hand_for_potential_sequences = (hand: Card[]): number => {
    let connectedness_score = 0;
    const suits = group_by_suit(hand);

    for (const suitName in suits) {
        const suitCards = suits[suitName];
        if (!suitCards) continue;
        const cards = sort_cards(suitCards);
        if (cards.length < 2) continue;

        let current_sequence_length = 1;
        for (let i = 0; i < cards.length - 1; i++) {
            const c1 = cards[i]!;
            const c2 = cards[i+1]!;
            const current_rank = RANK_MAP[c1.value];
            const next_rank = RANK_MAP[c2.value];

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

/**
 * Avalia estrategicamente cada jogo potencial e atribui uma nota.
 * Aqui reside a "personalidade" tática do bot.
 */
const evaluate_potential_melds = (
  potentialMelds: PotentialMeld[],
  currentHand: Card[],
  team_melds: Card[][],
  hasTakenDeadPile: boolean,
  hasCleanCanastra: boolean,
  isDesperate: boolean = false,
  is_2v2: boolean = false,
  rules: GameRules = DEFAULT_RULES
): PotentialMeld | null => {
  let bestMeld: PotentialMeld | null = null;
  let highestScore = -Infinity;

  // Mede quão boa a mão está antes de baixar o jogo
  const initialConnectedness = analyze_hand_for_potential_sequences(currentHand);

  for (const meld of potentialMelds) {
    let score = 0;
    const { cards, validation } = meld;

    // CRITÉRIO 1: Tamanho e tipo de Canastra
    score += cards.length * 10;

    // Valoriza muito canastras baseando-se nos pontos REAIS das regras
    if (validation.canastra_type === 'CLEAN' || validation.canastra_type === 'KING' || validation.canastra_type === 'ACE') {
      let bonus = rules.pointsCleanCanastra;
      if (validation.canastra_type === 'KING') bonus = rules.pointsKingCanastra;
      if (validation.canastra_type === 'ACE') bonus = rules.pointsAceCanastra;
      
      score += bonus * 2; // Peso estratégico (2x o valor do ponto)
    } else if (validation.canastra_type === 'DIRTY') {
      score += rules.pointsDirtyCanastra;
    } else if (validation.is_clean) {
      score += 50; // Bônus por ser limpo
    } else {
      score -= 20; // Penalidade leve por ser sujo
    }

    // CRITÉRIO 2: Modo 2v2 e Penalidade por sujar jogo novo
    // Em duplas, evitamos abrir jogos sujos para não bloquear o parceiro.
    if (is_2v2 && !validation.is_clean && !isDesperate) {
        score -= 300;
        console.log(`[BOT LOGIC] Penalty applied for starting new dirty meld in 2v2.`);
    }

    // CRITÉRIO 3: Prevenção de "Soft Lock" (Ficar preso sem poder descartar ou bater)
    const remainingHand = remove_cards_from_hand(currentHand, cards);
    if (hasTakenDeadPile && !hasCleanCanastra && remainingHand.length < 2) {
      const is_creating_clean = validation.canastra_type === 'CLEAN' || validation.canastra_type === 'KING' || validation.canastra_type === 'ACE';
      if (!is_creating_clean) {
         score -= 1000; // Penalidade massiva se for ficar com 1 carta sem ter canastra limpa
      }
    }

    // CRITÉRIO 4: Preservação de Curingas
    const jokersInMeld = cards.filter(c => c.value === "2");
    if (jokersInMeld.length > 0) {
        // Se o curinga for do mesmo naipe, ele é "limpável", o que é bom.
        if (!validation.is_clean) {
            const meldSuit = validation.start_weight > 0 ? cards.find(c => c.value !== "2")?.suit.name : undefined;
            const isCleanable = jokersInMeld.some(joker => meldSuit && joker.suit.name === meldSuit);
            if (isCleanable) score += 35;
        }
        
        // Evita usar o último curinga da mão em jogos pequenos
        const jokersInHandBefore = currentHand.filter(c => c.value === "2").length;
        const jokersInHandAfter = remainingHand.filter(c => c.value === "2").length;
        if (jokersInHandBefore === 1 && jokersInHandAfter === 0) {
            if (! (validation.canastra_type === 'CLEAN' || validation.canastra_type === 'KING' || validation.canastra_type === 'ACE')) score -= 150;
        }
        if (!validation.is_clean && cards.length < 5) score -= 30;
    }

    // CRITÉRIO 5: Impacto na conectividade da mão
    // Penaliza se baixar o jogo destruir muitas possibilidades de outras sequências na mão.
    const remainingConnectedness = analyze_hand_for_potential_sequences(remainingHand);
    const connectednessChange = initialConnectedness - remainingConnectedness;
    score -= connectednessChange * 2;

    // CRITÉRIO 6: Lógica de "Gap" (Lacuna) na mesa
    // EVITA abrir um novo jogo que esteja muito perto de um jogo que já existe (ex: abrir 4-5-6 se já tem 8-9-10).
    const meldSuit = cards.find(c => c.value !== "2")?.suit.name;
    if (meldSuit) {
      for (const existingMeld of team_melds) {
        const existingMeldDetails = get_sequence_details(existingMeld);
        if (!existingMeldDetails.is_valid) continue;

        const existingMeldSuit = existingMeld.find(c => c.value !== "2")?.suit.name;
        if (existingMeldSuit === meldSuit) {
          const s1 = validation.start_weight;
          const e1 = validation.end_weight;
          const s2 = existingMeldDetails.start_weight;
          const e2 = existingMeldDetails.end_weight;
          
          let gap = 0;
          if (e1 < s2) gap = s2 - e1; 
          else if (e2 < s1) gap = s1 - e2; 
          else gap = 0; // Sobreposição ou adjacente

          const is_existing_uncleanable = existingMeld.length >= 7 && 
                                          !existingMeldDetails.is_clean && 
                                          existingMeld.some(c => c.value === '2' && c.suit.name !== existingMeldSuit);

          // Se a lacuna for pequena (<= 4 cartas), penalizamos para forçar a união dos jogos em vez de fragmentar.
          if (gap <= 4 && !is_existing_uncleanable) { 
            const penalty = gap === 0 ? 600 : (500 / gap);
            score -= penalty; 
            console.log(`[BOT LOGIC] Penalty applied for split/overlapping meld (Gap: ${gap}, Suit: ${meldSuit}, Penalty: ${penalty})`);
          } else if (is_existing_uncleanable) {
            // Se o jogo existente já é sujo e impossível de limpar, abrir um novo limpo é uma boa estratégia.
            console.log(`[BOT LOGIC] Penalty SKIPPED for split meld: Existing canasta is uncleanable. Creating a new clean one is a good strategy.`);
            score += 100;
          }
        }
      }
    }

    // CRITÉRIO 7: Penalizar se as cartas poderiam ser adicionadas individualmente
    // Se as cartas do novo jogo podem ser simplesmente "penduradas" em jogos existentes,
    // o bot deve fazer isso em vez de criar um novo monte na mesa.
    let cardsThatCouldBeAdded = 0;
    for (const card of cards) {
      for (const existingMeld of team_melds) {
        const meldSuitName = existingMeld.find(c => c.value !== "2")?.suit.name;
        if (meldSuitName === card.suit.name || card.value === "2") {
           if (find_card_to_add([card], existingMeld, hasTakenDeadPile, hasCleanCanastra, isDesperate, [], is_2v2)) {
              cardsThatCouldBeAdded++;
              break;
           }
        }
      }
    }

    if (cardsThatCouldBeAdded > 0) {
      const addPenalty = cardsThatCouldBeAdded * 150;
      score -= addPenalty;
      console.log(`[BOT LOGIC] Penalty for using ${cardsThatCouldBeAdded} cards that could be added to existing melds: -${addPenalty}`);
    }

    if (score > highestScore) {
      highestScore = score;
      bestMeld = meld;
    }
  }

  // Só baixa o jogo se a pontuação estratégica for minimamente aceitável.
  if (highestScore < 10) { 
      console.log(`[BOT LOGIC] Best meld score (${highestScore.toFixed(1)}) is below threshold (10). Holding cards.`);
      return null;
  }

  return bestMeld;
};

/**
 * Tenta encontrar uma carta na mão para adicionar a um jogo (meld) que já está na mesa.
 */
export const find_card_to_add = (
    hand: Card[], 
    meld: Card[], 
    has_taken_dead_pile: boolean,
    has_clean_canastra: boolean = false,
    is_desperate_to_close: boolean = false,
    all_played_cards: Card[] = [],
    is_2v2: boolean = false
): Card | null => {
    const target_suit_name = meld.find(c => c.value !== "2")?.suit.name;
    const target_suit = target_suit_name; 
    if (!target_suit) return null;

  const current_validation = get_sequence_details(meld);
  const is_currently_clean = current_validation.is_valid && current_validation.is_clean;

  // Se o jogo na mesa é uma canastra suja que nunca poderá ser limpa (curinga de outro naipe),
  // o bot evita gastar cartas nela se puder usá-las para algo melhor.
  if (meld.length >= 7 && !is_currently_clean) {
      const wildcard = meld.find(c => c.value === "2" && c.suit.name !== target_suit);
      if (wildcard) {
          console.log(`[BOT LOGIC] REJECTED adding to meld: It's a dirty canastra with an off-suit joker, making it uncleanable.`);
          return null; 
      }
  }

  // Filtra candidatos: Cartas do mesmo naipe ou Curingas
  const candidates = hand.filter(c => c.suit.name === target_suit || c.value === "2");

  // Prioriza cartas naturais sobre curingas
  candidates.sort((a, b) => {
      if (a.value === "2" && b.value !== "2") return 1;
      if (a.value !== "2" && b.value === "2") return -1;
      return 0;
  });

  for (const card of candidates) {
    // REGRA DE OURO: Bots não usam curingas de naipe diferente (para facilitar limpeza posterior)
    if (card.value === "2" && card.suit.name !== target_suit) {
        continue;
    }

    const attempt = [...meld, card];
    const validation = validate_sequence(attempt);

    if (validation.is_valid) {
        // PRIORIDADE MÁXIMA: Fechar uma Canastra Limpa
        const is_now_clean_canastra = validation.is_clean && (validation.canastra_type === 'CLEAN' || validation.canastra_type === 'KING' || validation.canastra_type === 'ACE');
        if (is_now_clean_canastra) {
             return card;
        }

        // Proteção contra ficar "preso" com 1 carta sem ter canastra limpa
        if (has_taken_dead_pile && !has_clean_canastra) {
            const is_now_canastra = validation.is_valid && (
                validation.canastra_type === 'CLEAN' || 
                validation.canastra_type === 'KING' || 
                validation.canastra_type === 'ACE'
            );
            
            // Aqui usamos rules para saber se o bot precisa de canastra limpa para esvaziar a mão
            if (!is_now_canastra && hand.length <= 2) {
                 continue;
            }
        }

        // LÓGICA DE PROTEÇÃO DE LIMPEZA
        // Se o jogo é limpo e a carta vai sujá-lo...
        if (is_currently_clean && !validation.is_clean) {
            
            // Nunca suja uma canastra limpa já finalizada
            if (meld.length >= 7) continue;

            // Se for um curinga do mesmo naipe (limpável), o bot avalia se deve esperar.
            if (card.value === "2" && card.suit.name === target_suit) {
                 if (meld.length >= 6 && !is_desperate_to_close) {
                     // Se falta só 1 para a canastra, prefere esperar a carta natural para ganhar o bônus de 200.
                     continue;
                 }
                 return card;
            }

            // Se as cartas naturais necessárias já saíram do jogo, o bot aceita sujar (pois não tem escolha).
            const meld_details = get_sequence_details(meld);
            if (meld_details.is_valid && all_played_cards.length > 0) {
                 const rank_needed_start = meld_details.start_weight - 1;
                 const rank_needed_end = meld_details.end_weight + 1;
                 
                 let start_blocked = rank_needed_start < 1; 
                 let end_blocked = rank_needed_end > 14; 

                 if (!start_blocked) {
                     const start_val = Object.keys(RANK_MAP).find(k => RANK_MAP[k] === rank_needed_start);
                     if (start_val) {
                         const played = all_played_cards.filter(c => c.value === start_val && c.suit.name === target_suit).length;
                         const in_hand = hand.filter(c => c.value === start_val && c.suit.name === target_suit).length;
                         if (played + in_hand >= 2) start_blocked = true;
                     }
                 }

                 if (!end_blocked) {
                     const end_val = Object.keys(RANK_MAP).find(k => RANK_MAP[k] === rank_needed_end);
                     if (end_val) {
                         const played = all_played_cards.filter(c => c.value === end_val && c.suit.name === target_suit).length;
                         const in_hand = hand.filter(c => c.value === end_val && c.suit.name === target_suit).length;
                         if (played + in_hand >= 2) end_blocked = true;
                     }
                 }

                 if (start_blocked && end_blocked) {
                      return card;
                 }
            }

            // Em 2v2, preserva o jogo limpo para o parceiro
            if (is_2v2 && !is_desperate_to_close) continue;

            // Se não for desespero, segura a carta para tentar a limpa.
            if (!is_desperate_to_close) continue;
        }

        return card;
    }
  }
  return null;
};

/**
 * Analisa se o bot deve pegar a carta do topo do lixo.
 */
export const analyze_discard_pickup = (
  hand: Card[],
  top_discard: Card,
  team_melds: Card[][] = [],
  has_taken_dead_pile: boolean = false,
  has_clean_canastra: boolean = false,
  discard_pile_size: number = 0,
  deck_size: number = 0,
  rules: GameRules = DEFAULT_RULES
): PickupAction | null => {
  
  const desperation_factor = deck_size < 10 ? (10 - deck_size) * 5 : 0;
  
  // 1. Tenta adicionar a carta do lixo diretamente em um jogo da mesa
  for (let i = 0; i < team_melds.length; i++) {
    const meld = team_melds[i];
    if (!meld) continue;
    const target_suit = meld.find(c => c.value !== "2")?.suit.name;
    
    if (!target_suit || top_discard.suit.name !== target_suit) continue;

    const attempt = [...meld, top_discard];
    const validation = validate_sequence(attempt);
    
    if (validation.is_valid) {
       const meld_val = validate_sequence(meld);
       const was_clean = meld_val.is_valid && meld_val.is_clean;
       
       if (was_clean && !validation.is_clean && meld.length >= 7) continue;
       if (was_clean && !validation.is_clean && has_taken_dead_pile && desperation_factor === 0) continue; 

       // Proteção contra ficar com mão inválida após pegar o lixo todo
       if (has_taken_dead_pile && !has_clean_canastra) {
           const is_now_canastra = validation.is_valid && (validation.canastra_type === 'CLEAN' || validation.canastra_type === 'KING' || validation.canastra_type === 'ACE');
           const new_hand_size = hand.length + (discard_pile_size - 1);
           if (!is_now_canastra && new_hand_size < 2) continue;
       }
       
       return { type: 'ADD_TO_MELD', meld_index: i, cards: [] };
    }
  }

  // 2. Tenta fazer uma "ponte" (Carta do Lixo + 1 Carta da Mão -> Jogo na Mesa)
  for (let i = 0; i < team_melds.length; i++) {
      const meld = team_melds[i];
      if (!meld) continue;
      const target_suit = meld.find(c => c.value !== "2")?.suit.name;
      if (!target_suit) continue;

      const candidates = hand.filter(c => c.suit.name === target_suit);
      
      for (const card of candidates) {
          const attempt = [...meld, card, top_discard];
          const validation = validate_sequence(attempt);

          if (validation.is_valid) {
              const ruleCheck = validate_discard_add_to_meld(meld, [card], top_discard, rules);
              if (!ruleCheck.valid) continue;

              const meld_val = validate_sequence(meld);
              const was_clean = meld_val.is_valid && meld_val.is_clean;

              if (was_clean && !validation.is_clean && meld.length >= 7) continue;
              if (was_clean && !validation.is_clean && has_taken_dead_pile && desperation_factor === 0) continue;

              if (has_taken_dead_pile && !has_clean_canastra) {
                  const is_now_canastra = validation.is_valid && (validation.canastra_type === 'CLEAN' || validation.canastra_type === 'KING' || validation.canastra_type === 'ACE');
                  const new_hand_size = hand.length + (discard_pile_size - 1) - 1;
                  if (!is_now_canastra && new_hand_size < 2) continue;
              }

              return { type: 'ADD_TO_MELD', meld_index: i, cards: [card] };
          }
      }
  }

  // 3. Tenta criar um NOVO jogo usando a carta do lixo
  // Regra base: Para pegar o lixo para um jogo novo, ele deve ser obrigatoriamente LIMPO (3 naturais).
  // Se rules.canPickUpDiscardWithJoker for true, permite usar curinga da mão.
  const suit_candidates = hand.filter((c) => c.suit.name === top_discard.suit.name || (c.value === "2" && rules.canPickUpDiscardWithJoker));
  
  if (suit_candidates.length >= 2) {
    for (let i = 0; i < suit_candidates.length; i++) {
      for (let j = i + 1; j < suit_candidates.length; j++) {
        const c1 = suit_candidates[i]!;
        const c2 = suit_candidates[j]!;
        const attempt = [top_discard, c1, c2];
        
        const is_valid_pickup = validate_discard_pickup(top_discard, [c1, c2], rules);
        if (!is_valid_pickup) continue;

        const validation = validate_sequence(attempt);
        if (validation.is_valid) {
          const new_meld_details = get_sequence_details(attempt);
          if (!new_meld_details.is_valid) continue;

          let is_split_risk = false;

          // Aplica a lógica de lacuna (Gap) também no lixo
          for (const existing_meld of team_melds) {
            const target_suit = existing_meld.find(c => c.value !== "2")?.suit.name;
            if (target_suit === top_discard.suit.name) {
              const existing_details = get_sequence_details(existing_meld);
              if (existing_details.is_valid) {
                const s1 = new_meld_details.start_weight;
                const e1 = new_meld_details.end_weight;
                const s2 = existing_details.start_weight;
                const e2 = existing_details.end_weight;

                let gap = 0;
                if (e1 < s2) gap = s2 - e1;
                else if (e2 < s1) gap = s1 - e2;
                else gap = 0;
                
                const is_existing_dead_end = existing_meld.length >= 7 && 
                                             !existing_details.is_clean && 
                                             existing_meld.some(c => c.value === '2' && c.suit.name !== target_suit);

                if (gap <= 4 && !is_existing_dead_end) {
                   is_split_risk = true;
                   break;
                }
              }
            }
          }

          if (is_split_risk) continue;

          if (has_taken_dead_pile && !has_clean_canastra) {
              const is_now_canastra = validation.is_valid && (validation.canastra_type === 'CLEAN' || validation.canastra_type === 'KING' || validation.canastra_type === 'ACE');
              const new_hand_size = hand.length + (discard_pile_size - 1) - 2;
              if (!is_now_canastra && new_hand_size < 2) continue;
          }

          return { type: 'NEW_MELD', cards: [c1, c2] }; 
        }
      }
    }
  }

  return null;
};

/** Calcula o risco de descartar uma carta específica (baseado no que o oponente tem na mesa). */
const calculate_discard_risk = (card: Card, opponent_melds: Card[][]): number => {
    let max_risk = 0;
    if (card.value === "2") return 95; // Descartar curinga é quase sempre um erro grave

    const my_val = RANK_MAP[card.value];
    if (!my_val) return 0;

    for (const meld of opponent_melds) {
        const meld_suit = meld.find(c => c.value !== "2")?.suit.name;
        if (meld_suit !== card.suit.name) continue;

        // Risco Imediato: A carta encaixa perfeitamente no jogo do oponente
        const attempt = [...meld, card];
        if (validate_sequence(attempt).is_valid) {
            return 100;
        }

        // Risco de Proximidade: A carta ajuda o oponente a esticar o jogo no futuro
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

        if (Math.abs(dist_down) === 1 || Math.abs(dist_up) === 1) {
            max_risk = Math.max(max_risk, 85);
        }
        else if (Math.abs(dist_down) === 2) { 
            // Risco de "ponte"
            max_risk = Math.max(max_risk, 50);
        }
        else if (Math.abs(dist_up) === 2) { 
            // Risco de "ponte"
            max_risk = Math.max(max_risk, 50);
        }
    }
    return max_risk;
};

/** Calcula o quanto o bot precisa dessa carta para os seus próprios planos futuros. */
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
        if (diff === 1) score += 50; 
        else if (diff === 2) score += 25; 
        else if (diff === 0) score += 15; 
    }

    if (!has_taken_dead_pile && score > 30) score += 10; 

    return Math.min(score, 100);
};

/** Escolhe a melhor carta da mão para descartar. */
export const choose_discard = (
    hand: Card[], 
    opponent_melds: Card[][] = [],
    discard_pile_top: Card | null = null,
    has_taken_dead_pile: boolean = false,
    deck_size: number = 0, 
    discard_pile_size: number = 0,
    partner_hand_size: number = 0
): Card => {
  let best_card: Card | null = null;
  let min_score = Infinity; 
  
  const candidates = hand.length > 1 ? hand.filter(c => c.value !== "2") : hand;
  const pool = candidates.length > 0 ? candidates : hand;

  const desperation_factor = deck_size < 10 ? (10 - deck_size) * 5 : 0;
  const risk_multiplier = discard_pile_size > 10 ? 4.0 : 1.0;

  pool.forEach((card: Card) => {
      const utility = calculate_hand_utility(card, hand, has_taken_dead_pile);
      const risk = calculate_discard_risk(card, opponent_melds);
      
      let penalty = 0;
      // Penaliza levemente descartar uma carta igual à que já está no topo do lixo
      if (discard_pile_top && card.value === discard_pile_top.value && card.suit.name === discard_pile_top.suit.name) {
          penalty = 40; 
      }

      const card_val_points = CARD_POINTS[card.value] || 0;

      // O SCORE final: Queremos o MENOR score para descartar (menos utilidade + menos risco).
      const score = (utility * 3) + (risk * 25 * risk_multiplier) + penalty - (card_val_points / 20) - (desperation_factor * (card_val_points / 10));

      if (score < min_score) {
          min_score = score;
          best_card = card;
      }
  });
  
    const chosen: Card = best_card || pool[0]!; 
    console.log(`[BOT LOGIC] Discard choice: ${chosen.value}${chosen.suit.icon} (Score: ${min_score.toFixed(1)}) [Pile: ${discard_pile_size}, PartnerHand: ${partner_hand_size}]`);
    return chosen;
  };

export type PickupAction = 
  | { type: 'NEW_MELD'; cards: Card[] }
  | { type: 'ADD_TO_MELD'; meld_index: number; cards: Card[] };