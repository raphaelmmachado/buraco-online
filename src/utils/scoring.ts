import type { Card } from "../types/card";
import { CARD_POINTS } from "../types/card";
import { validate_sequence } from "./rules_logic";

// Configuração de Pontos (Regras Padrão)
const POINTS = {
  BATIDA: 100, // Bónus por bater
  CANASTRA_SUJA: 100, // Bónus Canastra Suja
  CANASTRA_LIMPA: 200, // Bónus Canastra Limpa
  CANASTRA_REAL_500: 500, // Bónus A a K ou similar
  CANASTRA_REAL_1000: 1000, // Bónus A a A
};

export interface ScoreResult {
  total_score: number;
  base_points: number; // Soma das cartas baixadas
  bonus_points: number; // Canastras + Batida
  penalty_points: number; // Cartas na mão
  details: {
    canastras_sujas: number;
    canastras_limpas: number;
    canastras_500: number;
    canastras_1000: number;
  };
}

export const calculate_score = (
  melds: Card[][],
  hand: Card[],
  did_beat: boolean // Se este jogador foi quem bateu
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

  // 1. Somar pontos das cartas baixadas (Base) e verificar Canastras
  for (const meld of melds) {
    // Soma valor individual de cada carta (ex: 3 vale 5, Rei vale 10)
    for (const card of meld) {
      base_points += CARD_POINTS[card.value];
    }

    // Verifica Bónus de Canastra (se tiver 7 ou mais cartas)
    if (meld.length >= 7) {
      // Reutilizamos a lógica de validação para saber o tipo exato
      const validation = validate_sequence(meld);

      switch (validation.canastra_type) {
        case "dirty":
          bonus_points += POINTS.CANASTRA_SUJA;
          details.canastras_sujas++;
          break;
        case "clean":
          bonus_points += POINTS.CANASTRA_LIMPA;
          details.canastras_limpas++;
          break;
        case "real_500":
          bonus_points += POINTS.CANASTRA_REAL_500;
          details.canastras_500++;
          break;
        case "thousand":
          bonus_points += POINTS.CANASTRA_REAL_1000;
          details.canastras_1000++;
          break;
      }
    }
  }

  // 2. Bónus de Batida
  if (did_beat) {
    bonus_points += POINTS.BATIDA;
  }

  // 3. Penalidade (Cartas que sobraram na mão)
  for (const card of hand) {
    penalty_points += CARD_POINTS[card.value];
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
