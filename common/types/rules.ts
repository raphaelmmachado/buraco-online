export interface GameRules {
  // Gameplay Rules
  can_pickup_discard_with_joker: boolean; // Permitir pegar lixo com 2/curinga da mão para novo jogo
  team_can_take_both_dead_piles: boolean;  // Mesmo time pode pegar os dois mortos (se o parceiro não pegou ou se permitido)

  // Scoring Rules
  points_for_ending: number;           // Pontos por batida (Default 100)
  points_clean_canastra: number;       // Pontos canastra limpa (Default 200)
  points_dirty_canastra: number;       // Pontos canastra suja (Default 100)
  points_king_canastra: number;        // Pontos canastra de 500 (13 cartas limpa) - Default 500
  points_ace_canastra: number;         // Pontos canastra Real (14 cartas limpa) - Default 1000
  penalty_dead_pile_not_taken: number;   // Penalidade morto não pego (Default 100)
  use_magic_jokers: boolean;           // Ativar cartas de RPG Magic Jokers

  // Advanced Gameplay Rules
  decks_to_use: number;                // Quantidade de baralhos (Default 2)
  cards_per_hand: number;              // Cartas por mão (Default 11)
  cards_in_dead_pile: number;           // Cartas no morto (Default 11)
  min_cards_for_meld: number;           // Mínimo de cartas para baixar (Default 3)
  min_cards_for_canastra: number;       // Mínimo de cartas para canastra (Default 7)
  max_length: number;                 // Máximo de cartas em uma sequência (Default 14)
  must_have_clean_canastra_to_beat: boolean; // Exigir canastra limpa para bater (Default true)
}

export const DEFAULT_RULES: GameRules = {
  can_pickup_discard_with_joker: false,
  team_can_take_both_dead_piles: false,
  points_for_ending: 100,
  points_clean_canastra: 200,
  points_dirty_canastra: 100,
  points_king_canastra: 500,
  points_ace_canastra: 1000,
  penalty_dead_pile_not_taken: 100,
  use_magic_jokers: false,
  decks_to_use: 2,
  cards_per_hand: 11,
  cards_in_dead_pile: 11,
  min_cards_for_meld: 3,
  min_cards_for_canastra: 7,
  max_length: 14,
  must_have_clean_canastra_to_beat: true,
};
