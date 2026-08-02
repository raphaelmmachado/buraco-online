import { motion } from "framer-motion";
import { Trophy, ArrowRight, LogOut } from "lucide-react";
import { StyledButton } from "../ui/StyledButton";
import { type ScoreResult } from "../../../common/utils/scoring";

interface RoundSummaryOverlayProps {
  finalScore: {
    team_1: number;
    team_2: number;
    details_t1: ScoreResult;
    details_t2: ScoreResult;
  };
  cumulativeScore?: { team_1: number; team_2: number };
  onNextRound: () => void;
  onLeave: () => void;
  onViewDetails: () => void; // Nova ação
  isLeader: boolean;
  roundCount: number;
}

export const RoundSummaryOverlay = ({
  finalScore,
  cumulativeScore,
  onNextRound,
  onLeave,
  onViewDetails,
  isLeader,
  roundCount,
}: RoundSummaryOverlayProps) => {
  const t1_won = finalScore.team_1 > finalScore.team_2;
  const t2_won = finalScore.team_2 > finalScore.team_1;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm pointer-events-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-lg bg-gray-900/90 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden pointer-events-auto"
      >
        {/* Header */}
        <div className="p-6 text-center bg-gradient-to-b from-white/5 to-transparent border-b border-white/5">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-yellow-500/20 rounded-2xl text-yellow-500">
              <Trophy size={24} />
            </div>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
            Rodada {roundCount} Encerrada
          </h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            Resumo da pontuação alcançada
          </p>
        </div>

        {/* Scores Grid */}
        <div className="p-6 grid grid-cols-2 gap-4">
          {/* Team 1 */}
          <div className={`p-4 rounded-3xl border transition-all ${t1_won ? 'bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20' : 'bg-white/5 border-white/5 opacity-60'}`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1 block">Nós (T1)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white leading-none">+{finalScore.team_1}</span>
              <span className="text-xs text-slate-500 font-bold">pts</span>
            </div>
            {cumulativeScore && (
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Total</span>
                <span className="text-sm font-mono font-black text-blue-300">{cumulativeScore.team_1}</span>
              </div>
            )}
          </div>

          {/* Team 2 */}
          <div className={`p-4 rounded-3xl border transition-all ${t2_won ? 'bg-red-500/10 border-red-500/30 ring-1 ring-red-500/20' : 'bg-white/5 border-white/5 opacity-60'}`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1 block">Eles (T2)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white leading-none">+{finalScore.team_2}</span>
              <span className="text-xs text-slate-500 font-bold">pts</span>
            </div>
            {cumulativeScore && (
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Total</span>
                <span className="text-sm font-mono font-black text-red-300">{cumulativeScore.team_2}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-black/20 border-t border-white/5 flex flex-col gap-3">
          <div className="flex gap-3">
            <button
                onClick={onLeave}
                className="p-4 rounded-2xl bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all border border-white/5 group"
                title="Sair da Partida"
            >
                <LogOut size={20} />
            </button>
            
            <StyledButton
                onClick={onNextRound}
                className="flex-1 h-14 text-sm font-black tracking-[0.2em]"
            >
                {isLeader ? (
                <button className="flex items-center justify-center gap-2">
                    PRÓXIMA RODADA <ArrowRight size={18} />
                </button>
                ) : (
                "AGUARDANDO LÍDER..."
                )}
            </StyledButton>
          </div>

          <button 
            onClick={onViewDetails}
            className="w-full py-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-yellow-500 transition-colors"
          >
            Ver Detalhes Completos
          </button>
        </div>
      </motion.div>
    </div>
  );
};
