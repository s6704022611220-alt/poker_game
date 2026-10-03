import React from 'react';
import { GameState, Card } from '../types/poker';
import { PokerCard } from './PokerCard';
import { PlayerSeat } from './PlayerSeat';

interface PokerTableProps {
  gameState: GameState;
  currentUserId: string;
  isHostUser: boolean;
  onKickBot?: (botId: string) => void;
  winningCardSet?: Set<string>;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  gameState,
  currentUserId,
  isHostUser,
  onKickBot,
  winningCardSet,
}) => {
  const { players, communityCards, pot, phase, activePlayerIndex, dealerIndex, winners } = gameState;

  // Find local user index
  const myIndex = players.findIndex((p) => p.id === currentUserId);
  const myPlayer = myIndex !== -1 ? players[myIndex] : null;

  // Geometry for 6 seats around the table oval
  // Position 0 is bottom center (Local player's perspective)
  const getSeatCoordinates = (relativeIdx: number, totalSeats: number) => {
    if (totalSeats === 2) {
      if (relativeIdx === 0) return { left: '50%', top: '86%' };
      return { left: '50%', top: '14%' };
    }
    if (totalSeats === 3) {
      if (relativeIdx === 0) return { left: '50%', top: '86%' };
      if (relativeIdx === 1) return { left: '18%', top: '22%' };
      return { left: '82%', top: '22%' };
    }
    if (totalSeats === 4) {
      if (relativeIdx === 0) return { left: '50%', top: '86%' };
      if (relativeIdx === 1) return { left: '14%', top: '48%' };
      if (relativeIdx === 2) return { left: '50%', top: '14%' };
      return { left: '86%', top: '48%' };
    }
    // 5 or 6 seats
    const layout = [
      { left: '50%', top: '86%' }, // 0: Bottom Center
      { left: '14%', top: '70%' }, // 1: Bottom Left
      { left: '16%', top: '22%' }, // 2: Top Left
      { left: '50%', top: '13%' }, // 3: Top Center
      { left: '84%', top: '22%' }, // 4: Top Right
      { left: '86%', top: '70%' }, // 5: Bottom Right
    ];
    return layout[relativeIdx] || layout[0];
  };

  // Phase translation
  const phaseLabels: Record<string, string> = {
    lobby: 'รอเริ่มเกม (Lobby)',
    dealing: 'กำลังแจกไพ่...',
    preflop: 'พรีฟลอป (Pre-Flop)',
    flop: 'ฟลอป (Flop)',
    turn: 'เทิร์น (Turn)',
    river: 'ริเวอร์ (River)',
    showdown: 'เปิดไพ่ตัดสิน (Showdown)',
  };

  const isCardWinning = (card: Card) => {
    if (!winningCardSet) return false;
    return winningCardSet.has(`${card.suit}-${card.rank}`);
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto aspect-[16/10] sm:aspect-[16/9] min-h-[460px] sm:min-h-[540px] flex items-center justify-center p-2 sm:p-4 select-none">
      {/* Outer Table Bumper (Padded Mahogany / Rich Leather Border) */}
      <div className="relative w-full h-full rounded-[100px] sm:rounded-[180px] bg-gradient-to-b from-[#2b170c] via-[#1a0e07] to-[#120904] p-3 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_2px_4px_rgba(255,255,255,0.2)] border-4 border-[#452715]/80 flex items-center justify-center">
        
        {/* Brass Inner Rim Accent */}
        <div className="relative w-full h-full rounded-[85px] sm:rounded-[165px] p-1.5 sm:p-2 bg-gradient-to-tr from-amber-700/60 via-amber-400/40 to-amber-900/60 shadow-inner flex items-center justify-center">
          
          {/* Casino Emerald Felt */}
          <div
            className="relative w-full h-full rounded-[75px] sm:rounded-[155px] overflow-hidden flex flex-col items-center justify-center border-2 border-emerald-950/80 shadow-[inset_0_0_80px_rgba(0,0,0,0.7)]"
            style={{
              background: 'radial-gradient(ellipse at center, #1b633a 0%, #124d2c 45%, #0b331c 85%, #061f11 100%)',
            }}
          >
            {/* Subtle Printed Table Ring Line */}
            <div className="absolute inset-8 sm:inset-12 rounded-[55px] sm:rounded-[135px] border border-emerald-400/20 pointer-events-none" />

            {/* Table Watermark Brand */}
            <div className="absolute top-[28%] text-center pointer-events-none opacity-20">
              <span className="text-xl sm:text-3xl font-black tracking-[0.25em] text-emerald-200 uppercase font-serif">
                TEXAS HOLD'EM
              </span>
              <div className="text-[10px] tracking-widest text-emerald-300">NO LIMIT POKER</div>
            </div>

            {/* Center Area: Pot & Community Cards */}
            <div className="z-10 flex flex-col items-center justify-center gap-2 sm:gap-3 py-2">
              
              {/* Pot Display */}
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-amber-500/40 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                <div className="flex -space-x-1 items-center">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-600 shadow inline-block" />
                  <span className="w-3.5 h-3.5 rounded-full bg-red-500 border border-red-700 shadow inline-block" />
                  <span className="w-3.5 h-3.5 rounded-full bg-blue-500 border border-blue-700 shadow inline-block" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] sm:text-xs text-amber-200/80 uppercase font-semibold">
                    POT
                  </span>
                  <span className="text-sm sm:text-lg font-black font-mono text-amber-300">
                    ${pot.toLocaleString()}
                  </span>
                </div>
                {phase !== 'lobby' && (
                  <span className="text-[10px] bg-emerald-900/80 text-emerald-300 px-2 py-0.5 rounded-full font-bold ml-1">
                    {phaseLabels[phase] || phase}
                  </span>
                )}
              </div>

              {/* 5 Community Cards Slots */}
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                {[0, 1, 2, 3, 4].map((slotIndex) => {
                  const card = communityCards[slotIndex];
                  return (
                    <div key={slotIndex} className="relative">
                      {card ? (
                        <div className="animate-card-flip">
                          <PokerCard
                            card={card}
                            size="md"
                            isWinning={isCardWinning(card)}
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-md border-2 border-dashed border-emerald-400/25 bg-emerald-950/20 flex flex-col items-center justify-center text-emerald-400/30">
                          <span className="text-xs font-serif font-black opacity-30">
                            {slotIndex < 3 ? 'FLOP' : slotIndex === 3 ? 'TURN' : 'RIVER'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Player Seats Positioned Around Table */}
            {players.map((player, idx) => {
              const relativeIdx =
                myIndex !== -1
                  ? (idx - myIndex + players.length) % players.length
                  : idx;

              const coords = getSeatCoordinates(relativeIdx, players.length);
              const isActiveTurn = phase !== 'showdown' && phase !== 'lobby' && idx === activePlayerIndex;
              const isDealer = idx === dealerIndex;

              return (
                <div
                  key={player.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                  style={{ left: coords.left, top: coords.top }}
                >
                  <PlayerSeat
                    player={player}
                    isSelf={player.id === currentUserId}
                    isActiveTurn={isActiveTurn}
                    isDealer={isDealer}
                    winningCardSet={winningCardSet}
                    onKickBot={onKickBot}
                    isHostUser={isHostUser}
                  />
                </div>
              );
            })}

          </div>
        </div>
      </div>
    </div>
  );
};
