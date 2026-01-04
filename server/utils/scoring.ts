import { CARD_POINTS, type Card } from "../types/card.ts";

// Configuração de Pontos
const POINTS = {
  BATIDA: 100,
  CANASTRA_SUJA: 100,
  CANASTRA_LIMPA: 200,
  CANASTRA_REAL_500: 500, // A a K (Limpa)
  CANASTRA_REAL_1000: 1000, // A a A (Limpa, 14 cartas)
};

export interface ScoreResult {
  total_score: number;
  base_points: number;
  bonus_points: number;
  penalty_points: number;
  details: {
    canastras_sujas: number;
    canastras_limpas: number;
    canastras_500: number;
    canastras_1000: number;
  };
}

// Helper para verificar se a canastra é limpa
const check_is_clean = (meld: Card[]): boolean => {
  const suit = meld[0].symbol.name;

  // 1. Verifica se tem curinga de naipe diferente
  const dirty_joker = meld.some(
    (c) => c.value === "2" && c.symbol.name !== suit
  );
  if (dirty_joker) return false;

  // 2. Verifica se tem mais de um 2 (mesmo sendo do mesmo naipe)
  // No buraco, se tem dois 2s, um está cobrindo buraco e o outro é curinga -> Suja
  const twos = meld.filter((c) => c.value === "2");
  if (twos.length > 1) return false;

  return true;
};

export const calculate_score = (
  melds: Card[][],
  hands_to_penalize: Card[][],
  did_beat: boolean
): ScoreResult => {
  let base_points = 0;
  let bonus_points = 0;
  let penalty_points = 0;

  const details = {
    canastras_sujas: 0,
    canastras_limpas: 0,
    canastras_500: 0,
    canastras_1000: 0,
  };

  // 1. Pontos na Mesa (Melds)
  for (const meld of melds) {
    // Soma pontos das cartas individuais
    for (const card of meld) {
      base_points += CARD_POINTS[card.value];
    }

    // Lógica de Bônus de Canastra
    if (meld.length >= 7) {
      const is_clean = check_is_clean(meld);

      if (!is_clean) {
        // SUJA
        bonus_points += POINTS.CANASTRA_SUJA;
        details.canastras_sujas++;
      } else {
        // É LIMPA. Agora checamos se é Real (500 ou 1000)

        if (meld.length === 14) {
          // A a A (14 cartas)
          bonus_points += POINTS.CANASTRA_REAL_1000;
          details.canastras_1000++;
        } else if (meld.length === 13) {
          // A a K (13 cartas)
          bonus_points += POINTS.CANASTRA_REAL_500;
          details.canastras_500++;
        } else {
          // Limpa comum (7 a 12 cartas)
          bonus_points += POINTS.CANASTRA_LIMPA;
          details.canastras_limpas++;
        }
      }
    }
  }

  // 2. Bônus de Batida
  if (did_beat) {
    bonus_points += POINTS.BATIDA;
  }

  // 3. Penalidade (Cartas na mão)
  for (const hand of hands_to_penalize) {
    for (const card of hand) {
      penalty_points += CARD_POINTS[card.value];
    }
  }

  const total_score = base_points + bonus_points - penalty_points;

  return {
    total_score,
    base_points,
    bonus_points,
    penalty_points,
    details,
  };
};
