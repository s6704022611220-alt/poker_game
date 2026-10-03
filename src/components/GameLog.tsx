import React, { useState, useRef, useEffect } from 'react';
import { GameLogEntry } from '../types/poker';

interface GameLogProps {
  logs: GameLogEntry[];
  onSendMessage?: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const GameLog: React.FC<GameLogProps> = ({
  logs,
  onSendMessage,
  isOpen,
  onToggle,
}) => {
  const [chatInput, setChatInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !onSendMessage) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  const sendEmoji = (emoji: string) => {
    if (onSendMessage) {
      onSendMessage(emoji);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 shadow-lg backdrop-blur-md cursor-pointer transition-all"
      >
        <span>📜 ประวัติ / แชท</span>
        {logs.length > 0 && (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        )}
      </button>

      {/* Slide-over Log Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-80 bg-slate-950/95 border-l border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col justify-between animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-base">📜</span>
              <h3 className="font-bold text-sm text-white">ประวัติเกม & ข้อความ</h3>
            </div>
            <button
              onClick={onToggle}
              className="text-slate-400 hover:text-white p-1 rounded-md text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Quick reactions */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900/60 border-b border-slate-800/80 text-base">
            {['👏', '🔥', '😎', '🍀', '💸', '😱'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendEmoji(emoji)}
                className="hover:scale-125 transition-transform p-1 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Log Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            {logs.length === 0 ? (
              <div className="text-slate-500 text-center py-8">
                ยังไม่มีประวัติการเล่น เริ่มเกมเพื่อดูบันทึก
              </div>
            ) : (
              logs.map((log) => {
                let badgeColor = 'text-slate-400';
                let icon = '•';

                if (log.type === 'action') {
                  badgeColor = 'text-amber-300';
                  icon = '⚡';
                } else if (log.type === 'phase') {
                  badgeColor = 'text-emerald-400 font-bold';
                  icon = '🃏';
                } else if (log.type === 'win') {
                  badgeColor = 'text-yellow-400 font-extrabold';
                  icon = '🏆';
                } else if (log.type === 'chat') {
                  badgeColor = 'text-sky-300';
                  icon = '💬';
                }

                return (
                  <div
                    key={log.id}
                    className="p-1.5 rounded bg-slate-900/60 border border-slate-800/50 flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 font-mono">
                        <span>{icon}</span>
                        <span>{log.timestamp}</span>
                      </span>
                    </div>
                    <div className={`${badgeColor} leading-snug break-words`}>
                      {log.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={logEndRef} />
          </div>

          {/* Chat input */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-slate-800 flex items-center gap-2 bg-slate-900/80"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="พิมพ์ข้อความคุยกับเพื่อน..."
              maxLength={80}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer shadow"
            >
              ส่ง
            </button>
          </form>
        </div>
      )}
    </>
  );
};
