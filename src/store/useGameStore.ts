import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import type { Card, Suit } from "../../common/types/card";
import { SERVER_ADDRESS } from "../../common/const/server-address";

import { type ScoreResult } from "../../common/utils/scoring";

// 1. O QUE CHEGA DO SERVIDOR
interface IncomingServerState {
  mode: "1v1" | "2v2";
  status: "LOBBY" | "PLAYING" | "FINISHED";
  deck_count: number;
  discard_pile: Card[];
  hands: Record<number, Card[] | number>;
  team_melds: Record<number, Card[][]>;
  dead_piles_count: number;
  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: number;
  players_data: Record<
    number,
    { socketId: string; userName: string; isBot?: boolean; playerId: string }
  >;
  last_drawn_card_id: string | null;
  has_taken_dead_pile: [boolean, boolean];
  cardsPlayedThisTurn?: number;
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
  playerNames: string[];
  status: "LOBBY" | "PLAYING" | "FINISHED";
}

// 2. O ESTADO DO FRONTEND
interface GameState {
  roomId: string;
  my_player_number: number | null;
  my_player_name: string | null;
  status: "IDLE" | "LOBBY" | "PLAYING" | "FINISHED";
  rooms: RoomInfo[];
  totalOnline: number;
  onlineNames: string[];
  last_error: string | null;
  connectionStatus: "CONNECTED" | "DISCONNECTED" | "CONNECTING" | "RECONNECTING";
  players_data: Record<
    number,
    { socketId: string; userName: string; isBot?: boolean; playerId: string }
  >;
  mode: "1v1" | "2v2";
  isMuted: boolean;
  showAnimations: boolean;
  recentEvents: {
    id: string;
    message: string;
    playerId?: number;
    type: "info" | "success" | "warning" | "error" | "combo";
  }[];
  lastMeldUpdate: {
    teamId: number;
    meldIndex: number;
    comboSize: number;
    suit?: Suit;
    addedCardCount?: number;
  } | null;

  deck_count: number;
  discard_pile: Card[];
  hands: Record<number, Card[] | number>;
  team_melds: { 1: Card[][]; 2: Card[][] };
  dead_piles_count: number;
  has_taken_dead_pile: [boolean, boolean];
  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: number;
  last_drawn_card_id: string | null;
  cardsPlayedThisTurn: number;
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
  rejoinGame: () => void;
  fetchRooms: () => void;
  clear_error: () => void;

  draw_card: () => void;
  discard_card: (card_id: string) => void;
  meld_cards: (card_ids: string[]) => void;
  add_to_meld: (card_ids: string[], meld_index: number) => void;
  pick_up_discard_new_meld: (card_ids: string[]) => void;
  pick_up_discard_add_to_meld: (meld_index: number, card_ids: string[]) => void;
  kickPlayer: (playerId: number) => void;
  startGame: () => void;
  leaveGame: () => void;
  closeRoom: () => void;
  switchTeam: () => void;
  sort_hand: () => void;
  toggleMute: () => void;
  toggleAnimations: () => void;
  addEvent: (
    message: string,
    type?: "info" | "success" | "warning" | "error",
    playerId?: number
  ) => void;
  setLastMeldUpdate: (
    teamId: number,
    meldIndex: number,
    comboSize: number,
    suit?: Suit,
    addedCardCount?: number
  ) => void;

  set_server_state: (server_data: IncomingServerState) => void;
}

type ServerResponse = { error?: string; success?: boolean };

