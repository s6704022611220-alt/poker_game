import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameState,
  Player,
  PlayerActionType,
  GameLogEntry,
  PeerMessage,
  Card,
} from './types/poker';
import { PokerPeerNetwork, formatHostPeerId } from './utils/peerManager';
import { PokerEngine, INITIAL_CHIPS, BOT_NAMES } from './game/pokerEngine';
import { sound } from './utils/audio';
import { PokerTable } from './components/PokerTable';
import { BettingControls } from './components/BettingControls';
import { GameLog } from './components/GameLog';
import { LobbyModal } from './components/LobbyModal';
import { RulesModal } from './components/RulesModal';
import { WinnerBanner } from './components/WinnerBanner';

export default function App() {
  const [inRoom, setInRoom] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [logs, setLogs] = useState<GameLogEntry[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showWinnerBanner, setShowWinnerBanner] = useState(true);

  const networkRef = useRef<PokerPeerNetwork | null>(null);
  const engineRef = useRef<PokerEngine | null>(null);
  const botTimeoutRef = useRef<any>(null);

  // Check URL query param ?room=XYZ
  const [initialRoomCode, setInitialRoomCode] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomCode(roomParam.trim().toUpperCase());
    }
  }, []);

  // Reset showWinnerBanner when entering showdown
  useEffect(() => {
    if (gameState?.phase === 'showdown') {
      setShowWinnerBanner(true);
    }
  }, [gameState?.phase]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const addLog = useCallback(
    (text: string, type: GameLogEntry['type'] = 'system') => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newEntry: GameLogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: timeStr,
        type,
        text,
      };
      setLogs((prev) => [...prev.slice(-49), newEntry]);
      return newEntry;
    },
    []
  );

  // Host: Broadcast sanitized states to each connected client
  const broadcastState = useCallback(
    (updatedLogs?: GameLogEntry[]) => {
      if (!engineRef.current || !networkRef.current || !networkRef.current.isHost) {
        return;
      }

      const engine = engineRef.current;
      const net = networkRef.current;

      // Update Host's local view
      setGameState(engine.getSanitizedStateFor(net.myPeerId));

      // Send personalized sanitized state to each connected player
      for (const p of engine.state.players) {
        if (!p.isBot && p.id !== net.myPeerId) {
          const sanitized = engine.getSanitizedStateFor(p.id);
          net.sendTo(p.id, {
            type: 'SYNC_STATE',
            state: sanitized,
            logs: updatedLogs,
          });
        }
      }
    },
    []
  );

  // Bot Turn Automation (Host only)
  useEffect(() => {
    if (!isHost || !engineRef.current || !gameState) return;
    const engine = engineRef.current;

    if (
      gameState.phase !== 'lobby' &&
      gameState.phase !== 'showdown' &&
      engine.state.players.length >= 2
    ) {
      const activeP = engine.state.players[engine.state.activePlayerIndex];
      if (activeP && activeP.isBot && !activeP.folded && !activeP.isAllIn) {
        // Clear previous timer
        if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);

        // Realistic bot thinking time (800ms to 1600ms)
        botTimeoutRef.current = setTimeout(() => {
          if (!engineRef.current) return;
          const botMove = engineRef.current.getBotAction(activeP);

          const result = engineRef.current.handleAction(
            activeP.id,
            botMove.action,
            botMove.amount
          );

          if (result.success) {
            // Sound effect
            if (botMove.action === 'fold') sound.playFold();
            else if (botMove.action === 'check') sound.playCheck();
            else sound.playChips();

            const actionLog = addLog(
              `${activeP.name} ทำการ ${activeP.lastAction?.text || botMove.action}`,
              'action'
            );

            if (result.showdown) {
              sound.playWin();
              addLog('🃏 เข้าสู่การเปิดไพ่ตัดสิน (Showdown)!', 'phase');
            } else if (result.nextRound) {
              sound.playCardDeal();
              addLog(`🃏 แจกไพ่กลางเข้าสู่รอบ: ${engineRef.current.state.phase.toUpperCase()}`, 'phase');
            }

            broadcastState([actionLog]);
          }
        }, 1100);
      }
    }

    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, [isHost, gameState?.activePlayerIndex, gameState?.phase, broadcastState, addLog]);

  // Host: Action handlers
  const handleHostAction = useCallback(
    (playerId: string, action: PlayerActionType, amount?: number) => {
      if (!engineRef.current) return;
      const engine = engineRef.current;
      const actingPlayer = engine.state.players.find((p) => p.id === playerId);
      if (!actingPlayer) return;

      const result = engine.handleAction(playerId, action, amount);
      if (!result.success) {
        showToast(result.message || 'ไม่สามารถทำคำสั่งนี้ได้');
        return;
      }

      // Play local sound
      if (action === 'fold') sound.playFold();
      else if (action === 'check') sound.playCheck();
      else sound.playChips();

      const actionLog = addLog(
        `${actingPlayer.name} ทำการ ${actingPlayer.lastAction?.text || action}`,
        'action'
      );

      if (result.showdown) {
        sound.playWin();
        addLog('🃏 สรุปผลไพ่และคำนวณเงินรางวัล (Showdown)!', 'phase');
      } else if (result.nextRound) {
        sound.playCardDeal();
        addLog(`🃏 เข้าสู่รอบเดิมพันใหม่: ${engine.state.phase.toUpperCase()}`, 'phase');
      }

      broadcastState([actionLog]);
    },
    [addLog, broadcastState]
  );

  // Setup Peer Network event listeners
  const setupNetworkListeners = useCallback(
    (network: PokerPeerNetwork) => {
      // Incoming message
      network.onMessage = (msg: PeerMessage, fromPeerId: string) => {
        if (network.isHost && engineRef.current) {
          // HOST RECEIVING FROM CLIENT
          if (msg.type === 'JOIN') {
            const newPlayer: Player = {
              id: fromPeerId,
              name: msg.name,
              avatarSeed: msg.avatarSeed,
              chips: INITIAL_CHIPS,
              currentBet: 0,
              totalRoundBet: 0,
              cards: [],
              folded: false,
              isAllIn: false,
              isBot: false,
              isHost: false,
              isConnected: true,
            };

            const added = engineRef.current.addPlayer(newPlayer);
            if (added) {
              const joinLog = addLog(`ผู้เล่น [${msg.name}] เข้าร่วมโต๊ะแล้ว`, 'system');
              sound.playChips();
              broadcastState([joinLog]);
            }
          } else if (msg.type === 'ACTION') {
            handleHostAction(fromPeerId, msg.action, msg.amount);
          } else if (msg.type === 'CHAT') {
            const chatLog = addLog(`${msg.senderName}: ${msg.text}`, 'chat');
            broadcastState([chatLog]);
          }
        } else {
          // CLIENT RECEIVING FROM HOST
          if (msg.type === 'SYNC_STATE') {
            setGameState(msg.state);
            if (msg.logs && msg.logs.length > 0) {
              setLogs((prev) => {
                const combined = [...prev];
                for (const l of msg.logs!) {
                  if (!combined.some((item) => item.id === l.id)) {
                    combined.push(l);
                  }
                }
                return combined.slice(-50);
              });
            }
          } else if (msg.type === 'SOUND') {
            if (msg.soundName === 'deal') sound.playCardDeal();
            else if (msg.soundName === 'chip') sound.playChips();
            else if (msg.soundName === 'check') sound.playCheck();
            else if (msg.soundName === 'fold') sound.playFold();
            else if (msg.soundName === 'win') sound.playWin();
          }
        }
      };

      network.onPeerJoined = (peerId: string) => {
        // Wait for JOIN message
      };

      network.onPeerLeft = (peerId: string) => {
        if (network.isHost && engineRef.current) {
          const leftPlayer = engineRef.current.state.players.find((p) => p.id === peerId);
          if (leftPlayer) {
            engineRef.current.removePlayer(peerId);
            const leaveLog = addLog(`ผู้เล่น [${leftPlayer.name}] ออกจากห้องไปแล้ว`, 'system');
            broadcastState([leaveLog]);
          }
        }
      };

      network.onError = (errText: string) => {
        showToast(errText);
      };
    },
    [addLog, broadcastState, handleHostAction]
  );

  // CREATE ROOM HANDLER
  const handleCreateRoom = async (name: string, roomCodeInput: string) => {
    const net = new PokerPeerNetwork();
    networkRef.current = net;
    setupNetworkListeners(net);

    const actualCode = await net.createRoom(roomCodeInput);
    setRoomCode(actualCode);
    setIsHost(true);

    const hostPlayer: Player = {
      id: net.myPeerId,
      name,
      avatarSeed: Math.floor(Math.random() * 10),
      chips: INITIAL_CHIPS,
      currentBet: 0,
      totalRoundBet: 0,
      cards: [],
      folded: false,
      isAllIn: false,
      isBot: false,
      isHost: true,
      isConnected: true,
    };

    setCurrentUser(hostPlayer);
    const engine = new PokerEngine(actualCode, hostPlayer);
    engineRef.current = engine;

    setGameState(engine.getSanitizedStateFor(hostPlayer.id));
    setInRoom(true);

    addLog(`สร้างห้องโป๊กเกอร์ [${actualCode}] สำเร็จ! พร้อมต้อนรับเพื่อน`, 'system');
    showToast(`สร้างห้อง ${actualCode} สำเร็จ`);
  };

  // JOIN ROOM HANDLER
  const handleJoinRoom = async (name: string, roomCodeInput: string) => {
    const net = new PokerPeerNetwork();
    networkRef.current = net;
    setupNetworkListeners(net);

    await net.joinRoom(roomCodeInput);
    setRoomCode(roomCodeInput);
    setIsHost(false);

    const clientPlayer: Player = {
      id: net.myPeerId,
      name,
      avatarSeed: Math.floor(Math.random() * 10),
      chips: INITIAL_CHIPS,
      currentBet: 0,
      totalRoundBet: 0,
      cards: [],
      folded: false,
      isAllIn: false,
      isBot: false,
      isHost: false,
      isConnected: true,
    };

    setCurrentUser(clientPlayer);
    setInRoom(true);

    // Send join message to host
    net.sendToHost({
      type: 'JOIN',
      name,
      avatarSeed: clientPlayer.avatarSeed,
    });

    addLog(`เชื่อมต่อไปยังห้อง [${roomCodeInput}] เรียบร้อยแล้ว`, 'system');
    showToast(`เชื่อมต่อห้อง ${roomCodeInput} สำเร็จ`);
  };

  // START HAND (Host only)
  const handleStartGame = () => {
    if (!engineRef.current || !isHost) return;
    const res = engineRef.current.startNewHand();
    if (!res.success) {
      showToast(res.message || 'ไม่สามารถเริ่มเกมได้');
      return;
    }

    sound.playCardDeal();
    const dealLog = addLog(`เริ่มแจกไพ่มือที่ #${engineRef.current.state.handNumber} (Pre-Flop)`, 'phase');
    broadcastState([dealLog]);
  };

  // NEXT HAND (Host only)
  const handleNextHand = () => {
    handleStartGame();
  };

  // ADD BOT (Host only)
  const handleAddBot = () => {
    if (!engineRef.current || !isHost) return;
    const currentBots = engineRef.current.state.players.filter((p) => p.isBot);
    if (engineRef.current.state.players.length >= 6) {
      showToast('ห้องเต็มแล้ว (สูงสุด 6 คน)');
      return;
    }

    const availableNames = BOT_NAMES.filter(
      (bName) => !engineRef.current!.state.players.some((p) => p.name === bName)
    );
    const botName = availableNames[0] || `บอท ${currentBots.length + 1}`;

    const newBot: Player = {
      id: 'bot-' + Math.random().toString(36).substring(2, 9),
      name: botName,
      avatarSeed: Math.floor(Math.random() * 10),
      chips: INITIAL_CHIPS,
      currentBet: 0,
      totalRoundBet: 0,
      cards: [],
      folded: false,
      isAllIn: false,
      isBot: true,
      isHost: false,
      isConnected: true,
    };

    const added = engineRef.current.addPlayer(newBot);
    if (added) {
      const botLog = addLog(`เพิ่ม ${botName} เข้าสู่โต๊ะเรียบร้อย`, 'system');
      broadcastState([botLog]);
      showToast(`เพิ่ม ${botName} แล้ว`);
    }
  };

  // KICK BOT (Host only)
  const handleKickBot = (botId: string) => {
    if (!engineRef.current || !isHost) return;
    const b = engineRef.current.state.players.find((p) => p.id === botId);
    if (b && b.isBot) {
      engineRef.current.removePlayer(botId);
      const kickLog = addLog(`นำ ${b.name} ออกจากห้อง`, 'system');
      broadcastState([kickLog]);
    }
  };

  // PLAYER ACTION (Fold, Check, Call, Raise, All-in)
  const handlePlayerAction = (action: PlayerActionType, amount?: number) => {
    if (!currentUser) return;

    if (isHost) {
      handleHostAction(currentUser.id, action, amount);
    } else if (networkRef.current) {
      networkRef.current.sendToHost({
        type: 'ACTION',
        action,
        amount,
      });
    }
  };

  // CHAT MESSAGE
  const handleSendMessage = (text: string) => {
    if (!currentUser) return;
    if (isHost) {
      const chatLog = addLog(`${currentUser.name}: ${text}`, 'chat');
      broadcastState([chatLog]);
    } else if (networkRef.current) {
      networkRef.current.sendToHost({
        type: 'CHAT',
        text,
        senderName: currentUser.name,
      });
    }
  };

  // COPY ROOM ID / LINK
  const handleCopyRoom = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    showToast(`คัดลอกรหัสห้อง ${roomCode} แล้ว!`);
  };

  const handleCopyLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    showToast('คัดลอกลิงก์เชิญเพื่อนแล้ว!');
  };

  // LEAVE ROOM
  const handleLeaveRoom = () => {
    if (networkRef.current) {
      networkRef.current.disconnect();
      networkRef.current = null;
    }
    engineRef.current = null;
    setInRoom(false);
    setGameState(null);
    setCurrentUser(null);
    setLogs([]);
  };

  // TOGGLE SOUND MUTE
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  // Winning cards set for visual halo glow
  const winningCardSet = React.useMemo(() => {
    if (gameState?.phase === 'showdown' && gameState.winners.length > 0) {
      const set = new Set<string>();
      gameState.winners[0].winningCards.forEach((c) => {
        set.add(`${c.suit}-${c.rank}`);
      });
      return set;
    }
    return undefined;
  }, [gameState?.phase, gameState?.winners]);

  return (
    <div className="min-h-screen bg-[#070e0a] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black/90 border border-amber-400 text-amber-300 px-4 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Rules Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Lobby Modal if not in room */}
      {!inRoom && (
        <LobbyModal
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onOpenRules={() => setIsRulesOpen(true)}
          initialRoomCode={initialRoomCode}
        />
      )}

      {/* Active Room View */}
      {inRoom && gameState && currentUser && (
        <>
          {/* Top Bar Header */}
          <header className="w-full bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between z-30 shrink-0">
            {/* Left: Brand & Room ID */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 font-serif font-black text-amber-400 text-sm sm:text-base tracking-wide">
                <span>♠</span>
                <span className="hidden sm:inline">TEXAS HOLD'EM</span>
              </div>

              {/* Room Code Badge */}
              <div className="flex items-center gap-1 bg-slate-900 border border-amber-500/40 rounded-lg px-2 sm:px-2.5 py-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold hidden xs:inline">
                  ห้อง:
                </span>
                <span className="font-mono font-black text-xs sm:text-sm text-amber-300">
                  {roomCode}
                </span>
                <button
                  onClick={handleCopyRoom}
                  title="คัดลอกรหัสห้อง"
                  className="ml-1 text-slate-400 hover:text-amber-300 text-xs cursor-pointer p-0.5"
                >
                  📋
                </button>
              </div>

              {/* Copy Invite Link */}
              <button
                onClick={handleCopyLink}
                title="คัดลอกลิงก์ส่งให้เพื่อน"
                className="hidden md:flex items-center gap-1 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
              >
                <span>🔗 ลิงก์ชวนเพื่อน</span>
              </button>
            </div>

            {/* Right: Controls & Info */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Show Winner Banner toggle if in Showdown */}
              {gameState.phase === 'showdown' && gameState.winners.length > 0 && !showWinnerBanner && (
                <button
                  onClick={() => setShowWinnerBanner(true)}
                  className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 sm:px-3 py-1 rounded-lg font-black flex items-center gap-1 cursor-pointer transition-all shadow-md animate-bounce"
                >
                  <span>🏆</span>
                  <span>ดูผลผู้ชนะ</span>
                </button>
              )}

              {/* Add Bot button for Host */}
              {isHost && gameState.players.length < 6 && (
                <button
                  onClick={handleAddBot}
                  className="text-xs bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 px-2 sm:px-3 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                >
                  <span>🤖</span>
                  <span className="hidden sm:inline">เพิ่มบอท</span>
                </button>
              )}

              {/* Rules Button */}
              <button
                onClick={() => setIsRulesOpen(true)}
                title="คู่มือ & กติกา"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-center justify-center cursor-pointer transition-colors"
              >
                📖
              </button>

              {/* Mute Button */}
              <button
                onClick={toggleMute}
                title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-center justify-center cursor-pointer transition-colors"
              >
                {isMuted ? '🔇' : '🔊'}
              </button>

              {/* Leave Room Button */}
              <button
                onClick={handleLeaveRoom}
                className="text-xs bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-rose-300 px-2 sm:px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-colors"
              >
                ออกจากห้อง
              </button>
            </div>
          </header>

          {/* Prominent Unobstructed Winner Banner during Showdown */}
          {showWinnerBanner &&
            gameState.phase === 'showdown' &&
            gameState.winners.length > 0 && (
              <WinnerBanner
                winners={gameState.winners}
                isHostUser={isHost}
                onNextHand={handleNextHand}
                onClose={() => setShowWinnerBanner(false)}
              />
            )}

          {/* Main Poker Table Canvas Area */}
          <main className="flex-1 w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden relative">
            <PokerTable
              gameState={gameState}
              currentUserId={currentUser.id}
              isHostUser={isHost}
              onKickBot={handleKickBot}
              winningCardSet={winningCardSet}
            />
          </main>

          {/* Bottom Docked Betting Controls */}
          <footer className="w-full shrink-0 z-30">
            <BettingControls
              gameState={gameState}
              currentUserId={currentUser.id}
              isHostUser={isHost}
              onAction={handlePlayerAction}
              onNextHand={handleNextHand}
              onStartGame={handleStartGame}
              winningCardSet={winningCardSet}
            />
          </footer>

          {/* Game Log & Chat Slide-over Drawer */}
          <GameLog
            logs={logs}
            onSendMessage={handleSendMessage}
            isOpen={isLogOpen}
            onToggle={() => setIsLogOpen(!isLogOpen)}
          />
        </>
      )}
    </div>
  );
}
