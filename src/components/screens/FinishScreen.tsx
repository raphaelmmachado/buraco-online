import { type ScoreResult } from "../../../common/utils/scoring";
import { MELD_POINTS, BONUS_POINTS } from "../../../common/types/card";
import { StyledButton } from "../ui/StyledButton";
import { RotateCcw, LogOut, Trophy, Target, Hash, Sparkles, XCircle } from "lucide-react";
import { type WinCondition } from "../../store/useGameStore";
import { motion } from "framer-motion";

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
  isRoundOver?: boolean;
  myTeam: number;
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
  isRoundOver = false,
}: FinishScreenProps) => {
  const effectiveScore = cumulativeScore || {
    team_1: finalScore.team_1,
    team_2: finalScore.team_2,
  };

  const isT1Winner = effectiveScore.team_1 > effectiveScore.team_2;
  const isT2Winner = effectiveScore.team_2 > effectiveScore.team_1;
  const isDraw = effectiveScore.team_1 === effectiveScore.team_2;

  const amIWinner = (myTeam === 1 && isT1Winner) || (myTeam === 2 && isT2Winner);

  const title = isRoundOver
    ? `Rodada ${roundCount}`
    : isDraw
      ? "Empate!"
      : amIWinner
        ? "Vitória!"
        : "Derrota";

  const subtitle = isRoundOver ? "Placar da Rodada" : "Fim de Campeonato";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen w-screen bg-[#061a0d] bg-radial-gradient from-[#0f2e1a] to-[#061a0d] text-white overflow-y-auto flex flex-col items-center py-8 px-4 font-sans"
    >
      {/* HEADER: CONSOLIDATED SCORE & ROUND */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full max-w-4xl p-8 md:p-12 rounded-[3rem] border backdrop-blur-xl shadow-2xl mb-10 overflow-hidden relative flex flex-col items-center gap-8 ${
          amIWinner
            ? "bg-yellow-500/5 border-yellow-500/20"
            : "bg-white/5 border-white/10"
        }`}
      >
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full blur-[120px] rounded-full pointer-events-none ${amIWinner ? 'bg-yellow-500/10' : 'bg-blue-500/5'}`}></div>

        {/* Round Info */}
        <div className="relative z-10 flex flex-col items-center">
          <h2
            className={`text-4xl md:text-6xl font-black uppercase tracking-tighter mb-2 ${
              amIWinner
                ? "text-transparent bg-clip-text bg-linear-to-b from-yellow-100 via-yellow-400 to-yellow-600 drop-shadow-[0_4px_12px_rgba(234,179,8,0.4)]"
                : "text-white/80"
            }`}
          >
            {title}
          </h2>
          <p className="text-white/30 uppercase tracking-[0.4em] text-[10px] font-black">
            {subtitle}
          </p>
        </div>

        {/* Scores */}
        <div className="flex gap-8 md:gap-20 items-center justify-center relative z-10">
          <ScoreTeamDisplay label="NÓS" score={effectiveScore.team_1} isActive={myTeam === 1} isWinner={isT1Winner} color="text-blue-400" />
          <div className="text-white/10 font-black text-2xl italic">VS</div>
          <ScoreTeamDisplay label="ELES" score={effectiveScore.team_2} isActive={myTeam === 2} isWinner={isT2Winner} color="text-red-400" />
        </div>

        {/* Goal/Meta */}
        {winCondition && (
          <div className="relative z-10 flex items-center gap-3 px-6 py-2 bg-black/40 rounded-full text-xs font-bold text-white/70 border border-white/10 shadow-xl backdrop-blur-md">
            {winCondition.type === "POINTS" ? (
              <Target size={16} className="text-yellow-400/70" />
            ) : (
              <Hash size={16} className="text-blue-400/70" />
            )}
            <span className="tracking-widest uppercase">
              {winCondition.type === "POINTS" 
                ? `Meta: ${winCondition.value} Pontos` 
                : `Melhor de ${winCondition.value} Rodadas`}
            </span>
          </div>
        )}
      </motion.div>

      {/* ROUND DETAILS */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <TeamScoreCard name="NÓS" teamId={1} isMyTeam={myTeam === 1} score={finalScore.team_1} details={finalScore.details_t1} delay={0.3} />
        <TeamScoreCard name="ELES" teamId={2} isMyTeam={myTeam === 2} score={finalScore.team_2} details={finalScore.details_t2} delay={0.4} />
      </div>

      {/* FOOTER ACTIONS */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col md:flex-row gap-4 w-full max-w-xl mt-auto"
      >
        <StyledButton onClick={onPlayAgain} variant="primary" size="lg" fullWidth icon={isRoundOver ? <Trophy size={20} /> : <RotateCcw size={20} />}>
          {isRoundOver ? "Próxima Rodada" : "Jogar Novamente"}
        </StyledButton>
        <StyledButton onClick={onLeave} variant="secondary" size="lg" fullWidth icon={<LogOut size={20} />}>
          Sair da Sala
        </StyledButton>
      </motion.div>
    </motion.div>
  );
};

const ScoreTeamDisplay = ({ label, score, isActive, isWinner, color }: { label: string, score: number, isActive: boolean, isWinner: boolean, color: string }) => (
  <div className="text-center">
    <span className={`block text-xs font-black uppercase tracking-widest mb-1 ${isActive ? color : 'text-white/20'}`}>{label}</span>
    <span className={`text-5xl md:text-7xl font-black tabular-nums ${isWinner ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/30'}`}>
      {score}
    </span>
  </div>
);

const TeamScoreCard = ({ name, teamId, isMyTeam, score, details, delay }: { 
  name: string, teamId: number, isMyTeam: boolean, score: number, details: ScoreResult, delay: number 
}) => (
  <motion.div
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay }}
    className={`flex flex-col rounded-[2rem] border transition-all shadow-xl relative overflow-hidden ${
      isMyTeam ? "border-blue-500/30 bg-blue-600/5" : "border-white/10 bg-white/[0.03]"
    }`}
  >
    <div className="p-6 md:p-8 flex flex-col h-full relative z-10">
      <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
        <div>
          <span className={`text-sm font-black uppercase tracking-widest ${isMyTeam ? 'text-blue-400' : 'text-white/40'}`}>
            {name} <span className="text-[10px] opacity-30">TIME {teamId}</span>
          </span>
          <div className="flex gap-2 mt-2">
            {details.did_beat && <Badge label="BATEU" color="bg-yellow-500/20 text-yellow-400 border-yellow-500/20" />}
            {details.has_taken_dead_pile && <Badge label="PEGOU MORTO" color="bg-blue-500/20 text-blue-300 border-blue-500/20" />}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black text-white/20 uppercase tracking-tighter">Total Rodada</span>
          <div className={`text-4xl font-black tabular-nums ${score >= 0 ? 'text-white' : 'text-red-400'}`}>
            {score > 0 && '+'}{score}
          </div>
        </div>
      </div>

      <ScoreBreakdown result={details} />
    </div>
  </motion.div>
);

