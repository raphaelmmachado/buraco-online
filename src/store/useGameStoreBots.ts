import { create } from "zustand";
import type { Card } from "../../common/types/card";
import { distribute_cards, create_deck } from "../../common/utils/game_logic";
import { sort_cards, organize_sequence } from "../../common/utils/sort_cards";
import { validate_sequence } from "../../common/utils/rules_logic";
import { calculate_score, type ScoreResult } from "../../common/utils/scoring";

type PlayerID = 1 | 2 | 3 | 4;
type TeamID = 1 | 2;
type GameMode = "1v1" | "2v2";

interface GameState {
  status: "LOBBY" | "PLAYING" | "FINISHED";
  mode: GameMode;

  deck: Card[];
  discard_pile: Card[];

  // Mãos individuais: { 1: Card[], 2: Card[], ... }
  hands: Record<number, Card[]>;

  // Jogos na mesa são compartilhados pelo TIME: { 1: Card[][], 2: Card[][] }
  team_melds: Record<TeamID, Card[][]>;

  dead_piles: Card[][];

  // Morto é pego pelo TIME. [Team1 pegou?, Team2 pegou?]
  has_taken_dead_pile: [boolean, boolean];

  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: PlayerID;

  // Placar final dos Times
  final_score: {
    team_1: number;
    team_2: number;
    details_t1: ScoreResult;
    details_t2: ScoreResult;
  } | null;
}

interface GameActions {
  start_game: (mode?: GameMode) => void;
  draw_card_from_deck: () => void;
  discard_card: (card_id: string) => void;
  sort_my_hand: () => void; // Apenas ordena a mão de quem está jogando

  meld_cards: (card_ids: string[]) => boolean;
  pick_up_discard_new_meld: (hand_card_ids: string[]) => boolean;
  pick_up_discard_add_to_meld: (
    meld_index: number,
    bridge_card_ids?: string[]
  ) => boolean;
  add_card_to_meld: (card_ids: string[], meld_index: number) => boolean;

  sync_server_state: (server_state: Partial<GameState>) => void;
  internal_handle_empty_hand: (type: "DIRECT" | "INDIRECT") => void;
}

// --- HELPER: Descobre o time do jogador ---
// 1v1: P1->T1, P2->T2
// 2v2: P1->T1, P2->T2, P3->T1, P4->T2
const get_team = (player_id: number): TeamID => {
  return player_id % 2 !== 0 ? 1 : 2;
};

