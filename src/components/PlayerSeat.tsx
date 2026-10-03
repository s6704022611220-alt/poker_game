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
            ? 'gap-1.5 sm:gap-2 -mt-4 sm:-mt-6'
            : '-space-x-4 sm:-space-x-5'
        }`}
      >
        {player.cards.length > 0 ? (
          player.cards.map((card, idx) => (
            <div
              key={idx}
              className={`transform transition-transform duration-200 ${
                isSelf
                  ? 'hover:-translate-y-1 scale-110 sm:scale-125 origin-bottom drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]'
                  : idx === 1
                  ? 'rotate-3 hover:translate-y-[-4px]'
                  : '-rotate-3 hover:translate-y-[-4px]'
              }`}
            >
              <PokerCard
                card={card}
                hidden={!player.showCards && !isSelf}
                isWinning={isCardWinning(card)}
                size={isSelf ? 'md' : 'sm'}
              />
            </div>
          ))
        ) : (
          <div
            className={`border border-dashed border-white/10 rounded flex items-center justify-center text-[10px] text-white/30 ${
              isSelf ? 'h-20 w-28 sm:h-24 sm:w-32' : 'h-14 w-16'
            }`}
          >
            รอแจกไพ่
          </div>
        )}
      </div>

      {/* Hand Evaluation at Showdown */}
      {player.handEval && player.showCards && (
        <div className="absolute top-10 z-30 whitespace-nowrap bg-emerald-950/90 border border-emerald-400 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded shadow">
          {player.handEval.nameTh}
        </div>
      )}

      {/* Player Plate / Avatar Box */}
      <div
        className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl border backdrop-blur-md transition-all duration-300 ${
          isActiveTurn
            ? 'bg-gradient-to-r from-amber-950/90 to-amber-900/90 border-amber-400 ring-4 ring-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.5)] scale-105'
            : isSelf
            ? 'bg-slate-900/85 border-emerald-400/50 shadow-md'
            : 'bg-slate-950/80 border-slate-700/60 shadow'
        }`}
      >
        {/* Avatar */}
        <div
          className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr ${avatarBg} text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-inner shrink-0`}
        >
          {player.isBot ? '🤖' : initial}
          {player.isHost && (
            <span
              title="Host ห้อง"
              className="absolute -top-1.5 -left-1 text-[11px] leading-none drop-shadow"
            >
              👑
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col text-left leading-tight min-w-[70px] sm:min-w-[85px] max-w-[110px]">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-white truncate" title={player.name}>
              {player.name}
            </span>
            {isSelf && (
              <span className="text-[9px] bg-emerald-500/30 text-emerald-300 font-extrabold px-1 rounded">
                YOU
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-amber-400 font-black">🪙</span>
            <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-300">
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
        <div className="mt-1.5 flex items-center gap-1 bg-amber-950/90 border border-amber-400/60 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold text-amber-200 shadow-md animate-bounce-subtle">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-600 inline-block shadow-sm" />
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
