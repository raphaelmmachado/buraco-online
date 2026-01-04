import { CARD_POINTS, type Card } from "../types/card";
import { validate_sequence } from "./rules_logic"; // <--- Importamos a fonte da verdade

// Configuração de Pontos
const POINTS = {
  BATIDA: 100,
  CANASTRA_SUJA: 100,
  CANASTRA_LIMPA: 200,
  CANASTRA_REAL_500: 500, // A a K
  CANASTRA_REAL_1000: 1000, // A a A
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

export const calculate_score = (
  melds: Card[][],
  // Tornamos opcionais para usar no HUD durante o jogo
  hands_to_penalize: Card[][] = [],
  did_beat: boolean = false
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
      base_points += CARD_POINTS[card.value] || 0;
    }

    // Lógica de Bônus de Canastra
    if (meld.length >= 7) {
      // Reutiliza a validação robusta do rules_logic
      const { canastra_type } = validate_sequence(meld);

      switch (canastra_type) {
        case "dirty":
          bonus_points += POINTS.CANASTRA_SUJA;
          details.canastras_sujas++;
          break;
        case "clean":
          bonus_points += POINTS.CANASTRA_LIMPA;
          details.canastras_limpas++;
          break;
        case "real_500": // Assumindo que seu rules_logic retorna isso para A-K limpa
          bonus_points += POINTS.CANASTRA_REAL_500;
          details.canastras_500++;
          break;
        case "thousand": // Assumindo que retorna isso para A-A limpa
          bonus_points += POINTS.CANASTRA_REAL_1000;
          details.canastras_1000++;
          break;
        default:
          // Caso caia aqui, não soma bônus
          break;
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
      penalty_points += CARD_POINTS[card.value] || 0;
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
