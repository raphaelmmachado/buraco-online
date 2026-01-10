import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { Card } from "../../common/types/card";
import { SERVER_ADDRESS } from "../../common/const/server-adress";

import { type ScoreResult } from "../../common/utils/scoring";

// 1. O QUE CHEGA DO SERVIDOR
interface IncomingServerState {
  mode: "1v1" | "2v2";
  status: "LOBBY" | "PLAYING" | "FINISHED";
  deck: Card[];
  discard_pile: Card[];
  hands: Record<number, Card[]>;
  team_melds: Record<number, Card[][]>;
  dead_piles: Card[][];
  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: number;
  players_data: Record<number, { socketId: string; userName: string }>;
  final_score: {
    team_1: number;
    team_2: number;
    details_t1: ScoreResult;
    details_t2: ScoreResult;
  } | null;
}

export interface RoomInfo {
  roomId: string;
  mode: "1v1" | "2v2";
  playerCount: number;
  maxPlayers: number;
}

// 2. O ESTADO DO FRONTEND
interface GameState {
  roomId: string;
  my_player_number: number | null;
  my_player_name: string | null;
  status: "IDLE" | "LOBBY" | "PLAYING" | "FINISHED";
  rooms: RoomInfo[];
  last_error: string | null;
  players_data: Record<number, { socketId: string; userName: string }>;
  mode: "1v1" | "2v2";

  deck: Card[];
  discard_pile: Card[];
  hands: Record<number, Card[]>;
  team_melds: { 1: Card[][]; 2: Card[][] };
  dead_piles: Card[][];
  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: number;
  final_score: {
    team_1: number;
    team_2: number;
    details_t1: ScoreResult;
    details_t2: ScoreResult;
  } | null;
}

interface GameActions {
  initializeSocket: () => void;
  connect: (roomId: string, mode: "1v1" | "2v2", userName: string) => void;
  fetchRooms: () => void;
  clear_error: () => void;

  draw_card: () => void;
  discard_card: (card_id: string) => void;
  meld_cards: (card_ids: string[]) => void;
  add_to_meld: (card_ids: string[], meld_index: number) => void;
  pick_up_discard_new_meld: (card_ids: string[]) => void;
  pick_up_discard_add_to_meld: (meld_index: number, card_ids: string[]) => void;
  addBot: () => void;
  startGame: () => void;
  leaveGame: () => void;
  closeRoom: () => void;
  sort_hand: () => void;

  set_server_state: (server_data: IncomingServerState) => void;
}

