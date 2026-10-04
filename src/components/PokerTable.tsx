import React, { useState, useEffect, useRef } from 'react';
import { GameState, Card, PlayerActionType } from '../types/poker';
import { PokerCard } from './PokerCard';
import { PlayerSeat } from './PlayerSeat';
import { getHandDescription } from '../utils/pokerEvaluator';
import { sound } from '../utils/audio';

interface PokerTableProps {
  gameState: GameState;
  currentUserId: string;
  isHostUser: boolean;
  roomCode: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenRules: () => void;
  onToggleLog: () => void;
  onLeaveRoom: () => void;
  onAddBot?: () => void;
  onKickBot?: (botId: string) => void;
  onCopyRoom: () => void;
  onCopyLink: () => void;
  onAction: (action: PlayerActionType, amount?: number) => void;
  onStartGame: () => void;
  onNextHand: () => void;
  winningCardSet?: Set<string>;
  showWinnerBannerButton?: boolean;
  onOpenWinnerBanner?: () => void;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  gameState,
  currentUserId,
  isHostUser,
  roomCode,
  isMuted,
  onToggleMute,
  onOpenRules,
  onToggleLog,
  onLeaveRoom,
  onAddBot,
  onKickBot,
  onCopyRoom,
  onCopyLink,
  onAction,
  onStartGame,
  onNextHand,
  winningCardSet,
  showWinnerBannerButton,
  onOpenWinnerBanner,
}) => {
  const { players, communityCards, pot, phase, activePlayerIndex, dealerIndex, currentBet, minRaise } = gameState;

  // Find local user
  const myIndex = players.findIndex((p) => p.id === currentUserId);
  const myPlayer = myIndex !== -1 ? players[myIndex] : null;
  const activePlayer = players[activePlayerIndex];

  // Turn calculation
  const isMyTurn =
    phase !== 'lobby' &&
    phase !== 'showdown' &&
    activePlayer &&
    activePlayer.id === currentUserId &&
    !myPlayer?.folded &&
    !myPlayer?.isAllIn;

  const callCost = myPlayer ? Math.max(0, currentBet - myPlayer.currentBet) : 0;
  const maxCanBet = myPlayer ? myPlayer.chips : 0;
  const minRaiseTarget = myPlayer
    ? Math.min(myPlayer.currentBet + maxCanBet, currentBet + minRaise)
    : 0;
  const maxRaiseTarget = myPlayer ? myPlayer.currentBet + maxCanBet : 0;

  const [raiseAmount, setRaiseAmount] = useState<number>(minRaiseTarget);

  useEffect(() => {
    if (isMyTurn) {
      setRaiseAmount(Math.max(minRaiseTarget, Math.min(maxRaiseTarget, currentBet + minRaise)));
    }
  }, [isMyTurn, minRaiseTarget, maxRaiseTarget, currentBet, minRaise]);

  const canCheck = callCost === 0;
  const canCall = callCost > 0 && maxCanBet > 0;
  const canRaise = maxRaiseTarget > minRaiseTarget && maxCanBet > callCost;

  const setPreset = (type: 'min' | 'halfPot' | 'pot' | 'allIn') => {
    if (!myPlayer) return;
    if (type === 'min') {
      setRaiseAmount(minRaiseTarget);
    } else if (type === 'halfPot') {
      const half = currentBet + Math.floor(pot * 0.5);
      setRaiseAmount(Math.max(minRaiseTarget, Math.min(maxRaiseTarget, half)));
    } else if (type === 'pot') {
      const full = currentBet + pot;
      setRaiseAmount(Math.max(minRaiseTarget, Math.min(maxRaiseTarget, full)));
    } else if (type === 'allIn') {
      setRaiseAmount(maxRaiseTarget);
    }
  };

  const isCardWinning = (card: Card | null) => {
    if (!card || !winningCardSet) return false;
    return winningCardSet.has(`${card.suit}-${card.rank}`);
  };

  const handDescription = myPlayer?.cards && myPlayer.cards.length > 0
    ? getHandDescription(myPlayer.cards, communityCards)
    : '';

  // Flop / Turn / River Animated Announcement State
  const [phaseAnnouncement, setPhaseAnnouncement] = useState<{
    title: string;
    subtitle: string;
  } | null>(null);

  // Visual Card Deck state
  const [isDrawingDeck, setIsDrawingDeck] = useState(false);

  useEffect(() => {
    if (communityCards.length > 0 || phase === 'preflop') {
      setIsDrawingDeck(true);
      const timer = setTimeout(() => setIsDrawingDeck(false), 500);
      return () => clearTimeout(timer);
    }
  }, [communityCards.length, phase, gameState.handNumber]);

  // Remaining cards in deck
  const activePlayersCount = players.filter((p) => !p.folded).length;
  const remainingCardsCount = Math.max(0, 52 - (activePlayersCount * 2) - communityCards.length);

  // All-In Dramatic Announcement State
  const [allInAnnouncement, setAllInAnnouncement] = useState<{
    playerName: string;
    amount: number;
  } | null>(null);

  const allInTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevAllInSetRef = useRef<Set<string>>(new Set());
  const prevCardsCountRef = useRef(communityCards.length);

  // Recent Opponent Action Alert Ticker
  const [latestActionAlert, setLatestActionAlert] = useState<{
    playerName: string;
    actionType: string;
    text: string;
    amount?: number;
  } | null>(null);

  const prevActionsMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (phase === 'lobby') {
      setLatestActionAlert(null);
      prevActionsMapRef.current.clear();
      return;
    }

    for (const p of players) {
      if (p.lastAction) {
        const key = `${p.id}-${p.lastAction.type}-${p.lastAction.amount || 0}`;
        const prevKey = prevActionsMapRef.current.get(p.id);
        if (key !== prevKey) {
          prevActionsMapRef.current.set(p.id, key);
          setLatestActionAlert({
            playerName: p.name,
            actionType: p.lastAction.type,
            text: p.lastAction.text,
            amount: p.lastAction.amount,
          });
          const timer = setTimeout(() => setLatestActionAlert(null), 2500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [players, phase]);

  useEffect(() => {
    // If in showdown or lobby, immediately clear the all-in announcement
    if (phase === 'showdown' || phase === 'lobby') {
      setAllInAnnouncement(null);
      if (allInTimerRef.current) {
        clearTimeout(allInTimerRef.current);
        allInTimerRef.current = null;
      }
      return;
    }

    const currentAllInIds = new Set(players.filter((p) => p.isAllIn).map((p) => p.id));
    const newlyAllIn = players.find(
      (p) => p.isAllIn && !prevAllInSetRef.current.has(p.id)
    );

    if (newlyAllIn) {
      sound.playAllIn();
      setAllInAnnouncement({
        playerName: newlyAllIn.name,
        amount: newlyAllIn.currentBet,
      });

      // Clear any prior timer and schedule auto-dismiss
      if (allInTimerRef.current) {
        clearTimeout(allInTimerRef.current);
      }
      allInTimerRef.current = setTimeout(() => {
        setAllInAnnouncement(null);
        allInTimerRef.current = null;
      }, 2200);
    }

    prevAllInSetRef.current = currentAllInIds;
  }, [players, phase]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (allInTimerRef.current) {
        clearTimeout(allInTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const prev = prevCardsCountRef.current;
    const current = communityCards.length;
    prevCardsCountRef.current = current;

    if (prev === 0 && current === 3) {
      // FLOP opened!
      setPhaseAnnouncement({
        title: '🃏 FLOP (ฟลอป)',
        subtitle: 'เปิดไพ่กลาง 3 ใบแรก',
      });
      sound.playCardDeal();
      const timer = setTimeout(() => setPhaseAnnouncement(null), 1800);
      return () => clearTimeout(timer);
    } else if (prev === 3 && current === 4) {
      // TURN opened!
      setPhaseAnnouncement({
        title: '🃏 TURN (เทิร์น)',
        subtitle: 'เปิดไพ่กลางใบที่ 4',
      });
      sound.playCardDeal();
      const timer = setTimeout(() => setPhaseAnnouncement(null), 1800);
      return () => clearTimeout(timer);
    } else if (prev === 4 && current === 5) {
      // RIVER opened!
      setPhaseAnnouncement({
        title: '🃏 RIVER (ริเวอร์)',
        subtitle: 'เปิดไพ่ใบที่ 5 สุดท้าย!',
      });
      sound.playCardDeal();
      const timer = setTimeout(() => setPhaseAnnouncement(null), 1800);
      return () => clearTimeout(timer);
    }
  }, [communityCards.length]);

  // Filter opponent seats (all players except local player)
  const opponentPlayers = players
    .map((p, originalIdx) => ({ player: p, originalIdx }))
    .filter((item) => item.player.id !== currentUserId);

  // Geometry for opponent seats placed cleanly along top and sides (Never overlapping bottom console!)
  const getOpponentCoordinates = (opponentIndex: number, totalOpponents: number) => {
    if (totalOpponents === 1) {
      return { left: '50%', top: '15%' };
    }
    if (totalOpponents === 2) {
      if (opponentIndex === 0) return { left: '26%', top: '16%' };
      return { left: '74%', top: '16%' };
    }
    if (totalOpponents === 3) {
      if (opponentIndex === 0) return { left: '16%', top: '24%' };
      if (opponentIndex === 1) return { left: '50%', top: '14%' };
      return { left: '84%', top: '24%' };
    }
    if (totalOpponents === 4) {
      if (opponentIndex === 0) return { left: '12%', top: '30%' };
      if (opponentIndex === 1) return { left: '34%', top: '14%' };
      if (opponentIndex === 2) return { left: '66%', top: '14%' };
      return { left: '88%', top: '30%' };
    }
    // 5 opponents (Maximum capacity, clean arch with zero overlap)
    const layout = [
      { left: '10%', top: '32%' }, // Far Left
      { left: '28%', top: '15%' }, // Top Left
      { left: '50%', top: '13%' }, // Top Center
      { left: '72%', top: '15%' }, // Top Right
      { left: '90%', top: '32%' }, // Far Right
    ];
    return layout[opponentIndex] || layout[0];
  };

  const phaseLabels: Record<string, string> = {
    lobby: 'รอเริ่มเกม (Lobby)',
    dealing: 'กำลังแจกไพ่...',
    preflop: 'พรีฟลอป (Pre-Flop)',
    flop: 'ฟลอป (Flop)',
    turn: 'เทิร์น (Turn)',
    river: 'ริเวอร์ (River)',
    showdown: 'เปิดไพ่ตัดสิน (Showdown)',
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center p-1 sm:p-2 select-none overflow-hidden bg-[#07130b]">
      {/* Outer Table Bumper (Padded Leather Rim - Edge to Edge) */}
      <div className="relative w-full h-full rounded-[24px] sm:rounded-[36px] md:rounded-[48px] bg-gradient-to-b from-[#2b170c] via-[#1a0e07] to-[#120904] p-1.5 sm:p-3 shadow-2xl border-2 sm:border-4 border-[#452715]/90 flex items-center justify-center overflow-hidden">
        
        {/* Brass Inner Rim Accent */}
        <div className="relative w-full h-full rounded-[20px] sm:rounded-[30px] md:rounded-[42px] p-1 sm:p-1.5 bg-gradient-to-tr from-amber-700/60 via-amber-400/40 to-amber-900/60 shadow-inner flex items-center justify-center">
          
          {/* Casino Emerald Felt (Full-Screen Surface) */}
          <div
            className="relative w-full h-full rounded-[16px] sm:rounded-[26px] md:rounded-[38px] overflow-hidden flex flex-col justify-between border sm:border-2 border-emerald-950/80 shadow-[inset_0_0_100px_rgba(0,0,0,0.85)] p-2 sm:p-3"
            style={{
              background: 'radial-gradient(ellipse at center, #1a6038 0%, #124c2c 45%, #0b331c 85%, #051d10 100%)',
            }}
          >
            {/* Printed Table Ring Line */}
            <div className="absolute inset-4 sm:inset-8 rounded-[14px] sm:rounded-[24px] md:rounded-[32px] border border-emerald-400/15 pointer-events-none" />

            {/* In-Table Top HUD Bar (Integrated directly on top of table) */}
            <div className="relative z-30 w-full flex items-center justify-between gap-1.5 shrink-0 px-1 pt-0.5">
              {/* Left HUD: Room ID & Info */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md border border-amber-500/40 rounded-xl px-2 sm:px-3 py-1 shadow-md">
                  <span className="text-amber-400 text-xs sm:text-sm font-serif font-black">♠</span>
                  <span className="text-[10px] sm:text-xs text-slate-300 font-semibold hidden xs:inline">ห้อง:</span>
                  <span className="font-mono font-black text-xs sm:text-sm text-amber-300 tracking-wider">
                    {roomCode}
                  </span>
                  <button
                    onClick={onCopyRoom}
                    title="คัดลอกรหัสห้อง"
                    className="ml-1 text-slate-400 hover:text-amber-300 text-xs cursor-pointer p-0.5"
                  >
                    📋
                  </button>
                </div>

                <button
                  onClick={onCopyLink}
                  title="คัดลอกลิงก์ชวนเพื่อน"
                  className="hidden sm:flex items-center gap-1 text-xs bg-black/50 hover:bg-black/70 border border-slate-700/80 text-slate-200 px-2.5 py-1 rounded-xl cursor-pointer transition-colors shadow-sm"
                >
                  <span>🔗 ชวนเพื่อน</span>
                </button>

                <div className="bg-black/50 border border-slate-700/80 px-2 py-1 rounded-xl text-[10px] sm:text-xs text-slate-300 font-bold flex items-center gap-1">
                  <span>👥</span>
                  <span>{players.length}/6</span>
                </div>
              </div>

              {/* Right HUD: Winner toggle, Add Bot, Rules, Mute, Chat, Leave */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {showWinnerBannerButton && onOpenWinnerBanner && (
                  <button
                    onClick={onOpenWinnerBanner}
                    className="text-[10px] sm:text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 px-2 sm:px-3 py-1 rounded-xl font-black flex items-center gap-1 cursor-pointer transition-all shadow-lg animate-bounce"
                  >
                    <span>🏆</span>
                    <span className="hidden xs:inline">ดูผลผู้ชนะ</span>
                  </button>
                )}

                {isHostUser && players.length < 6 && onAddBot && (
                  <button
                    onClick={onAddBot}
                    className="text-[10px] sm:text-xs bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 px-2 sm:px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                  >
                    <span>🤖</span>
                    <span className="hidden sm:inline">เพิ่มบอท</span>
                  </button>
                )}

                <button
                  onClick={onOpenRules}
                  title="กติกาและวิธีเล่น"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black/50 hover:bg-black/70 border border-slate-700 text-slate-200 text-xs flex items-center justify-center cursor-pointer transition-colors"
                >
                  📖
                </button>

                <button
                  onClick={onToggleMute}
                  title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black/50 hover:bg-black/70 border border-slate-700 text-slate-200 text-xs flex items-center justify-center cursor-pointer transition-colors"
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>

                <button
                  onClick={onToggleLog}
                  title="ประวัติการเล่นและแชท"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black/50 hover:bg-black/70 border border-slate-700 text-slate-200 text-xs flex items-center justify-center cursor-pointer transition-colors"
                >
                  📜
                </button>

                <button
                  onClick={onLeaveRoom}
                  className="text-[10px] sm:text-xs bg-red-950/90 hover:bg-red-900 border border-red-700/60 text-rose-300 px-2 sm:px-2.5 py-1 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  ออก
                </button>
              </div>
            </div>

            {/* Center Area: Pot & Community Cards & Opponent Seats */}
            <div className="relative flex-1 w-full flex items-center justify-center min-h-0 my-auto">
              {/* Floating All-In Dramatic Announcement Banner */}
              {allInAnnouncement && phase !== 'showdown' && phase !== 'lobby' && (
                <div
                  onClick={() => setAllInAnnouncement(null)}
                  onAnimationEnd={() => setAllInAnnouncement(null)}
                  className="absolute top-[32%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto cursor-pointer animate-allin-banner"
                >
                  <div className="bg-gradient-to-r from-red-950/98 via-rose-950/98 to-amber-950/98 border-2 border-amber-300 text-white px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-3xl shadow-[0_0_50px_rgba(244,63,94,0.95),0_0_25px_rgba(245,158,11,0.8)] backdrop-blur-2xl text-center whitespace-nowrap flex flex-col items-center gap-1 animate-flame-glow relative group">
                    <span className="absolute top-2 right-3 text-[10px] text-amber-300/50 group-hover:text-amber-300">
                      ✕
                    </span>
                    <div className="flex items-center gap-1.5 text-rose-300 text-xs sm:text-sm font-black tracking-widest uppercase">
                      <span className="text-xl animate-bounce">🔥</span>
                      <span>ALL-IN SHOWDOWN</span>
                      <span className="text-xl animate-bounce">🔥</span>
                    </div>
                    <div className="text-lg sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-rose-300 drop-shadow">
                      {allInAnnouncement.playerName} เทหมดหน้าตัก!
                    </div>
                    <div className="text-[11px] sm:text-xs text-amber-200 font-mono font-bold bg-black/50 px-3 py-0.5 rounded-full border border-amber-400/40">
                      เดิมพันหมดตัว: ${allInAnnouncement.amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Opponent Seats positioned around felt */}
              {opponentPlayers.map(({ player, originalIdx }, idx) => {
                const coords = getOpponentCoordinates(idx, opponentPlayers.length);
                const isActiveTurn = phase !== 'showdown' && phase !== 'lobby' && originalIdx === activePlayerIndex;
                const isDealer = originalIdx === dealerIndex;

                return (
                  <div
                    key={player.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto"
                    style={{ left: coords.left, top: coords.top }}
                  >
                    <PlayerSeat
                      player={player}
                      isSelf={false}
                      isActiveTurn={isActiveTurn}
                      isDealer={isDealer}
                      winningCardSet={winningCardSet}
                      onKickBot={onKickBot}
                      isHostUser={isHostUser}
                    />
                  </div>
                );
              })}

              {/* Center Pot & Community Cards Container */}
              <div className="z-10 flex flex-col items-center justify-center gap-1.5 sm:gap-2.5 my-auto">
                {/* Center Pot & Physical Card Deck Row */}
                <div className="flex items-center gap-2 sm:gap-3 z-20">
                  {/* Pot Display */}
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-black/75 backdrop-blur-md border border-amber-500/50 px-3 py-1 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                    <div className="flex -space-x-1 items-center">
                      <span className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-amber-400 border border-amber-600 shadow inline-block" />
                      <span className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-red-500 border border-red-700 shadow inline-block" />
                      <span className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-blue-500 border border-blue-700 shadow inline-block" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[9px] sm:text-xs text-amber-200/80 uppercase font-bold">
                        POT
                      </span>
                      <span className="text-xs sm:text-lg font-black font-mono text-amber-300">
                        ${pot.toLocaleString()}
                      </span>
                    </div>
                    {phase !== 'lobby' && (
                      <span className="text-[9px] sm:text-[10px] bg-emerald-900/90 text-emerald-300 px-2 py-0.5 rounded-full font-bold ml-1">
                        {phaseLabels[phase] || phase}
                      </span>
                    )}
                  </div>

                  {/* 3D Casino Card Deck (กองการ์ด / สำรับไพ่) */}
                  <div className="relative select-none flex items-center">
                    <div
                      title={`สำรับไพ่ (เหลือ ${remainingCardsCount} ใบ)`}
                      className="relative w-8 h-12 sm:w-11 sm:h-16 rounded-md bg-red-900 border border-amber-300/80 shadow-[1px_1px_0_#7f1d1d,2px_2px_0_#7f1d1d,3px_3px_0_#450a0a,4px_4px_0_#450a0a,5px_7px_12px_rgba(0,0,0,0.85)] flex items-center justify-center overflow-hidden transition-transform hover:scale-105"
                    >
                      {/* Red Diamond Crosshatch Pattern */}
                      <div
                        className="absolute inset-0 opacity-80"
                        style={{
                          backgroundColor: '#991b1b',
                          backgroundImage:
                            'radial-gradient(#ef4444 1.5px, transparent 1.5px), radial-gradient(#7f1d1d 1.5px, transparent 1.5px)',
                          backgroundSize: '6px 6px',
                          backgroundPosition: '0 0, 3px 3px',
                        }}
                      />
                      <div className="absolute inset-0.5 rounded border border-amber-400/40 pointer-events-none" />
                      <div className="relative z-10 flex flex-col items-center">
                        <span className="text-amber-300 text-xs sm:text-sm font-serif font-black drop-shadow">
                          ♠
                        </span>
                        <span className="text-[6px] sm:text-[8px] font-black text-amber-200 font-mono tracking-tighter">
                          DECK
                        </span>
                      </div>
                      {/* Animated Draw Card sliding out of deck */}
                      {isDrawingDeck && (
                        <div className="absolute inset-0 bg-red-800 rounded border border-amber-300 animate-deck-draw" />
                      )}
                    </div>
                    {/* Remaining count */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/90 border border-amber-400/60 text-amber-300 text-[8px] sm:text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap shadow">
                      {remainingCardsCount}
                    </div>
                  </div>
                </div>

                {/* Recent Player Action Pill (Highlights opponent's last move prominently) */}
                {latestActionAlert && (
                  <div className="z-30 animate-action-pop">
                    <div
                      className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold border shadow-xl flex items-center gap-1.5 backdrop-blur-md ${
                        latestActionAlert.actionType === 'fold'
                          ? 'bg-rose-950/95 border-rose-500 text-rose-200'
                          : latestActionAlert.actionType === 'raise'
                          ? 'bg-emerald-900/95 border-emerald-400 text-emerald-100 font-black ring-2 ring-emerald-400/40'
                          : latestActionAlert.actionType === 'all-in'
                          ? 'bg-gradient-to-r from-red-600 to-amber-600 border-amber-300 text-white font-black animate-pulse'
                          : latestActionAlert.actionType === 'check'
                          ? 'bg-sky-950/95 border-sky-400 text-sky-200'
                          : 'bg-blue-950/95 border-blue-400 text-blue-200'
                      }`}
                    >
                      <span>
                        {latestActionAlert.actionType === 'fold'
                          ? '❌'
                          : latestActionAlert.actionType === 'raise'
                          ? '⚡'
                          : latestActionAlert.actionType === 'all-in'
                          ? '🔥'
                          : latestActionAlert.actionType === 'check'
                          ? '✋'
                          : '💰'}
                      </span>
                      <span>
                        <strong className="text-white">{latestActionAlert.playerName}</strong>:{' '}
                        {latestActionAlert.text}
                      </span>
                    </div>
                  </div>
                )}

                {/* 5 Community Cards */}
                <div className="relative flex items-center gap-1 sm:gap-2">
                  {/* Floating Flop / Turn / River Animated Pop Banner */}
                  {phaseAnnouncement && (
                    <div className="absolute -top-12 sm:-top-14 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-phase-pop">
                      <div className="bg-gradient-to-r from-amber-950/95 via-amber-900/98 to-amber-950/95 border-2 border-amber-300 text-amber-200 px-4 sm:px-6 py-1.5 sm:py-2 rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.7)] backdrop-blur-xl text-center whitespace-nowrap">
                        <div className="text-sm sm:text-lg font-black font-serif text-amber-300 tracking-wider drop-shadow-md">
                          {phaseAnnouncement.title}
                        </div>
                        <div className="text-[10px] sm:text-xs text-amber-100 font-bold">
                          {phaseAnnouncement.subtitle}
                        </div>
                      </div>
                    </div>
                  )}

                  {[0, 1, 2, 3, 4].map((slotIndex) => {
                    const card = communityCards[slotIndex];
                    let animClass = 'animate-deal-deck-0';
                    if (slotIndex === 0) animClass = 'animate-deal-deck-0';
                    else if (slotIndex === 1) animClass = 'animate-deal-deck-1';
                    else if (slotIndex === 2) animClass = 'animate-deal-deck-2';
                    else if (slotIndex === 3) animClass = 'animate-deal-deck-turn';
                    else if (slotIndex === 4) animClass = 'animate-deal-deck-river';

                    return (
                      <div key={slotIndex} className="relative">
                        {card ? (
                          <div className={animClass}>
                            <PokerCard
                              card={card}
                              size="md"
                              isWinning={isCardWinning(card)}
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-14 sm:w-16 sm:h-24 rounded-lg border border-dashed sm:border-2 border-emerald-400/25 bg-emerald-950/25 flex flex-col items-center justify-center text-emerald-400/30">
                            <span className="text-[8px] sm:text-xs font-serif font-black opacity-30">
                              {slotIndex < 3 ? 'FLOP' : slotIndex === 3 ? 'TURN' : 'RIVER'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom In-Table Command Center (User Cards, Avatar & In-Table Buttons) */}
            <div className="relative z-30 w-full flex flex-col items-center shrink-0 pt-1 pb-0.5">
              
              {/* If in Lobby: In-Table Start Game Control */}
              {phase === 'lobby' && (
                <div className="w-full max-w-lg bg-black/75 backdrop-blur-md border border-amber-500/50 rounded-2xl p-2.5 sm:p-3 text-center flex flex-col sm:flex-row items-center justify-between gap-2 shadow-2xl">
                  <div className="text-left">
                    <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1">
                      <span>🎮 โต๊ะโป๊กเกอร์พร้อมแล้ว</span>
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-500/40">
                        {players.length}/6 คน
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-400">
                      {players.length < 2
                        ? 'ต้องการอย่างน้อย 2 คน (กด "เพิ่มบอท" หรือส่งรหัสห้องให้เพื่อน)'
                        : 'ผู้เล่นพร้อมแล้ว Host กดเริ่มแจกไพ่ได้ทันที'}
                    </div>
                  </div>

                  {isHostUser ? (
                    <button
                      onClick={onStartGame}
                      disabled={players.length < 2}
                      className={`px-5 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-lg transition-all ${
                        players.length >= 2
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 cursor-pointer hover:scale-102 active:scale-98'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      }`}
                    >
                      เริ่มแจกไพ่ (Start Game) ♠
                    </button>
                  ) : (
                    <div className="text-xs font-bold text-amber-300/90 animate-pulse">
                      รอ Host เริ่มเกม...
                    </div>
                  )}
                </div>
              )}

              {/* If in Showdown: In-Table Next Hand Control */}
              {phase === 'showdown' && (
                <div className="w-full max-w-lg bg-black/80 backdrop-blur-md border border-amber-500/60 rounded-2xl p-2 sm:p-2.5 flex items-center justify-between gap-2 shadow-2xl">
                  <div className="flex items-center gap-2 text-left">
                    <span className="text-xl">🏆</span>
                    <div>
                      <div className="text-xs font-bold text-amber-300">
                        {gameState.winners.length > 0
                          ? `${gameState.winners.map((w) => w.playerName).join(', ')} ชนะ $${gameState.winners.reduce((s, w) => s + w.amount, 0).toLocaleString()}`
                          : 'จบมือนักสู้'}
                      </div>
                      <div className="text-[10px] text-slate-300">
                        {gameState.winners[0]?.handName || 'สรุปผลเรียบร้อย'}
                      </div>
                    </div>
                  </div>

                  {isHostUser ? (
                    <button
                      onClick={onNextHand}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg cursor-pointer transition-all hover:scale-102 active:scale-98"
                    >
                      เล่นต่อรอบถัดไป ➜
                    </button>
                  ) : (
                    <div className="text-xs text-amber-300/80 font-semibold animate-pulse">
                      รอ Host เริ่มรอบถัดไป...
                    </div>
                  )}
                </div>
              )}

              {/* Active Hand: Local User Cards + In-Table Action Console */}
              {phase !== 'lobby' && phase !== 'showdown' && myPlayer && (
                <div
                  className={`w-full max-w-2xl bg-black/80 backdrop-blur-md border-2 ${
                    myPlayer.isAllIn
                      ? 'border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.95)] animate-flame-glow'
                      : 'border-amber-500/60 shadow-[0_0_30px_rgba(0,0,0,0.9)]'
                  } rounded-2xl sm:rounded-3xl p-2 sm:p-2.5 flex flex-col gap-1.5 transition-all duration-300`}
                >
                  
                  {/* Top Bar inside Console: Player Cards, Avatar, Hand Description, Status */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: 2 Face-Up Cards + Hand Description */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      {/* Big Cards in Hand */}
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        {myPlayer.cards.map((c, idx) => {
                          const isAllIn = myPlayer.isAllIn;
                          const dealAnimClass = idx === 0 ? 'animate-deal-hole-1' : 'animate-deal-hole-2';
                          return (
                            <div
                              key={`${gameState.handNumber}-${idx}`}
                              className={`transition-all duration-300 ${dealAnimClass} ${
                                isAllIn
                                  ? 'animate-allin-reveal drop-shadow-[0_0_15px_rgba(245,158,11,0.95)] scale-105'
                                  : 'hover:-translate-y-1 hover:scale-105 drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]'
                              }`}
                            >
                              <PokerCard
                                card={c}
                                size="md"
                                isWinning={isCardWinning(c)}
                                hidden={myPlayer.folded}
                                className={`sm:hidden ${isAllIn ? 'ring-2 ring-amber-400' : ''}`}
                              />
                              <PokerCard
                                card={c}
                                size="lg"
                                isWinning={isCardWinning(c)}
                                hidden={myPlayer.folded}
                                className={`hidden sm:flex ${isAllIn ? 'ring-2 ring-amber-400' : ''}`}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Hand Rank & Chips */}
                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-400">
                            ไพ่บนมือของคุณ
                          </span>
                          {myPlayer.isAllIn ? (
                            <span className="text-[9px] bg-gradient-to-r from-red-600 to-rose-600 text-white font-black px-2 py-0.5 rounded-full border border-amber-300 animate-pulse flex items-center gap-0.5">
                              <span>🔥</span>
                              <span>ALL-IN</span>
                            </span>
                          ) : myPlayer.folded ? (
                            <span className="text-[9px] bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded-full font-bold border border-rose-600/40">
                              หมอบแล้ว
                            </span>
                          ) : (
                            <span className="text-[9px] sm:text-[10px] bg-slate-800 text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded-full border border-slate-700">
                              ชิป: ${myPlayer.chips.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-base font-black text-white mt-0.5 leading-tight">
                          {myPlayer.folded ? 'คุณหมอบไพ่แล้วในรอบนี้' : handDescription}
                        </div>
                      </div>
                    </div>

                    {/* Right: Turn status message */}
                    <div>
                      {isMyTurn ? (
                        <div className="text-[11px] sm:text-xs font-black text-amber-400 bg-amber-950/90 border border-amber-500/70 px-2.5 sm:px-3 py-1 rounded-xl animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>ถึงตาคุณเล่น!</span>
                        </div>
                      ) : (
                        <div className="text-[10px] sm:text-xs text-slate-400 bg-slate-950/70 border border-slate-800 px-2 sm:px-2.5 py-1 rounded-xl flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-ping" />
                          <span>รอ: <strong className="text-slate-200">{activePlayer ? activePlayer.name : '-'}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Betting Controls: Visible directly on the table when it's your turn */}
                  {isMyTurn ? (
                    <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800/80">
                      {/* Raise Slider & Presets (if can raise) */}
                      {canRaise && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2">
                          {/* Quick presets */}
                          <div className="grid grid-cols-4 gap-1 w-full sm:w-auto">
                            <button
                              onClick={() => setPreset('min')}
                              className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer text-center"
                            >
                              Min (${minRaiseTarget})
                            </button>
                            <button
                              onClick={() => setPreset('halfPot')}
                              className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer text-center"
                            >
                              ½ Pot
                            </button>
                            <button
                              onClick={() => setPreset('pot')}
                              className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer text-center"
                            >
                              Pot (${pot})
                            </button>
                            <button
                              onClick={() => setPreset('allIn')}
                              className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-lg bg-red-950/80 hover:bg-red-900 text-rose-300 border border-rose-700/60 cursor-pointer text-center"
                            >
                              All-In
                            </button>
                          </div>

                          {/* Slider */}
                          <div className="flex items-center gap-1.5 w-full sm:w-64">
                            <button
                              onClick={() => setRaiseAmount((prev) => Math.max(minRaiseTarget, prev - minRaise))}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center cursor-pointer text-xs"
                            >
                              -
                            </button>
                            <input
                              type="range"
                              min={minRaiseTarget}
                              max={maxRaiseTarget}
                              step={minRaise}
                              value={raiseAmount}
                              onChange={(e) => setRaiseAmount(Number(e.target.value))}
                              className="w-full accent-amber-500 cursor-pointer h-1.5"
                            />
                            <button
                              onClick={() => setRaiseAmount((prev) => Math.min(maxRaiseTarget, prev + minRaise))}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center cursor-pointer text-xs"
                            >
                              +
                            </button>
                            <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-300 min-w-[45px] text-right">
                              ${raiseAmount}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 4 In-Table Action Buttons */}
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        {/* FOLD */}
                        <button
                          onClick={() => onAction('fold')}
                          className="py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl bg-gradient-to-b from-rose-700 to-rose-900 hover:from-rose-600 hover:to-rose-800 text-white font-black text-xs sm:text-sm border border-rose-500/50 shadow-md shadow-rose-950/50 cursor-pointer transition-all hover:scale-102 active:scale-98 flex items-center justify-center text-center"
                        >
                          <span>หมอบ</span>
                        </button>

                        {/* CHECK or CALL */}
                        {canCheck ? (
                          <button
                            onClick={() => onAction('check')}
                            className="py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl bg-gradient-to-b from-blue-600 to-indigo-800 hover:from-blue-500 hover:to-indigo-700 text-white font-black text-xs sm:text-sm border border-blue-400/50 shadow-md shadow-indigo-950/50 cursor-pointer transition-all hover:scale-102 active:scale-98 flex items-center justify-center text-center"
                          >
                            <span>ผ่าน</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onAction('call')}
                            disabled={!canCall}
                            className="py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl bg-gradient-to-b from-blue-600 to-indigo-800 hover:from-blue-500 hover:to-indigo-700 text-white font-black text-xs sm:text-sm border border-blue-400/50 shadow-md shadow-indigo-950/50 cursor-pointer transition-all hover:scale-102 active:scale-98 flex flex-col items-center justify-center leading-tight"
                          >
                            <span>ตาม</span>
                            <span className="text-[10px] text-blue-200 font-mono font-bold">
                              ${Math.min(callCost, maxCanBet)}
                            </span>
                          </button>
                        )}

                        {/* RAISE */}
                        {canRaise ? (
                          <button
                            onClick={() => onAction('raise', raiseAmount)}
                            className="py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white font-black text-xs sm:text-sm border border-emerald-400/50 shadow-md shadow-emerald-950/50 cursor-pointer transition-all hover:scale-102 active:scale-98 flex flex-col items-center justify-center leading-tight"
                          >
                            <span>เกเพิ่ม</span>
                            <span className="text-[10px] text-emerald-200 font-mono font-bold truncate max-w-full">
                              ${raiseAmount}
                            </span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl bg-slate-800/80 text-slate-500 font-bold text-xs sm:text-sm border border-slate-700/50 cursor-not-allowed flex items-center justify-center text-center"
                          >
                            <span>เกเพิ่ม</span>
                          </button>
                        )}

                        {/* ALL-IN */}
                        <button
                          onClick={() => onAction('all-in')}
                          disabled={maxCanBet === 0}
                          className="py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl bg-gradient-to-b from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm border border-amber-300 shadow-lg shadow-amber-950/50 cursor-pointer transition-all hover:scale-102 active:scale-98 flex flex-col items-center justify-center leading-tight"
                        >
                          <span>เทหมด</span>
                          <span className="font-mono text-[10px] font-black truncate max-w-full">
                            (${maxRaiseTarget})
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Waiting for other player's turn indicator */
                    <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 px-2 py-0.5 border-t border-slate-800/60 pt-1">
                      <span>เดิมพันรอบนี้: <strong className="text-amber-300">${currentBet}</strong></span>
                      <span>คุณลงไปแล้ว: <strong className="text-white">${myPlayer.currentBet}</strong></span>
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
