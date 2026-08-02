import { useState, useEffect, useRef, useMemo } from "react";
import {
  LayoutGroup,
  MotionConfig,
  motion,
  AnimatePresence,
} from "framer-motion";
import { calculate_score } from "../../../common/utils/scoring";
import { getPlayerDirection } from "../../utils/animation_utils";
// UI Components
import { MeldDisplay } from "../game-ui/MeldDisplay";
import { HandCard } from "../game-ui/HandCard";
import { GameMenu } from "../game-ui/GameMenu";
import { HowToPlay } from "../game-ui/HowToPlay";
import { GameRulesModal } from "../game-ui/GameRulesModal";
import { FinishScreen } from "./FinishScreen";
import { type GameAdapterInterface } from "../game-ui/useLocalGameAdapter";
import { OpponentsHandsLayer } from "../game-ui/OpponentsHandsLayer";
import { LoadingScreen } from "../ui/LoadingScreen";
import { X } from "lucide-react";
import { type Card } from "../../../common/types/card";

// Custom Hooks
import { useWakeLock } from "../../hooks/useWakeLock";
import { useScreenDrag } from "../../hooks/useScreenDrag";
import { useGameAudio } from "../../hooks/useGameAudio";
import { useMobileCheck } from "../../hooks/useMobileCheck";
import { ConnectionOverlay } from "./ConnectionOverlay";
import { EventBalloon } from "../game-ui/EventBalloon";
import Portal from "../ui/Portal";
import { TimerBalloon } from "../game-ui/TimerBalloon";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";

// Layout Components
import { GameSeparatorMobile } from "./layouts/GameSeparatorMobile";
import { GameSeparatorDesktop } from "./layouts/GameSeparatorDesktop";
import { GameFooterMobile } from "./layouts/GameFooterMobile";
import { GameFooterDesktop } from "./layouts/GameFooterDesktop";
import { type GameLayoutProps } from "./types/GameLayoutProps";