const socket: Socket = io(SERVER_ADDRESS, {
  autoConnect: false,
});

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  roomId: "",
  my_player_number: null,
  my_player_name: null,
  status: "IDLE",
  rooms: [],
  last_error: null,
  players_data: {},
  mode: "1v1",

  deck: [],
  discard_pile: [],
  hands: {},
  team_melds: { 1: [], 2: [] },
  dead_piles: [],
  turn_phase: "DRAW",
  current_player: 1,
  final_score: null,

  clear_error: () => set({ last_error: null }),

  addBot: () => {
    const { roomId } = get();
    socket.emit("action_add_bot", { roomId });
  },

  sort_hand: () => {
    const { roomId } = get();
    socket.emit("action_sort_hand", { roomId });
  },

  closeRoom: () => {
    const { roomId } = get();
    socket.emit("action_close_room", { roomId });
    // The server will send 'game_closed' event, which we handle below.
  },

  leaveGame: () => {
    const { roomId } = get();
    // Emite evento para o servidor (fire-and-forget)
    socket.emit("leave_game", { roomId });
    
    // Limpa estado local IMEDIATAMENTE
    localStorage.removeItem("baralho_active_room");
    set({
      status: "IDLE",
      roomId: "",
      my_player_number: null,
      my_player_name: null,
      hands: {},
      team_melds: { 1: [], 2: [] },
      discard_pile: [],
      deck: [],
      final_score: null,
      last_error: null
    });
  },

  initializeSocket: () => {
    if (socket.connected) return;

    socket.connect();

    socket.on("player_assignment", (num: number, userName: string) => {
      set({ my_player_number: num, my_player_name: userName });
    });

    socket.on("game_update", (serverState: IncomingServerState) => {
      get().set_server_state(serverState);
    });

    socket.on("rooms_list", (rooms: RoomInfo[]) => {
      set({ rooms });
    });

    socket.on("game_closed", (reason: string) => {
      alert(reason); // Simple alert for now
      localStorage.removeItem("baralho_active_room");
      set({
        status: "IDLE",
        roomId: "",
        my_player_number: null,
        my_player_name: null,
        hands: {},
        team_melds: { 1: [], 2: [] },
        discard_pile: [],
        deck: [],
        final_score: null,
      });
    });

    socket.on("rejoin_failed", () => {
        console.log("Tentativa de reconexão falhou: Sala não existe mais.");
        localStorage.removeItem("baralho_active_room");
        // Não removemos o ID do jogador (baralho_player_id) para manter a identidade
        set({ status: "IDLE", roomId: "", my_player_number: null, my_player_name: null });
    });

    socket.on("error_msg", (msg: string) => {
      set({ last_error: msg });
      // Se o erro for crítico de sessão, limpa tudo e volta pro inicio
      if (msg.includes("não encontrada") || msg.includes("não encontrado")) {
          alert(`Erro de conexão: ${msg}`);
          localStorage.removeItem("baralho_active_room");
          localStorage.removeItem("baralho_player_id");
          set({ status: "IDLE", roomId: "", my_player_number: null, my_player_name: null });
      }
    });

    socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
        set({ last_error: `Erro de conexão: ${err.message}` });
    });

    socket.on("connect", () => {
        console.log("Socket conectado!", socket.id);
        set({ last_error: null });
        // RECONNECTION LOGIC
        const savedRoom = localStorage.getItem("baralho_active_room");
        const savedPlayerId = localStorage.getItem("baralho_player_id");
        
        if (savedRoom && savedPlayerId) {
            console.log("Tentando reconectar...", savedRoom);
            socket.emit("rejoin_game", { roomId: savedRoom, playerId: savedPlayerId });
        }
    });

    get().fetchRooms();
  },

  fetchRooms: () => {
    socket.emit("request_rooms");
  },

  connect: (roomId, mode, userName) => {
    set({ status: "LOBBY", roomId, last_error: null });
    
    // Persistent Identity
    let pid = localStorage.getItem("baralho_player_id");
    if (!pid) {
        pid = crypto.randomUUID();
        localStorage.setItem("baralho_player_id", pid);
    }
    localStorage.setItem("baralho_active_room", roomId);

    socket.emit("join_game", { roomId, mode, userName, playerId: pid });
  },

  set_server_state: (server_data: IncomingServerState) => {
    set({
      status: server_data.status,
      mode: server_data.mode,
      deck: server_data.deck,
      discard_pile: server_data.discard_pile,
      dead_piles: server_data.dead_piles,
      current_player: server_data.current_player,
      turn_phase: server_data.turn_phase,
      team_melds: {
        1: server_data.team_melds[1] || [],
        2: server_data.team_melds[2] || [],
      },
      hands: server_data.hands,
      players_data: server_data.players_data,
      final_score: server_data.final_score,
      last_error: null,
    });
  },

  draw_card: () => {
    const { roomId } = get();
    socket.emit("action_draw", { roomId });
  },

  discard_card: (card_id: string) => {
    const { roomId } = get();
    socket.emit("action_discard", { roomId, card_id });
  },

  meld_cards: (card_ids: string[]) => {
    const { roomId } = get();
    socket.emit("action_meld", { roomId, card_ids });
  },

  add_to_meld: (card_ids: string[], meld_index: number) => {
    const { roomId } = get();
    socket.emit("action_add_to_meld", { roomId, card_ids, meld_index });
  },

  pick_up_discard_new_meld: (card_ids: string[]) => {
    const { roomId } = get();
    socket.emit("action_pick_up_discard_new_meld", { roomId, card_ids });
  },

  pick_up_discard_add_to_meld: (meld_index, card_ids) => {
    const { roomId } = get();
    socket.emit("action_pick_up_discard_add_to_meld", {
      roomId,
      meld_index,
      card_ids,
    });
  },

  startGame: () => {
    const { roomId } = get();
    socket.emit("action_start_game", { roomId });
  },
}));
