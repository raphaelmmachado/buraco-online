import {
  type ScoreResult,
  type RoundHistoryItem,
} from "../../../common/utils/scoring";
import { type GameRules, DEFAULT_RULES } from "../../../common/types/rules";
import { useState } from "react";
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
  History,
  ChevronDown,
  ChevronUp,
  Play,
} from "lucide-react";
import { type WinCondition } from "../../store/useGameStore";
import { motion, AnimatePresence } from "framer-motion";

interface FinishScreenProps {
  finalScore: {
    team_1: number;
    team_2: number;
    details_t1: ScoreResult;
    details_t2: ScoreResult;
  };
  cumulativeScore?: { team_1: number; team_2: number };
  roundCount?: number;
  roundHistory?: RoundHistoryItem[];
  winCondition?: WinCondition;
  isRoundOver?: boolean;
  myTeam: number;
  myPlayerId?: string;
  rematchVotes?: Record<string, boolean>;
  totalHumanPlayers?: number;
  onPlayAgain: () => void;
  onLeave: () => void;
  isLeader?: boolean;
  rules?: GameRules;
}

export const FinishScreen = ({
  finalScore,
  myTeam,
  onPlayAgain,
  onLeave,
  cumulativeScore,
  roundCount = 1,
  roundHistory = [],
  winCondition,
  isRoundOver = false,
  myPlayerId,
  rematchVotes = {},
  totalHumanPlayers = 0,
  isLeader = false,
  rules,
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
        <motion.button
          whileHover={iVoted ? {} : { scale: 1.05 }}
          whileTap={iVoted ? {} : { scale: 0.95 }}
          onClick={onPlayAgain}
          disabled={!!iVoted && isOnline}
          className={`flex items-center gap-2 px-5 py-2 rounded-full font-black text-xs uppercase tracking-wider mb-8 shadow-lg border transition-all cursor-pointer ${
            iVoted
              ? "bg-white/10 border-white/20 text-white/40 cursor-not-allowed shadow-none"
              : "bg-gradient-to-r from-amber-400 to-yellow-500 text-black border-amber-300/60 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]"
          }`}
        >
          <Play size={13} className="fill-black shrink-0" />
          <span>
            {isOnline && iVoted
              ? `Aguardando... (${votesCount}/${totalHumanPlayers})`
              : "Continuar Rodada"}
          </span>
        </motion.button>

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
              <div className="flex flex-col items-center gap-1.5 bg-black/60 border border-white/10 px-4 md:px-6 py-2 rounded-2xl shadow-2xl">
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
              ? "Placar Empatado"
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
      <div className="w-full max-w-6xl flex flex-col items-center mb-12">
        <div className="flex items-center gap-2 sm:gap-4 mb-6 w-full justify-center px-2">
          <div className="h-px flex-1 min-w-[20px] max-w-[80px] md:max-w-[128px] bg-linear-to-r from-transparent to-white/20"></div>
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#092213] border border-white/15 shadow-xl">
            <Crown size={14} className="text-yellow-500 shrink-0" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-wider sm:tracking-[0.25em] text-white/80 text-center">
              {isRoundOver ? `Rodada ${roundCount}` : "Resultado Final"}
            </span>
          </div>
          <div className="h-px flex-1 min-w-[20px] max-w-[80px] md:max-w-[128px] bg-linear-to-l from-transparent to-white/20"></div>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <TeamRoundCard
            title="SEU TIME"
            teamId={1}
            isMyTeam={myTeam === 1}
            score={finalScore.team_1}
            details={finalScore.details_t1}
            delay={0.4}
            rules={rules || DEFAULT_RULES}
          />
          <TeamRoundCard
            title="OPONENTE"
            teamId={2}
            isMyTeam={myTeam === 2}
            score={finalScore.team_2}
            details={finalScore.details_t2}
            delay={0.5}
            rules={rules || DEFAULT_RULES}
          />
        </div>
      </div>

      {/* 2.5 HISTÓRICO DE TODAS AS RODADAS NO FINAL DA PÁGINA */}
      <RoundHistorySection
        roundHistory={roundHistory}
        myTeam={myTeam}
        rules={rules || DEFAULT_RULES}
        isRoundOver={isRoundOver}
        currentRoundNumber={roundCount}
      />

      {/* 3. AÇÕES NO RODAPÉ COM DESIGN PREMIUM HARMÔNICO AO JOGO */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col md:flex-row gap-6 w-full max-w-2xl mt-auto pb-12 items-center"
      >
        <motion.button
          whileHover={iVoted ? {} : { scale: 1.03, y: -2 }}
          whileTap={iVoted ? {} : { scale: 0.97 }}
          onClick={onPlayAgain}
          disabled={!!iVoted && isOnline}
          className={`relative flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-black text-base md:text-lg uppercase tracking-[0.15em] shadow-2xl transition-all duration-300 overflow-hidden w-full flex-1 ${
            iVoted
              ? "bg-white/10 border border-white/20 text-white/40 cursor-not-allowed shadow-none"
              : "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black shadow-[0_0_40px_rgba(245,158,11,0.5)] border border-amber-200/60 hover:shadow-[0_0_60px_rgba(245,158,11,0.8)] hover:border-amber-100"
          }`}
        >
          {/* Subtle shine overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-30 animate-pulse pointer-events-none" />
          {isRoundOver ? (
            <Trophy size={22} className="shrink-0 drop-shadow-md" />
          ) : (
            <RotateCcw size={22} className="shrink-0 drop-shadow-md" />
          )}
          <span className="relative z-10 drop-shadow-sm">
            {isOnline
              ? iVoted
                ? `Aguardando... (${votesCount}/${totalHumanPlayers})`
                : isRoundOver
                  ? "Próxima Rodada"
                  : "Jogar Novamente"
              : isRoundOver
                ? "Próxima Rodada"
                : "Jogar Novamente"}
          </span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onLeave}
          className="relative flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-black text-sm md:text-base uppercase tracking-widest bg-gradient-to-b from-red-950/60 via-[#1a080a]/80 to-black/90 border border-red-500/40 text-red-300 shadow-[0_0_25px_rgba(239,68,68,0.2)] hover:border-red-500/80 hover:text-red-100 hover:shadow-[0_0_40px_rgba(239,68,68,0.5)] hover:bg-red-950/80 transition-all duration-300 w-full md:w-auto md:min-w-[220px]"
        >
          <LogOut size={20} className="text-red-400 shrink-0" />
          <span className="relative z-10">
            {isLeader ? "Encerrar Partida" : "Sair da Sala"}
          </span>
        </motion.button>
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
  rules,
}: {
  title: string;
  teamId: number;
  isMyTeam: boolean;
  score: number;
  details: ScoreResult;
  delay: number;
  rules: GameRules;
}) => (
  <motion.div
    initial={{ x: teamId === 1 ? -20 : 20, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ delay }}
    className={`flex flex-col rounded-[2rem] md:rounded-[2.5rem] border overflow-hidden shadow-2xl ${
      isMyTeam
        ? "bg-[#091b2c] border-blue-500/30"
        : "bg-[#09170e] border-white/10"
    }`}
  >
    <div className="p-5 sm:p-8 md:p-10">
      {/* Header do Card */}
      <div className="flex justify-between items-start mb-8 border-b border-white/5 pb-6">
        <div className="flex flex-col gap-1">
          <span
            className={`text-xs font-black tracking-[0.3em] ${isMyTeam ? "text-blue-400" : "text-red-400"}`}
          >
            {title}
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

      <DetailedScoreBreakdown result={details} rules={rules} />
    </div>
  </motion.div>
);

const DetailedScoreBreakdown = ({
  result,
  rules,
}: {
  result: ScoreResult;
  rules: GameRules;
}) => {
  const r = rules || {
    points_clean_canastra: 200,
    points_dirty_canastra: 100,
    points_king_canastra: 500,
    points_ace_canastra: 1000,
    penalty_dead_pile_not_taken: -100,
  };

  // Calculamos o bônus de canastras usando as regras
  const canastraPointsTotal =
    result.details.CLEAN * r.points_clean_canastra +
    result.details.DIRTY * r.points_dirty_canastra +
    result.details.KING * r.points_king_canastra +
    result.details.ACE * r.points_ace_canastra;

  const beatBonus = result.did_beat
    ? result.bonus_points - canastraPointsTotal
    : 0;

  // Penalidades
  const deadPilePenalty = !result.has_taken_dead_pile
    ? Math.abs(r.penalty_dead_pile_not_taken)
    : 0;
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
          total={result.details.CLEAN * r.points_clean_canastra}
          color="text-blue-400"
        />
        <StatRow
          label="Sujas"
          count={result.details.DIRTY}
          total={result.details.DIRTY * r.points_dirty_canastra}
          color="text-orange-400"
        />
        <StatRow
          label="Excelente (A a K)"
          count={result.details.KING}
          total={result.details.KING * r.points_king_canastra}
          color="text-violet-400"
        />
        <StatRow
          label="Perfeitas (A a A)"
          count={result.details.ACE}
          total={result.details.ACE * r.points_ace_canastra}
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
            <span className="font-mono text-lg font-black">
              -{deadPilePenalty}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center py-2">
          <span className="text-sm font-medium text-red-300/40">
            Cartas na Mão
          </span>
          <span className="font-mono text-lg font-black text-red-400/60">
            {handPenalty > 0 ? `-${handPenalty}` : "0"}
          </span>
        </div>

        <div className="bg-red-500/10 rounded-xl px-4 py-3 flex justify-between items-center mt-2 border border-red-500/10">
          <span className="text-xs font-black uppercase tracking-widest text-red-400">
            Total Perdas
          </span>
          <span className="text-2xl font-black text-red-500">
            {result.penalty_points > 0 ? `-${result.penalty_points}` : "0"}
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

const RoundHistorySection = ({
  roundHistory,
  myTeam,
  rules,
  isRoundOver,
  currentRoundNumber = 1,
}: {
  roundHistory: RoundHistoryItem[];
  myTeam: number;
  rules: GameRules;
  isRoundOver: boolean;
  currentRoundNumber?: number;
}) => {
  // Remove a rodada atual que já está sendo exibida em destaque no Section 2 acima e evita duplicidades no array
  const previousRounds = roundHistory
    .filter(
      (item, index, self) =>
        item.round_number < currentRoundNumber &&
        index === self.findIndex((r) => r.round_number === item.round_number),
    )
    .sort((a, b) => a.round_number - b.round_number);

  // Se a partida encerrou ou estamos em rodadas adiantadas, armazena estado de expansão
  const [expandedRounds, setExpandedRounds] = useState<number[]>(() =>
    !isRoundOver ? previousRounds.map((r) => r.round_number) : [],
  );

  if (!previousRounds || previousRounds.length === 0) return null;

  const toggleRound = (roundNum: number) => {
    setExpandedRounds((prev) =>
      prev.includes(roundNum)
        ? prev.filter((n) => n !== roundNum)
        : [...prev, roundNum],
    );
  };

  const isAllExpanded = expandedRounds.length === previousRounds.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="w-full max-w-6xl mb-16 flex flex-col items-center"
    >
      {/* Header do Histórico combinando com a estética das seções anteriores */}
      <div className="flex items-center gap-2 sm:gap-4 mb-6 w-full justify-center px-2">
        <div className="h-px flex-1 min-w-[20px] max-w-[80px] md:max-w-[128px] bg-gradient-to-r from-transparent to-white/20" />
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#092213] border border-white/15 shadow-xl">
          <History size={14} className="text-yellow-400 shrink-0" />
          <span className="text-[10px] md:text-xs font-black uppercase tracking-wider sm:tracking-[0.25em] text-white/80">
            Rodadas Anteriores
          </span>
        </div>
        <div className="h-px flex-1 min-w-[20px] max-w-[80px] md:max-w-[128px] bg-gradient-to-l from-transparent to-white/20" />
      </div>

      {previousRounds.length > 1 && (
        <div className="w-full flex justify-end mb-4 px-2">
          <button
            onClick={() =>
              setExpandedRounds(
                isAllExpanded ? [] : previousRounds.map((r) => r.round_number),
              )
            }
            className="text-xs font-bold uppercase tracking-[0.15em] text-white/70 hover:text-white transition-all bg-white/10 hover:bg-white/15 px-4 py-2 rounded-xl border border-white/15 shadow-md flex items-center gap-2 cursor-pointer"
          >
            {isAllExpanded ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
            {isAllExpanded
              ? "Recolher Todas as Rodadas"
              : "Expandir Detalhes de Todas"}
          </button>
        </div>
      )}

      <div className="w-full space-y-4 sm:space-y-6">
        {previousRounds.map((item) => {
          const isExpanded = expandedRounds.includes(item.round_number);
          const t1Won = item.team_1_score > item.team_2_score;
          const t2Won = item.team_2_score > item.team_1_score;

          return (
            <div
              key={item.round_number}
              className="flex flex-col rounded-[2rem] md:rounded-[2.5rem] border overflow-hidden shadow-2xl bg-[#09170e] border-white/10 hover:border-white/20 transition-all duration-300"
            >
              {/* Cabeçalho da Rodada (Clicável para expandir/recolher) */}
              <button
                onClick={() => toggleRound(item.round_number)}
                className="w-full p-4 sm:p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 cursor-pointer hover:bg-white/[0.03] transition-colors text-left group"
              >
                <div className="flex items-center gap-3 sm:gap-5 w-full md:w-auto">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-white/80 text-base sm:text-lg md:text-xl shadow-inner group-hover:scale-105 group-hover:border-white/20 transition-all shrink-0">
                    #{item.round_number}
                  </div>
                  <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0 flex-1">
                    <span className="text-sm md:text-base font-black tracking-wide sm:tracking-[0.15em] text-white/90 uppercase truncate">
                      Rodada {item.round_number}
                    </span>
                    <span className="text-[11px] sm:text-xs font-medium text-white/50 tracking-wide line-clamp-1">
                      {t1Won
                        ? "Vantagem do Seu Time nesta rodada"
                        : t2Won
                          ? "Vantagem do Oponente nesta rodada"
                          : "Empate no placar da rodada"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                  <div className="flex items-center gap-4 sm:gap-5 bg-black/60 px-4 sm:px-6 py-2.5 rounded-2xl border border-white/10 shadow-inner font-mono flex-1 md:flex-initial justify-center">
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-0.5">
                        NÓS
                      </span>
                      <span
                        className={`font-black text-lg sm:text-xl md:text-2xl leading-none tabular-nums ${
                          myTeam === 1 ? "text-blue-400" : "text-white/80"
                        }`}
                      >
                        {item.team_1_score > 0 ? "+" : ""}
                        {item.team_1_score}
                      </span>
                    </div>
                    <span className="text-white/20 text-xs font-black italic tracking-widest self-center px-1">
                      VS
                    </span>
                    <div className="flex flex-col items-start">
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-0.5">
                        ELES
                      </span>
                      <span
                        className={`font-black text-lg sm:text-xl md:text-2xl leading-none tabular-nums ${
                          myTeam === 2 ? "text-red-400" : "text-white/80"
                        }`}
                      >
                        {item.team_2_score > 0 ? "+" : ""}
                        {item.team_2_score}
                      </span>
                    </div>
                  </div>

                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white/80 group-hover:bg-white/10 transition-all shrink-0">
                    {isExpanded ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </div>
                </div>
              </button>

              {/* Corpo Detalhado da Rodada */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden border-t border-white/5 bg-black/40 p-4 sm:p-6 md:p-10"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <TeamRoundCard
                        title="SEU TIME"
                        teamId={1}
                        isMyTeam={myTeam === 1}
                        score={item.team_1_score}
                        details={item.details_t1}
                        delay={0}
                        rules={rules}
                      />
                      <TeamRoundCard
                        title="OPONENTE"
                        teamId={2}
                        isMyTeam={myTeam === 2}
                        score={item.team_2_score}
                        details={item.details_t2}
                        delay={0}
                        rules={rules}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
