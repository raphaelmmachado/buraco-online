import { type ScoreResult } from "../../../common/utils/scoring";
import { StyledButton } from "../ui/StyledButton";
import { RotateCcw, LogOut, Trophy, Target, Hash } from "lucide-react";
import { type WinCondition } from "../../store/useGameStore";
import { type GameRules } from "../../../common/types/rules";

interface FinishScreenProps {
  finalScore: {
    team_1: number;
    team_2: number;
    details_t1: ScoreResult;
    details_t2: ScoreResult;
  };
  cumulativeScore?: { team_1: number; team_2: number };
  roundCount?: number;
  winCondition?: WinCondition;
  rules: GameRules;
  isRoundOver?: boolean;
  myTeam: number;
  myPlayerId?: string; // SocketID logic? Or just ID. We need to check against rematchVotes keys.
  rematchVotes?: Record<string, boolean>;
  totalHumanPlayers?: number;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export const FinishScreen = ({ 
  finalScore, 
  myTeam, 
  onPlayAgain, 
  onLeave,
  cumulativeScore,
  roundCount = 1,
  winCondition,
  rules,
  isRoundOver = false,
  myPlayerId,
  rematchVotes = {},
  totalHumanPlayers = 0
}: FinishScreenProps) => {
  // Logic for Winner of the MATCH (Cumulative) or ROUND (FinalScore)
  // If isRoundOver, we care about round winner for visual pop, but general status for progress.
  
  const effectiveScore = cumulativeScore || { team_1: finalScore.team_1, team_2: finalScore.team_2 };
  
  const isT1Winner = effectiveScore.team_1 > effectiveScore.team_2;
  const isT2Winner = effectiveScore.team_2 > effectiveScore.team_1;
  const isDraw = effectiveScore.team_1 === effectiveScore.team_2;

  const amIWinner = (myTeam === 1 && isT1Winner) || (myTeam === 2 && isT2Winner);
  
  const title = isRoundOver 
    ? `Fim da Rodada ${roundCount}` 
    : (isDraw ? "Empate!" : amIWinner ? "Vitória!" : "Derrota");

  const subtitle = isRoundOver 
    ? "Pontuação Acumulada" 
    : "Fim de Campeonato";

  // Voting Logic
  const votesCount = Object.values(rematchVotes).filter(Boolean).length;
  const iVoted = myPlayerId && rematchVotes[myPlayerId];
  
  // If totalHumanPlayers is 0 (Local Game), we don't use voting logic visual, just click to continue.
  const isOnline = totalHumanPlayers > 0;

  return (
    <div className="h-screen w-screen bg-[#0f2e1a] text-white overflow-y-auto flex flex-col items-center py-10 px-4 font-sans">
      
      {/* HEADER: VICTORY / DEFEAT STATUS */}
      <div className={`w-full max-w-4xl p-8 text-center rounded-3xl border border-white/10 shadow-2xl mb-8 ${amIWinner ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <h2 className={`text-5xl md:text-8xl font-black uppercase tracking-tighter mb-4 drop-shadow-lg ${amIWinner ? 'text-yellow-400' : 'text-slate-400'}`}>
          {title}
        </h2>
        <div className="flex items-center justify-center gap-4">
            <p className="text-white/60 uppercase tracking-[0.5em] text-sm font-bold">{subtitle}</p>
            {winCondition && (
                <div className="flex items-center gap-2 px-2 py-1 bg-black/20 rounded text-xs font-mono text-white/40">
                    {winCondition.type === "POINTS" ? <Target size={12} /> : <Hash size={12} />}
                    <span>
                        {winCondition.type === "POINTS" ? `Meta: ${winCondition.value} pts` : `Melhor de ${winCondition.value}`}
                    </span>
                </div>
            )}
        </div>
      </div>

      {/* CUMULATIVE SCORE DISPLAY (Only if Championship Mode) */}
      {(cumulativeScore || isRoundOver) && (
          <div className="flex gap-4 md:gap-12 mb-8 items-center justify-center">
             <div className="text-center">
                <span className={`block text-xs font-bold uppercase tracking-widest ${myTeam === 1 ? 'text-blue-400' : 'text-slate-500'}`}>NÓS</span>
                <span className={`text-4xl md:text-6xl font-black tabular-nums ${effectiveScore.team_1 > effectiveScore.team_2 ? 'text-yellow-400' : 'text-white/50'}`}>
                    {effectiveScore.team_1}
                </span>
             </div>
             <div className="text-white/20 font-black text-2xl">VS</div>
             <div className="text-center">
                <span className={`block text-xs font-bold uppercase tracking-widest ${myTeam === 2 ? 'text-blue-400' : 'text-slate-500'}`}>ELES</span>
                <span className={`text-4xl md:text-6xl font-black tabular-nums ${effectiveScore.team_2 > effectiveScore.team_1 ? 'text-yellow-400' : 'text-white/50'}`}>
                    {effectiveScore.team_2}
                </span>
             </div>
          </div>
      )}

      {/* CONTENT: ROUND DETAILS */}
      <h3 className="text-white/40 uppercase tracking-widest text-xs font-bold mb-4">Detalhes da Rodada</h3>
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 mb-12">
        
        {/* TEAM 1 */}
        <div className={`flex flex-col gap-6 p-8 rounded-3xl border-2 transition-all shadow-xl ${myTeam === 1 ? 'border-blue-500/50 bg-blue-900/20' : 'border-white/10 bg-black/20'}`}>
          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <div className="flex flex-col">
              <span className={`text-sm font-black uppercase tracking-widest ${myTeam === 1 ? 'text-blue-400' : 'text-slate-500'}`}>
                NÓS (TIME 1)
              </span>
              <div className="flex gap-2 mt-1">
                {finalScore.details_t1.has_taken_dead_pile && (
                  <span className="text-[10px] bg-red-900/50 text-red-200 px-1.5 py-0.5 rounded border border-red-500/20">
                    PEGOU MORTO
                  </span>
                )}
                {finalScore.details_t1.did_beat && (
                  <span className="text-[10px] bg-yellow-900/50 text-yellow-200 px-1.5 py-0.5 rounded border border-yellow-500/20">
                    BATEU
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-5xl font-black text-white text-center py-4">+{finalScore.team_1}</div>
          
          <ScoreBreakdown result={finalScore.details_t1} rules={rules} />
        </div>

        {/* TEAM 2 */}
        <div className={`flex flex-col gap-6 p-8 rounded-3xl border-2 transition-all shadow-xl ${myTeam === 2 ? 'border-blue-500/50 bg-blue-900/20' : 'border-white/10 bg-black/20'}`}>
          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <div className="flex flex-col">
              <span className={`text-sm font-black uppercase tracking-widest ${myTeam === 2 ? 'text-blue-400' : 'text-slate-500'}`}>
                ELES (TIME 2)
              </span>
              <div className="flex gap-2 mt-1">
                {finalScore.details_t2.has_taken_dead_pile && (
                  <span className="text-[10px] bg-red-900/50 text-red-200 px-1.5 py-0.5 rounded border border-red-500/20">
                    PEGOU MORTO
                  </span>
                )}
                {finalScore.details_t2.did_beat && (
                  <span className="text-[10px] bg-yellow-900/50 text-yellow-200 px-1.5 py-0.5 rounded border border-yellow-500/20">
                    BATEU
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-5xl font-black text-white text-center py-4">+{finalScore.team_2}</div>
          
          <ScoreBreakdown result={finalScore.details_t2} rules={rules} />
        </div>

      </div>

      {/* FOOTER: ACTIONS */}
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
        <StyledButton
          onClick={onPlayAgain}
          variant={iVoted ? "secondary" : "primary"}
          size="lg"
          fullWidth
          disabled={!!iVoted && isOnline}
          icon={isRoundOver ? <Trophy size={20} /> : <RotateCcw size={20} />}
          className={iVoted ? "opacity-50" : "animate-pulse"}
        >
            {isOnline ? (
                iVoted ? (
                    `Aguardando... (${votesCount}/${totalHumanPlayers})`
                ) : (
                   isRoundOver ? "Estou Pronto (Próxima)" : "Jogar Novamente"
                )
            ) : (
                isRoundOver ? "Próxima Rodada" : "Jogar Novamente"
            )}
        </StyledButton>
        
        <StyledButton
          onClick={onLeave}
          variant="danger"
          size="lg"
          fullWidth
          icon={<LogOut size={20} />}
        >
          Sair da Sala
        </StyledButton>
      </div>

    </div>
  );
};

const ScoreBreakdown = ({ result, rules }: { result: ScoreResult, rules: GameRules }) => {
  // Positive Points Logic
  const cleanPoints = result.details.CLEAN * rules.pointsCleanCanastra;
  const dirtyPoints = result.details.DIRTY * rules.pointsDirtyCanastra;
  const realPoints = result.details.ACE * rules.pointsAceCanastra + result.details.KING * rules.pointsKingCanastra;
  const beatBonus = result.did_beat ? rules.pointsForEnding : 0;
  
  // Penalty Logic
  const deadPilePenalty = !result.has_taken_dead_pile ? Math.abs(rules.penaltyDeadPileNotTaken) : 0;
  const handPenalty = result.penalty_points - deadPilePenalty;

  return (
    <div className="space-y-4 text-sm md:text-base w-full">
      
      {/* SECTION: GANHOS (HUD STYLE) */}
      <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-lg backdrop-blur-sm group hover:border-green-500/30 transition-colors">
        <div className="bg-green-900/20 border-b border-white/5 p-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse"></div>
          <h4 className="text-[10px] md:text-xs font-black uppercase text-green-400 tracking-[0.2em]">
            Bônus & Pontos
          </h4>
        </div>
        
        <div className="p-2 space-y-1">
          {/* Canastras */}
          {result.details.CLEAN > 0 && (
            <DetailRow label="Canastra Limpa" count={result.details.CLEAN} multiplier={rules.pointsCleanCanastra} value={cleanPoints} color="text-green-300" icon="✨" />
          )}
          {result.details.DIRTY > 0 && (
            <DetailRow label="Canastra Suja" count={result.details.DIRTY} multiplier={rules.pointsDirtyCanastra} value={dirtyPoints} color="text-green-200/70" icon="🃏" />
          )}
          {(result.details.ACE + result.details.KING) > 0 && (
            <DetailRow label="Canastra Real/Especiais" value={realPoints} color="text-purple-300" icon="👑" />
          )}

          {/* Batida */}
          {beatBonus > 0 && (
            <DetailRow label="Vitória (Batida)" value={beatBonus} color="text-yellow-300" icon="🚩" isBold />
          )}

          {/* Cartas na Mesa */}
          <DetailRow label="Cartas na Mesa" value={result.base_points} color="text-white" icon="🎴" />
        </div>
      </div>

      {/* SECTION: PERDAS (HUD STYLE) */}
      <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-lg backdrop-blur-sm group hover:border-red-500/30 transition-colors">
        <div className="bg-red-900/20 border-b border-white/5 p-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
          <h4 className="text-[10px] md:text-xs font-black uppercase text-red-400 tracking-[0.2em]">
            Penalidades
          </h4>
        </div>
        
        <div className="p-2 space-y-1">
          {/* Morto */}
          {deadPilePenalty > 0 && (
            <DetailRow label="Não pegou o Morto" value={`-${deadPilePenalty}`} color="text-red-400" icon="💀" isBold />
          )}

          {/* Mão */}
          <DetailRow label="Sobra na Mão" value={`-${handPenalty}`} color="text-red-300" icon="✋" />
          
          <div className="border-t border-white/10 mt-2 pt-2 px-2 flex justify-between items-center bg-red-950/10 -mx-2 -mb-2 pb-2">
             <span className="text-[10px] text-red-400/70 font-bold uppercase tracking-wider">Total Descontado</span>
             <span className="text-red-500 font-mono font-black text-lg">-{result.penalty_points}</span>
          </div>
        </div>
      </div>

    </div>
  );
};

const DetailRow = ({ 
  label, 
  count, 
  multiplier, 
  value, 
  color = "text-white", 
  icon,
  isBold = false
}: { 
  label: string, 
  count?: number, 
  multiplier?: number, 
  value: string | number, 
  color?: string,
  icon?: string,
  isBold?: boolean
}) => (
  <div className="flex justify-between items-center p-2 rounded hover:bg-white/5 transition-colors group/row">
    <div className="flex items-center gap-3">
        {icon && <span className="text-sm opacity-50 grayscale group-hover/row:grayscale-0 transition-all">{icon}</span>}
        <div className="flex flex-col">
            <span className={`text-slate-300 text-xs md:text-sm ${isBold ? 'font-bold' : 'font-medium'}`}>{label}</span>
            {count !== undefined && multiplier !== undefined && (
                <span className="text-[9px] text-slate-500 font-mono tracking-tighter">
                    {count} <span className="text-slate-600">x</span> {multiplier}
                </span>
            )}
        </div>
    </div>
    <span className={`font-mono text-base md:text-lg ${isBold ? 'font-black' : 'font-bold'} ${color} tabular-nums`}>
        {value}
    </span>
  </div>
);
