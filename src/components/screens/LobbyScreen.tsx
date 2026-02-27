import { useGameStore, type WinCondition } from "../../store/useGameStore";
import { Users, Bot, Settings2, Share2, Check, Eye } from "lucide-react";
import { useState } from "react";
import { GameRulesModal } from "../game-ui/GameRulesModal";

const TeamList = ({
  teamName,
  players,
  color,
  myPlayerNumber,
}: {
  teamName: string;
  players: {
    userName: string;
    isBot?: boolean;
    playerId?: string;
    slotId: number;
    isReady?: boolean;
  }[];
  color: string;
  myPlayerNumber: number | null;
}) => (
  <div
    className={`flex-1 min-w-0 bg-black/20 rounded-xl p-4 border border-white/5 flex flex-col gap-2 ${color}`}
  >
    <h3 className="text-xs font-black uppercase tracking-widest opacity-70 mb-2 border-b border-white/5 pb-2 truncate">
      {teamName}
    </h3>
    {players.length > 0 ? (
      players.map((p, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between text-sm font-bold group/item gap-2"
        >
          <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
            {p.isBot ? (
              <Bot size={14} className="opacity-50 shrink-0" />
            ) : (
              <Users size={14} className="opacity-50 shrink-0" />
            )}
            <span className="truncate flex-1" title={p.userName}>
              {p.userName}
            </span>
            {p.slotId === 1 && (
              <span className="text-[9px] bg-yellow-500 text-black px-1 rounded font-black shrink-0">
                LÍDER
              </span>
            )}
            {p.isBot && (
              <span className="text-[9px] bg-white/10 px-1 rounded text-white/40 shrink-0">
                BOT
              </span>
            )}
            {!p.isBot && p.isReady && (
              <span className="text-[9px] bg-green-500 text-black px-1 rounded font-black shrink-0">
                PRONTO
              </span>
            )}
            {!p.isBot && !p.isReady && p.slotId !== 1 && (
              <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-1 rounded font-black border border-yellow-500/20 shrink-0">
                ...
              </span>
            )}
          </div>

          {/* KICK BUTTON (Only for Host, never on self) */}
          {myPlayerNumber === 1 && p.slotId !== 1 && (
            <button
              onClick={() => useGameStore.getState().kickPlayer(p.slotId)}
              className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400/50 hover:text-red-400 transition-all"
              title="Expulsar Jogador"
            >
              ✕
            </button>
          )}
        </div>
      ))
    ) : (
      <span className="text-white/20 text-xs italic">Aguardando...</span>
    )}
  </div>
);

