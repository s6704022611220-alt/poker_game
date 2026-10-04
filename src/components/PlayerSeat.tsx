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

  // Format action badge with clear high-contrast styles
  const getActionBadge = () => {
    if (!player.lastAction) return null;
    const { type, amount, text } = player.lastAction;

    switch (type) {
      case 'fold':
        return {
          icon: '❌',
          label: 'หมอบ (Fold)',
          style: 'bg-rose-950/95 border-rose-500 text-rose-200 shadow-rose-950/80',
        };
      case 'check':
        return {
          icon: '✋',
          label: 'ผ่าน (Check)',
          style: 'bg-sky-950/95 border-sky-400 text-sky-200 shadow-sky-950/80',
        };
      case 'call':
        return {
          icon: '💰',
          label: `ตาม $${amount?.toLocaleString() || ''}`,
          style: 'bg-blue-950/95 border-blue-400 text-blue-200 shadow-blue-950/80 font-bold',
        };
      case 'raise':
        return {
          icon: '⚡',
          label: `เกเพิ่ม $${amount?.toLocaleString() || ''}`,
          style: 'bg-emerald-900/95 border-emerald-400 text-emerald-100 shadow-emerald-950/80 font-black',
        };
      case 'all-in':
        return {
          icon: '🔥',
          label: `ALL-IN $${amount?.toLocaleString() || ''}`,
          style: 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 border-amber-300 text-white font-black animate-pulse shadow-red-950/90',
        };
      default:
        return {
          icon: '💬',
          label: text,
          style: 'bg-slate-900/95 border-slate-600 text-slate-200',
        };
    }
  };

  const actionInfo = getActionBadge();

  return (
    <div
      className={`flex flex-col items-center select-none transition-all duration-300 relative ${
        player.folded ? 'opacity-35 grayscale-[0.7]' : 'opacity-100'
      }`}
    >
      {/* Hole Cards Container (Top of Seat) */}
      <div
        className={`flex z-10 transition-all duration-200 ${
          isSelf ? 'gap-1 sm:gap-2 mb-1' : '-space-x-4 sm:-space-x-5 mb-0.5'
        }`}
      >
        {player.cards.length > 0 ? (
          player.cards.map((card, idx) => {
            const isAllInRevealed = player.isAllIn && player.showCards;
            const dealAnimClass = idx === 0 ? 'animate-deal-hole-1' : 'animate-deal-hole-2';

            return (
              <div
                key={idx}
                className={`transform transition-all duration-300 ${dealAnimClass} ${
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
              isSelf ? 'h-16 w-24 sm:h-20 sm:w-28' : 'h-11 w-14 sm:h-13 sm:w-16'
            }`}
          >
            รอแจก
          </div>
        )}
      </div>

      {/* Hand Evaluation at Showdown or All-in (Between cards and avatar) */}
      {player.handEval && player.showCards && (
        <div className="z-20 -my-1 whitespace-nowrap bg-emerald-950/95 border border-emerald-400 text-emerald-200 text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-lg animate-scale-in">
          {player.handEval.nameTh}
        </div>
      )}

      {/* Player Plate / Avatar Box (Center of Seat) */}
      <div
        className={`relative flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border backdrop-blur-md transition-all duration-300 ${
          player.isAllIn
            ? 'bg-gradient-to-r from-red-950/95 to-rose-900/95 border-amber-400 ring-2 sm:ring-4 ring-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.85)] animate-flame-glow'
            : isActiveTurn
            ? 'bg-gradient-to-r from-amber-950/95 to-amber-900/95 border-amber-400 ring-2 sm:ring-4 ring-amber-400/50 shadow-[0_0_18px_rgba(251,191,36,0.6)] scale-105'
            : isSelf
            ? 'bg-slate-900/90 border-emerald-400/60 shadow-md'
            : 'bg-black/75 border-slate-700/70 shadow-md'
        }`}
      >
        {/* Dealer Button - Neatly attached to top-right of avatar plate */}
        {isDealer && (
          <div
            title="Dealer Button"
            className="absolute -top-2.5 -right-2 z-30 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600 border border-white text-slate-950 font-black text-[10px] sm:text-xs flex items-center justify-center shadow-lg"
          >
            D
          </div>
        )}

        {/* Avatar */}
        <div
          className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr ${avatarBg} text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-inner shrink-0`}
        >
          {player.isBot ? '🤖' : initial}
          {player.isHost && (
            <span
              title="Host ห้อง"
              className="absolute -top-2 -left-1 text-[10px] sm:text-[11px] leading-none drop-shadow"
            >
              👑
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col text-left leading-tight min-w-[50px] sm:min-w-[70px] max-w-[80px] sm:max-w-[100px]">
          <div className="flex items-center gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-white truncate" title={player.name}>
              {player.name}
            </span>
            {isSelf && (
              <span className="text-[8px] bg-emerald-500/30 text-emerald-300 font-extrabold px-1 rounded">
                YOU
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5">
            <span className="text-[9px] text-amber-400 font-black">🪙</span>
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
            className="text-red-400 hover:text-red-200 text-xs px-1 hover:bg-red-950/50 rounded cursor-pointer transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Prominent Opponent Action Badge (Positioned below plate, never overlapping cards!) */}
      {actionInfo && (
        <div
          className={`mt-1 z-30 whitespace-nowrap border text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1 animate-action-pop ${actionInfo.style}`}
        >
          <span className="text-xs">{actionInfo.icon}</span>
          <span>{actionInfo.label}</span>
        </div>
      )}

      {/* Current Round Bet Chip Display (Cleanly below action badge) */}
      {player.currentBet > 0 && (
        <div className="mt-1 flex items-center gap-1 bg-black/85 border border-amber-400/80 rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-mono font-black text-amber-300 shadow-md">
          <span className="w-2 h-2 rounded-full bg-amber-400 border border-amber-600 inline-block shadow-sm" />
          <span>${player.currentBet.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};
