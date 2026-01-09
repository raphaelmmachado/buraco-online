import { type ScoreResult } from "../../../common/utils/scoring";

interface FinishScreenProps {
  finalScore: {
    team_1: number;
    team_2: number;
    details_t1: ScoreResult;
    details_t2: ScoreResult;
  };
  myTeam: number;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export const FinishScreen = ({ finalScore, myTeam, onPlayAgain, onLeave }: FinishScreenProps) => {
  const isT1Winner = finalScore.team_1 > finalScore.team_2;
  const isT2Winner = finalScore.team_2 > finalScore.team_1;
  const isDraw = finalScore.team_1 === finalScore.team_2;

  const amIWinner = (myTeam === 1 && isT1Winner) || (myTeam === 2 && isT2Winner);

  return (
    <div className="h-screen w-screen bg-[#0f2e1a] text-white overflow-y-auto flex flex-col items-center py-10 px-4 font-sans">
      
      {/* HEADER: VICTORY / DEFEAT STATUS */}
      <div className={`w-full max-w-4xl p-8 text-center rounded-3xl border border-white/10 shadow-2xl mb-8 ${amIWinner ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <h2 className={`text-6xl md:text-8xl font-black uppercase tracking-tighter mb-4 drop-shadow-lg ${amIWinner ? 'text-yellow-400' : 'text-slate-400'}`}>
          {isDraw ? "Empate!" : amIWinner ? "Vitória!" : "Derrota"}
        </h2>
        <p className="text-white/60 uppercase tracking-[0.5em] text-sm font-bold">Fim de Jogo</p>
      </div>

      {/* CONTENT: SCORES COMPARISON */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 mb-12">
        
        {/* TEAM 1 */}
        <div className={`flex flex-col gap-6 p-8 rounded-3xl border-2 transition-all shadow-xl ${myTeam === 1 ? 'border-blue-500/50 bg-blue-900/20' : 'border-white/10 bg-black/20'}`}>
          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <span className={`text-sm font-black uppercase tracking-widest ${myTeam === 1 ? 'text-blue-400' : 'text-slate-500'}`}>
              NÓS (TIME 1)
            </span>
            {isT1Winner && <span className="text-3xl animate-bounce">🏆</span>}
          </div>
          
          <div className="text-7xl font-black text-white text-center py-4">{finalScore.team_1}</div>
          
          <div className="space-y-4">
            <ScoreDetail label="Cartas na Mesa" value={finalScore.details_t1.base_points} />
            <ScoreDetail label="Bônus Canastras" value={finalScore.details_t1.bonus_points} color="text-green-400" />
            <ScoreDetail label="Penalidades" value={`-${finalScore.details_t1.penalty_points}`} color="text-red-400" />
            
            <div className="pt-6 border-t border-white/10 grid grid-cols-3 gap-2">
                <MiniStat label="Limpa" val={finalScore.details_t1.details.CLEAN} color="text-blue-400" />
                <MiniStat label="Suja" val={finalScore.details_t1.details.DIRTY} color="text-yellow-400" />
                <MiniStat label="Real" val={finalScore.details_t1.details.ACE + finalScore.details_t1.details.KING} color="text-purple-400" />
            </div>
          </div>
        </div>

        {/* TEAM 2 */}
        <div className={`flex flex-col gap-6 p-8 rounded-3xl border-2 transition-all shadow-xl ${myTeam === 2 ? 'border-blue-500/50 bg-blue-900/20' : 'border-white/10 bg-black/20'}`}>
          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <span className={`text-sm font-black uppercase tracking-widest ${myTeam === 2 ? 'text-blue-400' : 'text-slate-500'}`}>
              ELES (TIME 2)
            </span>
            {isT2Winner && <span className="text-3xl animate-bounce">🏆</span>}
          </div>
          
          <div className="text-7xl font-black text-white text-center py-4">{finalScore.team_2}</div>
          
          <div className="space-y-4">
            <ScoreDetail label="Cartas na Mesa" value={finalScore.details_t2.base_points} />
            <ScoreDetail label="Bônus Canastras" value={finalScore.details_t2.bonus_points} color="text-green-400" />
            <ScoreDetail label="Penalidades" value={`-${finalScore.details_t2.penalty_points}`} color="text-red-400" />

            <div className="pt-6 border-t border-white/10 grid grid-cols-3 gap-2">
                <MiniStat label="Limpa" val={finalScore.details_t2.details.CLEAN} color="text-blue-400" />
                <MiniStat label="Suja" val={finalScore.details_t2.details.DIRTY} color="text-yellow-400" />
                <MiniStat label="Real" val={finalScore.details_t2.details.ACE + finalScore.details_t2.details.KING} color="text-purple-400" />
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER: ACTIONS */}
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
        <button
          onClick={onPlayAgain}
          className="flex-1 py-5 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl transition-all text-sm uppercase tracking-widest shadow-lg hover:shadow-green-500/20 active:scale-95 flex items-center justify-center gap-3"
        >
          <span className="text-xl">🔄</span> Jogar Novamente
        </button>
        
        <button
          onClick={onLeave}
          className="flex-1 py-5 bg-red-600/80 hover:bg-red-500 text-white font-black rounded-2xl transition-all text-sm uppercase tracking-widest shadow-lg hover:shadow-red-500/20 active:scale-95 flex items-center justify-center gap-3"
        >
          <span className="text-xl">🚪</span> Sair da Sala
        </button>
      </div>

    </div>
  );
};

const ScoreDetail = ({ label, value, color = "text-slate-300" }: { label: string, value: string | number, color?: string }) => (
  <div className="flex justify-between items-center text-base">
    <span className="text-slate-400 font-medium">{label}</span>
    <span className={`font-black text-xl ${color}`}>{value}</span>
  </div>
);

const MiniStat = ({ label, val, color }: { label: string, val: number, color: string }) => (
  <div className="bg-black/30 px-3 py-3 rounded-xl flex flex-col items-center justify-center border border-white/5">
    <span className={`text-2xl font-black ${color} mb-1`}>{val}</span>
    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">{label}</span>
  </div>
);
