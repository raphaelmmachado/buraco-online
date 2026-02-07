import { useState, useEffect, useRef } from "react";
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
import { GameMenu } from "../game-ui/GameMenu";
import { HowToPlay } from "../game-ui/HowToPlay";
import { FinishScreen } from "./FinishScreen";
import { type GameAdapterInterface } from "../game-ui/useLocalGameAdapter";
import { OpponentsHandsLayer } from "../game-ui/OpponentsHandsLayer";
import { LoadingScreen } from "../ui/LoadingScreen";

// Custom Hooks
import { useWakeLock } from "../../hooks/useWakeLock";
import { useScreenDrag } from "../../hooks/useScreenDrag";
import { useGameAudio } from "../../hooks/useGameAudio";
import { useMobileCheck } from "../../hooks/useMobileCheck";
import CurrentGamePoints from "../game-ui/CurrentGamePoints";
import { ConnectionOverlay } from "./ConnectionOverlay";
import TookDeadPile from "../game-ui/TookDeadPile";
import { EventBalloon } from "../game-ui/EventBalloon";
import Portal from "../ui/Portal";
import { TimerBalloon } from "../game-ui/TimerBalloon";

// Layout Components
import { GameSeparatorMobile } from "./layouts/GameSeparatorMobile";
import { GameSeparatorDesktop } from "./layouts/GameSeparatorDesktop";
import { GameFooterMobile } from "./layouts/GameFooterMobile";
import { GameFooterDesktop } from "./layouts/GameFooterDesktop";
import { type GameLayoutProps } from "./types/GameLayoutProps";

