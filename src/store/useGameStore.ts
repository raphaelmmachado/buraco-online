import { create } from "zustand";
import type { Card } from "../types/card";
import { distribute_cards, create_deck } from "../utils/game_logic";
import { sort_cards } from "../utils/sort_cards";
import { validate_sequence } from "../utils/rules_logic";

interface GameState {
  status: "LOBBY" | "PLAYING" | "FINISHED";
  deck: Card[];
  discard_pile: Card[];
  player_hand: Card[];
  opponent_hand: Card[];
  player_melds: Card[][];
  opponent_melds: Card[][];
  dead_piles: Card[][];
  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_turn: 1 | 2;
  has_taken_dead_pile: [boolean, boolean];
}

interface GameActions {
  start_game: () => void;
  draw_card_from_deck: () => void;
  discard_card: (card_id: string) => void;
  sort_player_hand: () => void;
  meld_cards: (card_ids: string[]) => boolean;
  sync_server_state: (server_state: Partial<GameState>) => void;

  // NOVAS AÇÕES DE COMPRA DE LIXO COM VALIDAÇÃO
  pick_up_discard_new_meld: (hand_card_ids: string[]) => boolean;
  pick_up_discard_add_to_meld: (meld_index: number) => boolean;
  // NOVA AÇÃO: Adicionar carta da mão a um jogo da mesa
  add_card_to_meld: (card_id: string, meld_index: number) => boolean;
  internal_handle_empty_hand: (type: "DIRECT" | "INDIRECT") => void;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  status: "LOBBY",
  deck: [],
  discard_pile: [],
  player_hand: [],
  opponent_hand: [],
  player_melds: [],
  opponent_melds: [],
  dead_piles: [],
  has_taken_dead_pile: [false, false], // Começa ninguém tendo pego
  turn_phase: "DRAW",
  current_turn: 1,

  start_game: () => {
    const full_deck = create_deck();
    const setup = distribute_cards(full_deck);
    set({
      status: "PLAYING",
      deck: setup.remaining_deck,
      player_hand: setup.player_1_hand,
      opponent_hand: setup.player_2_hand,
      dead_piles: [setup.dead_pile_1, setup.dead_pile_2],
      has_taken_dead_pile: [false, false],
      discard_pile: [],
      player_melds: [],
      opponent_melds: [],
      turn_phase: "DRAW",
      current_turn: 1,
    });
  },

  draw_card_from_deck: () => {
    const { deck, player_hand, turn_phase, current_turn, dead_piles } = get();

    if (current_turn !== 1) return;

    // REGRA: Monte acabou? Verifica se tem Morto sobrando para virar Monte.
    let current_deck = deck;
    let current_dead_piles = dead_piles;

    if (current_deck.length === 0) {
      if (current_dead_piles.length > 0) {
        // Pega o primeiro morto disponível e transforma em monte
        // (Geralmente acontece se um dos jogadores não pegou o morto e o jogo se estendeu)
        const [new_deck_source, ...remaining_dead_piles] = current_dead_piles;

        current_deck = new_deck_source;
        current_dead_piles = remaining_dead_piles;

        // Atualiza o estado imediatamente para refletir a mudança
        set({
          deck: current_deck,
          dead_piles: current_dead_piles,
        });

        console.log("O monte acabou! Um morto foi convertido em novo monte.");
      } else {
        // Se não tem deck e não tem morto sobrando -> FIM DE JOGO
        console.log("Fim de jogo: Cartas esgotadas.");
        set({ status: "FINISHED" });
        return;
      }
    }

    if (turn_phase !== "DRAW") return;

    // Prossegue com a compra normal
    const [new_card, ...remaining_deck] = current_deck;

    set({
      deck: remaining_deck,
      player_hand: [...player_hand, new_card],
      turn_phase: "ACTION",
    });
  },

