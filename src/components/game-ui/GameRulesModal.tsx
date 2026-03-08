import { X, Settings2, Info, Check, Dot, RotateCcw } from "lucide-react";
import { type GameRules, DEFAULT_RULES } from "../../../common/types/rules";
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
  unit = "Pts",
  disabled = false,
}: {
  label: string;
  ruleKey: keyof GameRules;
  rules: GameRules;
  isHost: boolean;
  onChange: (key: keyof GameRules, val: number) => void;
  step?: number;
  unit?: string;
  disabled?: boolean;
}) => (
  <div
    className={`flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-yellow-500/20 transition-all ${disabled ? "opacity-40" : ""}`}
  >
    <span className="text-sm font-bold text-slate-200">{label}</span>
    <div className="flex items-center gap-2">
      <input
        disabled={!isHost || disabled}
        type="number"
        value={rules[ruleKey] as number}
        onChange={(e) => onChange(ruleKey, Number(e.target.value))}
        step={step}
        className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1 text-right text-yellow-400 font-mono text-sm focus:outline-none focus:border-yellow-500/50 disabled:opacity-50"
      />
      <span className="text-[10px] font-black text-slate-500 uppercase">
        {unit}
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
              className={`p-1 rounded ${rules.can_pickup_discard_with_joker ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/20"}`}
            >
              <Check
                size={14}
                strokeWidth={rules.can_pickup_discard_with_joker ? 4 : 1}
              />
            </div>
            <span
              className={
                rules.can_pickup_discard_with_joker
                  ? "text-slate-200 font-bold"
                  : "text-slate-500 line-through decoration-slate-700"
              }
            >
              Comprar lixo com curinga
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div
              className={`p-1 rounded ${rules.team_can_take_both_dead_piles ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/20"}`}
            >
              <Check
                size={14}
                strokeWidth={rules.team_can_take_both_dead_piles ? 4 : 1}
              />
            </div>
            <span
              className={
                rules.team_can_take_both_dead_piles
                  ? "text-slate-200 font-bold"
                  : "text-slate-500 line-through decoration-slate-700"
              }
            >
              Equipe pode pegar os dois mortos
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div
              className={`p-1 rounded ${rules.use_magic_jokers ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-white/20"}`}
            >
              <Check size={14} strokeWidth={rules.use_magic_jokers ? 4 : 1} />
            </div>
            <span
              className={
                rules.use_magic_jokers
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
          <div className="flex items-center gap-3 text-sm">
            <div
              className={`p-1 rounded ${rules.must_have_clean_canastra_to_beat ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/20"}`}
            >
              <Check
                size={14}
                strokeWidth={rules.must_have_clean_canastra_to_beat ? 4 : 1}
              />
            </div>
            <span
              className={
                rules.must_have_clean_canastra_to_beat
                  ? "text-slate-200 font-bold"
                  : "text-slate-500 line-through decoration-slate-700"
              }
            >
              Exigir Canastra Limpa para Bater
            </span>
          </div>
        </div>
      </div>

      {/* Regras Avançadas Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-500/50 mb-1 flex items-center gap-2">
          <Dot size={20} /> Regras Avançadas
        </h3>
        <div className="grid grid-cols-1 gap-2 bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
          <PointRow label="Baralhos" value={rules.decks_to_use} unit="x" />
          <PointRow label="Cartas na Mão" value={rules.cards_per_hand} />
          <PointRow label="Cartas no Morto" value={rules.cards_in_dead_pile} />
          <PointRow
            label="Mínimo para Baixar"
            value={rules.min_cards_for_meld}
          />
          <PointRow
            label="Mínimo para Canastra"
            value={rules.min_cards_for_canastra}
          />
        </div>
      </div>

      {/* Pontuação Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500/50 mb-1 flex items-center gap-2">
          <Dot size={20} /> Tabela de Pontos
        </h3>
        <div className="grid grid-cols-1 gap-2 bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
          <PointRow label="Batida Final" value={rules.points_for_ending} />
          <PointRow
            label="Canastra Limpa"
            value={rules.points_clean_canastra}
          />
          <PointRow label="Canastra Suja" value={rules.points_dirty_canastra} />
          <PointRow label="Canastra A-K" value={rules.points_king_canastra} />
          <PointRow
            label="Canastra Completa"
            value={rules.points_ace_canastra}
          />
          <PointRow
            label="Morto não pego"
            value={rules.penalty_dead_pile_not_taken}
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
  unit = "pts",
}: {
  label: string;
  value: number;
  isPenalty?: boolean;
  unit?: string;
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
        {unit}
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

  const handleResetToDefault = () => {
    if (!isHost) return;
    setLocalRules(DEFAULT_RULES);
    onRulesChange(DEFAULT_RULES);
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
                {isHost ? "Ajustar Regras" : "Regras da Mesa"}
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {isHost
                  ? "Ajustes salvos automaticamente"
                  : "Consultando configurações ativas"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHost && (
              <button
                onClick={handleResetToDefault}
                className="p-2 hover:bg-yellow-500/10 rounded-full text-yellow-600/70 hover:text-yellow-500 transition-all flex items-center gap-2"
                title="Resetar para o Padrão"
              >
                <RotateCcw size={20} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all"
            >
              <X size={24} />
            </button>
          </div>
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
                  ruleKey="can_pickup_discard_with_joker"
                  info="Permite comprar o lixo usando um 2 ou Curinga da mão para formar um novo jogo."
                  rules={localRules}
                  isHost={isHost}
                  onToggle={toggleRule}
                />
                <RuleToggle
                  label="Time pode pegar dois mortos"
                  ruleKey="team_can_take_both_dead_piles"
                  info="Permite que a mesma equipe pegue os dois mortos do jogo (um para cada jogador)."
                  rules={localRules}
                  isHost={isHost}
                  onToggle={toggleRule}
                />
                <RuleToggle
                  label="Exigir Canastra Limpa para Bater"
                  ruleKey="must_have_clean_canastra_to_beat"
                  info="Se ativado, é obrigatório ter pelo menos uma canastra limpa na mesa para poder realizar a batida final (encerrar a rodada). Não impede de esvaziar a mão para pegar o morto."
                  rules={localRules}
                  isHost={isHost}
                  onToggle={toggleRule}
                />

                <RuleToggle
                  label="Coringas Mágicos"
                  ruleKey="use_magic_jokers"
                  info="Coringas especiais que tem poderes e também continuam servindo como coringa. É destruído ao usar o poder."
                  rules={localRules}
                  isHost={isHost}
                  onToggle={toggleRule}
                />
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-2">
                  <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                  Pontuação
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <PointInput
                    label="Batida Final"
                    ruleKey="points_for_ending"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                  />
                  <PointInput
                    label="Canastra Limpa"
                    ruleKey="points_clean_canastra"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                  />
                  <PointInput
                    label="Canastra Suja"
                    ruleKey="points_dirty_canastra"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                  />
                  <PointInput
                    label="Canastra Real A-K"
                    ruleKey="points_king_canastra"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                  />
                  <PointInput
                    label="Canastra Completa A-A"
                    ruleKey="points_ace_canastra"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                  />
                  <PointInput
                    label="Morto não pego"
                    ruleKey="penalty_dead_pile_not_taken"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-2">
                  <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                  Regras Avançadas
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <PointInput
                    label="Quantidade de Baralhos"
                    ruleKey="decks_to_use"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                    step={1}
                    unit=""
                  />
                  <PointInput
                    label="Cartas por Mão"
                    ruleKey="cards_per_hand"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                    step={1}
                    unit=""
                  />
                  <PointInput
                    label="Cartas no Morto"
                    ruleKey="cards_in_dead_pile"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                    step={1}
                    unit=""
                  />
                  <PointInput
                    label="Mínimo para Baixar"
                    ruleKey="min_cards_for_meld"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                    step={1}
                    unit=""
                  />
                  <PointInput
                    label="Mínimo para Canastra"
                    ruleKey="min_cards_for_canastra"
                    rules={localRules}
                    isHost={isHost}
                    onChange={updatePoints}
                    step={1}
                    unit=""
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
