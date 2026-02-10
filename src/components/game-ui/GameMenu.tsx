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
} from "lucide-react";
import { useGameStore } from "../../store/useGameStore";

interface GameMenuProps {
  onOpenHowToPlay?: () => void;
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

export const GameMenu = ({
  onOpenHowToPlay,
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
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all border border-white/5"
      >
        <Settings size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-48 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 flex flex-col gap-1 animate-fade-in-down origin-top-right">
          {!showConfirmLeave ? (
            <>
              <button
                onClick={() => {
                  toggleMute();
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {isMuted ? "Som: OFF" : "Som: ON"}
              </button>

              <button
                onClick={() => {
                  toggleAccessibilityMode();
                }}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isAccessibilityMode
                    ? "text-yellow-400 bg-yellow-400/10"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Type size={16} />
                {isAccessibilityMode ? "+ Legível: ON" : "+ Legível: OFF"}
              </button>

              {toggleAnimations && (
                <button
                  onClick={() => {
                    toggleAnimations();
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                >
                  {showAnimations ? <Zap size={16} /> : <ZapOff size={16} />}
                  {showAnimations ? "Animações: ON" : "Animações: OFF"}
                </button>
              )}

              {toggleOpponentHands && (
                <button
                  onClick={() => {
                    toggleOpponentHands();
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                >
                  {showOpponentHands ? <Eye size={16} /> : <EyeOff size={16} />}
                  {showOpponentHands ? "Mãos: ON" : "Mãos: OFF"}
                </button>
              )}

              {toggleSortButton && (
                <button
                  onClick={() => {
                    toggleSortButton();
                  }}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    showSortButton
                      ? "text-yellow-400 bg-yellow-400/10"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Wand2 size={16} />
                  {showSortButton ? "Organizar: ON" : "Organizar: OFF"}
                </button>
              )}

              {toggleCardMarkers && (
                <button
                  onClick={() => {
                    toggleCardMarkers();
                  }}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    showCardMarkers
                      ? "text-yellow-400 bg-yellow-400/10"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Bookmark size={16} />
                  {showCardMarkers ? "Marcadores: ON" : "Marcadores: OFF"}
                </button>
              )}

              {onOpenHowToPlay && (
                <button
                  onClick={() => {
                    onOpenHowToPlay();
                    handleClose();
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                >
                  <HelpCircle size={16} />
                  Como Jogar
                </button>
              )}

              {(onLeave || onCloseRoom) && (
                <>
                  <div className="h-[1px] bg-white/10 my-1"></div>
                  <button
                    onClick={() => setShowConfirmLeave(true)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                  >
                    <LogOut size={16} />
                    {onCloseRoom ? "Encerrar Sala" : "Sair da Sala"}
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2 p-1 animate-fade-in">
              <p className="text-xs text-center text-slate-300 font-bold uppercase tracking-wide mb-1">
                {onCloseRoom ? "Encerrar para todos?" : "Sair da partida?"}
              </p>
              <button
                onClick={() => {
                  if (onCloseRoom) onCloseRoom();
                  else if (onLeave) onLeave();
                  handleClose();
                }}
                className="w-full px-3 py-2 rounded-lg text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-all"
              >
                {onCloseRoom ? "Sim, Encerrar" : "Sim, Sair"}
              </button>
              <button
                onClick={() => setShowConfirmLeave(false)}
                className="w-full px-3 py-2 rounded-lg text-sm font-bold bg-white/10 hover:bg-white/20 text-slate-300 transition-all"
              >
                Cancelar
              </button>
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