  // OPÇÃO 1: Pegar o lixo criando um NOVO jogo (Mínimo 3 cartas incluindo o topo)
  pick_up_discard_new_meld: (hand_card_ids) => {
    const {
      discard_pile,
      player_hand,
      turn_phase,
      current_turn,
      player_melds,
    } = get();

    if (
      current_turn !== 1 ||
      turn_phase !== "DRAW" ||
      discard_pile.length === 0
    )
      return false;

    // 1. Identificar as cartas envolvidas
    const top_discard_card = discard_pile[0]; // Carta do topo
    const selected_hand_cards = player_hand.filter((c) =>
      hand_card_ids.includes(c.id)
    );

    // 2. Simular o jogo proposto (Topo + Selecionadas)
    const proposed_meld = [...selected_hand_cards, top_discard_card];

    // 3. Validar usando a lógica de regras existente
    const validation = validate_sequence(proposed_meld);

    if (!validation.is_valid) {
      console.warn(
        "Movimento inválido: O topo do lixo não forma sequência com as cartas selecionadas."
      );
      return false;
    }

    // 4. Se válido, executa a "compra explosiva"
    // O jogador recebe TODO o lixo na mão...
    const pile_cards = [...discard_pile];
    let new_hand = [...player_hand, ...pile_cards];

    // ...MAS as cartas usadas no jogo saem imediatamente da mão
    const used_ids = proposed_meld.map((c) => c.id);
    new_hand = new_hand.filter((c) => !used_ids.includes(c.id));

    // Ordenamos o novo jogo antes de ir pra mesa
    const sorted_meld = sort_cards(proposed_meld);

    set({
      player_hand: new_hand,
      discard_pile: [], // Lixo esvazia
      player_melds: [...player_melds, sorted_meld], // Novo jogo na mesa
      turn_phase: "ACTION",
    });

    return true;
  },

  // OPÇÃO 2: Pegar o lixo adicionando a um jogo EXISTENTE
  pick_up_discard_add_to_meld: (meld_index) => {
    const {
      discard_pile,
      player_hand,
      turn_phase,
      current_turn,
      player_melds,
    } = get();

    if (
      current_turn !== 1 ||
      turn_phase !== "DRAW" ||
      discard_pile.length === 0
    )
      return false;

    const target_meld = player_melds[meld_index];
    if (!target_meld) return false;

    // 1. Identificar Topo
    const top_discard_card = discard_pile[0];

    // 2. Simular adição (Jogo Atual + Topo)
    const proposed_meld = [...target_meld, top_discard_card];

    // 3. Validar
    const validation = validate_sequence(proposed_meld);

    if (!validation.is_valid) {
      console.warn(
        "Movimento inválido: O topo do lixo não encaixa neste jogo."
      );
      return false;
    }

    // 4. Executa a compra
    const pile_cards = [...discard_pile];

    // Adiciona lixo à mão...
    let new_hand = [...player_hand, ...pile_cards];

    // ...remove APENAS a carta do topo que foi usada no jogo (as outras ficam na mão)
    new_hand = new_hand.filter((c) => c.id !== top_discard_card.id);

    // Atualiza o jogo específico na mesa
    const new_melds = [...player_melds];
    new_melds[meld_index] = sort_cards(proposed_meld);

    set({
      player_hand: new_hand,
      discard_pile: [],
      player_melds: new_melds,
      turn_phase: "ACTION",
    });

    return true;
  },

  discard_card: (card_id) => {
    const { player_hand, turn_phase, current_turn } = get();
    if (current_turn !== 1 || turn_phase !== "ACTION") return;

    const card_to_discard = player_hand.find((c) => c.id === card_id);
    if (!card_to_discard) return;

    const new_hand = player_hand.filter((c) => c.id !== card_id);

    const hand_is_empty = new_hand.length === 0;

    if (hand_is_empty) {
      // Se descartou a última carta -> Batida Indireta
      // Tenta pegar o morto, mas passa a vez de qualquer jeito
      get().internal_handle_empty_hand("INDIRECT");

      // Nota: A função internal_handle vai gerenciar se pega o morto ou se o jogo acaba
      // Mas como foi descarte, o turno DEVE virar.
    }

    set((state) => {
      const next_turn = state.current_turn === 1 ? 2 : 1;
      return {
        player_hand: new_hand, // Agora a variável existe
        discard_pile: [card_to_discard, ...state.discard_pile],
        turn_phase: "DRAW",
        current_turn: next_turn,
      };
    });
    // CORREÇÃO 3: Verificamos se bateu DEPOIS de atualizar o estado inicial
    // Se a mão ficou vazia, chamamos a lógica do morto.
    // Como é Indireta (descarte), o turno já mudou ali em cima, mas o morto entra na mão do jogador.
    if (new_hand.length === 0) {
      get().internal_handle_empty_hand("INDIRECT");
    }
  },