// --- HELPER: Próximo Jogador ---
const get_next_player = (current: number, mode: GameMode): PlayerID => {
  if (mode === "1v1") return current === 1 ? 2 : 1;
  // 2v2 Rotação: 1 -> 2 -> 3 -> 4 -> 1
  return ((current % 4) + 1) as PlayerID;
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  status: "LOBBY",
  mode: "1v1",
  deck: [],
  discard_pile: [],
  hands: { 1: [], 2: [], 3: [], 4: [] },
  team_melds: { 1: [], 2: [] },
  dead_piles: [],
  has_taken_dead_pile: [false, false],
  turn_phase: "DRAW",
  current_player: 1,
  final_score: null,

  start_game: (mode = "1v1") => {
    const full_deck = create_deck();
    const setup = distribute_cards(full_deck, mode);

    set({
      status: "PLAYING",
      mode: mode,
      deck: setup.remaining_deck,
      hands: setup.hands,
      dead_piles: setup.dead_piles,
      has_taken_dead_pile: [false, false],
      discard_pile: [],
      team_melds: { 1: [], 2: [] },
      turn_phase: "DRAW",
      current_player: 1,
      final_score: null,
    });
  },

  draw_card_from_deck: () => {
    const {
      deck,
      hands,
      turn_phase,
      current_player,
      dead_piles,
      team_melds,
      mode,
    } = get();
    if (turn_phase !== "DRAW") return;

    let current_deck = deck;
    let current_dead_piles = dead_piles;

    if (current_deck.length === 0) {
      if (current_dead_piles.length > 0) {
        // Monte acabou -> Vira o morto
        const [new_deck, ...remaining] = current_dead_piles;
        current_deck = new_deck;
        current_dead_piles = remaining;

        set({ deck: current_deck, dead_piles: current_dead_piles });
        console.log("Monte virou com o morto!");
      } else {
        console.log("Fim de Jogo: Cartas Esgotadas");

        // FIM DE JOGO: Calcular Pontos (Ninguém bateu)
        let t1_hands: Card[][] = [];
        let t2_hands: Card[][] = [];

        if (mode === "1v1") {
          t1_hands = [hands[1]];
          t2_hands = [hands[2]];
        } else {
          t1_hands = [hands[1], hands[3]];
          t2_hands = [hands[2], hands[4]];
        }

        const t1_score = calculate_score(team_melds[1], t1_hands, false);
        const t2_score = calculate_score(team_melds[2], t2_hands, false);

        set({
          status: "FINISHED",
          final_score: {
            team_1: t1_score.total_score,
            team_2: t2_score.total_score,
            details_t1: t1_score,
            details_t2: t2_score,
          },
        });
        return;
      }
    }

    const [new_card, ...remaining_deck] = current_deck;
    const updated_hands = {
      ...hands,
      [current_player]: [...hands[current_player], new_card],
    };

    set({
      deck: remaining_deck,
      hands: updated_hands,
      turn_phase: "ACTION",
    });
  },

  pick_up_discard_new_meld: (hand_card_ids) => {
    const { discard_pile, hands, current_player, team_melds, turn_phase } =
      get();
    if (turn_phase !== "DRAW" || discard_pile.length === 0) return false;

    const my_hand = hands[current_player];
    const top_card = discard_pile[0];
    const selected_cards = my_hand.filter((c) => hand_card_ids.includes(c.id));

    const proposed = [...selected_cards, top_card];
    if (!validate_sequence(proposed).is_valid) return false;

    // Compra Explosiva
    const pile = [...discard_pile];
    let new_hand = [...my_hand, ...pile];

    // Remove as usadas no jogo
    const used_ids = proposed.map((c) => c.id);
    new_hand = new_hand.filter((c) => !used_ids.includes(c.id));

    // Atualiza mão e melds do TIME
    const team_id = get_team(current_player);
    const new_team_melds = [...team_melds[team_id], sort_cards(proposed)];

    set({
      hands: { ...hands, [current_player]: new_hand },
      discard_pile: [],
      team_melds: { ...team_melds, [team_id]: new_team_melds },
      turn_phase: "ACTION",
    });
    return true;
  },

  // Agora aceita um segundo argumento: as cartas da mão que fazem a ponte
  pick_up_discard_add_to_meld: (
    meld_index: number,
    bridge_card_ids: string[] = []
  ) => {
    const { discard_pile, hands, current_player, team_melds, turn_phase } =
      get();

    // Validações básicas
    if (turn_phase !== "DRAW" || discard_pile.length === 0) return false;

    const team_id = get_team(current_player);
    const target_meld = team_melds[team_id][meld_index];
    if (!target_meld) return false;

    const top_card = discard_pile[0];
    const my_hand = hands[current_player];

    // Filtra as cartas da mão que o usuário selecionou para fazer a ponte (ex: o 7)
    const bridge_cards = my_hand.filter((c) => bridge_card_ids.includes(c.id));

    // A proposta agora inclui: Jogo Atual + Cartas Ponte + Carta do Lixo
    const proposed = [...target_meld, ...bridge_cards, top_card];

    // Se continuar inválido (ex: mesa 3,4,5, mão 7, lixo 9 -> falta o 8), retorna false
    if (!validate_sequence(proposed).is_valid) return false;

    // --- EXECUÇÃO ---
    const pile = [...discard_pile];

    // Nova mão: Mão atual + Lixo Inteiro
    let new_hand = [...my_hand, ...pile];

    // Remove da nova mão:
    // 1. A carta do topo do lixo (pois ela já foi pra mesa)
    // 2. As cartas ponte (pois elas já foram pra mesa)
    const ids_to_remove = [top_card.id, ...bridge_card_ids];
    new_hand = new_hand.filter((c) => !ids_to_remove.includes(c.id));

    // Atualiza o jogo na mesa
    const new_melds_list = [...team_melds[team_id]];
    // Importante: use organize_meld ou sort_cards aqui
    new_melds_list[meld_index] = sort_cards(proposed);

    set({
      hands: { ...hands, [current_player]: new_hand },
      discard_pile: [], // Lixo esvazia
      team_melds: { ...team_melds, [team_id]: new_melds_list },
      turn_phase: "ACTION",
    });

    return true;
  },

  add_card_to_meld: (card_ids, meld_index) => {
    const { hands, current_player, team_melds, turn_phase } = get();
    if (turn_phase !== "ACTION") return false;

    const team_id = get_team(current_player);
    const my_hand = hands[current_player];

    // 1. Encontra todas as cartas selecionadas na mão
    const cards_to_add = my_hand.filter((c) => card_ids.includes(c.id));
    const target_meld = team_melds[team_id][meld_index];

    // Verifica se achou as cartas e o jogo
    if (cards_to_add.length !== card_ids.length || !target_meld) return false;

    // 2. Simula a nova sequência (Jogo Atual + Todas as Novas Cartas)
    const proposed = [...target_meld, ...cards_to_add];

    // 3. Valida
    if (!validate_sequence(proposed).is_valid) {
      console.warn("Essas cartas não encaixam na sequência.");
      return false;
    }

    // 4. Executa
    const new_hand = my_hand.filter((c) => !card_ids.includes(c.id));
    const new_melds_list = [...team_melds[team_id]];

    // Ordena o jogo usando a lógica correta que posiciona os coringas
    new_melds_list[meld_index] = organize_sequence(proposed);

    set({
      hands: { ...hands, [current_player]: new_hand },
      team_melds: { ...team_melds, [team_id]: new_melds_list },
    });

    const { hands: h_after } = get();
    if (h_after[current_player].length === 0) {
      get().internal_handle_empty_hand("DIRECT");
    }
    return true;
  },

  meld_cards: (card_ids) => {
    const { hands, current_player, team_melds, turn_phase } = get();
    if (turn_phase !== "ACTION") return false;

    const my_hand = hands[current_player];
    const cards = my_hand.filter((c) => card_ids.includes(c.id));

    // Validação
    if (!validate_sequence(cards).is_valid) return false;

    const new_hand = my_hand.filter((c) => !card_ids.includes(c.id));
    const team_id = get_team(current_player);

    // --- CORREÇÃO AQUI ---
    // Usamos organize_sequence ao invés de sort_cards
    const sorted_meld = organize_sequence(cards);
    const new_melds_list = [...team_melds[team_id], sorted_meld];
    // ---------------------

    set({
      hands: { ...hands, [current_player]: new_hand },
      team_melds: { ...team_melds, [team_id]: new_melds_list },
    });

    const { hands: h_after } = get();
    if (h_after[current_player].length === 0) {
      get().internal_handle_empty_hand("DIRECT");
    }
    return true;
  },

  discard_card: (card_id) => {
    const { hands, current_player, discard_pile, turn_phase, mode } = get();
    if (turn_phase !== "ACTION") return;

    const my_hand = hands[current_player];
    const card = my_hand.find((c) => c.id === card_id);
    if (!card) return;

    const new_hand = my_hand.filter((c) => c.id !== card_id);

    // 1. PRIMEIRO: Atualiza a mão (vazia ou não) e o lixo.
    // IMPORTANTE: NÃO mudamos o current_player ainda!
    set({
      hands: { ...hands, [current_player]: new_hand },
      discard_pile: [card, ...discard_pile],
    });

    // 2. CASO A: Mão ainda tem cartas (Jogo segue normal)
    if (new_hand.length > 0) {
      const next = get_next_player(current_player, mode);
      set({
        current_player: next,
        turn_phase: "DRAW",
      });
      return;
    }

    // 3. CASO B: Batida Indireta (Mão ficou vazia)
    // Chamamos a função enquanto ainda é a vez do jogador que bateu
    get().internal_handle_empty_hand("INDIRECT");

    // 4. Depois de pegar o morto (ou acabar o jogo), passamos a vez
    // Verificamos se o jogo não acabou antes de passar a vez
    if (get().status !== "FINISHED") {
      const next = get_next_player(current_player, mode);
      set({
        current_player: next,
        turn_phase: "DRAW",
      });
    }
  },

  sort_my_hand: () => {
    const { hands, current_player } = get();
    const sorted = sort_cards(hands[current_player]);
    set({ hands: { ...hands, [current_player]: sorted } });
  },

  internal_handle_empty_hand: (type) => {
    const {
      dead_piles,
      has_taken_dead_pile,
      current_player,
      hands, // Pega o estado ATUAL (que acabou de ficar vazio no discard)
      team_melds,
      mode,
    } = get();

    const team_id = get_team(current_player);
    const team_index = team_id - 1;

    // Se o time já pegou o morto -> FIM DE JOGO
    if (has_taken_dead_pile[team_index]) {
      console.log(`Time ${team_id} bateu final!`);
      // ... (Lógica de pontuação mantém igual) ...

      // Recalcule score aqui como você já fazia...
      // (Vou omitir o cálculo repetido para economizar espaço, mantenha o seu)

      set({ status: "FINISHED" }); // + final_score
      return;
    }

    // PEGAR O MORTO
    if (dead_piles.length > 0) {
      const [my_dead_pile, ...remaining] = dead_piles;
      const new_taken = [...has_taken_dead_pile] as [boolean, boolean];
      new_taken[team_index] = true;

      set({
        // AQUI ESTÁ O SEGREDO: Atribui o morto ao current_player
        hands: { ...hands, [current_player]: my_dead_pile },
        dead_piles: remaining,
        has_taken_dead_pile: new_taken,
        // Se for direta, continua jogando (ACTION). Se indireta, vai pro próximo (DRAW)
        // Nota: Se for indireta, o discard_card vai sobrescrever turn_phase para DRAW logo em seguida,
        // mas não tem problema.
        turn_phase: type === "DIRECT" ? "ACTION" : "DRAW",
      });

      console.log(`Jogador ${current_player} pegou o morto (${type})`);
    } else {
      set({ status: "FINISHED" });
    }
  },

  sync_server_state: (new_state) =>
    set((state) => ({ ...state, ...new_state })),
}));
