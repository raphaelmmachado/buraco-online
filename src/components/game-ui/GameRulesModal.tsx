import { X, Settings2, Info, Check, Dot } from "lucide-react";
import { type GameRules } from "../../../common/types/rules";
import { StyledButton } from "../ui/StyledButton";
import { useState } from "react";

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
  onToggle,
}: {
  label: string;
  ruleKey: keyof GameRules;
  info: string;
  rules: GameRules;
  isHost: boolean;
  onToggle: (key: keyof GameRules) => void;
}) => (
  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-yellow-500/20 transition-all">
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-200">{label}</span>
        <div className="group/info relative">
          <Info
            size={12}
            className="text-slate-500 hover:text-yellow-500 cursor-help transition-colors"
          />
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
  step = 50,
}: {
  label: string;
  ruleKey: keyof GameRules;
  rules: GameRules;
  isHost: boolean;
  onChange: (key: keyof GameRules, val: number) => void;
  step?: number;
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
      <span className="text-[10px] font-black text-slate-500 uppercase">
        Pts
      </span>
    </div>
  </div>
);

// Component for non-host players to see rules as a text list
const RulesListView = ({ rules }: { rules: GameRules }) => {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Jogabilidade Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-500/50 mb-1 flex items-center gap-2">
          <Dot size={20} /> Jogabilidade
        </h3>
        <div className="space-y-2 pl-2">
          <div className="flex items-center gap-3 text-sm">
            <div
              className={`p-1 rounded ${rules.canPickUpDiscardWithJoker ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/20"}`}
            >
              <Check
                size={14}
                strokeWidth={rules.canPickUpDiscardWithJoker ? 4 : 1}
              />
            </div>
            <span
              className={
                rules.canPickUpDiscardWithJoker
                  ? "text-slate-200 font-bold"
                  : "text-slate-500 line-through decoration-slate-700"
              }
            >
              Comprar lixo com curinga
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div
              className={`p-1 rounded ${rules.teamCanTakeBothDeadPiles ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/20"}`}
            >
              <Check
                size={14}
                strokeWidth={rules.teamCanTakeBothDeadPiles ? 4 : 1}
              />
            </div>
            <span
              className={
                rules.teamCanTakeBothDeadPiles
                  ? "text-slate-200 font-bold"
                  : "text-slate-500 line-through decoration-slate-700"
              }
            >
              Equipe pode pegar os dois mortos
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div
              className={`p-1 rounded ${rules.useMagicJokers ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-white/20"}`}
            >
              <Check size={14} strokeWidth={rules.useMagicJokers ? 4 : 1} />
            </div>
            <span
              className={
                rules.useMagicJokers
                  ? "text-slate-200 font-bold"
                  : "text-slate-500 line-through decoration-slate-700"
              }
            >
              Magic Jokers (Cartas de Poder)
              <span className="ml-2 text-[8px] font-black text-blue-400 uppercase">
                * Novo
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Pontuação Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500/50 mb-1 flex items-center gap-2">
          <Dot size={20} /> Tabela de Pontos
        </h3>
        <div className="grid grid-cols-1 gap-2 bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
          <PointRow label="Batida Final" value={rules.pointsForEnding} />
          <PointRow label="Canastra Limpa" value={rules.pointsCleanCanastra} />
          <PointRow label="Canastra Suja" value={rules.pointsDirtyCanastra} />
          <PointRow
            label="Canastra de 500 (13 cartas)"
            value={rules.pointsKingCanastra}
          />
          <PointRow
            label="Canastra Real (14 cartas)"
            value={rules.pointsAceCanastra}
          />
          <PointRow
            label="Morto não pego"
            value={rules.penaltyDeadPileNotTaken}
            isPenalty
          />
        </div>
      </div>
    </div>
  );
};

const PointRow = ({
  label,
  value,
  isPenalty,
}: {
  label: string;
  value: number;
  isPenalty?: boolean;
}) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
    <span className="text-xs font-bold text-slate-400">{label}</span>
    <div className="flex items-center gap-1">
      <span
        className={`font-mono text-sm font-black ${isPenalty ? "text-red-400" : "text-yellow-500"}`}
      >
        {isPenalty ? "-" : ""}
        {value}
      </span>
      <span className="text-[8px] font-black text-slate-600 uppercase">
        pts
      </span>
    </div>
  </div>
);

