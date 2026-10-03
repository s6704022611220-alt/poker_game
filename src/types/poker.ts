export type Suit = 'S' | 'H' | 'D' | 'C'; // Spades, Hearts, Diamonds, Clubs

export interface Card {
  suit: Suit;
  rank: number; // 2 - 14 (14 = Ace)
}

export type HandRankCategory =
  | 'ROYAL_FLUSH'
  | 'STRAIGHT_FLUSH'
  | 'FOUR_OF_A_KIND'
  | 'FULL_HOUSE'
  | 'FLUSH'
  | 'STRAIGHT'
  | 'THREE_OF_A_KIND'
  | 'TWO_PAIR'
  | 'ONE_PAIR'
  | 'HIGH_CARD';

export interface HandEvaluation {
  category: HandRankCategory;
  categoryScore: number; // 0 to 9
  kickerScores: number[]; // e.g. [14, 13, 9, 7, 4] for tie-breaking
  nameTh: string;
  nameEn: string;
  bestFiveCards: Card[];
}

export type PlayerActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface Player {
  id: string; // Peer ID or bot ID
  name: string;
  avatarSeed: number;
  chips: number;
  currentBet: number;
  totalRoundBet: number;
  cards: (Card | null)[]; // null if face down to this viewer
  folded: boolean;
  isAllIn: boolean;
  isBot: boolean;
  isHost: boolean;
  isConnected: boolean;
  lastAction?: {
    type: PlayerActionType;
    amount?: number;
    text: string;
  };
  showCards?: boolean;
  handEval?: HandEvaluation;
}

export type GamePhase =
  | 'lobby'
  | 'dealing'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown';

export interface PotWinner {
  playerId: string;
  playerName: string;
  amount: number;
  handName: string;
  winningCards: Card[];
}

export interface GameState {
  roomId: string;
  hostId: string;
  phase: GamePhase;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  minRaise: number;
  activePlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  winners: PotWinner[];
  actionTimerSeconds: number;
  maxPlayers: number;
}

export interface GameLogEntry {
  id: string;
  timestamp: string;
  type: 'action' | 'phase' | 'win' | 'system' | 'chat';
  text: string;
}

export type PeerMessage =
  | { type: 'JOIN'; name: string; avatarSeed: number }
  | { type: 'SYNC_STATE'; state: GameState; logs?: GameLogEntry[] }
  | { type: 'ACTION'; action: PlayerActionType; amount?: number }
  | { type: 'START_GAME' }
  | { type: 'NEXT_HAND' }
  | { type: 'ADD_BOT' }
  | { type: 'REMOVE_BOT'; botId: string }
  | { type: 'CHAT'; text: string; senderName: string }
  | { type: 'SOUND'; soundName: 'deal' | 'chip' | 'check' | 'fold' | 'win' | 'turn' };
