import { type Card } from "../../common/types/card";
import { validate_sequence } from "../../common/utils/rules_logic";
import { sort_cards } from "../../common/utils/sort_cards";

// --- HELPERS ---

// Agrupa cartas por naipe
const group_by_suit = (hand: Card[]) => {
  const suits: Record<string, Card[]> = {
    hearts: [],
    diamonds: [],
    clubs: [],
    spades: [],
  };
  hand.forEach((c) => {
    if (c.suit.name in suits) suits[c.suit.name].push(c);
  });
  return suits;
};

// Encontra todas as sequências possíveis de 3+ cartas em uma lista de cartas (já filtradas por naipe)
const find_sequences_in_suit = (cards: Card[]): Card[][] => {
  if (cards.length < 3) return [];
  // Ordena por rank (considerando Ás como 1 ou 14? O sort_cards já lida com visual, mas aqui precisamos de lógica numérica)
  // Assumindo que sort_cards organiza 2, 3, 4 ...
  // Precisamos de uma lógica mais bruta de 'consecutividade'.
  // Vamos usar a validate_sequence para testar subconjuntos? Não, muito caro.
  // Vamos fazer uma varredura linear.

  const sorted = sort_cards(cards); // Helper do projeto
  const sequences: Card[][] = [];
  let current_seq: Card[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = current_seq[current_seq.length - 1];
    const curr = sorted[i];

    // Checa se é consecutivo (rank + 1)
    // Precisamos de um mapa de valores para inteiros.
    const rank_map: Record<string, number> = {
      "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14, "2": 2 // 2 é curinga mas também valor baixo
    };

    // Obs: A lógica de buraco é complexa com o 2 curinga. 
    // Para um bot MVP, vamos ignorar o uso de curingas deslocados por enquanto,
    // e focar em sequências naturais ou 2 na posição correta.

    const v_prev = rank_map[prev.value];
    const v_curr = rank_map[curr.value];

    // Se forem iguais (duplicata), ignora mas não quebra sequencia? No buraco fechado não pode duplicata no mesmo jogo.
    if (v_prev === v_curr) continue;

    if (v_curr === v_prev + 1) {
      current_seq.push(curr);
    } else {
      if (current_seq.length >= 3) sequences.push([...current_seq]);
      current_seq = [curr];
    }
  }
  if (current_seq.length >= 3) sequences.push([...current_seq]);

  return sequences;
};

// --- AI FUNCTIONS ---

export const analyze_discard_pickup = (
  hand: Card[],
  top_discard: Card
): Card[] | null => {
  // Tenta achar 2 cartas na mão que, com o lixo, formam uma trinca limpa do mesmo naipe.
  const same_suit = hand.filter((c) => c.suit.name === top_discard.suit.name);
  if (same_suit.length < 2) return null;

  // Tenta combinações de 2 cartas
  for (let i = 0; i < same_suit.length; i++) {
    for (let j = i + 1; j < same_suit.length; j++) {
      const attempt = [top_discard, same_suit[i], same_suit[j]];
      const validation = validate_sequence(attempt);
      
      // Regra: Deve ser limpo para pegar (is_clean check)
      if (validation.is_valid && validation.is_clean) {
        return [same_suit[i], same_suit[j]]; // Retorna as cartas da mão para usar
      }
    }
  }
  return null;
};

export const find_meld_in_hand = (hand: Card[]): Card[] | null => {
  const suits = group_by_suit(hand);
  
  for (const suit in suits) {
    const cards = suits[suit];
    const seqs = find_sequences_in_suit(cards);
    
    // Retorna a primeira válida encontrada
    for (const seq of seqs) {
      if (validate_sequence(seq).is_valid) return seq;
    }
  }
  return null;
};

export const find_card_to_add = (hand: Card[], meld: Card[]): Card | null => {
  // Tenta adicionar cada carta da mão ao jogo
  for (const card of hand) {
    const attempt = [...meld, card];
    // Otimização: Só tenta se for mesmo naipe
    if (meld[0] && card.suit.name !== meld[0].suit.name) continue;
    
    if (validate_sequence(attempt).is_valid) {
      return card;
    }
  }
  return null;
};

export const choose_discard = (hand: Card[]): Card => {
  // Estratégia simples:
  // 1. Evita descartar curingas (2)
  // 2. Prefere descartar cartas isoladas (sem vizinhos de naipe)
  
  const candidates = hand.filter(c => c.value !== "2");
  const pool = candidates.length > 0 ? candidates : hand; // Se só tiver 2, descarta 2

  // Se tiver alguma carta duplicada (inútil em jogo sem trinca), descarta
  const value_counts: Record<string, number> = {};
  pool.forEach(c => {
      const key = `${c.value}-${c.suit.name}`;
      value_counts[key] = (value_counts[key] || 0) + 1;
  });
  
  const duplicate = pool.find(c => value_counts[`${c.value}-${c.suit.name}`] > 1);
  if (duplicate) return duplicate;

  // Aleatório entre os candidatos por enquanto, ou maior valor?
  // Vamos descartar a de maior valor (para não dar ponto pro oponente?)
  // Ou menor valor?
  // Vamos pegar aleatório do pool para não ficar travado
  return pool[Math.floor(Math.random() * pool.length)];
};