export const GameRulesModal = ({
  rules: externalRules,
  onRulesChange,
  onClose,
  isHost,
}: GameRulesModalProps) => {
  // Use local state to provide instant feedback and handle network latency
  const [localRules, setLocalRules] = useState<GameRules>(externalRules);
  const [prevExternalRules, setPrevExternalRules] =
    useState<GameRules>(externalRules);

  // Sync with external rules if they change (e.g., from server)
  // This is the recommended way to sync state from props without useEffect
  if (JSON.stringify(externalRules) !== JSON.stringify(prevExternalRules)) {
    setLocalRules(externalRules);
    setPrevExternalRules(externalRules);
  }

  const toggleRule = (key: keyof GameRules) => {
    if (!isHost) return;
    const newRules = {
      ...localRules,
      [key]: !localRules[key],
    };
    setLocalRules(newRules); // Instant feedback
    onRulesChange(newRules); // Emit to server
  };

  const updatePoints = (key: keyof GameRules, value: number) => {
    if (!isHost) return;
    const newRules = {
      ...localRules,
      [key]: value,
    };
    setLocalRules(newRules); // Instant feedback
    onRulesChange(newRules); // Emit to server
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#141414] w-full max-w-md rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-yellow-500/5 to-transparent">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-2xl ${isHost ? "bg-yellow-500/20 text-yellow-500" : "bg-blue-500/20 text-blue-400"}`}
            >
              <Settings2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter text-white">
                Regras da Mesa
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {isHost
                  ? "Ajustes salvos automaticamente"
                  : "Consultando configurações"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 flex flex-col gap-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {isHost ? (
            /* HOST VIEW: Interactive Toggles */
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-2">
                  <span className="w-1 h-1 bg-yellow-500 rounded-full"></span>
                  Jogabilidade
                </h3>
                <RuleToggle
                  label="Lixo com Coringa"
                  ruleKey="canPickUpDiscardWithJoker"
                  info="Permite comprar o lixo usando um 2 ou Curinga da mão para formar um novo jogo."
                  rules={localRules}
                  isHost={isHost}
                  onToggle={toggleRule}
                />
                <RuleToggle
                  label="Time pode pegar dois mortos"
                  ruleKey="teamCanTakeBothDeadPiles"
                  info="Permite que a mesma equipe pegue os dois mortos do jogo (um para cada jogador)."
                  rules={localRules}
                  isHost={isHost}
                  onToggle={toggleRule}
                />
                <div className="relative border border-blue-500 rounded-lg animate-pulse">
                  <RuleToggle
                    label="Coringas Mágicos"
                    ruleKey="useMagicJokers"
                    info="Coringas especiais que tem poderes e também continuam servindo como coringa. É destruído ao usar o poder."
                    rules={localRules}
                    isHost={isHost}
                    onToggle={toggleRule}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-2">
                  <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                  Pontuação
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <PointInput
                    label="Batida Final"
                    ruleKey="pointsForEnding"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                  />
                  <PointInput
                    label="Canastra Limpa"
                    ruleKey="pointsCleanCanastra"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                  />
                  <PointInput
                    label="Canastra Suja"
                    ruleKey="pointsDirtyCanastra"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                  />
                  <PointInput
                    label="Canastra de 500 (13 cartas)"
                    ruleKey="pointsKingCanastra"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                  />
                  <PointInput
                    label="Canastra Real (14 cartas)"
                    ruleKey="pointsAceCanastra"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                  />
                  <PointInput
                    label="Morto não pego"
                    ruleKey="penaltyDeadPileNotTaken"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* NON-HOST VIEW: Read-only list */
            <RulesListView rules={localRules} />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 bg-black/20 border-t border-white/5">
          <StyledButton
            onClick={onClose}
            className="w-full h-14 text-sm font-black tracking-[0.2em]"
          >
            {isHost ? "FECHAR E SALVAR" : "ENTENDIDO"}
          </StyledButton>
        </div>
      </div>
    </div>
  );
};
