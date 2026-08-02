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
 * @param dead_piles_count Quantidade de mortos disponíveis.
 */
export const find_meld_in_hand = (
  hand: Card[],
  team_melds: Card[][] = [],
  has_taken_dead_pile: boolean = false,
  has_clean_canastra: boolean = false,
  is_desperate_to_close: boolean = false,
  is_2v2: boolean = false,
  rules: GameRules = DEFAULT_RULES,
  dead_piles_count: number = 0,
): Card[] | null => {
  const all_potential_melds: PotentialMeld[] = [];
  const suits = group_by_suit(hand);
  const wildcards = hand.filter(c => c.value === "2");
  
  // ESTRATÉGIA 1: Tenta encontrar sequências LIMPAS (sem curingas)
  for (const suitName in suits) {
    const suitCards = suits[suitName];
    if (!suitCards) continue;
    const cards = sort_cards(suitCards); 
    if (cards.length < rules.min_cards_for_meld) continue;

    // Varre todas as combinações possíveis de tamanho decrescente
    for (let len = cards.length; len >= rules.min_cards_for_meld; len--) {
      for (let i = 0; i <= cards.length - len; i++) {
        const sub = cards.slice(i, i + len);
        const validation = get_sequence_details(sub, rules);
        if (validation.is_valid) {
          all_potential_melds.push({
            cards: sub,
            validation: validation as ValidSequence,
          });
        }
      }
    }
  }

  // ESTRATÉGIA 2: Tenta sequências COM CURINGA (mesmo naipe)
  // Nota: O bot foi instruído a preferir curingas do mesmo naipe para permitir "limpar" o jogo depois.
  if (wildcards.length > 0) {
    for (const wc of wildcards) {
      const hand_without_wc = hand.filter((c) => c.id !== wc.id);
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
          const c2 = cards[i + 1]!;
          const curr_rank = RANK_MAP[c1.value] || 0;
          const next_rank = RANK_MAP[c2.value] || 0;

          if (curr_rank && next_rank && next_rank - curr_rank <= 2) {
            current_cluster.push(c2);
          } else {
            if (current_cluster.length >= 2) {
              const attempt = [...current_cluster, wc];
              const validation = get_sequence_details(attempt, rules);
              if (validation.is_valid) {
                all_potential_melds.push({
                  cards: organize_meld(attempt, rules),
                  validation: validation as ValidSequence,
                });
              }
            }
            current_cluster = [c2];
          }
        }
        // Verifica o último cluster encontrado
        if (current_cluster.length >= 2) {
          const attempt = [...current_cluster, wc];
          const validation = get_sequence_details(attempt, rules);
          if (validation.is_valid) {
            all_potential_melds.push({
              cards: organize_meld(attempt, rules),
              validation: validation as ValidSequence,
            });
          }
        }
      }
    }
  }

  // Avalia todos os jogos potenciais encontrados e escolhe o que tem maior pontuação estratégica
  const bestMeld = evaluate_potential_melds(all_potential_melds, hand, team_melds, has_taken_dead_pile, has_clean_canastra, is_desperate_to_close, is_2v2, rules, dead_piles_count);

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
  rules: GameRules = DEFAULT_RULES,
  dead_piles_count: number = 0,
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
      let bonus = rules.points_clean_canastra;
      if (validation.canastra_type === 'KING') bonus = rules.points_king_canastra;
      if (validation.canastra_type === 'ACE') bonus = rules.points_ace_canastra;
      
      score += bonus * 2; // Peso estratégico (2x o valor do ponto)
    } else if (validation.canastra_type === 'DIRTY') {
      score += rules.points_dirty_canastra;
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
    const is_creating_clean = validation.canastra_type === 'CLEAN' || validation.canastra_type === 'KING' || validation.canastra_type === 'ACE';
    const will_have_clean = hasCleanCanastra || is_creating_clean;

    const can_take_extra = hasTakenDeadPile && rules.team_can_take_both_dead_piles && dead_piles_count > 0;
    const is_final_beat_attempt = (hasTakenDeadPile && !can_take_extra) || (!hasTakenDeadPile && dead_piles_count === 0);

    if (remainingHand.length < 2) {
      if (rules.must_have_clean_canastra_to_beat && is_final_beat_attempt && !will_have_clean) {
         score -= 2000; // Penalidade extrema: Proibido bater/ficar com 1 sem canastra limpa
      } else if (is_final_beat_attempt && hasTakenDeadPile && !will_have_clean) {
         score -= 1000; // Penalidade se já pegou morto mas ainda não tem limpa
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
    // Porém, se a mão é grande (ex: pegou o lixo e está com muitas cartas), desovar as cartas na mesa tem prioridade!
    const remainingConnectedness = analyze_hand_for_potential_sequences(remainingHand);
    const connectednessChange = initialConnectedness - remainingConnectedness;
    const connectednessWeight = currentHand.length >= 9 ? 0.5 : 2.0;
    score -= connectednessChange * connectednessWeight;

    if (currentHand.length >= 9) {
      score += cards.length * 5; // Incentiva desovar sequências quando a mão está com muitas cartas
    }

    // CRITÉRIO 6: Lógica de "Gap" (Lacuna) na mesa e Proteção contra "Matar a Canastra"
    // EVITA abrir um novo jogo que esteja muito perto ou sobreposto a um jogo INCOMPLETO (< 7 cartas).
    // Se o jogo da mesa ainda não é canastra (ex: tem 4-5-6 e abrimos outro 4-5-6 ou 8-9-10),
    // fragmentamos os pares do baralho e matamos a possibilidade de chegar a 7 cartas.
    const meldSuit = cards.find((c) => c.value !== "2")?.suit.name;
    if (meldSuit) {
      for (const existingMeld of team_melds) {
        const existingMeldDetails = get_sequence_details(existingMeld, rules);
        if (!existingMeldDetails.is_valid) continue;

        const existingMeldSuit = existingMeld.find((c) => c.value !== "2")?.suit
          .name;
        if (existingMeldSuit === meldSuit) {
          const s1 = validation.start_weight;
          const e1 = validation.end_weight;
          const s2 = existingMeldDetails.start_weight;
          const e2 = existingMeldDetails.end_weight;

          let gap = 0;
          if (e1 < s2) gap = s2 - e1;
          else if (e2 < s1) gap = s1 - e2;
          else gap = 0; // Sobreposição ou adjacente

          const is_existing_canastra = existingMeld.length >= rules.min_cards_for_canastra;
          const is_end_of_game = is_final_beat_attempt || isDesperate;

          // Se existe uma lacuna pequena (1 a 4 cartas de distância) entre o jogo da mesa e o novo jogo (ex: mesa tem A a 8 e mão tem 10-J-Q),
          // o bot NUNCA deve abrir esse novo jogo separadamente, pois arruína a chance de conectá-los (ou de emendar tudo no jogo da mesa).
          // Ele deve segurar as cartas na mão aguardando a carta ponte, A NÃO SER que esteja no final da partida!
          if (gap > 0 && gap <= 4 && !is_end_of_game) {
            const penalty = 500 / gap;
            score -= penalty;
            console.log(
              `[BOT LOGIC] Penalty applied for starting nearby sequence (${gap} cards away from existing meld in ${meldSuit}). Holding cards to connect them later!`,
            );
          } else if (is_existing_canastra && gap === 0) {
            // Se o jogo da mesa JÁ É uma canastra (>= 7 cartas) E as cartas da mão são totalmente REPETIDAS/SOBREPOSTAS (gap === 0, ex: 4-5-6),
            // elas nunca poderiam ser emendadas no topo/base do jogo da mesa. Abaixar esse jogo repetido é limpo, seguro e ganha pontos!
            console.log(
              `[BOT LOGIC] Penalty SKIPPED for duplicate meld (gap 0): Existing meld is already a completed Canastra (${existingMeld.length} cards). Adding duplicate meld is safe.`,
            );
            score += 60;
          } else if (!is_existing_canastra && gap <= 4) {
            // Se o jogo existente na mesa é INCOMPLETO (< 7 cartas), abrir jogos repetidos ou próximos (gap <= 4) fragmentaria o baralho e mataria a canastra!
            const penalty = gap === 0 ? 600 : 500 / gap;
            score -= penalty;
            console.log(
              `[BOT LOGIC] Penalty applied to avoid killing potential canastra (Gap: ${gap}, Suit: ${meldSuit}, Penalty: ${penalty})`,
            );
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
        const meldSuitName = existingMeld.find((c) => c.value !== "2")?.suit
          .name;
        if (meldSuitName === card.suit.name || card.value === "2") {
          if (
            find_card_to_add(
              [card],
              existingMeld,
              hasTakenDeadPile,
              hasCleanCanastra,
              isDesperate,
              [],
              is_2v2,
              rules
            )
          ) {
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
  is_2v2: boolean = false,
  rules: GameRules = DEFAULT_RULES,
  dead_piles_count: number = 0,
  opponent_melds: Card[][] = [],
  discard_pile_size: number = 0,
): Card | null => {
  const target_suit_name = meld.find((c) => c.value !== "2")?.suit.name;
  const target_suit = target_suit_name;
  if (!target_suit) return null;

  const current_validation = get_sequence_details(meld, rules);
  const is_currently_clean =
    current_validation.is_valid && current_validation.is_clean;

  // Filtra candidatos: Cartas do mesmo naipe ou Curingas (APENAS o 2, Joker proibido em sequências para bots)
  const candidates = hand.filter((c) => c.suit.name === target_suit || c.value === "2");

  // Prioriza cartas naturais sobre curingas
  candidates.sort((a, b) => {
    const isWildA = a.value === "2";
    const isWildB = b.value === "2";
    if (isWildA && !isWildB) return 1;
    if (!isWildA && isWildB) return -1;
    return 0;
  });

  for (const card of candidates) {
    // REGRA DE OURO: Bots não usam curingas de naipe diferente (para facilitar limpeza posterior)
    if (card.value === "2" && card.suit.name !== target_suit) {
      continue;
    }

    const attempt = [...meld, card];
    const validation = validate_sequence(attempt, rules);

    if (validation.is_valid) {
      // PRIORIDADE MÁXIMA: Fechar uma Canastra Limpa
      const is_now_clean_canastra =
        validation.is_clean &&
        (validation.canastra_type === "CLEAN" ||
          validation.canastra_type === "KING" ||
          validation.canastra_type === "ACE");
      if (is_now_clean_canastra) {
        return card;
      }

      // Proteção contra ficar "preso" com 1 carta sem ter canastra limpa
      const is_now_clean_canastra_final =
        validation.is_clean &&
        (validation.canastra_type === "CLEAN" ||
          validation.canastra_type === "KING" ||
          validation.canastra_type === "ACE");

      const will_have_clean_final = has_clean_canastra || is_now_clean_canastra_final;

      const can_take_extra =
        has_taken_dead_pile && rules.team_can_take_both_dead_piles && dead_piles_count > 0;
      const is_final_beat_attempt =
        (has_taken_dead_pile && !can_take_extra) || (!has_taken_dead_pile && dead_piles_count === 0);

      if (hand.length <= 2) {
        if (rules.must_have_clean_canastra_to_beat && is_final_beat_attempt && !will_have_clean_final) {
          continue; // Não pode ficar com 1 ou 0 se as regras exigem limpa e não temos uma
        }
        if (is_final_beat_attempt && has_taken_dead_pile && !will_have_clean_final) {
          continue; // Proteção clássica do morto
        }
      }

      // INTELIGÊNCIA DE PRESERVAÇÃO DE DESCARTE SEGURO (Evitar dar o lixo ao oponente):
      // Se o lixo é valioso (ex: 8+ cartas ou lixo grande 12+), não é fim de jogo e a carta não fecha uma canastra:
      if (!is_desperate_to_close && discard_pile_size >= 8 && opponent_melds.length > 0) {
        const is_completing_any_canastra = meld.length === rules.min_cards_for_canastra - 1;
        if (!is_completing_any_canastra && hand.length > 2 && card.value !== "2" && card.value !== "JOKER") {
          const card_risk = calculate_discard_risk(card, opponent_melds, rules);
          // Se esta carta é 100% segura para descartar e ter garantia de não dar o lixo ao oponente (risco < 40):
          if (card_risk < 40) {
            const other_candidates = hand.filter(c => c.id !== card.id && c.value !== "2" && c.value !== "JOKER");
            const min_other_risk = other_candidates.length > 0
              ? Math.min(...other_candidates.map(c => calculate_discard_risk(c, opponent_melds, rules)))
              : 100;

            // Se descartar qualquer outra carta da mão teria alto risco de entregar o lixo ao adversário,
            // vale mais a pena segurar esta carta neutra com garantia de descarte do que usá-la no jogo da mesa!
            const risk_threshold = discard_pile_size >= 12 ? 40 : 60; // No lixo grande (>= 12), cautela máxima!
            if (min_other_risk >= risk_threshold) {
              console.log(
                `[BOT LOGIC] Preservando ${card.value} do naipe ${card.suit.name} para o descarte seguro! Todos os outros descartes na mão têm alto risco (${min_other_risk}) de entregar um lixo grande (${discard_pile_size} cartas).`
              );
              continue;
            }
          }
        }
      }

      // LÓGICA DE PROTEÇÃO DE LIMPEZA
      // Se o jogo é limpo e a carta vai sujá-lo...
      if (is_currently_clean && !validation.is_clean) {
        // Nunca suja uma canastra limpa já finalizada
        if (meld.length >= rules.min_cards_for_canastra) continue;

        const is_wildcard = card.value === "2" || card.value === "JOKER";

        // Se estamos adicionando uma carta NATURAL (ex: o 7 num jogo 2,3,4,5),
        // o jogo só passou a ser avaliado como sujo porque um "2" do mesmo naipe na mesa
        // deslocou-se para cobrir a lacuna (posição 6). Como essa jogada expande o jogo e é limpável,
        // nós SEMPRE permitimos adicionar a carta natural!
        if (!is_wildcard) {
          return card;
        }

        if (is_wildcard) {
          // Se for um curinga do mesmo naipe (limpável), o bot avalia se deve esperar.
          if (card.value === "2" && card.suit.name === target_suit) {
            if (
              meld.length >= rules.min_cards_for_canastra - 1 &&
              !is_desperate_to_close
            ) {
              // Se falta só 1 para a canastra, prefere esperar a carta natural para ganhar o bônus de 200.
              continue;
            }
            // Se estiver em 2v2 e não for desespero, evita sujar mesmo sendo limpável
            if (
              is_2v2 &&
              !is_desperate_to_close &&
              meld.length < rules.min_cards_for_canastra - 1
            )
              continue;

            return card;
          }

          // Se for JOKER ou 2 de outro naipe, NUNCA suja um jogo limpo a menos que seja desespero extremo
          if (!is_desperate_to_close) continue;
        }

        // Se as cartas naturais necessárias já saíram do jogo, o bot aceita sujar (pois não tem escolha).
        const meld_details = get_sequence_details(meld, rules);
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
  rules: GameRules = DEFAULT_RULES,
  dead_piles_count: number = 0
): PickupAction | null => {
  
  const desperation_factor = deck_size <= 4 ? (5 - deck_size) * 40 : 0; // Fim de jogo quando faltam 4 ou menos cartas
  const is_large_discard = discard_pile_size >= 12; // Lixo grande se tem 12 cartas ou mais
  
  // 1. Tenta adicionar a carta do lixo diretamente em um jogo da mesa
  for (let i = 0; i < team_melds.length; i++) {
    const meld = team_melds[i];
    if (!meld) continue;
    const target_suit = meld.find((c) => c.value !== "2")?.suit.name;

    if (!target_suit || top_discard.suit.name !== target_suit) continue;

    const attempt = [...meld, top_discard];
    const validation = validate_sequence(attempt, rules);

    if (validation.is_valid) {
      const meld_val = validate_sequence(meld, rules);
      const was_clean = meld_val.is_valid && meld_val.is_clean;

      // Bots não sujam jogos limpos pegando coringa do lixo,
      // A NÃO SER QUE SEJA PARA PEGAR UM GRANDE BOLO DE LIXO (12+ cartas), em qualquer momento do jogo!
      if (was_clean && !validation.is_clean) {
        const is_wildcard_pickup =
          top_discard.value === "2" || top_discard.value === "JOKER";

        if (is_wildcard_pickup && !is_large_discard) {
          // REGRA DE OURO: Com lixo pequeno (< 12), NUNCA suja uma canastra limpa (min_cards_for_canastra+).
          if (meld.length >= rules.min_cards_for_canastra) continue;

          const is_cleanable_2 =
            top_discard.value === "2" && top_discard.suit.name === target_suit;
          // Se for um "2" do mesmo naipe e NÃO for canastra, o bot pode pegar (é limpável).
          if (is_cleanable_2) {
            // Prossiga (não dê continue)
          } else {
            // Se for Joker ou 2 de outro naipe, só pega em desespero final.
            if (desperation_factor < 40) continue;
          }
        }
      }

      // Proteção contra ficar com mão inválida após pegar o lixo todo
      const is_now_canastra =
        validation.is_valid &&
        (validation.canastra_type === "CLEAN" ||
          validation.canastra_type === "KING" ||
          validation.canastra_type === "ACE");
      const will_have_clean = has_clean_canastra || is_now_canastra;
      const new_hand_size = hand.length + (discard_pile_size - 1);

      const can_take_extra = has_taken_dead_pile && rules.team_can_take_both_dead_piles && dead_piles_count > 0;
      const is_final_beat_attempt = (has_taken_dead_pile && !can_take_extra) || (!has_taken_dead_pile && dead_piles_count === 0);

      if (new_hand_size < 2) {
        if (rules.must_have_clean_canastra_to_beat && is_final_beat_attempt && !will_have_clean) continue;
        if (is_final_beat_attempt && has_taken_dead_pile && !will_have_clean) continue;
      }

      return { type: "ADD_TO_MELD", meld_index: i, cards: [] };
    }
  }

  // 2. Tenta fazer uma "ponte" (Carta do Lixo + 1 Carta da Mão -> Jogo na Mesa)
  for (let i = 0; i < team_melds.length; i++) {
    const meld = team_melds[i];
    if (!meld) continue;
    const target_suit = meld.find((c) => c.value !== "2")?.suit.name;
    if (!target_suit) continue;

    const candidates = hand.filter((c) => c.suit.name === target_suit);

    for (const card of candidates) {
      const attempt = [...meld, card, top_discard];
      const validation = validate_sequence(attempt, rules);

      if (validation.is_valid) {
        const ruleCheck = validate_discard_add_to_meld(
          meld,
          [card],
          top_discard,
          rules,
        );
        if (!ruleCheck.is_valid) continue;

        const meld_val = validate_sequence(meld, rules);
        const was_clean = meld_val.is_valid && meld_val.is_clean;

        // Evita sujar jogos limpos na ponte se envolver coringas,
        // EXCETO se for para pegar um grande bolo de lixo (12+ cartas), em qualquer momento do jogo!
        if (was_clean && !validation.is_clean) {
          const has_wildcard =
            top_discard.value === "2" ||
            top_discard.value === "JOKER" ||
            card.value === "2" ||
            card.value === "JOKER";

          if (has_wildcard && !is_large_discard) {
            // NUNCA suja canastra com lixo pequeno (min_cards_for_canastra+)
            if (meld.length >= rules.min_cards_for_canastra) continue;

            const is_cleanable_wildcard =
              (top_discard.value === "2" &&
                top_discard.suit.name === target_suit) ||
              (card.value === "2" && card.suit.name === target_suit);

            if (!is_cleanable_wildcard && desperation_factor < 40) continue;
          }
        }

        const is_now_canastra =
          validation.is_valid &&
          (validation.canastra_type === "CLEAN" ||
            validation.canastra_type === "KING" ||
            validation.canastra_type === "ACE");
        const will_have_clean = has_clean_canastra || is_now_canastra;
        const new_hand_size = hand.length + (discard_pile_size - 1) - 1;

        const can_take_extra = has_taken_dead_pile && rules.team_can_take_both_dead_piles && dead_piles_count > 0;
        const is_final_beat_attempt = (has_taken_dead_pile && !can_take_extra) || (!has_taken_dead_pile && dead_piles_count === 0);

        if (new_hand_size < 2) {
          if (rules.must_have_clean_canastra_to_beat && is_final_beat_attempt && !will_have_clean) continue;
          if (is_final_beat_attempt && has_taken_dead_pile && !will_have_clean) continue;
        }

        return { type: "ADD_TO_MELD", meld_index: i, cards: [card] };
      }
    }
  }

  // 3. Tenta criar um NOVO jogo usando a carta do lixo
  // Regra base: Para pegar o lixo para um jogo novo, ele deve ser obrigatoriamente LIMPO (3 naturais).
  // Bots são proibidos de usar JOKER para abrir jogo do lixo.
  const suit_candidates = hand.filter(
    (c) =>
      c.suit.name === top_discard.suit.name ||
      (c.value === "2" && rules.can_pickup_discard_with_joker),
  );

  if (suit_candidates.length >= 2) {
    for (let i = 0; i < suit_candidates.length; i++) {
      for (let j = i + 1; j < suit_candidates.length; j++) {
        const c1 = suit_candidates[i]!;
        const c2 = suit_candidates[j]!;
        const attempt = [top_discard, c1, c2];

        const is_valid_pickup = validate_discard_pickup(
          top_discard,
          [c1, c2],
          rules,
        );
        if (!is_valid_pickup) continue;

        const validation = validate_sequence(attempt, rules);
        if (validation.is_valid) {
          const new_meld_details = get_sequence_details(attempt, rules);
          if (!new_meld_details.is_valid) continue;

          let is_split_risk = false;

          // Aplica a lógica de lacuna (Gap) também no lixo
          for (const existing_meld of team_melds) {
            const target_suit = existing_meld.find((c) => c.value !== "2")?.suit
              .name;
            if (target_suit === top_discard.suit.name) {
              const existing_details = get_sequence_details(
                existing_meld,
                rules,
              );
              if (existing_details.is_valid) {
                const s1 = new_meld_details.start_weight;
                const e1 = new_meld_details.end_weight;
                const s2 = existing_details.start_weight;
                const e2 = existing_details.end_weight;

                let gap = 0;
                if (e1 < s2) gap = s2 - e1;
                else if (e2 < s1) gap = s1 - e2;
                else gap = 0;

                const is_existing_dead_end =
                  existing_meld.length >= rules.min_cards_for_canastra &&
                  !existing_details.is_clean &&
                  existing_meld.some(
                    (c) => c.value === "2" && c.suit.name === target_suit,
                  );

                if (gap <= 4 && !is_existing_dead_end) {
                  is_split_risk = true;
                  break;
                }
              }
            }
          }

          // Se o lixo tem 12 ou mais cartas (is_large_discard), vale a pena pegar o lixo mesmo que assim gere jogos do mesmo naipe próximos!
          if (is_split_risk && !is_large_discard) continue;

          const is_now_canastra = validation.is_valid && (validation.canastra_type === 'CLEAN' || validation.canastra_type === 'KING' || validation.canastra_type === 'ACE');
          const will_have_clean = has_clean_canastra || is_now_canastra;
          const new_hand_size = hand.length + (discard_pile_size - 1) - 2;

          const can_take_extra = has_taken_dead_pile && rules.team_can_take_both_dead_piles && dead_piles_count > 0;
          const is_final_beat_attempt = (has_taken_dead_pile && !can_take_extra) || (!has_taken_dead_pile && dead_piles_count === 0);

          if (new_hand_size < 2) {
              if (rules.must_have_clean_canastra_to_beat && is_final_beat_attempt && !will_have_clean) continue;
              if (is_final_beat_attempt && has_taken_dead_pile && !will_have_clean) continue;
          }

          return { type: 'NEW_MELD', cards: [c1, c2] }; 
        }
      }
    }
  }

  return null;
};

/** Calcula o risco de descartar uma carta específica (baseado no que o oponente tem na mesa). */
function calculate_discard_risk(
  card: Card,
  opponent_melds: Card[][],
  rules: GameRules = DEFAULT_RULES,
): number {
  let max_risk = 0;
  if (card.value === "2") return 95; // Descartar curinga é quase sempre um erro grave

  const my_val = RANK_MAP[card.value];
  if (!my_val) return 0;

  for (const meld of opponent_melds) {
    const meld_suit = meld.find((c) => c.value !== "2")?.suit.name;
    if (meld_suit !== card.suit.name) continue;

    // Risco Imediato: A carta encaixa perfeitamente no jogo do oponente
    const attempt = [...meld, card];
    if (validate_sequence(attempt, rules).is_valid) {
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
}

/** Calcula o quanto o bot precisa dessa carta para os seus próprios planos futuros e para os jogos da mesa. */
const calculate_hand_utility = (
  card: Card,
  hand: Card[],
  has_taken_dead_pile: boolean,
  team_melds: Card[][] = [],
): number => {
  if (card.value === "2") return 100;

  let score = 0;
  const my_val = RANK_MAP[card.value] || 0;

  // 1. Avaliação em relação aos jogos da própria equipe já baixadas na mesa
  for (const meld of team_melds) {
    const meld_suit = meld.find((c) => c.value !== "2" && c.value !== "JOKER")?.suit.name;
    if (meld_suit === card.suit.name) {
      let min_val = 15;
      let max_val = 0;
      for (const mc of meld) {
        if (mc.value === "2" || mc.value === "JOKER") continue;
        const r = RANK_MAP[mc.value] || 0;
        if (r < min_val) min_val = r;
        if (r > max_val) max_val = r;
      }
      if (max_val > 0) {
        const dist_down = Math.abs(my_val - min_val);
        const dist_up = Math.abs(my_val - max_val);
        const min_dist = Math.min(dist_down, dist_up);

        if (min_dist <= 1) score += 90; // Encaixa diretamente no jogo
        else if (min_dist === 2) score += 65; // A 1 carta de distância (pode usar coringa na mesa para conectar!)
        else if (min_dist === 3) score += 35; // A 2 cartas de distância
        else score += 15;
      }
    }
  }

  // 2. Avaliação em relação aos pares na própria mão
  const my_suit_cards = hand.filter((c) => c.suit.name === card.suit.name && c.id !== card.id);
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
  partner_hand_size: number = 0,
  rules: GameRules = DEFAULT_RULES,
  has_clean_canastra: boolean = false,
  dead_piles_count: number = 0,
  team_melds: Card[][] = [],
): Card => {
  let best_card: Card | null = null;
  let min_score = Infinity;

  const can_take_extra =
    has_taken_dead_pile && rules.team_can_take_both_dead_piles && dead_piles_count > 0;
  const is_final_beat_attempt =
    (has_taken_dead_pile && !can_take_extra) || (!has_taken_dead_pile && dead_piles_count === 0);

  // Se o bot tem apenas 1 carta e a regra exige canastra limpa,
  // ele NÃO PODE descartar essa carta para bater sem ter a limpa.
  const can_discard_last =
    !is_final_beat_attempt || !rules.must_have_clean_canastra_to_beat || has_clean_canastra;

  const candidates =
    hand.length > 1
      ? hand.filter((c) => c.value !== "2")
      : can_discard_last
        ? hand
        : [];

  // Fallback: se não houver candidatos legais (bot travado com 1 carta sem canastra limpa),
  // ele ainda precisa retornar algo para o sistema não quebrar, mas idealmente a lógica superior
  // deveria impedir que ele chegasse nesse estado.
  const pool = candidates.length > 0 ? candidates : hand;

  const desperation_factor = deck_size <= 4 ? (5 - deck_size) * 40 : 0; // Fim de jogo quando faltam 4 ou menos cartas
  const is_large_discard = discard_pile_size >= 12; // Lixo é grande se tem 12 cartas ou mais
  // Se o lixo tem bastante cartas, joga com muita cautela ao descartar!
  const risk_multiplier = is_large_discard ? 8.0 : discard_pile_size >= 8 ? 3.5 : 1.0;

  pool.forEach((card: Card) => {
    const utility = calculate_hand_utility(card, hand, has_taken_dead_pile, team_melds);
    const risk = calculate_discard_risk(card, opponent_melds, rules);
      
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
