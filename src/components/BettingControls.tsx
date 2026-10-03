import React, { useState, useEffect } from 'react';
import { GameState, PlayerActionType, Card } from '../types/poker';
import { PokerCard } from './PokerCard';
import { getHandDescription } from '../utils/pokerEvaluator';

interface BettingControlsProps {
  gameState: GameState;
  currentUserId: string;
  isHostUser: boolean;
  onAction: (action: PlayerActionType, amount?: number) => void;
  onNextHand: () => void;
  onStartGame: () => void;
  winningCardSet?: Set<string>;
}

export const BettingControls: React.FC<BettingControlsProps> = ({
  gameState,
  currentUserId,
  isHostUser,
  onAction,
  onNextHand,
  onStartGame,
  winningCardSet,
}) => {
  const { players, activePlayerIndex, currentBet, pot, phase, minRaise, communityCards } = gameState;
  const activePlayer = players[activePlayerIndex];
  const myPlayer = players.find((p) => p.id === currentUserId);

  const isMyTurn =
    phase !== 'lobby' &&
    phase !== 'showdown' &&
    activePlayer &&
    activePlayer.id === currentUserId &&
    !myPlayer?.folded &&
    !myPlayer?.isAllIn;

  const callCost = myPlayer ? Math.max(0, currentBet - myPlayer.currentBet) : 0;
  const maxCanBet = myPlayer ? myPlayer.chips : 0;

  // Calculate minimum raise target
  const minRaiseTarget = myPlayer
    ? Math.min(myPlayer.currentBet + maxCanBet, currentBet + minRaise)
    : 0;
  const maxRaiseTarget = myPlayer ? myPlayer.currentBet + maxCanBet : 0;

  const [raiseAmount, setRaiseAmount] = useState<number>(minRaiseTarget);

  // Sync raiseAmount when turn begins or minRaise changes
  useEffect(() => {
    if (isMyTurn) {
      setRaiseAmount(Math.max(minRaiseTarget, Math.min(maxRaiseTarget, currentBet + minRaise)));
    }
  }, [isMyTurn, minRaiseTarget, maxRaiseTarget, currentBet, minRaise]);

  const isCardWinning = (card: Card | null) => {
    if (!card || !winningCardSet) return false;
    return winningCardSet.has(`${card.suit}-${card.rank}`);
  };

  const handDescription = myPlayer?.cards && myPlayer.cards.length > 0
    ? getHandDescription(myPlayer.cards, communityCards)
    : '';

  // Between hands / Lobby controls
  if (phase === 'lobby') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-3 bg-slate-900/95 border-t border-slate-700/80 backdrop-blur-md rounded-t-2xl flex flex-wrap items-center justify-between gap-3 text-center sm:text-left">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5 justify-center sm:justify-start">
            <span>🎮 ห้องพร้อมเริ่มเล่น</span>
            <span className="text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40">
              ผู้เล่น {players.length}/6 คน
            </span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {players.length < 2
              ? 'ต้องการผู้เล่นอย่างน้อย 2 คน (กด "เพิ่มบอททดลอง" หรือชวนเพื่อนด้วยรหัสห้อง)'
              : 'ผู้เล่นพร้อมแล้ว Host สามารถกดเริ่มเกมแจกไพ่ได้ทันที'}
          </p>
        </div>

        {isHostUser ? (
          <button
            onClick={onStartGame}
            disabled={players.length < 2}
            className={`px-6 py-2.5 rounded-xl font-black text-sm tracking-wide shadow-lg transition-all ${
              players.length >= 2
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 cursor-pointer shadow-emerald-900/40 hover:scale-102 active:scale-98'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            เริ่มแจกไพ่ (Start Game) ♠
          </button>
        ) : (
          <div className="text-xs font-semibold text-amber-300/90 py-2">
            รอ Host กดเริ่มเกม...
          </div>
        )}
      </div>
    );
  }

  // Showdown phase: Next hand controls
  if (phase === 'showdown') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-3 bg-slate-900/95 border-t border-amber-600/40 backdrop-blur-md rounded-t-2xl flex flex-wrap items-center justify-between gap-3">
        {/* User Hand Showcase during Showdown */}
        {myPlayer && myPlayer.cards.length > 0 && (
          <div className="flex items-center gap-3 bg-slate-950/80 border border-amber-500/30 px-3 py-1.5 rounded-xl">
            <div className="flex -space-x-1.5">
              {myPlayer.cards.map((c, idx) => (
                <div key={idx} className="drop-shadow-md">
                  <PokerCard card={c} size="md" isWinning={isCardWinning(c)} />
                </div>
              ))}
            </div>
            <div className="text-left">
              <div className="text-[11px] text-amber-300 font-bold">ไพ่ของคุณ</div>
              <div className="text-xs text-white font-extrabold">{handDescription}</div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <div>
            <div className="text-sm font-bold text-amber-300">
              จบมือนักสู้! แสดงผลไพ่และมอบ Pot
            </div>
            <div className="text-xs text-slate-300">
              {gameState.winners.length > 0
                ? `${gameState.winners.map((w) => w.playerName).join(', ')} ชนะเงินรางวัล $${gameState.winners.reduce((sum, w) => sum + w.amount, 0).toLocaleString()}`
                : 'สรุปผลเรียบร้อย'}
            </div>
          </div>
        </div>

        {isHostUser ? (
          <button
            onClick={onNextHand}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-900/40 transition-all hover:scale-102 active:scale-98 cursor-pointer"
          >
            เล่นต่อรอบถัดไป (Next Hand) ➜
          </button>
        ) : (
          <div className="text-xs font-medium text-amber-300/80 py-2 animate-pulse">
            รอ Host เริ่มรอบถัดไป...
          </div>
        )}
      </div>
    );
  }

  // Active Player Turn Controls!
  const canCheck = callCost === 0;
  const canCall = callCost > 0 && maxCanBet > 0;
  const canRaise = maxRaiseTarget > minRaiseTarget && maxCanBet > callCost;

  // Preset quick bets
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

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-6 py-1.5 sm:py-3 bg-slate-900/98 border-t-2 border-amber-500/70 backdrop-blur-2xl rounded-t-2xl sm:rounded-t-3xl shadow-[0_-15px_35px_rgba(0,0,0,0.85)] flex flex-col gap-1.5 sm:gap-2.5 z-40">
      
      {/* Prominent Hand Showcase Bar (ไพ่บนมือเห็นชัดเจนมาก พร้อมบอกลำดับไพ่ทันที) */}
      {myPlayer && myPlayer.cards.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/90 border border-emerald-500/30 rounded-xl sm:rounded-2xl px-2 sm:px-3 py-1.5 sm:py-2 shadow-inner">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cards in Hand */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {myPlayer.cards.map((c, idx) => (
                <div
                  key={idx}
                  className="transition-transform duration-200 hover:-translate-y-1 hover:scale-105 drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)]"
                >
                  <PokerCard
                    card={c}
                    size="md"
                    isWinning={isCardWinning(c)}
                    hidden={myPlayer.folded}
                    className="sm:hidden"
                  />
                  <PokerCard
                    card={c}
                    size="lg"
                    isWinning={isCardWinning(c)}
                    hidden={myPlayer.folded}
                    className="hidden sm:flex"
                  />
                </div>
              ))}
            </div>

            {/* Hand Name, Chips & Strength */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <span>🃏 ไพ่บนมือ</span>
                </span>
                {myPlayer.folded ? (
                  <span className="text-[9px] sm:text-[10px] bg-rose-950 text-rose-300 px-1.5 sm:px-2 py-0.5 rounded-full font-bold border border-rose-600/40">
                    หมอบแล้ว
                  </span>
                ) : (
                  <span className="text-[9px] sm:text-[10px] bg-slate-800 text-amber-300 font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-slate-700">
                    ชิป: ${myPlayer.chips.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="text-xs sm:text-base font-black text-white mt-0.5 tracking-wide leading-tight">
                {myPlayer.folded ? 'คุณหมอบไพ่แล้วในรอบนี้' : handDescription}
              </div>
            </div>
          </div>

          {/* Turn Status Message */}
          <div className="flex items-center gap-1.5 text-xs">
            {isMyTurn ? (
              <span className="flex items-center gap-1 text-[11px] sm:text-xs font-black text-amber-400 bg-amber-950/80 border border-amber-500/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl animate-pulse">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400" />
                ถึงตาคุณเล่น!
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1 text-[10px] sm:text-xs bg-slate-950/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-800">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500/60 animate-ping" />
                รอ: <strong className="text-slate-200 truncate max-w-[70px] sm:max-w-none">{activePlayer ? activePlayer.name : '-'}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* If not player's turn and no controls needed */}
      {!isMyTurn ? (
        <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 px-2 py-0.5">
          <span>
            เดิมพันรอบนี้: <strong className="text-amber-300">${currentBet}</strong>
          </span>
          <span>
            คุณลงไปแล้ว: <strong className="text-white">${myPlayer?.currentBet || 0}</strong>
          </span>
        </div>
      ) : (
        <>
          {/* Raise Slider & Quick Buttons (Visible when player can raise) */}
          {canRaise && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 pt-0.5 border-b border-slate-800/80 pb-1.5 sm:pb-2">
              {/* Quick preset buttons */}
              <div className="grid grid-cols-4 gap-1 w-full sm:w-auto">
                <button
                  onClick={() => setPreset('min')}
                  className="px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer text-center"
                >
                  Min (${minRaiseTarget})
                </button>
                <button
                  onClick={() => setPreset('halfPot')}
                  className="px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer text-center"
                >
                  ½ Pot
                </button>
                <button
                  onClick={() => setPreset('pot')}
                  className="px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer text-center"
                >
                  Pot (${pot})
                </button>
                <button
                  onClick={() => setPreset('allIn')}
                  className="px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-lg bg-red-950/80 hover:bg-red-900 text-rose-300 border border-rose-700/60 cursor-pointer text-center"
                >
                  All-In (${maxRaiseTarget})
                </button>
              </div>

              {/* Slider & precise input */}
              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-72">
                <button
                  onClick={() => setRaiseAmount((prev) => Math.max(minRaiseTarget, prev - minRaise))}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center cursor-pointer text-xs sm:text-sm"
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
                  className="w-full accent-amber-500 cursor-pointer h-1.5 sm:h-2"
                />
                <button
                  onClick={() => setRaiseAmount((prev) => Math.min(maxRaiseTarget, prev + minRaise))}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center cursor-pointer text-xs sm:text-sm"
                >
                  +
                </button>
                <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-300 min-w-[45px] text-right">
                  ${raiseAmount}
                </span>
              </div>
            </div>
          )}

          {/* Primary Action Buttons (Fold, Check/Call, Raise, All-in) */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
            {/* FOLD */}
            <button
              onClick={() => onAction('fold')}
              className="py-2.5 sm:py-3.5 px-1 sm:px-3 rounded-xl bg-gradient-to-b from-rose-700 to-rose-900 hover:from-rose-600 hover:to-rose-800 text-white font-black text-xs sm:text-base border border-rose-500/50 shadow-md shadow-rose-950/50 cursor-pointer transition-all hover:scale-102 active:scale-98 flex items-center justify-center text-center"
            >
              <span>หมอบ</span>
            </button>

            {/* CHECK or CALL */}
            {canCheck ? (
              <button
                onClick={() => onAction('check')}
                className="py-2.5 sm:py-3.5 px-1 sm:px-3 rounded-xl bg-gradient-to-b from-blue-600 to-indigo-800 hover:from-blue-500 hover:to-indigo-700 text-white font-black text-xs sm:text-base border border-blue-400/50 shadow-md shadow-indigo-950/50 cursor-pointer transition-all hover:scale-102 active:scale-98 flex items-center justify-center text-center"
              >
                <span>ผ่าน</span>
              </button>
            ) : (
              <button
                onClick={() => onAction('call')}
                disabled={!canCall}
                className="py-2.5 sm:py-3.5 px-1 sm:px-3 rounded-xl bg-gradient-to-b from-blue-600 to-indigo-800 hover:from-blue-500 hover:to-indigo-700 text-white font-black text-xs sm:text-base border border-blue-400/50 shadow-md shadow-indigo-950/50 cursor-pointer transition-all hover:scale-102 active:scale-98 flex flex-col items-center justify-center leading-tight"
              >
                <span>ตาม</span>
                <span className="text-[10px] sm:text-xs text-blue-200 font-mono font-bold">
                  ${Math.min(callCost, maxCanBet)}
                </span>
              </button>
            )}

            {/* RAISE */}
            {canRaise ? (
              <button
                onClick={() => onAction('raise', raiseAmount)}
                className="py-2.5 sm:py-3.5 px-1 sm:px-3 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white font-black text-xs sm:text-base border border-emerald-400/50 shadow-md shadow-emerald-950/50 cursor-pointer transition-all hover:scale-102 active:scale-98 flex flex-col items-center justify-center leading-tight"
              >
                <span>เกเพิ่ม</span>
                <span className="text-[10px] sm:text-xs text-emerald-200 font-mono font-bold truncate max-w-full">
                  ${raiseAmount}
                </span>
              </button>
            ) : (
              <button
                disabled
                className="py-2.5 sm:py-3.5 px-1 sm:px-3 rounded-xl bg-slate-800/80 text-slate-500 font-bold text-xs sm:text-sm border border-slate-700/50 cursor-not-allowed flex items-center justify-center text-center"
              >
                <span>เกเพิ่ม</span>
              </button>
            )}

            {/* ALL-IN */}
            <button
              onClick={() => onAction('all-in')}
              disabled={maxCanBet === 0}
              className="py-2.5 sm:py-3.5 px-1 sm:px-3 rounded-xl bg-gradient-to-b from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-base border border-amber-300 shadow-lg shadow-amber-950/50 cursor-pointer transition-all hover:scale-102 active:scale-98 flex flex-col items-center justify-center leading-tight"
            >
              <span>เทหมด</span>
              <span className="font-mono text-[10px] sm:text-xs font-black truncate max-w-full">
                (${maxRaiseTarget})
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