  sort_player_hand: () => {
    const { player_hand, current_turn, opponent_hand } = get();
    if (current_turn === 1) {
      set({ player_hand: sort_cards(player_hand) });
    } else {
      set({ opponent_hand: sort_cards(opponent_hand) });
    }
  },

  meld_cards: (card_ids) => {
    const { player_hand, turn_phase, player_melds, current_turn } = get();
    if (current_turn !== 1 || turn_phase !== "ACTION") return false;

    const cards_to_meld = player_hand.filter((c) => card_ids.includes(c.id));
    const validation = validate_sequence(cards_to_meld);

    if (!validation.is_valid) return false;

    const new_hand = player_hand.filter((c) => !card_ids.includes(c.id));
    // Importante: Ordenar o jogo antes de salvar no estado
    const sorted_meld = sort_cards(cards_to_meld);

    set({
      player_hand: new_hand,
      player_melds: [...player_melds, sorted_meld],
    });

    const { player_hand: hand_after } = get(); // Pega o estado atualizado
    if (hand_after.length === 0) {
      get().internal_handle_empty_hand("DIRECT"); // Batida Direta (continua jogando)
    }

    return true;
  },

  add_card_to_meld: (card_id, meld_index) => {
    const { player_hand, turn_phase, player_melds, current_turn } = get();

    // Validações básicas de turno
    if (current_turn !== 1) return false;
    if (turn_phase !== "ACTION") return false;

    // Busca o jogo alvo e a carta
    const target_meld = player_melds[meld_index];
    const card_to_add = player_hand.find((c) => c.id === card_id);

    if (!target_meld || !card_to_add) return false;

    // Simula a nova sequência
    const proposed_meld = [...target_meld, card_to_add];

    // Valida a regra (Sequência, Naipe, Limpa/Suja, etc)
    const validation = validate_sequence(proposed_meld);

    if (!validation.is_valid) {
      console.warn("Jogada inválida: Carta não encaixa na sequência.");
      return false;
    }

    // Se passou: Atualiza estado

    // 1. Remove da mão
    const new_hand = player_hand.filter((c) => c.id !== card_id);

    // 2. Atualiza o jogo específico na mesa (Ordenado)
    const new_melds = [...player_melds];
    new_melds[meld_index] = sort_cards(proposed_meld);

    set({
      player_hand: new_hand,
      player_melds: new_melds,
    });

    const { player_hand: hand_after } = get();
    if (hand_after.length === 0) {
      get().internal_handle_empty_hand("DIRECT");
    }
    // TODO: Aqui será o lugar perfeito para checar se a mão ficou vazia (Pegar Morto/Bater)

    return true;
  },
  internal_handle_empty_hand: (type) => {
    const { dead_piles, has_taken_dead_pile, current_turn } = get();

    // Indice do jogador no array (Player 1 é indice 0)
    const player_index = current_turn - 1;

    // Se já pegou o morto antes, então é FIM DE JOGO (Batida Final)
    if (has_taken_dead_pile[player_index]) {
      // TODO: Verificar se é uma batida válida (Canastra Limpa exigida?)
      // Por enquanto, assumimos que bateu e acabou.
      console.log("Jogador bateu final!");
      set({ status: "FINISHED" });
      return;
    }

    // Se ainda tem morto disponível
    if (dead_piles.length > 0) {
      const [my_dead_pile, ...remaining_piles] = dead_piles;

      // Atualiza o flag de que este jogador pegou o morto
      const new_has_taken = [...has_taken_dead_pile] as [boolean, boolean];
      new_has_taken[player_index] = true;

      console.log(`Jogador pegou o morto! Tipo: ${type}`);

      set({
        player_hand: my_dead_pile, // A mão vira o morto
        dead_piles: remaining_piles,
        has_taken_dead_pile: new_has_taken,
        // Se for DIRETA, continua na fase de ACTION.
        // Se for INDIRETA (veio do descarte), o discard_card já mudou o turno,
        // mas aqui garantimos que a mão está cheia para o próximo turno dele.
        turn_phase: type === "DIRECT" ? "ACTION" : "DRAW",
      });
    } else {
      // Não tem morto e não tinha pego? (Raro, geralmente acontece se o morto virou monte)
      // Então é fim de jogo.
      set({ status: "FINISHED" });
    }
  },
  sync_server_state: (new_state) =>
    set((state) => ({ ...state, ...new_state })),
}));