const GameConfig = ({
  onStart,
}: {
  onStart: (winCondition?: WinCondition) => void;
}) => {
  const winCondition = useGameStore((state) => state.win_condition);
  const updateWinCondition = useGameStore((state) => state.updateWinCondition);

  const type = winCondition?.type || "CLASSIC";
  const value = winCondition?.value || (type === "ROUNDS" ? 3 : 3000);

  const handleTypeChange = (newType: "CLASSIC" | "POINTS" | "ROUNDS") => {
    if (newType === "CLASSIC") {
      updateWinCondition(undefined);
    } else {
      const newValue = newType === "POINTS" ? 3000 : 3;
      updateWinCondition({ type: newType, value: newValue });
    }
  };

  const handleValueChange = (v: number) => {
    updateWinCondition({ type: type as "POINTS" | "ROUNDS", value: v });
  };

  const handleStart = () => {
    onStart();
  };

  return (
    <div className="flex flex-col gap-3 my-2 p-4 bg-black/20 rounded-xl border border-white/5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.8)]"></span>
        <label className="text-[10px] uppercase tracking-widest text-yellow-500/80 font-bold">
          Configuração da Partida
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleTypeChange("CLASSIC")}
          className={`flex-1 py-3 px-1 text-[9px] md:text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${type === "CLASSIC" ? "bg-yellow-500 text-black border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]" : "bg-black/40 text-slate-400 border-white/5 hover:bg-white/5 hover:border-white/10"}`}
        >
          Rápida
        </button>
        <button
          onClick={() => handleTypeChange("POINTS")}
          className={`flex-1 py-3 px-1 text-[9px] md:text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${type === "POINTS" ? "bg-yellow-500 text-black border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]" : "bg-black/40 text-slate-400 border-white/5 hover:bg-white/5 hover:border-white/10"}`}
        >
          Pontos
        </button>
        <button
          onClick={() => handleTypeChange("ROUNDS")}
          className={`flex-1 py-3 px-1 text-[9px] md:text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${type === "ROUNDS" ? "bg-yellow-500 text-black border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]" : "bg-black/40 text-slate-400 border-white/5 hover:bg-white/5 hover:border-white/10"}`}
        >
          Rodadas
        </button>
      </div>

      {type === "POINTS" && (
        <div className="flex items-center gap-3 mt-2 animate-fade-in bg-black/20 p-2 rounded-lg border border-white/5">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">
            Alvo:
          </span>
          <input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(Number(e.target.value))}
            step={500}
            min={1000}
            max={10000}
            className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-1.5 text-sm font-mono text-yellow-400 focus:outline-none focus:border-yellow-500/50 transition-colors text-right"
          />
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pr-1">
            Pts
          </span>
        </div>
      )}

      {type === "ROUNDS" && (
        <div className="flex items-center gap-3 mt-2 animate-fade-in bg-black/20 p-2 rounded-lg border border-white/5">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">
            Total:
          </span>
          <div className="flex gap-2 flex-1">
            {[2, 3, 5, 10].map((v) => (
              <button
                key={v}
                onClick={() => handleValueChange(v)}
                className={`flex-1 py-1.5 text-xs font-mono font-bold rounded border transition-all ${value === v ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]" : "bg-black/40 text-slate-500 border-white/5 hover:bg-white/5"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleStart}
        className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-black text-lg shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-[1.02] active:scale-95 animate-pulse uppercase tracking-[0.2em] border border-white/10 mt-4"
      >
        INICIAR PARTIDA
      </button>
    </div>
  );
};

export const LobbyScreen = () => {
  const roomId = useGameStore((state) => state.roomId);
  const players_data = useGameStore((state) => state.players_data);
  const mode = useGameStore((state) => state.mode);
  const my_player_number = useGameStore((state) => state.my_player_number);
  const startGame = useGameStore((state) => state.startGame);
  const rules = useGameStore((state) => state.rules);
  const setRules = useGameStore((state) => state.setRules);

  const [showRules, setShowRules] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomId);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maxPlayers = mode === "1v1" ? 2 : 4;
  const missingCount = maxPlayers - Object.keys(players_data).length;

  const allPlayers = Object.entries(players_data).map(([id, data]) => ({
    ...data,
    slotId: Number(id),
  }));

  const team1 = allPlayers.filter((p) => p.slotId % 2 !== 0);
  const team2 = allPlayers.filter((p) => p.slotId % 2 === 0);

  const isTeam1Full = players_data[1] && players_data[3];
  const isTeam2Full = players_data[2] && players_data[4];

  const winCondition = useGameStore((state) => state.win_condition);

  const canSwitch =
    my_player_number !== 1 &&
    mode === "2v2" &&
    ((my_player_number === 3 && !isTeam2Full) ||
      ((my_player_number === 2 || my_player_number === 4) && !isTeam1Full));

  const nonHostPlayers = allPlayers.filter((p) => p.slotId !== 1);
  const allOthersReady = nonHostPlayers.every((p) => p.isBot || p.isReady);
  const myPlayerReady = players_data[my_player_number!]?.isReady;

  return (
    <div className="min-h-screen bg-[#0a1f13] flex flex-col items-center justify-center text-white p-4 md:p-6 font-sans relative overflow-hidden">
      {/* Background Polish */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      ></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-transparent to-black pointer-events-none"></div>

      <div className="w-full max-w-2xl relative z-10 flex flex-col gap-6 animate-fade-in-up">
        {/* ROOM HEADER CARD */}
        <div className="bg-gradient-to-br from-slate-900 to-black p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-yellow-500/20 transition-all duration-700"></div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase tracking-widest border border-yellow-500/30">
                  SALA {mode}
                </span>
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Aguardando
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
                {roomId}
              </h1>
            </div>

            <div className="flex items-center gap-3 self-start md:self-center">
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Link de Convite
                </span>
                <button
                  onClick={handleCopyLink}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all ${copied ? "bg-green-500 text-black border-green-400" : "bg-white/5 border-white/10 hover:border-white/30 text-slate-300 hover:text-white"}`}
                >
                  {copied ? (
                    <>
                      <Check size={16} strokeWidth={3} />
                      <span className="text-xs font-black uppercase tracking-wider">
                        Copiado!
                      </span>
                    </>
                  ) : (
                    <>
                      <Share2 size={16} />
                      <span className="text-xs font-black uppercase tracking-wider">
                        Copiar Link
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* TEAMS CARD */}
        <div className="bg-black/40 backdrop-blur-xl p-1 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <div className="bg-slate-900/40 p-6 md:p-8 rounded-[2.2rem]">
            <div className="flex flex-col md:flex-row gap-6 mb-8 relative">
              <TeamList
                teamName="Equipe 1"
                players={team1}
                color="border-blue-500/20 bg-blue-500/5 text-blue-200"
                myPlayerNumber={my_player_number}
              />

              <div className="flex items-center justify-center shrink-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                  <span className="text-xs font-black text-white/20 italic">
                    VS
                  </span>
                </div>
              </div>

              <TeamList
                teamName="Equipe 2"
                players={team2}
                color="border-red-500/20 bg-red-500/5 text-red-200"
                myPlayerNumber={my_player_number}
              />
            </div>

            <div className="flex flex-col gap-4">
              {/* Progress Bar (Visual only) */}
              <div className="bg-black/40 h-2 w-full rounded-full overflow-hidden p-0.5 border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-1000"
                  style={{
                    width: `${(Object.keys(players_data).length / maxPlayers) * 100}%`,
                  }}
                ></div>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <button
                  onClick={() => setShowRules(true)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group"
                >
                  {my_player_number === 1 ? (
                    <>
                      <Settings2
                        size={18}
                        className="group-hover:rotate-90 transition-transform duration-500"
                      />
                      Configurações
                    </>
                  ) : (
                    <>
                      <Eye
                        size={18}
                        className="group-hover:scale-110 transition-transform"
                      />
                      Ver Regras
                    </>
                  )}
                </button>

                {my_player_number === 1 && missingCount > 0 && (
                  <button
                    onClick={useGameStore.getState().addBot}
                    className="flex-1 bg-purple-600/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Bot size={18} /> Adicionar Bot
                  </button>
                )}

                {canSwitch && (
                  <button
                    onClick={useGameStore.getState().switchTeam}
                    className="flex-1 bg-blue-600/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                  >
                    ⇄ Trocar Time
                  </button>
                )}
              </div>

              {my_player_number === 1 && missingCount === 0 ? (
                <div className="animate-fade-in mt-2">
                  {!allOthersReady ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl text-center mb-4">
                      <p className="text-[10px] text-yellow-500 font-black uppercase tracking-[0.2em] animate-pulse">
                        Aguardando jogadores ficarem prontos...
                      </p>
                    </div>
                  ) : (
                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl text-center mb-4">
                      <p className="text-[10px] text-green-500 font-black uppercase tracking-[0.2em]">
                        Todos os jogadores estão prontos!
                      </p>
                    </div>
                  )}

                  {/* Rules Summary for everyone */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {rules.can_pickup_discard_with_joker && (
                      <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold text-blue-400 uppercase tracking-tight">
                        Lixo c/ Curinga
                      </span>
                    )}
                    {rules.team_can_take_both_dead_piles && (
                      <span className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-[9px] font-bold text-purple-400 uppercase tracking-tight">
                        2 Mortos p/ Equipe
                      </span>
                    )}
                    <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                      {rules.points_clean_canastra}pts Limpa
                    </span>
                    <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                      {rules.points_for_ending}pts Batida
                    </span>
                  </div>

                  <div
                    className={
                      !allOthersReady
                        ? "opacity-30 pointer-events-none grayscale"
                        : ""
                    }
                  >
                    <GameConfig onStart={startGame} />
                  </div>
                </div>
              ) : missingCount === 0 ? (
                <div className="w-full flex flex-col gap-3 mt-2">
                  {/* Display current win condition for non-hosts */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between mb-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        Meta da Partida
                      </span>
                      <span className="text-sm font-bold text-yellow-500 uppercase">
                        {!winCondition
                          ? "Partida Rápida"
                          : winCondition.type === "POINTS"
                            ? `${winCondition.value} Pontos`
                            : `${winCondition.value} Rodadas`}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                      <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">
                        {mode}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => useGameStore.getState().toggleReady()}
                    className={`w-full py-5 rounded-2xl font-black text-xl transition-all hover:scale-[1.02] active:scale-95 uppercase tracking-[0.2em] border-2 ${myPlayerReady ? "bg-green-500 border-green-400 text-black shadow-[0_0_30px_rgba(34,197,94,0.3)]" : "bg-black border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/5"}`}
                  >
                    {myPlayerReady ? "ESTOU PRONTO!" : "FICAR PRONTO"}
                  </button>
                  <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {myPlayerReady
                      ? "Aguardando líder iniciar a partida..."
                      : "Prepare-se para o jogo"}
                  </p>
                </div>
              ) : (
                <div className="w-full bg-white/5 text-slate-500 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] border border-white/5 mt-2 text-center animate-pulse">
                  Aguardando Jogadores... ({Object.keys(players_data).length}/
                  {maxPlayers})
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-white/5 flex justify-center">
                {my_player_number === 1 ? (
                  <button
                    onClick={() => useGameStore.getState().closeRoom()}
                    className="group flex items-center gap-2 text-[10px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-all"
                  >
                    <span className="w-4 h-[1px] bg-red-500/20 group-hover:w-8 transition-all"></span>
                    Encerrar Sala
                    <span className="w-4 h-[1px] bg-red-500/20 group-hover:w-8 transition-all"></span>
                  </button>
                ) : (
                  <button
                    onClick={() => useGameStore.getState().leaveGame()}
                    className="group flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-all"
                  >
                    <span className="w-4 h-[1px] bg-slate-500/20 group-hover:w-8 transition-all"></span>
                    Sair da Sala
                    <span className="w-4 h-[1px] bg-slate-500/20 group-hover:w-8 transition-all"></span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRules && (
        <GameRulesModal
          rules={rules}
          onRulesChange={setRules}
          onClose={() => setShowRules(false)}
          isHost={my_player_number === 1}
        />
      )}
    </div>
  );
};
