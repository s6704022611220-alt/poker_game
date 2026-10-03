import React, { useState } from 'react';
import { generateRoomCode } from '../utils/peerManager';

interface LobbyModalProps {
  onCreateRoom: (name: string, roomCode: string) => Promise<void>;
  onJoinRoom: (name: string, roomCode: string) => Promise<void>;
  onOpenRules: () => void;
  initialRoomCode?: string;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  onCreateRoom,
  onJoinRoom,
  onOpenRules,
  initialRoomCode = '',
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState(
    () => 'ผู้เล่น ' + Math.floor(100 + Math.random() * 900)
  );
  const [roomCode, setRoomCode] = useState(
    () => initialRoomCode || generateRoomCode()
  );
  const [joinCode, setJoinCode] = useState(initialRoomCode || '');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('กรุณากรอกชื่อเล่นของคุณ');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      await onCreateRoom(name.trim(), roomCode.trim().toUpperCase());
    } catch (err: any) {
      setErrorMessage(err?.message || 'ไม่สามารถสร้างห้องได้ กรุณาลองใหม่อีกครั้ง');
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('กรุณากรอกชื่อเล่นของคุณ');
      return;
    }
    if (!joinCode.trim()) {
      setErrorMessage('กรุณากรอกรหัสห้อง (Room ID)');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      await onJoinRoom(name.trim(), joinCode.trim().toUpperCase());
    } catch (err: any) {
      setErrorMessage(err?.message || 'ไม่พบห้องหรือไม่สามารถเชื่อมต่อกับ Host ได้');
      setLoading(false);
    }
  };

  const handleRegenerateCode = () => {
    setRoomCode(generateRoomCode());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none overflow-y-auto">
      <div className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-[#0c1a12] border-2 border-amber-500/50 rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Banner with Poker Suits & Title */}
        <div className="pt-4 sm:pt-6 pb-3 sm:pb-4 px-4 sm:px-6 text-center border-b border-slate-800/80 bg-slate-950/60 relative shrink-0">
          <div className="text-2xl sm:text-3xl mb-1 flex items-center justify-center gap-2">
            <span className="text-red-500">♥</span>
            <span className="text-white">♠</span>
            <span className="text-red-500">♦</span>
            <span className="text-slate-300">♣</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-amber-400 tracking-wide font-serif">
            TEXAS HOLD'EM CLUB
          </h1>
          <p className="text-xs text-emerald-400/90 font-medium mt-1">
            โป๊กเกอร์ออนไลน์เล่นกับเพื่อน (Multiplayer PeerJS)
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setTab('create');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              tab === 'create'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            สร้างห้องใหม่ (Create Room)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('join');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              tab === 'join'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            เข้าร่วมห้อง (Join Room)
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
          {/* Nickname Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              ชื่อเล่นของคุณ (Display Name)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              placeholder="ใส่ชื่อเล่น..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  รหัสห้องที่จะสร้าง (Room ID)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-950/80 border border-amber-500/40 rounded-xl px-3.5 py-2.5 font-mono font-black text-amber-300 tracking-wider text-base text-center">
                    {roomCode}
                  </div>
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    title="สุ่มรหัสห้องใหม่"
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
                  >
                    🎲 สุ่มใหม่
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  * ส่งรหัสนี้ให้เพื่อน 1-5 คน เพื่อเข้าเล่นในห้องเดียวกัน
                </p>
              </div>

              {errorMessage && (
                <div className="text-xs text-rose-300 bg-rose-950/60 border border-rose-600/50 p-2.5 rounded-xl">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-emerald-900/40 cursor-pointer transition-all hover:scale-101 active:scale-99 disabled:opacity-50"
              >
                {loading ? 'กำลังเชื่อมต่อ PeerJS...' : 'เปิดห้องโป๊กเกอร์ (Create & Enter) ♠'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ใส่รหัสห้องของเพื่อน (Room ID)
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="เช่น PK89A"
                  maxLength={10}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 font-mono text-center text-base tracking-widest text-amber-300 placeholder-slate-600 focus:outline-none uppercase"
                />
              </div>

              {errorMessage && (
                <div className="text-xs text-rose-300 bg-rose-950/60 border border-rose-600/50 p-2.5 rounded-xl">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-900/40 cursor-pointer transition-all hover:scale-101 active:scale-99 disabled:opacity-50"
              >
                {loading ? 'กำลังเชื่อมต่อกับ Host...' : 'เข้าร่วมห้อง (Join Room) ➜'}
              </button>
            </form>
          )}

          {/* Quick Help Link */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onOpenRules}
              className="text-xs text-amber-400/80 hover:text-amber-300 underline underline-offset-4 cursor-pointer"
            >
              📖 ดูวิธีสร้างห้องและกติกา Texas Hold'em
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