const socket: Socket = io(SERVER_ADDRESS, {
  autoConnect: false,
  transports: ["websocket"], // Força WebSocket para evitar problemas de polling no Render
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

let listeners_setup = false;
let is_manual_join = false;

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  roomId: "",
  my_player_number: null,
  my_player_name: null,
  status: "IDLE",
  rooms: [],
  totalOnline: 0,
  onlineNames: [],
  last_error: null,
  connectionStatus: "DISCONNECTED",
  isMuted: localStorage.getItem("baralho_muted") === "true",
  showAnimations: localStorage.getItem("baralho_show_animations") !== "false",
  players_data: {},
  mode: "1v1",
  recentEvents: [],
  lastMeldUpdate: null,

  deck_count: 0,
  discard_pile: [],
  hands: {} as Record<number, Card[] | number>,
  team_melds: { 1: [], 2: [] },
  dead_piles_count: 0,
  has_taken_dead_pile: [false, false],
  turn_phase: "DRAW",
  current_player: 1,
  last_drawn_card_id: null,
  cardsPlayedThisTurn: 0,
  final_score: null,

  clear_error: () => set({ last_error: null }),

  addEvent: (message, type = "info", playerId) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({
      recentEvents: [...state.recentEvents, { id, message, type, playerId }],
    }));

    // Auto-remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        recentEvents: state.recentEvents.filter((e) => e.id !== id),
      }));
    }, 3000);
  },

  setLastMeldUpdate: (teamId, meldIndex, comboSize, suit, addedCardCount) => {
    set({
      lastMeldUpdate: { teamId, meldIndex, comboSize, suit, addedCardCount },
    });
    setTimeout(() => {
      set({ lastMeldUpdate: null });
    }, 1500); // Effect signal lasts 1.5 seconds
  },

  toggleMute: () =>
    set((state) => {
      const newVal = !state.isMuted;
      localStorage.setItem("baralho_muted", String(newVal));
      return { isMuted: newVal };
    }),

  toggleAnimations: () =>
    set((state) => {
      const newVal = !state.showAnimations;
      localStorage.setItem("baralho_show_animations", String(newVal));
      return { showAnimations: newVal };
    }),

  kickPlayer: (playerId: number) => {
    const { roomId } = get();
    socket.emit("action_kick_player", { roomId, targetId: playerId });
  },

  switchTeam: () => {
    const { roomId } = get();
    socket.emit("action_switch_team", { roomId });
  },

  sort_hand: () => {
    const { roomId } = get();
    socket.emit("action_sort_hand", { roomId });
  },

  closeRoom: () => {
    const { roomId } = get();
    socket.emit("action_close_room", { roomId });
    // Chama leaveGame para garantir limpeza local e redirecionamento imediato
    get().leaveGame();
  },

  leaveGame: () => {
    const { roomId } = get();
    if (roomId) {
        socket.emit("leave_game", { roomId });
    }
    
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
      deck_count: 0,
      dead_piles_count: 0,
      players_data: {},
      final_score: null,
      last_error: null,
      recentEvents: [],
      lastMeldUpdate: null,
    });
  },

  initializeSocket: () => {
    if (!listeners_setup) {
      socket.on("player_assignment", (num: number, userName: string) => {
        set({ my_player_number: num, my_player_name: userName });
      });

      socket.on("game_update", (serverState: IncomingServerState) => {
        get().set_server_state(serverState);
      });

      socket.on(
        "rooms_list",
        (data: { rooms: RoomInfo[]; totalOnline: number; onlineNames: string[] }) => {
          set({
            rooms: data.rooms,
            totalOnline: data.totalOnline,
            onlineNames: data.onlineNames,
          });
        }
      );

      socket.on("game_closed", (reason: string) => {
        alert(reason); // Simple alert for now
        
        // Limpa estado local e redireciona
        localStorage.removeItem("baralho_active_room");
        set({
          status: "IDLE",
          roomId: "",
          my_player_number: null,
          my_player_name: null,
          hands: {},
          team_melds: { 1: [], 2: [] },
          discard_pile: [],
          deck_count: 0,
          dead_piles_count: 0,
          players_data: {},
          final_score: null,
          last_error: null,
          recentEvents: [],
          lastMeldUpdate: null
        });
      });

      socket.on("kicked", () => {
        alert("Você foi expulso da sala pelo anfitrião.");
        localStorage.removeItem("baralho_active_room");
        set({
          status: "IDLE",
          roomId: "",
          my_player_number: null,
          my_player_name: null,
          hands: {},
          team_melds: { 1: [], 2: [] },
          discard_pile: [],
          deck_count: 0,
          dead_piles_count: 0,
          players_data: {},
          final_score: null,
          last_error: null,
          recentEvents: [],
          lastMeldUpdate: null
        });
      });

      socket.on("rejoin_failed", () => {
        console.log("Tentativa de reconexão falhou: Sala não existe mais.");
        localStorage.removeItem("baralho_active_room");
        // Não removemos o ID do jogador (baralho_player_id) para manter a identidade
        set({
          status: "IDLE",
          roomId: "",
          my_player_number: null,
          my_player_name: null,
        });
      });

      socket.on("error_msg", (msg: string) => {
        set({ last_error: msg });
        // Se o erro for crítico de sessão, limpa tudo e volta pro inicio
        if (msg.includes("não encontrada") || msg.includes("não encontrado")) {
          alert(`Erro de conexão: ${msg}`);
          localStorage.removeItem("baralho_active_room");
          localStorage.removeItem("baralho_player_id");
          set({
            status: "IDLE",
            roomId: "",
            my_player_number: null,
            my_player_name: null,
          });
        }
      });

      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
        set({ 
            last_error: `Erro de conexão: ${err.message}`,
            connectionStatus: "DISCONNECTED" // ou RECONNECTING se quisermos ser mais específicos, mas connect_error é falha
        });
      });

      socket.on("connect", () => {
        console.log("Socket conectado!", socket.id);
        set({ last_error: null, connectionStatus: "CONNECTED" });

        // Se conectou e NÃO foi via botão 'Entrar' (ou seja, foi reconexão automática ou refresh), tenta voltar pro jogo
        if (!is_manual_join) {
          console.log(
            "Conexão automática detectada. Tentando voltar para a sala..."
          );
          get().rejoinGame();
        }
      });
      
      socket.on("disconnect", (reason) => {
        console.warn("Socket disconnected:", reason);
        set({ connectionStatus: "DISCONNECTED" });
      });
      
      socket.io.on("reconnect_attempt", () => {
         set({ connectionStatus: "RECONNECTING" });
      });

      listeners_setup = true;
    }

    if (!socket.connected) {
      set({ connectionStatus: "CONNECTING" });
      socket.connect();
    }
    
    // Always fetch rooms when initializing
    get().fetchRooms();
  },

  fetchRooms: () => {
    socket.emit("request_rooms");
  },

  rejoinGame: () => {
    const savedRoom = localStorage.getItem("baralho_active_room");
    const savedPlayerId = localStorage.getItem("baralho_player_id");

    if (!savedRoom || !savedPlayerId) return;

    const emitRejoin = () => {
        console.log("Emitindo rejoin para:", savedRoom);
        socket.emit("rejoin_game", { roomId: savedRoom, playerId: savedPlayerId });
    };

    if (socket.connected) {
        emitRejoin();
    } else {
        console.log("Socket desconectado. Conectando antes de rejoin...");
        socket.connect();
        socket.once("connect", emitRejoin);
    }
  },

  connect: (roomId, mode, userName) => {
    // CLEAN SLATE: Garante que não há conexões antigas ativas
    if (socket.connected) {
      socket.disconnect();
    }
    // Limpa a sala anterior do storage para evitar auto-rejoin
    localStorage.removeItem("baralho_active_room");

    // Marca que esta conexão é intencional (manual), evitando que o evento 'connect' dispare o rejoin automático
    is_manual_join = true;
    setTimeout(() => {
      is_manual_join = false;
    }, 5000);

    socket.connect();

    set({ status: "LOBBY", roomId, last_error: null });

    // Persistent Identity
    let pid = localStorage.getItem("baralho_player_id");
    if (!pid) {
      pid = crypto.randomUUID();
      localStorage.setItem("baralho_player_id", pid);
    }
    localStorage.setItem("baralho_active_room", roomId);
    localStorage.setItem("baralho_user_name", userName); // Save name

    socket.emit("join_game", { roomId, mode, userName, playerId: pid });
  },

  set_server_state: (server_data: IncomingServerState) => {
    set({
      status: server_data.status,
      mode: server_data.mode,
      deck_count: server_data.deck_count,
      discard_pile: server_data.discard_pile,
      dead_piles_count: server_data.dead_piles_count,
      has_taken_dead_pile: server_data.has_taken_dead_pile || [false, false],
      current_player: server_data.current_player,
      turn_phase: server_data.turn_phase,
      team_melds: {
        1: server_data.team_melds[1] || [],
        2: server_data.team_melds[2] || [],
      },
      hands: server_data.hands,
      players_data: server_data.players_data,
      last_drawn_card_id: server_data.last_drawn_card_id,
      cardsPlayedThisTurn: server_data.cardsPlayedThisTurn || 0,
      final_score: server_data.final_score,
      last_error: null,
    });
  },

  draw_card: () => {
    const { roomId } = get();
    socket.emit("action_draw", { roomId }, (response: ServerResponse) => {
      if (response && response.error) {
        set({ last_error: response.error });
      }
    });
  },

  discard_card: (card_id: string) => {
    const { roomId } = get();
    socket.emit("action_discard", { roomId, card_id }, (response: ServerResponse) => {
      if (response && response.error) {
        set({ last_error: response.error });
      }
    });
  },

  meld_cards: (card_ids: string[]) => {
    const { roomId } = get();
    socket.emit("action_meld", { roomId, card_ids }, (response: ServerResponse) => {
      if (response && response.error) {
        set({ last_error: response.error });
      }
    });
  },

  add_to_meld: (card_ids: string[], meld_index: number) => {
    const { roomId } = get();
    socket.emit(
      "action_add_to_meld",
      { roomId, card_ids, meld_index },
      (response: ServerResponse) => {
        if (response && response.error) {
          set({ last_error: response.error });
        }
      }
    );
  },

  pick_up_discard_new_meld: (card_ids: string[]) => {
    const { roomId } = get();
    socket.emit(
      "action_pick_up_discard_new_meld",
      { roomId, card_ids },
      (response: ServerResponse) => {
        if (response && response.error) {
          set({ last_error: response.error });
        }
      }
    );
  },

  pick_up_discard_add_to_meld: (meld_index, card_ids) => {
    const { roomId } = get();
    socket.emit(
      "action_pick_up_discard_add_to_meld",
      {
        roomId,
        meld_index,
        card_ids,
      },
      (response: ServerResponse) => {
        if (response && response.error) {
          set({ last_error: response.error });
        }
      }
    );
  },

  startGame: () => {
    const { roomId } = get();
    socket.emit("action_start_game", { roomId });
  },
}));
