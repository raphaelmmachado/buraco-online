export interface GameRules {
  // Gameplay Rules
  canPickUpDiscardWithJoker: boolean; // Permitir pegar lixo com 2/curinga da mão para novo jogo
  teamCanTakeBothDeadPiles: boolean;  // Mesmo time pode pegar os dois mortos (se o parceiro não pegou ou se permitido)

  // Scoring Rules
  pointsForEnding: number;           // Pontos por batida (Default 100)
  pointsCleanCanastra: number;       // Pontos canastra limpa (Default 200)
  pointsDirtyCanastra: number;       // Pontos canastra suja (Default 100)
  pointsKingCanastra: number;        // Pontos canastra de 500 (13 cartas limpa) - Default 500
  pointsAceCanastra: number;         // Pontos canastra Real (14 cartas limpa) - Default 1000
  penaltyDeadPileNotTaken: number;   // Penalidade morto não pego (Default 100)
}

export const DEFAULT_RULES: GameRules = {
  canPickUpDiscardWithJoker: false,
  teamCanTakeBothDeadPiles: false,
  pointsForEnding: 100,
  pointsCleanCanastra: 200,
  pointsDirtyCanastra: 100,
  pointsKingCanastra: 500,
  pointsAceCanastra: 1000,
  penaltyDeadPileNotTaken: 100,
};