export const GameScreen = ({ game }: { game: GameAdapterInterface }) => {
  // State
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
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

  // Effect to delay finish screen
  useEffect(() => {
    if (game.status === "FINISHED" || game.status === "ROUND_OVER") {
      const timer = setTimeout(() => {
        setShowFinishScreen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [game.status]);

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
  const topDiscardCard = game.discard_pile?.[0];
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

  // Auto-clear error after 3 seconds
  useEffect(() => {
    if (game.last_error) {
      const timer = setTimeout(() => {
        game.clear_error();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [game.last_error, game]);

  // GUARD: Wait for player identification to prevent "Ghost Mode"
  // Moved after hooks to strictly follow React Rules of Hooks
  if (game.my_player_number === null) {
    return (
      <LoadingScreen
        message="Sincronizando..."
        subMessage="Recuperando estado da partida..."
      />
    );
  }

  // --- RENDER FINISH SCREEN ---
  if (
    showFinishScreen &&
    (game.status === "FINISHED" || game.status === "ROUND_OVER") &&
    game.final_score
  ) {
    const isRoundOver = game.status === "ROUND_OVER";
    const totalHumanPlayers = game.players_data
      ? Object.values(game.players_data).filter((p) => !p.isBot).length
      : 0;
    const mySocketId = game.players_data?.[my_player_id]?.socketId;

    return (
      <FinishScreen
        finalScore={game.final_score}
        myTeam={my_team}
        onPlayAgain={() => game.voteNext()}
        onLeave={game.leaveGame}
        isRoundOver={isRoundOver}
        cumulativeScore={game.cumulative_score}
        roundCount={game.round_count}
        winCondition={game.win_condition}
        rematchVotes={game.rematch_votes}
        totalHumanPlayers={totalHumanPlayers}
        myPlayerId={mySocketId}
      />
    );
  }

  // --- HANDLERS ---
  const toggleSelect = (id: string) => {
    setSelectedCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
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
    } else if (canAction && selectedCards.length === 1) {
      game.discard_card(selectedCards[0]);
      setSelectedCards([]);
    }
  };

  const handleMeldClick = (teamId: number, meldIndex: number) => {
    if (teamId !== my_team) return;

    if (canAction && selectedCards.length > 0) {
      game.add_to_meld(selectedCards, meldIndex);
      setSelectedCards([]);
    } else if (canDraw && isDiscardSelected) {
      const handCardsForMeld = selectedCards.filter(
        (id) => id !== topDiscardCard?.id,
      );
      game.pick_up_discard_add_to_meld(meldIndex, handCardsForMeld);
      setSelectedCards([]);
    }
  };

  const showNewMeldAction = canAction && selectedCards.length >= 3;
  const showNewMeldPickUp =
    canDraw && isDiscardSelected && selectedCards.length >= 3;

  const handleNewMeldClick = () => {
    if (showNewMeldAction) {
      game.meld_cards(selectedCards);
    } else if (showNewMeldPickUp) {
      const handCardsForMeld = selectedCards.filter(
        (id) => id !== topDiscardCard?.id,
      );
      game.pick_up_discard_new_meld(handCardsForMeld);
    }
    setSelectedCards([]);
  };

  // Prepare Props Object
  const layoutProps: GameLayoutProps = {
    game,
    selectedCards,
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
        <AnimatePresence>
          {(game.status === "FINISHED" || game.status === "ROUND_OVER") &&
            !showFinishScreen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/10 pointer-events-none"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 30 }}
                  animate={{ scale: 1, y: 0 }}
                  className="text-center bg-black/60 backdrop-blur-md px-16 py-10 rounded-[3.5rem] border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                >
                  <h2 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tighter drop-shadow-2xl mb-4">
                    {game.status === "FINISHED"
                      ? "Fim de Jogo!"
                      : "Fim da Rodada!"}
                  </h2>

                  <div className="flex flex-col items-center gap-4">
                    <div className="h-px w-24 bg-white/20"></div>

                    <p className="text-yellow-400 text-xl md:text-3xl font-black uppercase tracking-[0.2em] drop-shadow-lg">
                      {(() => {
                        const t1Beat = game.final_score?.details_t1.did_beat;
                        const t2Beat = game.final_score?.details_t2.did_beat;
                        if (t1Beat)
                          return my_team === 1
                            ? "VOCÊS BATERAM!"
                            : "ELES BATERAM!";
                        if (t2Beat)
                          return my_team === 2
                            ? "VOCÊS BATERAM!"
                            : "ELES BATERAM!";
                        return "AS CARTAS ACABARAM!";
                      })()}
                    </p>

                    <p className="text-white/40 uppercase tracking-[0.3em] text-xs font-bold animate-pulse">
                      Computando Placar Final...
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
        </AnimatePresence>

        <OpponentsHandsLayer game={game} visible={showOpponentHands} />
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

                let customColor = undefined;
                if (playerEvent.type === "warning") customColor = "bg-red-600";
                if (playerEvent.type === "success")
                  customColor = "bg-green-600";

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

          {/* Menu Dropdown */}
          <div className="absolute top-4 right-4 z-100">
            <GameMenu
              onOpenRules={() => setShowHowToPlay(true)}
              onLeave={game.leaveGame}
              showAnimations={game.showAnimations}
              toggleAnimations={game.toggleAnimations}
              onOpenHowToPlay={() => setShowHowToPlay(true)}
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

          {/* ÁREA DO ADVERSÁRIO (Resizable) */}
          <section
            id="opponent-area"
            style={{ height: `${opponentHeight}%` }}
            className="bg-red-950/10 border-b border-white/5 px-1 md:px-6 py-1 flex flex-col relative z-10 min-h-0 transition-[height] duration-75 ease-linear"
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
            {/* PLACAR */}
            <TookDeadPile took={oppTeamHasTaken} position="right-2 bottom-8" />
            <CurrentGamePoints points={oppScore} position="right-2 bottom-1" />
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
            className="flex-1 bg-blue-950/10 px-1 md:px-6 py-1 flex flex-col relative z-10 min-h-0"
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

            {/* PLACAR */}
            <TookDeadPile took={myTeamHasTaken} position="right-2 top-8" />
            <CurrentGamePoints points={myScore} position="right-2 top-1" />
          </section>

          {/* FOOTER: [MONTE] [MÃO] [LIXO] */}
          <footer
            id="game-footer"
            className="h-32 md:h-[20%] bg-linear-to-t from-black/95 via-black/80 to-transparent backdrop-blur-md px-1 pb-1 z-40
           relative w-full flex items-end justify-between gap-1 md:gap-6 pointer-events-none"
          >
            {isMobile ? (
              <GameFooterMobile {...layoutProps} my_player_id={my_player_id} />
            ) : (
              <GameFooterDesktop {...layoutProps} my_player_id={my_player_id} />
            )}

            {/* ERROR TOAST */}
            {game.last_error && (
              <div
                id="error-toast"
                className="absolute -top-16 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur
               text-white px-6 py-2 rounded-md text-sm font-black shadow-2xl
                flex items-center gap-3 border border-white/20 z-100"
              >
                <span>⚠️ {game.last_error}</span>
                <button
                  onClick={game.clear_error}
                  className="bg-black/20 hover:bg-black/40 rounded-lg w-5 h-5 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            )}
          </footer>
        </main>
      </LayoutGroup>
    </MotionConfig>
  );
};
