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

            // Directly send the fresh state specifically to the joining peer!
            const sanitized = engineRef.current.getSanitizedStateFor(fromPeerId);
            network.sendTo(fromPeerId, {
              type: 'SYNC_STATE',
              state: sanitized,
            });

            if (added) {
              const joinLog = addLog(`ผู้เล่น [${msg.name}] เข้าร่วมโต๊ะแล้ว`, 'system');
              sound.playChips();
              broadcastState([joinLog]);
            } else {
              broadcastState();
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

    // Send join message to host immediately
    net.sendToHost({
      type: 'JOIN',
      name,
      avatarSeed: clientPlayer.avatarSeed,
    });

    // Backup retry after 500ms in case channel was buffering
    setTimeout(() => {
      if (networkRef.current && !networkRef.current.isHost) {
        networkRef.current.sendToHost({
          type: 'JOIN',
          name,
          avatarSeed: clientPlayer.avatarSeed,
        });
      }
    }, 500);

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
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-[#070e0a] text-slate-100 flex flex-col justify-between overflow-hidden selection:bg-amber-500 selection:text-slate-950 font-sans">
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

      {/* Client Connecting & Syncing with Host Loader */}
      {inRoom && !gameState && (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center z-40 bg-[#07130b] select-none">
          <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
            <span className="w-20 h-20 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin absolute" />
            <span className="text-3xl animate-pulse text-amber-400 font-serif">♠</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
            กำลังเข้าสู่ห้อง [{roomCode}]...
          </h2>
          <p className="text-xs sm:text-sm text-emerald-400 font-medium animate-pulse mb-6 max-w-xs">
            กำลังเชื่อมต่อ P2P และรอรับข้อมูลโต๊ะโป๊กเกอร์จาก Host...
          </p>
          <button
            onClick={handleLeaveRoom}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 px-4 py-2 rounded-xl cursor-pointer transition-colors"
          >
            ยกเลิกและกลับหน้าหลัก
          </button>
        </div>
      )}

      {/* Active Room View */}
      {inRoom && gameState && currentUser && (
        <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
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

          {/* Fullscreen Poker Table with Embedded In-Table Buttons & HUD */}
          <PokerTable
            gameState={gameState}
            currentUserId={currentUser.id}
            isHostUser={isHost}
            roomCode={roomCode}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onOpenRules={() => setIsRulesOpen(true)}
            onToggleLog={() => setIsLogOpen(!isLogOpen)}
            onLeaveRoom={handleLeaveRoom}
            onAddBot={handleAddBot}
            onKickBot={handleKickBot}
            onCopyRoom={handleCopyRoom}
            onCopyLink={handleCopyLink}
            onAction={handlePlayerAction}
            onStartGame={handleStartGame}
            onNextHand={handleNextHand}
            winningCardSet={winningCardSet}
            showWinnerBannerButton={
              gameState.phase === 'showdown' &&
              gameState.winners.length > 0 &&
              !showWinnerBanner
            }
            onOpenWinnerBanner={() => setShowWinnerBanner(true)}
          />

          {/* Game Log & Chat Slide-over Drawer */}
          <GameLog
            logs={logs}
            onSendMessage={handleSendMessage}
            isOpen={isLogOpen}
            onToggle={() => setIsLogOpen(!isLogOpen)}
          />
        </div>
      )}
    </div>
  );
}