export const GameScreen = ({ game }: { game: GameAdapterInterface }) => {
  // State
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [prevTurnContext, setPrevTurnContext] = useState({
    player: game.current_player,
    phase: game.turn_phase,
  });
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showOpponentHands, setShowOpponentHands] = useState(true);
  const [hoveredMeld, setHoveredMeld] = useState<{
    teamId: number;
    index: number;
  } | null>(null);

  // Refs and state for player positions (for portals)
  const playerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [playerPositions, setPlayerPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  // Delay for Finish Screen
  const [showFinishScreen, setShowFinishScreen] = useState(false);

  // Computed Values
  const my_player_id = game.my_player_number ?? 1;
  const my_team = my_player_id % 2 !== 0 ? 1 : 2;
  const opponent_team = my_team === 1 ? 2 : 1;
  const isMyTurn = game.current_player === my_player_id;
  const canDraw = isMyTurn && game.turn_phase === "DRAW";
  const canAction = isMyTurn && game.turn_phase === "ACTION";

  // Ensure selected cards are cleared during render when starting a new turn in DRAW phase
  // (per React's official recommendation: https://react.dev/learn/you-might-not-need-an-effect)
  if (
    game.current_player !== prevTurnContext.player ||
    game.turn_phase !== prevTurnContext.phase
  ) {
    setPrevTurnContext({
      player: game.current_player,
      phase: game.turn_phase,
    });
    if (canDraw) {
      setSelectedCards([]);
    }
  }

  const myHand = useMemo(
    () => (game.hands[my_player_id] as Card[]) || [],
    [game.hands, my_player_id],
  );
  const topDiscardCard = game.discard_pile?.[0];

  // Derived state: only cards that are actually in hand or top of discard are considered "selected"
  const validSelectedCards = useMemo(() => {
    const myHandIds = new Set(myHand.map((c) => c.id));
    return selectedCards.filter(
      (id) => myHandIds.has(id) || (topDiscardCard && id === topDiscardCard.id),
    );
  }, [selectedCards, myHand, topDiscardCard]);

  // Effect to delay finish screen transition
  useEffect(() => {
    if (game.status === "FINISHED" || game.status === "ROUND_OVER") {
      const timer = setTimeout(() => {
        setShowFinishScreen(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setShowFinishScreen(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [game.status]);

  // Combined Effect to auto-clear toasts and cancel power
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (game.last_error) {
      timers.push(setTimeout(() => game.clear_error(), 4000));
    }

    if (game.last_info) {
      timers.push(setTimeout(() => game.clear_info?.(), 2000));
    }

    if (
      game.magic_joker.power_selection?.ability === "VIEW_HAND" &&
      game.magic_joker.power_selection.player_id === my_player_id
    ) {
      timers.push(setTimeout(() => game.power_cancel(), 5000));
    }

    return () => timers.forEach(clearTimeout);
  }, [
    game.last_error,
    game.last_info,
    game.magic_joker.power_selection,
    my_player_id,
    game,
  ]);

  // Safe calculation even if game data is incomplete initially
  const isGameOver = game.status === "FINISHED" || game.status === "ROUND_OVER";

  const myScore = game.team_melds?.[my_team]
    ? calculate_score(
        game.team_melds[my_team],
        [],
        false,
        isGameOver && !game.has_taken_dead_pile?.[my_team - 1],
        game.rules,
      ).total_score
    : 0;
  const oppScore = game.team_melds?.[opponent_team]
    ? calculate_score(
        game.team_melds[opponent_team],
        [],
        false,
        isGameOver && !game.has_taken_dead_pile?.[opponent_team - 1],
        game.rules,
      ).total_score
    : 0;

  const myTeamHasTaken = game.has_taken_dead_pile?.[my_team - 1] ?? false;
  const oppTeamHasTaken =
    game.has_taken_dead_pile?.[opponent_team - 1] ?? false;

  // Discard Pile Logic
  const isDiscardSelected =
    !!topDiscardCard && selectedCards.includes(topDiscardCard.id);

  // Calculate direction for discard animation
  const numPlayers = game.players_data
    ? Object.keys(game.players_data).length
    : 0;
  const previousPlayerId =
    game.current_player === 1 ? numPlayers : game.current_player - 1;

  const discardOriginDirection = getPlayerDirection(
    previousPlayerId,
    my_player_id,
    numPlayers === 4 ? "2v2" : "1v1",
  );

  // Calculate direction for Meld Entry animations
  const activePlayerDirection = getPlayerDirection(
    game.current_player,
    my_player_id,
    numPlayers === 4 ? "2v2" : "1v1",
  );

  // Hooks Integration
  useWakeLock();
  const { isMobile } = useMobileCheck();
  const { opponentHeight, startDrag } = useScreenDrag(35);
  // Pass a safe isMyTurn even if game is loading
  useGameAudio(game, isMyTurn);

  // Force layout refresh when tab gains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // simulamos resize para consertar animações framer motion quando minimiza a janela
        window.dispatchEvent(new Event("resize"));
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Effect to calculate player positions for portal
  useEffect(() => {
    const calculatePositions = () => {
      const newPositions: Record<string, { x: number; y: number }> = {};
      Object.keys(playerRefs.current).forEach((id) => {
        const el = playerRefs.current[id];
        if (el) {
          const rect = el.getBoundingClientRect();
          newPositions[id] = {
            x: rect.left + rect.width / 2, // Center of the element
            y: rect.top, // Top of the element
          };
        }
      });
      setPlayerPositions(newPositions);
    };

    calculatePositions();
    window.addEventListener("resize", calculatePositions);
    return () => {
      window.removeEventListener("resize", calculatePositions);
    };
  }, [game.players_data, opponentHeight]);

  // Early returns moved below hooks to satisfy React Rules of Hooks

  // --- HANDLERS ---
  const toggleSelect = (id: string) => {
    // Se estiver em modo de seleção de poder mágico, usa a ação de poder
    if (game.magic_joker.power_selection?.player_id === my_player_id) {
      game.power_pick_card(id);
      return;
    }

    setSelectedCards((prev) => {
      // Lazy cleanup: filter out invalid IDs from previous state while toggling
      const myHandIds = new Set(myHand.map((c) => c.id));
      const filteredPrev = prev.filter(
        (pId) =>
          myHandIds.has(pId) || (topDiscardCard && pId === topDiscardCard.id),
      );

      return filteredPrev.includes(id)
        ? filteredPrev.filter((c) => c !== id)
        : [...filteredPrev, id];
    });
  };

  const handleDeckClick = () => {
    if (canDraw) {
      game.draw_card();
      setSelectedCards([]); // Clear selection on draw
    }
  };

  const handleDiscardClick = () => {
    if (canDraw && topDiscardCard) {
      toggleSelect(topDiscardCard.id);
    } else if (canAction) {
      if (validSelectedCards.length === 1) {
        game.discard_card(validSelectedCards[0]);
        setSelectedCards([]);
      } else {
        game.set_error("Selecione exatamente 1 carta para descartar.");
      }
    }
  };

  const handleMeldClick = (teamId: number, meldIndex: number) => {
    if (teamId !== my_team) return;

    if (canAction && validSelectedCards.length > 0) {
      game.add_to_meld(validSelectedCards, meldIndex);
      setSelectedCards([]);
    } else if (canDraw && isDiscardSelected) {
      const handCardsForMeld = validSelectedCards.filter(
        (id) => id !== topDiscardCard?.id,
      );
      game.pick_up_discard_add_to_meld(meldIndex, handCardsForMeld);
      setSelectedCards([]);
    }
  };

  const showNewMeldAction =
    canAction && validSelectedCards.length >= game.rules.min_cards_for_meld;
  const showNewMeldPickUp =
    canDraw &&
    isDiscardSelected &&
    validSelectedCards.length >= game.rules.min_cards_for_meld;

  const handleNewMeldClick = () => {
    if (showNewMeldAction) {
      game.meld_cards(validSelectedCards);
    } else if (showNewMeldPickUp) {
      const handCardsForMeld = validSelectedCards.filter(
        (id) => id !== topDiscardCard?.id,
      );
      game.pick_up_discard_new_meld(handCardsForMeld);
    }
    setSelectedCards([]);
  };

  const { focusedCardId } = useKeyboardControls({
    myHand,
    topDiscardCard,
    selectedCards: validSelectedCards,
    isMyTurn,
    canDraw,
    canAction,
    isDiscardSelected,
    onToggleSelect: toggleSelect,
    onDeckClick: handleDeckClick,
    onDiscardClick: handleDiscardClick,
    onNewMeldClick: handleNewMeldClick,
    onMeldClick: handleMeldClick,
    myTeam: my_team,
  });

  // GUARD: Wait for player identification to prevent "Ghost Mode"
  if (game.my_player_number === null) {
    return (
      <LoadingScreen
        message="Sincronizando..."
        subMessage="Recuperando estado da partida..."
      />
    );
  }

  // --- RENDER FINISH SCREEN OR ROUND SUMMARY ---
  if (
    showFinishScreen &&
    (game.status === "FINISHED" || game.status === "ROUND_OVER") &&
    game.final_score
  ) {
    const totalHumanPlayers = game.players_data
      ? Object.values(game.players_data).filter((p) => !p.isBot).length
      : 0;
    const mySocketId = game.players_data?.[my_player_id]?.socketId;
    const isLeader = my_player_id === 1;

    return (
      <FinishScreen
        finalScore={game.final_score}
        myTeam={my_team}
        onPlayAgain={() => {
          game.voteNext();
        }}
        onLeave={isLeader ? game.closeRoom : game.leaveGame}
        isLeader={isLeader}
        isRoundOver={game.status === "ROUND_OVER"}
        cumulativeScore={game.cumulative_score}
        roundCount={game.round_count}
        roundHistory={game.round_history || []}
        winCondition={game.win_condition}
        rematchVotes={game.rematch_votes}
        totalHumanPlayers={totalHumanPlayers}
        myPlayerId={mySocketId}
        rules={game.rules}
      />
    );
  }

  // Prepare Props Object

  const layoutProps: GameLayoutProps = {
    game,
    selectedCards: validSelectedCards,
    isMyTurn,
    canDraw,
    canAction,
    myScore,
    oppScore,
    myTeam: my_team,
    opponentTeam: opponent_team,
    opponentHeight,
    myTeamHasTaken,
    oppTeamHasTaken,
    onDeckClick: handleDeckClick,
    onDiscardClick: handleDiscardClick,
    onMeldClick: handleMeldClick,
    onNewMeldClick: handleNewMeldClick,
    onUseJoker: game.useJoker,
    toggleSelect,
    onCardClick: toggleSelect, // Alias for toggleSelect in props if needed
    startDrag,
    hoveredMeld,
    setHoveredMeld,
    showNewMeldAction,
    showNewMeldPickUp,
    isDiscardSelected,
    topDiscardCard,
    discardOriginDirection,
    activePlayerDirection,
    playerRefs,
    focusedCardId,
  };

  return (
    <MotionConfig
      transition={
        game.showAnimations
          ? { type: "spring", stiffness: 500, damping: 30, mass: 0.8 }
          : { duration: 0 }
      }
    >
      <LayoutGroup>
        <OpponentsHandsLayer
          game={game}
          visible={showOpponentHands}
          onCardClick={toggleSelect}
        />

        {/* == VISION POWER MODAL OVERLAY == */}
        <AnimatePresence>
          {game.magic_joker.power_selection?.ability === "VIEW_HAND" &&
            game.magic_joker.power_selection.player_id === my_player_id && (
              <Portal>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-slate-900/95 p-6 md:p-8 rounded-[2rem] border-4 border-violet-500/50 shadow-[0_0_80px_rgba(139,92,246,0.3)] flex flex-col items-center gap-6"
                  >
                    <div className="flex items-center gap-3 bg-violet-600 px-6 py-2 rounded-full shadow-lg">
                      <span className="text-white font-black uppercase tracking-widest text-xs md:text-sm">
                        Espiando Adversário
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 md:gap-3 max-w-[85vw] md:max-w-2xl">
                      {(
                        game.hands[
                          game.magic_joker.power_selection.target_player_id
                        ] as Card[]
                      ).map((card) => (
                        <div
                          key={card.id}
                          className="w-16 h-24 md:w-24 md:h-36 shadow-xl"
                        >
                          <HandCard
                            card={card}
                            isSelected={false}
                            className="w-full h-full border border-white/10 rounded-lg"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="text-violet-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                      Saindo em alguns segundos...
                    </div>
                  </motion.div>
                </motion.div>
              </Portal>
            )}
        </AnimatePresence>

        <main
          id="game-screen"
          className="h-screen w-screen bg-[#0f2e1a] text-white overflow-hidden flex flex-col select-none relative font-sans"
        >
          {/* == PORTAL RENDERER FOR EVENTS == */}
          <Portal>
            {/* Event Balloons (for info/success messages) */}
            {Object.entries(playerPositions).map(([id, pos]) => {
              const playerEvent = [...(game.recentEvents || [])]
                .reverse()
                .find(
                  (e) =>
                    e.playerId === Number(id) &&
                    ["info", "warning", "success"].includes(e.type),
                );

              if (playerEvent) {
                // Determine team
                const eventPlayerId = playerEvent.playerId!;
                const myTeam = my_player_id % 2;
                const eventPlayerTeam = eventPlayerId % 2;
                const team = myTeam === eventPlayerTeam ? "mine" : "opponent";

                let customColor: string | undefined = undefined;
                if (playerEvent.type === "warning") customColor = "warning";
                if (playerEvent.type === "success") customColor = "success";

                return (
                  <EventBalloon
                    key={playerEvent.id}
                    message={playerEvent.message}
                    team={team}
                    customColor={customColor}
                    x={pos.x}
                    y={pos.y}
                  />
                );
              }
              return null;
            })}

            {/* Persistent Timer Balloon for Current Player */}
            {(() => {
              const currentPos = playerPositions[game.current_player];
              if (currentPos && game.status === "PLAYING") {
                return <TimerBalloon x={currentPos.x} y={currentPos.y} />;
              }
              return null;
            })()}
          </Portal>
          {/* Connection Overlay (Only for Online Game) */}
          {game.roomId !== "LOCAL_DEBUG" && <ConnectionOverlay />}

          {/* Rules Modal */}
          {showHowToPlay && (
            <HowToPlay onClose={() => setShowHowToPlay(false)} />
          )}

          {showRules && (
            <GameRulesModal
              rules={game.rules}
              onRulesChange={(newRules) => game.setRules(newRules)}
              onClose={() => setShowRules(false)}
              isHost={false}
            />
          )}

          {/* Menu Dropdown */}
          <div className="absolute top-4 right-4 z-100">
            <GameMenu
              onLeave={my_player_id !== 1 ? game.leaveGame : undefined}
              onCloseRoom={my_player_id === 1 ? game.closeRoom : undefined}
              showAnimations={game.showAnimations}
              toggleAnimations={game.toggleAnimations}
              showSortButton={game.showSortButton}
              toggleSortButton={game.toggleSortButton}
              showCardMarkers={game.showCardMarkers}
              toggleCardMarkers={game.toggleCardMarkers}
              onOpenHowToPlay={() => setShowHowToPlay(true)}
              onOpenRules={() => setShowRules(true)}
              showOpponentHands={showOpponentHands}
              toggleOpponentHands={() =>
                setShowOpponentHands(!showOpponentHands)
              }
            />
          </div>

          {/* TEXTURA DA MESA */}
          <div
            id="table-texture"
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          ></div>

          {/* == POWER INSTRUCTION OVERLAY == */}
          <AnimatePresence>
            {game.magic_joker.power_selection?.player_id === my_player_id && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-20 left-1/2 -translate-x-1/2 z-100 pointer-events-none"
              >
                <div className="bg-violet-600/90 backdrop-blur-md px-6 py-3 rounded-full border border-violet-400 shadow-[0_0_30px_rgba(124,58,237,0.5)] flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                    <span className="text-white font-black uppercase tracking-widest text-xs md:text-sm">
                      {game.magic_joker.power_selection.ability === "VIEW_HAND"
                        ? "Espiando a mão do adversário..."
                        : game.magic_joker.power_selection.stage ===
                            "PICK_MY_CARD"
                          ? "Escolha uma carta da sua mão para dar"
                          : "Agora escolha uma carta do seu parceiro para pegar"}
                    </span>
                  </div>
                  <button
                    onClick={() => game.power_cancel()}
                    className="pointer-events-auto bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full border border-white/20 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ÁREA DO ADVERSÁRIO (Resizable) */}
          <section
            id="opponent-area"
            style={{ height: `${opponentHeight}%` }}
            className="bg-red-950/10 border-b border-white/5 px-4 md:px-6 py-1 flex flex-col relative z-10 min-h-0 transition-[height] duration-75 ease-linear"
          >
            <div className="flex-1 flex flex-wrap content-start gap-x-2 md:gap-x-4 gap-y-1.5 md:gap-y-8 overflow-y-auto scrollbar-hide pt-1">
              {game.team_melds[opponent_team]?.map((meld, idx) => (
                <MeldDisplay
                  key={idx}
                  meld={meld}
                  enterFrom={activePlayerDirection}
                />
              ))}
              <div className="absolute text-center w-full h-full flex items-center justify-center pointer-events-none">
                <span className="text-white/5 text-xl md:text-3xl font-black uppercase tracking-[0.5em]">
                  ELES
                </span>
              </div>
            </div>
          </section>
          {/* SEPARATOR / INFO BAR (Draggable) */}
          <motion.section
            transition={{ stiffness: 500 }}
            id="game-separator"
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            className="md:h-[5%] bg-white/5 backdrop-blur-md
           px-1 md:px-8 border-y border-white/5 shadow-2xl z-30 shrink-0
            cursor-grab active:cursor-grabbing select-none active:bg-white/10 transition-colors group"
          >
            <div className="flex h-full items-center justify-between px-1 md:px-0">
              {isMobile ? (
                <GameSeparatorMobile
                  {...layoutProps}
                  my_player_id={my_player_id}
                />
              ) : (
                <GameSeparatorDesktop
                  {...layoutProps}
                  my_player_id={my_player_id}
                />
              )}
            </div>
          </motion.section>

          {/* ÁREA DO JOGADOR (Resizable) */}
          <section
            id="player-area"
            className="flex-1 bg-blue-950/10 px-4 md:px-6 py-1 flex flex-col relative z-10 min-h-0"
          >
            <div
              className="flex-1 flex flex-wrap content-start gap-x-2 md:gap-x-4
           gap-y-1.5 md:gap-y-8 overflow-y-auto scrollbar-hide pt-1 pb-16"
            >
              {game.team_melds[my_team]?.map((meld, idx) => {
                // Logic: Can interact if (Draw Phase & Discard Avail) OR (Action Phase & Hand Cards Selected)
                const canInteractWithMeld =
                  (canDraw && (game.discard_pile?.length ?? 0) > 0) ||
                  (canAction && selectedCards.length > 0);

                const isHovered =
                  hoveredMeld?.teamId === my_team &&
                  hoveredMeld?.index === idx &&
                  canInteractWithMeld;

                return (
                  <MeldDisplay
                    key={idx}
                    meld={meld}
                    isHovered={isHovered}
                    interactive={true}
                    onClick={() => handleMeldClick(my_team, idx)}
                    onMouseEnter={() =>
                      canInteractWithMeld &&
                      setHoveredMeld({ teamId: my_team, index: idx })
                    }
                    onMouseLeave={() => setHoveredMeld(null)}
                    enterFrom={activePlayerDirection}
                  />
                );
              })}
              {
                <div className="absolute w-full h-full flex items-center justify-center pointer-events-none">
                  <span className="text-white/5 text-xl md:text-3xl font-black uppercase tracking-[0.5em]">
                    NÓS
                  </span>
                </div>
              }
              {/* Botão Baixar Novo Jogo - VISUAL DE SLOT RETANGULAR */}
              {(showNewMeldAction || showNewMeldPickUp) && (
                <div
                  onClick={handleNewMeldClick}
                  className="shrink-0 w-24 h-16 md:w-48 md:h-28 border-2 border-dotted border-yellow-600/40 bg-yellow-600/5 cursor-pointer hover:bg-yellow-600/10 shadow-sm rounded-xl flex flex-col items-center justify-center transition-all duration-300"
                >
                  <div className="flex items-center gap-3 text-yellow-600/60">
                    <span className="text-3xl md:text-5xl font-light"></span>
                    <span className="text-[9px] md:text-xs font-black uppercase tracking-widest text-left leading-tight">
                      + Abaixar novo
                    </span>
                  </div>
                </div>
              )}{" "}
            </div>
          </section>

          {/* FOOTER: [MONTE] [MÃO] [LIXO] */}
          <footer
            id="game-footer"
            className="h-32 md:h-[20%] transition-all duration-300 ease-out overflow-visible px-1 pb-1 z-40
           relative w-full flex items-end justify-between gap-1 md:gap-6 pointer-events-none"
          >
            {/* Visual Background (Gradient) - Fixed height to not cover the table */}
            <div className="absolute inset-0 top-auto h-32 md:h-full bg-linear-to-t from-black/95 via-black/80 to-transparent backdrop-blur-md -z-10 pointer-events-none" />

            {isMobile ? (
              <GameFooterMobile
                {...layoutProps}
                my_player_id={my_player_id}
                focusedCardId={focusedCardId}
              />
            ) : (
              <GameFooterDesktop
                {...layoutProps}
                my_player_id={my_player_id}
                focusedCardId={focusedCardId}
              />
            )}

            {/* ERROR TOAST (Standardized with EventBalloon) */}
            {game.last_error && (
              <div
                id="error-toast"
                className="absolute -top-20 left-1/2 -translate-x-1/2 z-100 pointer-events-auto"
              >
                <div className="relative">
                  <EventBalloon
                    message={`[ALERT] ${game.last_error}`}
                    x={0}
                    y={0}
                    isStatic={true}
                    customColor="error"
                  />
                  <button
                    onClick={game.clear_error}
                    className="absolute -top-2 -right-2 bg-red-800 hover:bg-red-700 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer text-white border border-white/10 z-[60] shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* INFO TOAST (Using EventBalloon style for icons) */}
            {game.last_info && (
              <div
                id="info-toast"
                className="absolute -top-20 left-1/2 -translate-x-1/2 z-100 pointer-events-auto"
              >
                <div className="relative">
                  <EventBalloon
                    message={game.last_info}
                    x={0}
                    y={0}
                    isStatic={true}
                    customColor="info"
                  />
                  <button
                    onClick={game.clear_info}
                    className="absolute -top-2 -right-2 bg-slate-700 hover:bg-slate-600 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer text-white border border-white/10 z-[60] shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </footer>
        </main>
      </LayoutGroup>
    </MotionConfig>
  );
};
