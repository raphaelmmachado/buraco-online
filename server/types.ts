export type PlayerID = 1 | 2 | 3 | 4;
export type TeamID = 1 | 2;
export type GameMode = "1v1" | "2v2";

export interface PlayerData {
  socketId: string;
  userName: string;
  playerId: string;
  isBot?: boolean;
  botTakeoverTimeout?: NodeJS.Timeout | null;
}

export type ServerResponse = { error?: string; success?: boolean };
