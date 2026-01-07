import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { Card } from "../../common/types/card";
import { SERVER_ADRESS } from "../../common/const/server-adress";

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
  startGame: () => void;

  set_server_state: (server_data: IncomingServerState) => void;
}

const socket: Socket = io(SERVER_ADRESS, {
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

  clear_error: () => set({ last_error: null }),

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

    socket.on("error_msg", (msg: string) => {
      set({ last_error: msg });
    });

    get().fetchRooms();
  },

  fetchRooms: () => {
    socket.emit("request_rooms");
  },

  connect: (roomId, mode, userName) => {
    set({ status: "LOBBY", roomId, last_error: null });
    socket.emit("join_game", { roomId, mode, userName });
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
    socket.emit("action_pick_up_discard_add_to_meld", { roomId, meld_index, card_ids });
  },

  startGame: () => {
    const { roomId } = get();
    socket.emit("action_start_game", { roomId });
  },
}));