const Badge = ({ label, color }: { label: string, color: string }) => (
  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${color}`}>{label}</span>
);

const ScoreBreakdown = ({ result }: { result: ScoreResult }) => {
  const beatBonus = result.did_beat ? BONUS_POINTS.BEAT : 0;
  const deadPilePenalty = !result.has_taken_dead_pile ? 100 : 0;
  const handPenalty = result.penalty_points - deadPilePenalty;

  return (
    <div className="space-y-4 w-full">
      {/* GANHOS */}
      <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
        <div className="bg-green-500/10 px-4 py-2 border-b border-white/5 flex items-center gap-2">
          <Sparkles size={14} className="text-green-400" />
          <h4 className="text-xs font-black uppercase text-green-400/80 tracking-widest">Ganhos</h4>
        </div>
        <div className="p-2 space-y-0.5">
          <StatRow label="Canastras Limpas" value={result.details.CLEAN} points={result.details.CLEAN * MELD_POINTS.CLEAN} color="text-blue-400" />
          <StatRow label="Canastras Sujas" value={result.details.DIRTY} points={result.details.DIRTY * MELD_POINTS.DIRTY} color="text-orange-400" />
          <StatRow label="Excelentes (500)" value={result.details.KING} points={result.details.KING * MELD_POINTS.KING} color="text-violet-400" />
          <StatRow label="Perfeitas (1000)" value={result.details.ACE} points={result.details.ACE * MELD_POINTS.ACE} color="text-green-400" />
          {beatBonus > 0 && <DetailRow label="Bônus de Batida" value={beatBonus} color="text-yellow-400" isBold />}
          <DetailRow label="Cartas na Mesa" value={result.base_points} color="text-white/70" />
        </div>
      </div>

      {/* PERDAS */}
      <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
        <div className="bg-red-500/10 px-4 py-2 border-b border-white/5 flex items-center gap-2">
          <XCircle size={14} className="text-red-400" />
          <h4 className="text-xs font-black uppercase text-red-400/80 tracking-widest">Perdas</h4>
        </div>
        <div className="p-2 space-y-0.5">
          {deadPilePenalty > 0 && <DetailRow label="Não pegou o Morto" value="-100" color="text-red-400" isBold />}
          <DetailRow label="Cartas na Mão" value={`-${handPenalty}`} color="text-red-300/60" />
          <div className="mt-2 pt-2 border-t border-white/10 px-3 flex justify-between items-center bg-red-950/20 -mx-2 -mb-2 py-3">
            <span className="text-xs font-black uppercase tracking-widest text-red-400">Total Perdas</span>
            <span className="text-xl font-black text-red-500">-{result.penalty_points}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatRow = ({ label, value, points, color }: { label: string, value: number, points: number, color: string }) => {
  if (value === 0) return null;
  return (
    <div className="flex justify-between items-center px-3 py-2 rounded-lg hover:bg-white/5">
      <span className="text-sm font-bold text-white/80">
        ({value}) {label}
      </span>
      <span className={`font-mono text-base font-black ${color}`}>+{points}</span>
    </div>
  );
};

const DetailRow = ({ label, value, color, isBold = false }: { label: string, value: string | number, color: string, isBold?: boolean }) => (
  <div className="flex justify-between items-center px-3 py-2 rounded-lg hover:bg-white/5">
    <span className={`text-sm ${isBold ? 'font-black' : 'font-medium text-white/50'}`}>{label}</span>
    <span className={`font-mono text-base font-black ${color}`}>{value}</span>
  </div>
);