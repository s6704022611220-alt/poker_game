import React from 'react';
import { PotWinner, Card } from '../types/poker';
import { PokerCard } from './PokerCard';

interface WinnerBannerProps {
  winners: PotWinner[];
  isHostUser: boolean;
  onNextHand: () => void;
  onClose?: () => void;
}

export const WinnerBanner: React.FC<WinnerBannerProps> = ({
  winners,
  isHostUser,
  onNextHand,
  onClose,
}) => {
  if (!winners || winners.length === 0) return null;

  const totalPot = winners.reduce((sum, w) => sum + w.amount, 0);
  const primaryWinner = winners[0];

  return (
    <div className="fixed top-14 sm:top-16 inset-x-0 z-50 flex items-center justify-center p-3 pointer-events-none select-none animate-scale-in">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#1c1206]/98 via-[#2a1705]/98 to-[#120a02]/98 border-2 border-amber-400 rounded-3xl shadow-[0_15px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(245,158,11,0.4)] backdrop-blur-2xl p-4 sm:p-5 text-center pointer-events-auto flex flex-col items-center gap-3 overflow-hidden">
        
        {/* Subtle decorative glow ribbons */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close / Minimize button */}
        {onClose && (
          <button
            onClick={onClose}
            title="ย่อข้อความเพื่อดูโต๊ะ"
            className="absolute top-3 right-3 text-amber-300/70 hover:text-white p-1 rounded-full hover:bg-white/10 text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        )}

        {/* Header with Trophy */}
        <div className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl animate-bounce">🏆</span>
          <span className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-amber-300/90 font-serif">
            ประกาศผลผู้ชนะรอบนี้
          </span>
          <span className="text-2xl sm:text-3xl animate-bounce">✨</span>
        </div>

        {/* Winner Name & Amount Won */}
        <div className="flex flex-col items-center">
          <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 drop-shadow-sm tracking-wide">
            {winners.map((w) => w.playerName).join(' & ')}
          </div>
          <div className="flex items-center gap-1.5 mt-1 bg-amber-950/90 border border-amber-500/50 rounded-full px-3.5 py-1 shadow-inner">
            <span className="text-base sm:text-lg">🪙</span>
            <span className="text-base sm:text-lg font-black font-mono text-amber-300">
              รับเงินรางวัล ${totalPot.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Winning Hand Ranking Description */}
        <div className="bg-black/50 border border-amber-500/30 rounded-xl px-4 py-1.5 text-xs sm:text-sm font-bold text-amber-100 flex items-center gap-2">
          <span className="text-amber-400">ชนะด้วยชุดไพ่:</span>
          <span className="text-emerald-300 font-extrabold">{primaryWinner.handName}</span>
        </div>

        {/* Display Winning 5 Cards if available */}
        {primaryWinner.winningCards && primaryWinner.winningCards.length > 0 && (
          <div className="flex flex-col items-center gap-1.5 my-0.5">
            <span className="text-[11px] text-amber-300/70 font-semibold uppercase tracking-wider">
              ไพ่ชุดที่ดีที่สุด 5 ใบ
            </span>
            <div className="flex items-center gap-1 sm:gap-2">
              {primaryWinner.winningCards.map((card: Card, idx: number) => (
                <div key={idx} className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                  <PokerCard card={card} size="sm" isWinning={true} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button: Next Hand */}
        <div className="w-full pt-1 flex items-center justify-center">
          {isHostUser ? (
            <button
              onClick={onNextHand}
              className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-950/60 transition-all hover:scale-102 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>เริ่มเล่นรอบถัดไป (Next Hand)</span>
              <span className="text-base">➜</span>
            </button>
          ) : (
            <div className="text-xs text-amber-300/80 font-medium py-1 animate-pulse flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>รอ Host ผู้สร้างห้องเริ่มรอบถัดไป...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
