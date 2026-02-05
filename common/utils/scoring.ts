// =============================================================================
// LÓGICA DE PONTUAÇÃO - O PLACAR
// Este arquivo é responsável por calcular a pontuação de uma equipe ao final
// de uma rodada, baseado nas regras do `RULES.md`.
// =============================================================================

import {
  CARD_POINTS,
  MELD_POINTS,
  type Card,
} from "../types/card";
import { type GameRules, DEFAULT_RULES } from "../types/rules";
import { validate_sequence } from "./rules_logic";

export interface ScoreResult {
  total_score: number;
  base_points: number; // Pontos das cartas na mesa
  bonus_points: number; // Bônus de batida e canastras
  penalty_points: number; // Pontos das cartas na mão + morto não pego
  details: Record<keyof typeof MELD_POINTS, number>;
  has_taken_dead_pile: boolean;
  did_beat: boolean;
}

export const calculate_score = (
  melds: Card[][],
  hands_to_penalize: Card[][] = [],
  did_beat: boolean = false,
  did_not_take_dead_pile: boolean = false,
  rules: GameRules = DEFAULT_RULES
): ScoreResult => {
  let base_points = 0;
  let bonus_points = 0;
  let penalty_points = 0;

  const details = {
    DIRTY: 0,
    CLEAN: 0,
    KING: 0,
    ACE: 0,
    INSUFFICIENT: 0,
  };
  // 1. Soma os pontos de todas as cartas na mesa (base_points)
  for (const meld of melds) {
    for (const card of meld) {
      base_points += CARD_POINTS[card.value] || 0;
    }

    // 2. Se o jogo for uma canastra, soma o bônus correspondente
    if (meld.length >= 7) {
      const validation_result = validate_sequence(meld); // Pega o objeto completo

      if (validation_result.is_valid) {
        // Verifica o discriminador
        const { canastra_type } = validation_result; // Agora é seguro desestruturar
        
        // Aplica pontos baseados nas regras customizadas
        let points = 0;
        switch (canastra_type) {
            case "CLEAN": points = rules.pointsCleanCanastra; break;
            case "DIRTY": points = rules.pointsDirtyCanastra; break;
            case "KING": points = rules.pointsKingCanastra; break;
            case "ACE": points = rules.pointsAceCanastra; break;
            default: points = 0;
        }
        
        bonus_points += points;
        details[canastra_type]++;
      }
    }
  }

  // 3. Adiciona bônus pela batida
  if (did_beat) {
    bonus_points += rules.pointsForEnding;
  }

  // 4. Calcula as penalidades
  // a. Cartas restantes na mão
  for (const hand of hands_to_penalize) {
    for (const card of hand) {
      penalty_points += CARD_POINTS[card.value] || 0;
    }
  }

  // b. Morto não pego
  if (did_not_take_dead_pile) {
    penalty_points += Math.abs(rules.penaltyDeadPileNotTaken);
  }

  // 5. Calcula o placar final
  const total_score = base_points + bonus_points - penalty_points;

  return {
    total_score,
    base_points,
    bonus_points,
    penalty_points,
    details,
    has_taken_dead_pile: !did_not_take_dead_pile,
    did_beat,
  };
};

/**
 * Calcula a pontuação e o tipo de um único jogo (meld).
 * Útil para a UI exibir informações detalhadas sobre cada sequência na mesa.
 */
export const calculate_meld_score = (
  meld: Card[],
  rules: GameRules = DEFAULT_RULES
): { score: number; type: keyof typeof MELD_POINTS; length: number } => {
  let score = 0;
  for (const card of meld) {
    score += CARD_POINTS[card.value] || 0;
  }

  let type: keyof typeof MELD_POINTS = "INSUFFICIENT";

  if (meld.length >= 7) {
    const validation = validate_sequence(meld);
    if (validation.is_valid) {
      type = validation.canastra_type;
      
      let points = 0;
      switch (type) {
          case "CLEAN": points = rules.pointsCleanCanastra; break;
          case "DIRTY": points = rules.pointsDirtyCanastra; break;
          case "KING": points = rules.pointsKingCanastra; break;
          case "ACE": points = rules.pointsAceCanastra; break;
          default: points = 0;
      }
      score += points;
    }
  } else if (meld.length >= 3) {
    type = "INSUFFICIENT";
  }

  return { score, type, length: meld.length };
};
