import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { Card } from "../types/card";

// 1. O QUE CHEGA DO SERVIDOR (Cópia da interface do server)
interface IncomingServerState {
  mode: "1v1" | "2v2";
  status: "LOBBY" | "PLAYING" | "FINISHED";
  deck: Card[];
  discard_pile: Card[];
  hands: Record<number, Card[]>; // <--- O servidor manda assim
  team_melds: Record<number, Card[][]>;
  dead_piles: Card[][];
  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: number;
}

// 2. O ESTADO DO FRONTEND (O que a UI usa para desenhar)
interface GameState {
  // Dados de controle local
  roomId: string;
  my_player_number: number | null; // 1, 2, 3 ou 4
  status: "LOBBY" | "PLAYING" | "FINISHED";

  // Dados do jogo "traduzidos" para facilitar a UI
  deck: Card[];
  discard_pile: Card[];
  player_hand: Card[]; // <--- A UI prefere assim
  opponent_hand: Card[]; // <--- A UI prefere assim
  team_melds: { 1: Card[][]; 2: Card[][] };
  dead_piles: Card[][];
  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: number;
}

interface GameActions {
  connect: (roomId: string, mode: "1v1" | "2v2") => void;

  // Actions de envio (Client -> Server)
  draw_card: () => void;
  discard_card: (card_id: string) => void;
  meld_cards: (card_ids: string[]) => void;
  add_to_meld: (card_ids: string[], meld_index: number) => void;

  // Action de recebimento (Server -> Client)
  set_server_state: (server_data: IncomingServerState) => void;
}

// Conexão Socket (fora da store para ser singleton)
const socket: Socket = io("http://localhost:3000", {
  autoConnect: false,
});

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  // ESTADO INICIAL
  roomId: "",
  my_player_number: null,
  status: "LOBBY",

  deck: [],
  discard_pile: [],
  player_hand: [],
  opponent_hand: [],
  team_melds: { 1: [], 2: [] },
  dead_piles: [],
  turn_phase: "DRAW",
  current_player: 1,

  // --- ACTIONS ---

  connect: (roomId, mode) => {
    socket.connect();

    // 1. Ouvir identidade
    socket.on("player_assignment", (num: number) => {
      console.log("Servidor disse que sou o Jogador:", num);
      set({ my_player_number: num, roomId });
    });

    // 2. Ouvir atualizações do jogo
    socket.on("game_update", (serverState: IncomingServerState) => {
      get().set_server_state(serverState);
    });

    socket.on("error_msg", (msg: string) => alert(msg));

    // Entrar na sala
    socket.emit("join_game", { roomId, mode });
  },

  // AQUI ESTAVA O ERRO: Agora fazemos a tradução explícita
  set_server_state: (server_data) => {
    const { my_player_number } = get();

    // Se ainda não sei quem sou, não posso separar as mãos.
    // Mas atualizo o resto para garantir que a tela de lobby funcione.
    if (!my_player_number) return;

    // Lógica para descobrir a mão do oponente (no 1v1)
    const opponent_number = my_player_number === 1 ? 2 : 1;

    // TRADUÇÃO: Server (Record) -> Front (Arrays simples)
    set({
      status: server_data.status,
      deck: server_data.deck,
      discard_pile: server_data.discard_pile,
      dead_piles: server_data.dead_piles,
      current_player: server_data.current_player,
      turn_phase: server_data.turn_phase,

      // Mapeia team_melds corretamente (garantindo tipagem)
      team_melds: {
        1: server_data.team_melds[1] || [],
        2: server_data.team_melds[2] || [],
      },

      // AQUI É A MÁGICA:
      // Pega do objeto 'hands' usando meu ID
      player_hand: server_data.hands[my_player_number] || [],
      opponent_hand: server_data.hands[opponent_number] || [],
    });
  },

  draw_card: () => {
    const { roomId } = get();
    socket.emit("action_draw", { roomId });
  },

  discard_card: (card_id) => {
    const { roomId } = get();
    socket.emit("action_discard", { roomId, card_id });
  },

  meld_cards: (card_ids) => {
    const { roomId } = get();
    socket.emit("action_meld", { roomId, card_ids });
  },

  add_to_meld: (card_ids, meld_index) => {
    const { roomId } = get();
    socket.emit("action_add_to_meld", { roomId, card_ids, meld_index });
  },
}));
