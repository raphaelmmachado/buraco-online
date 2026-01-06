// =============================================================================
// LÓGICA DE PONTUAÇÃO - O PLACAR
// Este arquivo é responsável por calcular a pontuação de uma equipe ao final
// de uma rodada, baseado nas regras do `RULES.md`.
// =============================================================================

import {
  BONUS_POINTS,
  CARD_POINTS,
  MELD_POINTS,
  type Card,
} from "../types/card";
import { validate_sequence } from "./rules_logic";

export interface ScoreResult {
  total_score: number;
  base_points: number; // Pontos das cartas na mesa
  bonus_points: number; // Bônus de batida e canastras
  penalty_points: number; // Pontos das cartas na mão + morto não pego
  details: Record<keyof typeof MELD_POINTS, number>;
}
/**
 * Calcula a pontuação final de uma equipe.
 * @param {Card[][]} melds - Todos os jogos que a equipe baixou na mesa.
 * @param {Card[][]} hands_to_penalize - Array de mãos dos jogadores da equipe (para subtrair pontos).
 * @param {boolean} did_beat - Se a equipe foi a que bateu.
 * @param {boolean} did_not_take_dead_pile - Se a equipe não pegou o morto.
 * @returns {ScoreResult} - O objeto com o resultado detalhado da pontuação.
 */
export const calculate_score = (
  melds: Card[][],
  hands_to_penalize: Card[][] = [],
  did_beat: boolean = false,
  did_not_take_dead_pile: boolean = false
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
        bonus_points += MELD_POINTS[canastra_type];
        details[canastra_type]++;
      }
    }
  }

  // 3. Adiciona bônus pela batida
  if (did_beat) {
    bonus_points += BONUS_POINTS.BEAT;
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
    // A constante é -100, então somamos para subtrair do total.
    penalty_points -= BONUS_POINTS.DID_NOT_TAKE_DEAD_PILE;
  }

  // 5. Calcula o placar final
  const total_score = base_points + bonus_points - penalty_points;

  return {
    total_score,
    base_points,
    bonus_points,
    penalty_points,
    details,
  };
};

/**
 * Calcula a pontuação e o tipo de um único jogo (meld).
 * Útil para a UI exibir informações detalhadas sobre cada sequência na mesa.
 */
export const calculate_meld_score = (
  meld: Card[]
): { score: number; type: string } => {
  let score = 0;
  for (const card of meld) {
    score += CARD_POINTS[card.value] || 0;
  }

  let type: keyof typeof MELD_POINTS = "INSUFFICIENT";

  if (meld.length >= 7) {
    const validation = validate_sequence(meld);
    if (validation.is_valid) {
      type = validation.canastra_type;
      score += MELD_POINTS[type];
    }
  } else if (meld.length >= 3) {
    type = "INSUFFICIENT";
  }

  return { score, type };
};
