import { type ScoreResult } from "../../../common/utils/scoring";
import { MELD_POINTS } from "../../../common/types/card";
import { StyledButton } from "../ui/StyledButton";
import {
  RotateCcw,
  LogOut,
  Trophy,
  Sparkles,
  XCircle,
  Target,
  Hash,
  Crown,
  TrendingUp,
} from "lucide-react";
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
  myPlayerId?: string;
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
  isRoundOver = false,
  myPlayerId,
  rematchVotes = {},
  totalHumanPlayers = 0,
}: FinishScreenProps) => {
  const effectiveScore = cumulativeScore || {
    team_1: finalScore.team_1,
    team_2: finalScore.team_2,
  };

  const isT1Winner = effectiveScore.team_1 > effectiveScore.team_2;
  const isT2Winner = effectiveScore.team_2 > effectiveScore.team_1;
  const isDraw = effectiveScore.team_1 === effectiveScore.team_2;

  const amIWinner =
    (myTeam === 1 && isT1Winner) || (myTeam === 2 && isT2Winner);

  // Voting Logic
  const votesCount = Object.values(rematchVotes).filter(Boolean).length;
  const iVoted = myPlayerId && rematchVotes[myPlayerId];
  const isOnline = totalHumanPlayers > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-[#061a0d] bg-radial-gradient from-[#0f2e1a] to-[#061a0d] text-white overflow-y-auto overflow-x-hidden flex flex-col items-center py-8 px-4 font-sans z-[300]"
    >
      {/* 1. CAMPEONATO HEADER (PROGRESSO TOTAL) */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-5xl mb-12 relative flex flex-col items-center"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px w-12 md:w-32 bg-linear-to-r from-transparent to-white/20"></div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md shadow-xl">
            <Crown size={14} className="text-yellow-500" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-white/70">
              {isRoundOver ? `Rodada ${roundCount}` : "Resultado Final"}
            </span>
          </div>
          <div className="h-px w-12 md:w-32 bg-linear-to-l from-transparent to-white/20"></div>
        </div>

        {/* COMPARATIVO DE PONTOS ACUMULADOS */}
        <div className="grid grid-cols-3 w-full items-center gap-4 md:gap-12 px-4">
          {/* TIME 1 */}
          <div className="flex flex-col items-end">
            <span
              className={`text-[10px] md:text-xs font-black mb-2 tracking-widest ${myTeam === 1 ? "text-blue-400" : "text-white/20"}`}
            >
              NÓS
            </span>
            <div className="relative">
              <span
                className={`text-5xl md:text-9xl font-black tabular-nums tracking-tighter ${isT1Winner ? "text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]" : "text-white/20"}`}
              >
                {effectiveScore.team_1}
              </span>
              {isT1Winner && !isDraw && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-4 -right-4 md:-top-8 md:-right-8 bg-yellow-500 text-black p-1.5 md:p-2 rounded-full shadow-lg"
                >
                  <Trophy size={isRoundOver ? 16 : 24} />
                </motion.div>
              )}
            </div>
          </div>

          {/* VS & META */}
          <div className="flex flex-col items-center gap-4">
            <span className="text-2xl md:text-4xl font-black italic text-white/10 tracking-widest">
              VS
            </span>

            {winCondition && (
              <div className="flex flex-col items-center gap-1.5 bg-black/40 border border-white/5 px-4 md:px-6 py-2 rounded-2xl shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-2 text-yellow-500/80">
                  {winCondition.type === "POINTS" ? (
                    <Target size={14} />
                  ) : (
                    <Hash size={14} />
                  )}
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                    Meta
                  </span>
                </div>
                <span className="text-lg md:text-2xl font-black text-white/90 tabular-nums">
                  {winCondition.value}
                </span>

                {/* Progress Bar (if points) */}
                {winCondition.type === "POINTS" && (
                  <div className="w-20 md:w-32 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, (Math.max(effectiveScore.team_1, effectiveScore.team_2) / winCondition.value) * 100)}%`,
                      }}
                      className="h-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TIME 2 */}
          <div className="flex flex-col items-start">
            <span
              className={`text-[10px] md:text-xs font-black mb-2 tracking-widest ${myTeam === 2 ? "text-red-400" : "text-white/20"}`}
            >
              ELES
            </span>
            <div className="relative">
              <span
                className={`text-5xl md:text-9xl font-black tabular-nums tracking-tighter ${isT2Winner ? "text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]" : "text-white/20"}`}
              >
                {effectiveScore.team_2}
              </span>
              {isT2Winner && !isDraw && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-4 -left-4 md:-top-8 md:-left-8 bg-yellow-500 text-black p-1.5 md:p-2 rounded-full shadow-lg"
                >
                  <Trophy size={isRoundOver ? 16 : 24} />
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* MENSAGEM DE STATUS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <h2
            className={`text-2xl md:text-4xl font-black uppercase tracking-tight ${amIWinner ? "text-yellow-400" : isDraw ? "text-white/60" : "text-red-400"}`}
          >
            {isDraw
              ? "Partida Empatada"
              : isRoundOver
                ? amIWinner
                  ? "Liderança de Vocês!"
                  : "Vantagem Deles!"
                : amIWinner
                  ? "Vocês Venceram!"
                  : "Eles Venceram!"}
          </h2>
        </motion.div>
      </motion.div>

      {/* 2. DETALHAMENTO DA RODADA (CARDS) */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <TeamRoundCard
          title="SEU TIME"
          teamId={1}
          isMyTeam={myTeam === 1}
          score={finalScore.team_1}
          details={finalScore.details_t1}
          delay={0.4}
        />
        <TeamRoundCard
          title="OPONENTE"
          teamId={2}
          isMyTeam={myTeam === 2}
          score={finalScore.team_2}
          details={finalScore.details_t2}
          delay={0.5}
        />
      </div>

      {/* 3. AÇÕES FIXAS NO RODAPÉ */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col md:flex-row gap-4 w-full max-w-xl mt-auto pb-8"
      >
        <StyledButton
          onClick={onPlayAgain}
          variant={iVoted ? "secondary" : "primary"}
          size="lg"
          fullWidth
          disabled={!!iVoted && isOnline}
          icon={isRoundOver ? <Trophy size={20} /> : <RotateCcw size={20} />}
          className={iVoted ? "opacity-50" : ""}
        >
          {isOnline
            ? iVoted
              ? `Aguardando... (${votesCount}/${totalHumanPlayers})`
              : isRoundOver
                ? "Próxima Rodada"
                : "Jogar Novamente"
            : isRoundOver
              ? "Próxima Rodada"
              : "Jogar Novamente"}
        </StyledButton>
        <StyledButton
          onClick={onLeave}
          variant="secondary"
          size="lg"
          fullWidth
          icon={<LogOut size={20} />}
        >
          Sair da Sala
        </StyledButton>
      </motion.div>
    </motion.div>
  );
};

/* --- COMPONENTES AUXILIARES INTERNOS --- */

const TeamRoundCard = ({
  title,
  teamId,
  isMyTeam,
  score,
  details,
  delay,
}: {
  title: string;
  teamId: number;
  isMyTeam: boolean;
  score: number;
  details: ScoreResult;
  delay: number;
}) => (
  <motion.div
    initial={{ x: teamId === 1 ? -20 : 20, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ delay }}
    className={`flex flex-col rounded-[2.5rem] border backdrop-blur-md overflow-hidden shadow-2xl ${
      isMyTeam
        ? "bg-blue-600/5 border-blue-500/20"
        : "bg-white/[0.02] border-white/5"
    }`}
  >
    <div className="p-8 md:p-10">
      {/* Header do Card */}
      <div className="flex justify-between items-start mb-8 border-b border-white/5 pb-6">
        <div className="flex flex-col gap-1">
          <span
            className={`text-xs font-black tracking-[0.3em] ${isMyTeam ? "text-blue-400" : "text-white/40"}`}
          >
            {title}{" "}
            <span className="text-[10px] opacity-30 ml-2">TIME {teamId}</span>
          </span>
          <div className="flex gap-2 mt-3">
            {details.did_beat && (
              <Badge
                label="BATEU"
                color="bg-yellow-500/20 text-yellow-400 border-yellow-500/20"
              />
            )}
            {details.has_taken_dead_pile && (
              <Badge
                label="PEGOU MORTO"
                color="bg-blue-500/20 text-blue-300 border-blue-500/20"
              />
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">
            <TrendingUp size={12} /> Pontos Rodada
          </div>
          <div
            className={`text-5xl font-black tabular-nums tracking-tighter ${score >= 0 ? "text-white" : "text-red-500"}`}
          >
            {score > 0 && "+"}
            {score}
          </div>
        </div>
      </div>

      <DetailedScoreBreakdown result={details} />
    </div>
  </motion.div>
);

const DetailedScoreBreakdown = ({ result }: { result: ScoreResult }) => {
  // Calculamos o bônus de batida subtraindo canastras do bônus total
  const canastraPointsTotal =
    result.details.CLEAN * MELD_POINTS.CLEAN +
    result.details.DIRTY * MELD_POINTS.DIRTY +
    result.details.KING * MELD_POINTS.KING +
    result.details.ACE * MELD_POINTS.ACE;
  const beatBonus = result.did_beat
    ? result.bonus_points - canastraPointsTotal
    : 0;

  // Penalidades
  const deadPilePenalty = !result.has_taken_dead_pile ? 100 : 0;
  const handPenalty = result.penalty_points - deadPilePenalty;

  return (
    <div className="flex flex-col gap-6">
      {/* GANHOS */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-3 text-green-400/50">
          <Sparkles size={14} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">
            Bonificações
          </span>
        </div>
        <StatRow
          label="Limpas"
          count={result.details.CLEAN}
          total={result.details.CLEAN * MELD_POINTS.CLEAN}
          color="text-blue-400"
        />
        <StatRow
          label="Sujas"
          count={result.details.DIRTY}
          total={result.details.DIRTY * MELD_POINTS.DIRTY}
          color="text-orange-400"
        />
        <StatRow
          label="Excelente (A a K)"
          count={result.details.KING}
          total={result.details.KING * MELD_POINTS.KING}
          color="text-violet-400"
        />
        <StatRow
          label="Perfeitas (A a A)"
          count={result.details.ACE}
          total={result.details.ACE * MELD_POINTS.ACE}
          color="text-green-400"
        />
        {beatBonus > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-white/5 border-dashed">
            <span className="text-sm font-black text-yellow-400/80">
              Bônus de Batida
            </span>
            <span className="font-mono text-lg font-black text-yellow-400">
              +{beatBonus}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center py-2">
          <span className="text-sm font-medium text-white/40">
            Soma das Cartas (Mesa)
          </span>
          <span className="font-mono text-lg font-black text-white/60">
            +{result.base_points}
          </span>
        </div>

        <div className="bg-green-500/10 rounded-xl px-4 py-3 flex justify-between items-center mt-2 border border-green-500/10">
          <span className="text-xs font-black uppercase tracking-widest text-green-400">
            Total Ganhos
          </span>
          <span className="text-2xl font-black text-green-400">
            +{result.base_points + result.bonus_points}
          </span>
        </div>
      </div>

      {/* PERDAS */}
      <div className="space-y-1 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 mb-3 text-red-400/50">
          <XCircle size={14} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">
            Penalidades
          </span>
        </div>
        {deadPilePenalty > 0 && (
          <div className="flex justify-between items-center py-2 text-red-400">
            <span className="text-sm font-black">Não pegou o Morto</span>
            <span className="font-mono text-lg font-black">-100</span>
          </div>
        )}
        <div className="flex justify-between items-center py-2">
          <span className="text-sm font-medium text-red-300/40">
            Cartas na Mão
          </span>
          <span className="font-mono text-lg font-black text-red-400/60">
            -{handPenalty}
          </span>
        </div>

        <div className="bg-red-500/10 rounded-xl px-4 py-3 flex justify-between items-center mt-2 border border-red-500/10">
          <span className="text-xs font-black uppercase tracking-widest text-red-400">
            Total Perdas
          </span>
          <span className="text-2xl font-black text-red-500">
            -{result.penalty_points}
          </span>
        </div>
      </div>
    </div>
  );
};

const StatRow = ({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) => {
  if (count === 0) return null;
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 border-dashed last:border-0">
      <span className="text-sm font-bold text-white/80">
        {count} {label}
      </span>
      <span className={`font-mono text-lg font-black ${color}`}>+{total}</span>
    </div>
  );
};

const Badge = ({ label, color }: { label: string; color: string }) => (
  <span
    className={`text-[9px] font-black px-3 py-1 rounded-full border shadow-sm ${color}`}
  >
    {label}
  </span>
);
