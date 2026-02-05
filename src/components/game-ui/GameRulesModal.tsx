import { X, Settings2, Info } from "lucide-react";
import { type GameRules } from "../../../common/types/rules";
import { StyledButton } from "../ui/StyledButton";

interface GameRulesModalProps {
  rules: GameRules;
  onRulesChange: (newRules: GameRules) => void;
  onClose: () => void;
  isHost: boolean;
}

const RuleToggle = ({ 
    label, 
    ruleKey, 
    info, 
    rules, 
    isHost, 
    onToggle 
}: { 
    label: string; 
    ruleKey: keyof GameRules; 
    info: string; 
    rules: GameRules; 
    isHost: boolean; 
    onToggle: (key: keyof GameRules) => void 
}) => (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-yellow-500/20 transition-all">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-200">{label}</span>
            <div className="group/info relative">
                <Info size={12} className="text-slate-500 hover:text-yellow-500 cursor-help transition-colors" />
                <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-slate-800 text-[10px] text-slate-300 rounded-lg shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-50 border border-white/10 pointer-events-none">
                    {info}
                </div>
            </div>
        </div>
      </div>
      <button
        disabled={!isHost}
        onClick={() => onToggle(ruleKey)}
        className={`w-12 h-6 rounded-full relative transition-all ${
          rules[ruleKey] ? "bg-yellow-500" : "bg-slate-700"
        } ${!isHost ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"}`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
            rules[ruleKey] ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );

  const PointInput = ({ 
      label, 
      ruleKey, 
      rules, 
      isHost, 
      onChange, 
      step = 50 
    }: { 
        label: string; 
        ruleKey: keyof GameRules; 
        rules: GameRules; 
        isHost: boolean; 
        onChange: (key: keyof GameRules, val: number) => void; 
        step?: number 
    }) => (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-yellow-500/20 transition-all">
      <span className="text-sm font-bold text-slate-200">{label}</span>
      <div className="flex items-center gap-2">
        <input
          disabled={!isHost}
          type="number"
          value={rules[ruleKey] as number}
          onChange={(e) => onChange(ruleKey, Number(e.target.value))}
          step={step}
          className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1 text-right text-yellow-400 font-mono text-sm focus:outline-none focus:border-yellow-500/50 disabled:opacity-50"
        />
        <span className="text-[10px] font-black text-slate-500 uppercase">Pts</span>
      </div>
    </div>
  );

export const GameRulesModal = ({
  rules,
  onRulesChange,
  onClose,
  isHost,
}: GameRulesModalProps) => {
  const toggleRule = (key: keyof GameRules) => {
    if (!isHost) return;
    onRulesChange({
      ...rules,
      [key]: !rules[key],
    });
  };

  const updatePoints = (key: keyof GameRules, value: number) => {
    if (!isHost) return;
    onRulesChange({
      ...rules,
      [key]: value,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1a1a1a] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-yellow-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Settings2 size={20} className="text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tighter text-white">Regras da Mesa</h2>
              <p className="text-[10px] font-bold text-yellow-500/50 uppercase tracking-widest">
                {isHost ? "Personalize sua partida" : "Configuradas pelo anfitrião"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Jogabilidade */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-2">
                <span className="w-1 h-1 bg-yellow-500 rounded-full"></span>
                Jogabilidade
            </h3>
            <RuleToggle
              label="Lixo com Curinga"
              ruleKey="canPickUpDiscardWithJoker"
              info="Permite comprar o lixo usando um 2 ou Curinga da mão para formar um novo jogo."
              rules={rules}
              isHost={isHost}
              onToggle={toggleRule}
            />
            <RuleToggle
              label="Dois Mortos p/ Equipe"
              ruleKey="teamCanTakeBothDeadPiles"
              info="Permite que a mesma equipe pegue os dois mortos do jogo (um para cada jogador)."
              rules={rules}
              isHost={isHost}
              onToggle={toggleRule}
            />
          </div>

          {/* Pontuação */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-2">
                <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                Pontuação
            </h3>
            <div className="grid grid-cols-1 gap-2">
                <PointInput label="Batida Final" ruleKey="pointsForEnding" rules={rules} isHost={isHost} onChange={updatePoints} />
                <PointInput label="Canastra Limpa" ruleKey="pointsCleanCanastra" rules={rules} isHost={isHost} onChange={updatePoints} />
                <PointInput label="Canastra Suja" ruleKey="pointsDirtyCanastra" rules={rules} isHost={isHost} onChange={updatePoints} />
                <PointInput label="Canastra Real (3 a K)" ruleKey="pointsKingCanastra" rules={rules} isHost={isHost} onChange={updatePoints} />
                <PointInput label="Canastra de Ás a Ás" ruleKey="pointsAceCanastra" rules={rules} isHost={isHost} onChange={updatePoints} />
                <PointInput label="Morto não pego" ruleKey="penaltyDeadPileNotTaken" rules={rules} isHost={isHost} onChange={updatePoints} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/20 border-t border-white/5">
          <StyledButton onClick={onClose} className="w-full">
            {isHost ? "SALVAR CONFIGURAÇÕES" : "FECHAR"}
          </StyledButton>
        </div>
      </div>
    </div>
  );
};