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
      throw new Error('PeerJS ไม่พร้อมใช้งาน กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
    }

    return new Promise((resolve, reject) => {
      try {
        this.peer = new PeerClass(hostPeerId, {
          debug: 1,
        });

        this.peer.on('open', (id: string) => {
          this.myPeerId = id;
          resolve(this.roomCode);
        });

        this.peer.on('connection', (conn: any) => {
          this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err: any) => {
          if (err.type === 'unavailable-id') {
            // Room code already taken, notify
            reject(new Error(`รหัสห้อง ${this.roomCode} กำลังถูกใช้งานอยู่ กรุณาสร้างรหัสใหม่`));
          } else {
            this.onError?.(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ PeerJS');
          }
        });
      } catch (err: any) {
        reject(err);
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
      throw new Error('PeerJS ไม่พร้อมใช้งาน กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
    }

    return new Promise((resolve, reject) => {
      try {
        // Create client peer with randomized ID
        this.peer = new PeerClass(undefined, {
          debug: 1,
        });

        this.peer.on('open', (id: string) => {
          this.myPeerId = id;

          // Connect to the host
          const conn = this.peer.connect(targetHostPeerId, {
            reliable: true,
          });

          this.hostConnection = conn;

          conn.on('open', () => {
            this.onConnected?.(targetHostPeerId);
            resolve();
          });

          conn.on('data', (data: any) => {
            this.onMessage?.(data, targetHostPeerId);
          });

          conn.on('close', () => {
            this.onPeerLeft?.(targetHostPeerId);
            this.onError?.('หลุดการเชื่อมต่อจาก Host ผู้สร้างห้อง');
          });

          conn.on('error', (err: any) => {
            reject(new Error('ไม่สามารถเชื่อมต่อกับห้องนี้ได้: ' + (err?.message || 'Host ไม่ได้ออนไลน์')));
          });
        });

        this.peer.on('error', (err: any) => {
          reject(new Error(err?.message || 'เกิดข้อผิดพลาดกับ PeerJS'));
        });
      } catch (err: any) {
        reject(err);
      }
    });
  }

  private handleIncomingConnection(conn: any) {
    conn.on('open', () => {
      this.clientConnections.set(conn.peer, conn);
      this.onPeerJoined?.(conn.peer);
    });

    conn.on('data', (data: any) => {
      this.onMessage?.(data, conn.peer);
    });

    conn.on('close', () => {
      this.clientConnections.delete(conn.peer);
      this.onPeerLeft?.(conn.peer);
    });

    conn.on('error', () => {
      this.clientConnections.delete(conn.peer);
      this.onPeerLeft?.(conn.peer);
    });
  }

  // Host: Send to a specific client
  public sendTo(peerId: string, message: PeerMessage) {
    if (this.isHost) {
      const conn = this.clientConnections.get(peerId);
      if (conn && conn.open) {
        conn.send(message);
      }
    }
  }

  // Host: Broadcast to all connected clients
  public broadcast(message: PeerMessage) {
    if (this.isHost) {
      this.clientConnections.forEach((conn) => {
        if (conn && conn.open) {
          conn.send(message);
        }
      });
    }
  }

  // Client: Send action/message to Host
  public sendToHost(message: PeerMessage) {
    if (!this.isHost && this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send(message);
    }
  }

  public getConnectedPeerCount(): number {
    return this.isHost ? this.clientConnections.size : (this.hostConnection?.open ? 1 : 0);
  }

  public disconnect() {
    if (this.hostConnection) {
      this.hostConnection.close();
      this.hostConnection = null;
    }
    this.clientConnections.forEach((conn) => conn.close());
    this.clientConnections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
