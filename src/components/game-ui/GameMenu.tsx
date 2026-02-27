import { useState } from "react";
import {
  Settings,
  Volume2,
  VolumeX,
  LogOut,
  Zap,
  ZapOff,
  HelpCircle,
  Eye,
  EyeOff,
  Type,
  Wand2,
  Bookmark,
  ChevronRight,
  Gavel,
} from "lucide-react";
import { useGameStore } from "../../store/useGameStore";

interface GameMenuProps {
  onOpenHowToPlay?: () => void;
  onOpenRules?: () => void; // Nova prop para abrir o GameRulesModal
  onLeave?: () => void;
  onCloseRoom?: () => void;
  showAnimations?: boolean;
  toggleAnimations?: () => void;
  showOpponentHands?: boolean;
  toggleOpponentHands?: () => void;
  showSortButton?: boolean;
  toggleSortButton?: () => void;
  showCardMarkers?: boolean;
  toggleCardMarkers?: () => void;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="px-3 py-2">
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
      {children}
    </span>
  </div>
);

export const GameMenu = ({
  onOpenHowToPlay,
  onOpenRules,
  onLeave,
  onCloseRoom,
  showAnimations,
  toggleAnimations,
  showOpponentHands,
  toggleOpponentHands,
  showSortButton,
  toggleSortButton,
  showCardMarkers,
  toggleCardMarkers,
}: GameMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"SETTINGS" | "RULES">("SETTINGS");

  const toggleMute = useGameStore((state) => state.toggleMute);
  const isMuted = useGameStore((state) => state.isMuted);
  const toggleAccessibilityMode = useGameStore(
    (state) => state.toggleAccessibilityMode,
  );
  const isAccessibilityMode = useGameStore(
    (state) => state.isAccessibilityMode,
  );

  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
    setShowConfirmLeave(false);
    setActiveTab("SETTINGS");
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 backdrop-blur-md rounded-full transition-all border ${
          isOpen
            ? "bg-yellow-500 text-black border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]"
            : "bg-black/40 text-white/80 hover:text-white hover:bg-white/10 border-white/5"
        }`}
      >
        <Settings size={20} className={isOpen ? "animate-spin-slow" : ""} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-64 bg-[#0f0f0f]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-down origin-top-right">
          {!showConfirmLeave ? (
            <div className="flex flex-col">
              {/* Tabs */}
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => setActiveTab("SETTINGS")}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "SETTINGS" ? "text-yellow-500 bg-white/5" : "text-slate-500 hover:text-slate-300"}`}
                >
                  Preferências
                </button>
                <button
                  onClick={() => setActiveTab("RULES")}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "RULES" ? "text-yellow-500 bg-white/5" : "text-slate-500 hover:text-slate-300"}`}
                >
                  Regras
                </button>
              </div>

              <div className="p-2 flex flex-col gap-1 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {activeTab === "SETTINGS" ? (
                  <>
                    <SectionTitle>Áudio & Visual</SectionTitle>
                    <button
                      onClick={() => toggleMute()}
                      className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        {isMuted ? (
                          <VolumeX size={16} className="text-red-400" />
                        ) : (
                          <Volume2 size={16} className="text-blue-400" />
                        )}
                        <span>Efeitos Sonoros</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${isMuted ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}
                      >
                        {isMuted ? "OFF" : "ON"}
                      </span>
                    </button>

                    {toggleAnimations && (
                      <button
                        onClick={() => toggleAnimations()}
                        className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          {showAnimations ? (
                            <Zap size={16} className="text-yellow-400" />
                          ) : (
                            <ZapOff size={16} className="text-slate-500" />
                          )}
                          <span>Animações</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${showAnimations ? "bg-yellow-500/10 text-yellow-400" : "bg-slate-500/10 text-slate-500"}`}
                        >
                          {showAnimations ? "ON" : "OFF"}
                        </span>
                      </button>
                    )}

                    <div className="h-px bg-white/5 my-1 mx-2"></div>
                    <SectionTitle>Interface</SectionTitle>

                    <button
                      onClick={() => toggleAccessibilityMode()}
                      className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Type
                          size={16}
                          className={
                            isAccessibilityMode
                              ? "text-yellow-400"
                              : "text-slate-500"
                          }
                        />
                        <span>Cartas Legíveis</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${isAccessibilityMode ? "bg-yellow-500/10 text-yellow-400" : "bg-slate-500/10 text-slate-500"}`}
                      >
                        {isAccessibilityMode ? "ON" : "OFF"}
                      </span>
                    </button>

                    {toggleOpponentHands && (
                      <button
                        onClick={() => toggleOpponentHands()}
                        className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          {showOpponentHands ? (
                            <Eye size={16} className="text-green-400" />
                          ) : (
                            <EyeOff size={16} className="text-slate-500" />
                          )}
                          <span>Ver Mãos (Eles)</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${showOpponentHands ? "bg-green-500/10 text-green-400" : "bg-slate-500/10 text-slate-500"}`}
                        >
                          {showOpponentHands ? "ON" : "OFF"}
                        </span>
                      </button>
                    )}

                    {toggleSortButton && (
                      <button
                        onClick={() => toggleSortButton()}
                        className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Wand2
                            size={16}
                            className={
                              showSortButton
                                ? "text-purple-400"
                                : "text-slate-500"
                            }
                          />
                          <span>Botão Organizar</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${showSortButton ? "bg-purple-500/10 text-purple-400" : "bg-slate-500/10 text-slate-500"}`}
                        >
                          {showSortButton ? "ON" : "OFF"}
                        </span>
                      </button>
                    )}

                    {toggleCardMarkers && (
                      <button
                        onClick={() => toggleCardMarkers()}
                        className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Bookmark
                            size={16}
                            className={
                              showCardMarkers
                                ? "text-orange-400"
                                : "text-slate-500"
                            }
                          />
                          <span>Marcadores</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${showCardMarkers ? "bg-orange-500/10 text-orange-400" : "bg-slate-500/10 text-slate-500"}`}
                        >
                          {showCardMarkers ? "ON" : "OFF"}
                        </span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <SectionTitle>Referência</SectionTitle>
                    {onOpenHowToPlay && (
                      <button
                        onClick={() => {
                          onOpenHowToPlay();
                          handleClose();
                        }}
                        className="flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <HelpCircle size={16} className="text-blue-400" />
                          <span>Como Jogar</span>
                        </div>
                        <ChevronRight size={14} className="text-slate-600" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onOpenRules?.();
                        handleClose();
                      }}
                      className="flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Gavel size={16} className="text-orange-400" />
                        <span>Regras da Mesa</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-600" />
                    </button>
                  </>
                )}
              </div>

              {/* Exit Button */}
              {(onLeave || onCloseRoom) && (
                <div className="p-2 mt-auto border-t border-white/5 bg-white/[0.02]">
                  <button
                    onClick={() => setShowConfirmLeave(true)}
                    className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                  >
                    <LogOut size={16} />
                    {onCloseRoom ? "Encerrar Sala" : "Sair da Sala"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-4 animate-fade-in">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <LogOut size={24} className="text-red-500" />
              </div>
              <p className="text-sm text-center text-slate-200 font-bold mb-1">
                {onCloseRoom
                  ? "Encerrar partida para todos?"
                  : "Deseja sair da partida?"}
              </p>
              <p className="text-[10px] text-center text-slate-500 uppercase tracking-widest mb-4">
                {onCloseRoom
                  ? "A sala será excluída permanentemente"
                  : "Você poderá tentar reconectar depois"}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmLeave(false)}
                  className="flex-1 px-3 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-slate-300 transition-all border border-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (onCloseRoom) onCloseRoom();
                    else if (onLeave) onLeave();
                    handleClose();
                  }}
                  className="flex-1 px-3 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all"
                >
                  {onCloseRoom ? "Encerrar" : "Sair"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[-1]" onClick={handleClose}></div>
      )}
    </div>
  );
};
