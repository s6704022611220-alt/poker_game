import { Peer } from 'peerjs';
import { PeerMessage } from '../types/poker';

export const ROOM_PREFIX = 'texasholdem-club-v1-';

export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function formatHostPeerId(roomCode: string): string {
  return `${ROOM_PREFIX}${roomCode.toUpperCase().trim()}`;
}

const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
  },
};

export class PokerPeerNetwork {
  private peer: any = null;
  public isHost: boolean = false;
  public myPeerId: string = '';
  public roomCode: string = '';

  // Host: Map of peerId -> DataConnection
  private clientConnections: Map<string, any> = new Map();
  // Client: single DataConnection to host
  private hostConnection: any = null;

  // Callbacks
  public onMessage?: (data: PeerMessage, fromPeerId: string) => void;
  public onPeerJoined?: (peerId: string) => void;
  public onPeerLeft?: (peerId: string) => void;
  public onConnected?: (peerId: string) => void;
  public onError?: (error: string) => void;

  private getPeerConstructor(): any {
    if (Peer) return Peer;
    if (typeof window !== 'undefined' && (window as any).Peer) {
      return (window as any).Peer;
    }
    return null;
  }

  // Host: Create a new room with a specific code
  public async createRoom(roomCode: string): Promise<string> {
    this.isHost = true;
    this.roomCode = roomCode.toUpperCase().trim();
    const hostPeerId = formatHostPeerId(this.roomCode);

    const PeerClass = this.getPeerConstructor();
    if (!PeerClass) {
      throw new Error('PeerJS ไม่พร้อมใช้งาน กรุณารีเฟรชหน้าเว็บหรือตรวจสอบอินเทอร์เน็ต');
    }

    return new Promise((resolve, reject) => {
      let isSettled = false;

      try {
        this.peer = new PeerClass(hostPeerId, PEER_CONFIG);

        this.peer.on('open', (id: string) => {
          if (!isSettled) {
            isSettled = true;
            this.myPeerId = id;
            resolve(this.roomCode);
          }
        });

        this.peer.on('connection', (conn: any) => {
          this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err: any) => {
          if (!isSettled) {
            isSettled = true;
            if (err.type === 'unavailable-id') {
              reject(new Error(`รหัสห้อง "${this.roomCode}" กำลังถูกใช้งานอยู่ กรุณากดสุ่มรหัสห้องใหม่`));
            } else {
              reject(new Error(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ PeerJS'));
            }
          } else {
            this.onError?.(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
          }
        });
      } catch (err: any) {
        if (!isSettled) {
          isSettled = true;
          reject(err);
        }
      }
    });
  }

  // Client: Join an existing room code
  public async joinRoom(roomCode: string): Promise<void> {
    this.isHost = false;
    this.roomCode = roomCode.toUpperCase().trim();
    const targetHostPeerId = formatHostPeerId(this.roomCode);

    const PeerClass = this.getPeerConstructor();
    if (!PeerClass) {
      throw new Error('PeerJS ไม่พร้อมใช้งาน กรุณารีเฟรชหน้าเว็บหรือตรวจสอบอินเทอร์เน็ต');
    }

    return new Promise((resolve, reject) => {
      let isSettled = false;
      let connectionTimeout: any = null;

      const cleanup = () => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
      };

      try {
        // Create client peer with randomized ID
        this.peer = new PeerClass(undefined, PEER_CONFIG);

        this.peer.on('open', (id: string) => {
          this.myPeerId = id;

          // Connect to the host peer
          const conn = this.peer.connect(targetHostPeerId, {
            reliable: true,
          });

          this.hostConnection = conn;

          const onOpen = () => {
            if (!isSettled) {
              isSettled = true;
              cleanup();
              this.onConnected?.(targetHostPeerId);
              resolve();
            }
          };

          if (conn.open) {
            onOpen();
          } else {
            conn.on('open', onOpen);
          }

          conn.on('data', (data: any) => {
            this.onMessage?.(data, targetHostPeerId);
          });

          conn.on('close', () => {
            this.onPeerLeft?.(targetHostPeerId);
            this.onError?.('หลุดการเชื่อมต่อจากห้อง');
          });

          conn.on('error', (err: any) => {
            if (!isSettled) {
              isSettled = true;
              cleanup();
              reject(new Error(`ไม่พบห้อง "${this.roomCode}" หรือ Host ไม่ได้ออนไลน์`));
            }
          });

          // 12-second timeout guard
          connectionTimeout = setTimeout(() => {
            if (!isSettled) {
              isSettled = true;
              this.disconnect();
              reject(
                new Error(
                  `ไม่พบห้อง "${this.roomCode}" หรือ Host ยังไม่ได้เปิดห้อง กรุณาตรวจสอบรหัสห้องอีกครั้ง`
                )
              );
            }
          }, 12000);
        });

        this.peer.on('error', (err: any) => {
          if (!isSettled) {
            isSettled = true;
            cleanup();
            if (err.type === 'peer-unavailable') {
              reject(new Error(`ไม่พบห้อง "${this.roomCode}" หรือ Host ยังไม่ได้เปิดห้อง`));
            } else {
              reject(new Error(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ PeerJS'));
            }
          }
        });
      } catch (err: any) {
        if (!isSettled) {
          isSettled = true;
          cleanup();
          reject(err);
        }
      }
    });
  }

  private handleIncomingConnection(conn: any) {
    // Store immediately so host can send back
    this.clientConnections.set(conn.peer, conn);

    const onConnReady = () => {
      this.clientConnections.set(conn.peer, conn);
      this.onPeerJoined?.(conn.peer);
    };

    if (conn.open) {
      onConnReady();
    } else {
      conn.on('open', onConnReady);
    }

    conn.on('data', (data: any) => {
      // Ensure conn is registered
      this.clientConnections.set(conn.peer, conn);
      this.onMessage?.(data, conn.peer);
    });

    conn.on('close', () => {
      this.clientConnections.delete(conn.peer);
      this.onPeerLeft?.(conn.peer);
    });

    conn.on('error', (err: any) => {
      console.warn('Peer connection error with', conn.peer, err);
      this.clientConnections.delete(conn.peer);
      this.onPeerLeft?.(conn.peer);
    });
  }

  // Host: Send to a specific client
  public sendTo(peerId: string, message: PeerMessage) {
    if (this.isHost) {
      const conn = this.clientConnections.get(peerId);
      if (conn) {
        if (conn.open) {
          try {
            conn.send(message);
          } catch (e) {
            console.error('Failed to send to', peerId, e);
          }
        } else {
          conn.once('open', () => {
            try {
              conn.send(message);
            } catch (e) {
              console.error('Failed to send once opened to', peerId, e);
            }
          });
        }
      }
    }
  }

  // Host: Broadcast to all connected clients
  public broadcast(message: PeerMessage) {
    if (this.isHost) {
      this.clientConnections.forEach((conn) => {
        if (conn && conn.open) {
          try {
            conn.send(message);
          } catch (e) {
            console.error('Failed to broadcast to', conn.peer, e);
          }
        }
      });
    }
  }

  // Client: Send action/message to Host
  public sendToHost(message: PeerMessage) {
    if (!this.isHost && this.hostConnection) {
      if (this.hostConnection.open) {
        try {
          this.hostConnection.send(message);
        } catch (e) {
          console.error('Failed to send to host', e);
        }
      } else {
        this.hostConnection.once('open', () => {
          try {
            this.hostConnection.send(message);
          } catch (e) {
            console.error('Failed to send to host on open', e);
          }
        });
      }
    }
  }

  public getConnectedPeerCount(): number {
    return this.isHost ? this.clientConnections.size : (this.hostConnection?.open ? 1 : 0);
  }

  public disconnect() {
    if (this.hostConnection) {
      try {
        this.hostConnection.close();
      } catch {}
      this.hostConnection = null;
    }
    this.clientConnections.forEach((conn) => {
      try {
        conn.close();
      } catch {}
    });
    this.clientConnections.clear();
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
  }
}
