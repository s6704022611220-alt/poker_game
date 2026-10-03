import React from 'react';
import { Player, Card } from '../types/poker';
import { PokerCard } from './PokerCard';

interface PlayerSeatProps {
  player: Player;
  isSelf: boolean;
  isActiveTurn: boolean;
  isDealer: boolean;
  winningCardSet?: Set<string>;
  onKickBot?: (botId: string) => void;
  isHostUser?: boolean;
}

const AVATAR_COLORS = [
  'from-blue-600 to-indigo-800',
  'from-emerald-600 to-teal-800',
  'from-amber-600 to-orange-800',
  'from-purple-600 to-pink-800',
  'from-rose-600 to-red-800',
  'from-cyan-600 to-blue-800',
];

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isSelf,
  isActiveTurn,
  isDealer,
  winningCardSet,
  onKickBot,
  isHostUser,
}) => {
  const avatarBg = AVATAR_COLORS[player.avatarSeed % AVATAR_COLORS.length];
  const initial = player.name ? player.name.charAt(0).toUpperCase() : '?';

  // Check if a card is winning
  const isCardWinning = (c: Card | null) => {
    if (!c || !winningCardSet) return false;
    return winningCardSet.has(`${c.suit}-${c.rank}`);
  };

  return (
    <div
      className={`flex flex-col items-center select-none transition-all duration-300 relative ${
        player.folded ? 'opacity-40 grayscale-[0.6]' : 'opacity-100'
      }`}
    >
      {/* Dealer Button */}
      {isDealer && (
        <div
          title="Dealer Button"
          className="absolute -top-3 -right-2 z-30 w-7 h-7 rounded-full bg-gradient-to-b from-yellow-300 to-amber-500 border-2 border-amber-200 text-slate-900 font-black text-xs flex items-center justify-center shadow-lg animate-bounce"
        >
          D
        </div>
      )}

      {/* Floating Action Badge */}
      {player.lastAction && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap bg-black/85 backdrop-blur-sm border border-amber-400/40 text-amber-300 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full shadow-md animate-fade-in">
          {player.lastAction.text}
        </div>
      )}

      {/* Hole Cards Container */}
      <div
        className={`flex z-20 mb-1 transition-all duration-200 ${
          isSelf
            ? 'gap-1 sm:gap-2 -mt-2 sm:-mt-4'
            : '-space-x-3.5 sm:-space-x-5'
        }`}
      >
        {player.cards.length > 0 ? (
          player.cards.map((card, idx) => {
            const isAllInRevealed = player.isAllIn && player.showCards;
            return (
              <div
                key={idx}
                className={`transform transition-all duration-300 ${
                  isAllInRevealed
                    ? 'animate-allin-reveal drop-shadow-[0_0_15px_rgba(245,158,11,0.95)]'
                    : isSelf
                    ? 'hover:-translate-y-1 scale-100 sm:scale-110 origin-bottom drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]'
                    : idx === 1
                    ? 'rotate-3 hover:translate-y-[-2px]'
                    : '-rotate-3 hover:translate-y-[-2px]'
                }`}
              >
                <PokerCard
                  card={card}
                  hidden={!player.showCards && !isSelf}
                  isWinning={isCardWinning(card)}
                  size={isSelf ? 'md' : 'sm'}
                  className={isAllInRevealed ? 'ring-2 ring-amber-400' : ''}
                />
              </div>
            );
          })
        ) : (
          <div
            className={`border border-dashed border-white/10 rounded flex items-center justify-center text-[9px] sm:text-[10px] text-white/30 ${
              isSelf ? 'h-16 w-24 sm:h-22 sm:w-30' : 'h-12 w-14 sm:h-14 sm:w-16'
            }`}
          >
            รอแจกไพ่
          </div>
        )}
      </div>

      {/* Hand Evaluation at Showdown or All-in */}
      {player.handEval && player.showCards && (
        <div className="absolute top-8 sm:top-10 z-30 whitespace-nowrap bg-emerald-950/95 border border-emerald-400 text-emerald-200 text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-lg animate-scale-in">
          {player.handEval.nameTh}
        </div>
      )}

      {/* Player Plate / Avatar Box */}
      <div
        className={`relative flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border backdrop-blur-md transition-all duration-300 ${
          player.isAllIn
            ? 'bg-gradient-to-r from-red-950/95 to-rose-900/95 border-amber-400 ring-2 sm:ring-4 ring-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.85)] animate-flame-glow'
            : isActiveTurn
            ? 'bg-gradient-to-r from-amber-950/90 to-amber-900/90 border-amber-400 ring-2 sm:ring-4 ring-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-102 sm:scale-105'
            : isSelf
            ? 'bg-slate-900/85 border-emerald-400/50 shadow-md'
            : 'bg-slate-950/80 border-slate-700/60 shadow'
        }`}
      >
        {/* Floating All-In Badge */}
        {player.isAllIn && (
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white font-black text-[8px] sm:text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-amber-300 animate-bounce whitespace-nowrap flex items-center gap-0.5">
            <span>🔥</span>
            <span>ALL-IN</span>
          </div>
        )}
        {/* Avatar */}
        <div
          className={`relative w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr ${avatarBg} text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-inner shrink-0`}
        >
          {player.isBot ? '🤖' : initial}
          {player.isHost && (
            <span
              title="Host ห้อง"
              className="absolute -top-1.5 -left-1 text-[10px] sm:text-[11px] leading-none drop-shadow"
            >
              👑
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col text-left leading-tight min-w-[55px] sm:min-w-[85px] max-w-[85px] sm:max-w-[110px]">
          <div className="flex items-center gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-white truncate" title={player.name}>
              {player.name}
            </span>
            {isSelf && (
              <span className="text-[8px] sm:text-[9px] bg-emerald-500/30 text-emerald-300 font-extrabold px-0.5 sm:px-1 rounded">
                YOU
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5">
            <span className="text-[9px] sm:text-[10px] text-amber-400 font-black">🪙</span>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-300 truncate">
              ${player.chips.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Kick Bot Button for host */}
        {isHostUser && player.isBot && onKickBot && (
          <button
            onClick={() => onKickBot(player.id)}
            title="ลบบอทออก"
            className="text-red-400 hover:text-red-200 text-xs px-1 hover:bg-red-950/50 rounded"
          >
            ✕
          </button>
        )}
      </div>

      {/* Current Round Bet Chip Display */}
      {player.currentBet > 0 && (
        <div className="mt-1 flex items-center gap-1 bg-amber-950/90 border border-amber-400/60 rounded-full px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs font-bold text-amber-200 shadow-md animate-bounce-subtle">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-400 border border-amber-600 inline-block shadow-sm" />
          <span>${player.currentBet.toLocaleString()}</span>
        </div>
      )}

      {/* All-in Badge */}
      {player.isAllIn && !player.folded && (
        <span className="mt-1 text-[9px] font-black uppercase tracking-wider text-rose-300 bg-rose-950/90 border border-rose-500 px-2 py-0.2 rounded-full shadow">
          ALL-IN
        </span>
      )}
    </div>
  );
};
