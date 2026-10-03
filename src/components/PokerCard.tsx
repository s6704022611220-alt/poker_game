import React from 'react';
import { Card, Suit } from '../types/poker';
import { SUIT_SYMBOLS, getRankLabel } from '../utils/pokerEvaluator';

interface PokerCardProps {
  card?: Card | null;
  isWinning?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  hidden?: boolean;
}

export const PokerCard: React.FC<PokerCardProps> = ({
  card,
  isWinning = false,
  size = 'md',
  className = '',
  hidden = false,
}) => {
  // Dimension classes
  const sizeClasses = {
    sm: 'w-10 h-14 text-xs rounded',
    md: 'w-14 h-20 sm:w-16 sm:h-24 text-sm sm:text-base rounded-lg',
    lg: 'w-18 h-26 sm:w-20 sm:h-28 text-base sm:text-lg rounded-xl',
    xl: 'w-20 h-28 sm:w-24 sm:h-34 text-lg sm:text-xl rounded-xl shadow-xl',
  }[size];

  // If card is hidden or null, render casino card back
  if (hidden || !card) {
    return (
      <div
        className={`relative ${sizeClasses} bg-gradient-to-br from-[#7f1d1d] via-[#991b1b] to-[#450a0a] border-2 border-amber-500/50 shadow-lg flex items-center justify-center overflow-hidden transition-all duration-200 select-none ${className}`}
      >
        {/* Diamond mesh pattern */}
        <div
          className="absolute inset-1 rounded-md border border-amber-400/40 opacity-80 flex items-center justify-center"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(251, 191, 36, 0.35) 1.5px, transparent 1.5px)`,
            backgroundSize: '10px 10px',
          }}
        >
          <div className="w-6 h-8 sm:w-8 sm:h-10 border border-amber-300/60 rounded flex items-center justify-center bg-[#450a0a]/90 shadow-inner">
            <span className="text-amber-300 text-xs sm:text-sm font-serif font-black">♠</span>
          </div>
        </div>
      </div>
    );
  }

  const isRed = card.suit === 'H' || card.suit === 'D';
  const suitSymbol = SUIT_SYMBOLS[card.suit as Suit] || '♠';
  const rankLabel = getRankLabel(card.rank);

  return (
    <div
      className={`relative ${sizeClasses} bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900 border transition-all duration-200 select-none shadow-md overflow-hidden flex flex-col justify-between p-1.5 sm:p-2 font-bold ${
        isWinning
          ? 'border-amber-400 ring-4 ring-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.8)] scale-105 z-10'
          : 'border-slate-300/90 hover:border-slate-400 hover:shadow-lg'
      } ${className}`}
    >
      {/* Top Left pip */}
      <div
        className={`leading-none flex flex-col items-center ${
          isRed ? 'text-rose-600' : 'text-slate-950'
        }`}
      >
        <span className="text-xs sm:text-base font-black font-mono tracking-tighter leading-tight drop-shadow-sm">
          {rankLabel}
        </span>
        <span className="text-[10px] sm:text-xs leading-none -mt-0.5">
          {suitSymbol}
        </span>
      </div>

      {/* Center large high-contrast suit */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className={`text-2xl sm:text-4xl font-serif select-none drop-shadow-sm ${
            isRed ? 'text-rose-600' : 'text-slate-950'
          }`}
        >
          {suitSymbol}
        </span>
      </div>

      {/* Bottom Right pip (rotated) */}
      <div
        className={`leading-none flex flex-col items-center self-end rotate-180 ${
          isRed ? 'text-rose-600' : 'text-slate-950'
        }`}
      >
        <span className="text-xs sm:text-base font-black font-mono tracking-tighter leading-tight drop-shadow-sm">
          {rankLabel}
        </span>
        <span className="text-[10px] sm:text-xs leading-none -mt-0.5">
          {suitSymbol}
        </span>
      </div>

      {/* Subtle glossy sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none" />
    </div>
  );
};
