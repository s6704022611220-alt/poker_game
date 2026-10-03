import {
  Card,
  GamePhase,
  GameState,
  Player,
  PlayerActionType,
  PotWinner,
} from '../types/poker';
import {
  compareEvaluations,
  createDeck,
  evaluateBestHand,
  shuffleDeck,
} from '../utils/pokerEvaluator';

export const INITIAL_CHIPS = 1000;
export const DEFAULT_SMALL_BLIND = 10;
export const DEFAULT_BIG_BLIND = 20;

export const BOT_NAMES = [
  'สมชาย (Bot)',
  'วิชัย (Bot)',
  'กานดา (Bot)',
  'บอส (Bot)',
  'เจมส์ (Bot)',
];

export class PokerEngine {
  private deck: Card[] = [];
  private playerHoleCards: Map<string, Card[]> = new Map(); // Authoritative server storage for true hole cards
  public state: GameState;
  private actedThisRound: Set<string> = new Set();

  constructor(roomId: string, hostPlayer: Player) {
    this.state = {
      roomId,
      hostId: hostPlayer.id,
      phase: 'lobby',
      players: [hostPlayer],
      communityCards: [],
      pot: 0,
      currentBet: 0,
      minRaise: DEFAULT_BIG_BLIND,
      activePlayerIndex: 0,
      dealerIndex: 0,
      smallBlind: DEFAULT_SMALL_BLIND,
      bigBlind: DEFAULT_BIG_BLIND,
      handNumber: 0,
      winners: [],
      actionTimerSeconds: 20,
      maxPlayers: 6,
    };
  }

  public addPlayer(player: Player): boolean {
    if (this.state.players.length >= this.state.maxPlayers) {
      return false;
    }
    // Check if ID already exists
    if (this.state.players.some((p) => p.id === player.id)) {
      return false;
    }
    this.state.players.push(player);
    return true;
  }

  public removePlayer(playerId: string) {
    const idx = this.state.players.findIndex((p) => p.id === playerId);
    if (idx !== -1) {
      this.state.players.splice(idx, 1);
      if (this.state.players.length > 0) {
        if (this.state.dealerIndex >= this.state.players.length) {
          this.state.dealerIndex = 0;
        }
        if (this.state.activePlayerIndex >= this.state.players.length) {
          this.state.activePlayerIndex = 0;
        }
      }
    }
  }

  // Start a new hand
  public startNewHand(): { success: boolean; message?: string } {
    if (this.state.players.length < 2) {
      return { success: false, message: 'ต้องการผู้เล่นอย่างน้อย 2 คนเพื่อเริ่มเกม' };
    }

    // Reset stacks if anyone is out of chips (give rebuy of initial chips for casual fun)
    for (const p of this.state.players) {
      if (p.chips <= 0) {
        p.chips = INITIAL_CHIPS;
      }
      p.currentBet = 0;
      p.totalRoundBet = 0;
      p.folded = false;
      p.isAllIn = false;
      p.cards = [];
      p.lastAction = undefined;
      p.showCards = false;
      p.handEval = undefined;
    }

    // Move dealer button
    if (this.state.handNumber > 0) {
      this.state.dealerIndex = (this.state.dealerIndex + 1) % this.state.players.length;
    }

    this.state.handNumber += 1;
    this.state.communityCards = [];
    this.state.pot = 0;
    this.state.winners = [];
    this.actedThisRound.clear();
    this.playerHoleCards.clear();

    // Shuffle fresh deck
    this.deck = shuffleDeck(createDeck());

    // Deal 2 hole cards to each player
    for (const p of this.state.players) {
      const card1 = this.deck.pop()!;
      const card2 = this.deck.pop()!;
      this.playerHoleCards.set(p.id, [card1, card2]);
      p.cards = [card1, card2];
    }

    // Determine Blinds
    const n = this.state.players.length;
    let sbIndex: number;
    let bbIndex: number;
    let firstActionIndex: number;

    if (n === 2) {
      // Heads-up: Dealer is SB and acts first pre-flop
      sbIndex = this.state.dealerIndex;
      bbIndex = (this.state.dealerIndex + 1) % n;
      firstActionIndex = sbIndex;
    } else {
      sbIndex = (this.state.dealerIndex + 1) % n;
      bbIndex = (this.state.dealerIndex + 2) % n;
      firstActionIndex = (this.state.dealerIndex + 3) % n;
    }

    // Post Small Blind
    const sbPlayer = this.state.players[sbIndex];
    const sbAmount = Math.min(sbPlayer.chips, this.state.smallBlind);
    sbPlayer.chips -= sbAmount;
    sbPlayer.currentBet = sbAmount;
    sbPlayer.totalRoundBet = sbAmount;
    if (sbPlayer.chips === 0) sbPlayer.isAllIn = true;
    sbPlayer.lastAction = { type: 'raise', amount: sbAmount, text: `ลง Small Blind $${sbAmount}` };

    // Post Big Blind
    const bbPlayer = this.state.players[bbIndex];
    const bbAmount = Math.min(bbPlayer.chips, this.state.bigBlind);
    bbPlayer.chips -= bbAmount;
    bbPlayer.currentBet = bbAmount;
    bbPlayer.totalRoundBet = bbAmount;
    if (bbPlayer.chips === 0) bbPlayer.isAllIn = true;
    bbPlayer.lastAction = { type: 'raise', amount: bbAmount, text: `ลง Big Blind $${bbAmount}` };

    this.state.pot = sbAmount + bbAmount;
    this.state.currentBet = Math.max(sbAmount, bbAmount);
    this.state.minRaise = this.state.bigBlind;
    this.state.phase = 'preflop';
    this.state.activePlayerIndex = firstActionIndex;

    return { success: true };
  }

  // Handle a player action
  public handleAction(
    playerId: string,
    action: PlayerActionType,
    amount?: number
  ): { success: boolean; message?: string; nextRound?: boolean; showdown?: boolean } {
    const player = this.state.players[this.state.activePlayerIndex];
    if (!player || player.id !== playerId) {
      return { success: false, message: 'ยังไม่ถึงตาของคุณ' };
    }

    const currentHighestBet = this.state.currentBet;
    const callCost = currentHighestBet - player.currentBet;

    switch (action) {
      case 'fold': {
        player.folded = true;
        player.lastAction = { type: 'fold', text: 'หมอบไพ่ (Fold)' };
        this.actedThisRound.add(player.id);
        break;
      }

      case 'check': {
        if (callCost > 0) {
          return { success: false, message: 'ไม่สามารถ Check ได้เนื่องจากมีผู้เล่นเพิ่มเดิมพัน ต้อง Call หรือ Fold' };
        }
        player.lastAction = { type: 'check', text: 'ผ่าน (Check)' };
        this.actedThisRound.add(player.id);
        break;
      }

      case 'call': {
        const actualCall = Math.min(player.chips, callCost);
        player.chips -= actualCall;
        player.currentBet += actualCall;
        player.totalRoundBet += actualCall;
        this.state.pot += actualCall;
        if (player.chips === 0) {
          player.isAllIn = true;
        }
        player.lastAction = {
          type: 'call',
          amount: actualCall,
          text: `ตาม (Call $${player.currentBet})`,
        };
        this.actedThisRound.add(player.id);
        break;
      }

      case 'raise': {
        // Amount specified is total currentBet player wants to reach
        const targetBet = amount || currentHighestBet + this.state.minRaise;
        const addAmount = targetBet - player.currentBet;

        if (addAmount <= callCost && player.chips > callCost) {
          return { success: false, message: 'ยอด Raise ต้องมากกว่ายอด Call' };
        }

        const actualAdd = Math.min(player.chips, addAmount);
        const newPlayerBet = player.currentBet + actualAdd;

        if (newPlayerBet > currentHighestBet) {
          const raiseDiff = newPlayerBet - currentHighestBet;
          this.state.minRaise = Math.max(this.state.minRaise, raiseDiff);
          this.state.currentBet = newPlayerBet;
          // Re-open betting for active non-allin players
          this.actedThisRound.clear();
        }

        player.chips -= actualAdd;
        player.currentBet = newPlayerBet;
        player.totalRoundBet += actualAdd;
        this.state.pot += actualAdd;
        if (player.chips === 0) {
          player.isAllIn = true;
        }

        player.lastAction = {
          type: player.isAllIn ? 'all-in' : 'raise',
          amount: newPlayerBet,
          text: player.isAllIn ? `เทหมดหน้าตัก All-In ($${newPlayerBet})` : `เกเพิ่ม Raise ($${newPlayerBet})`,
        };
        this.actedThisRound.add(player.id);
        break;
      }

      case 'all-in': {
        const allInAmount = player.chips;
        const newBet = player.currentBet + allInAmount;

        if (newBet > currentHighestBet) {
          const raiseDiff = newBet - currentHighestBet;
          this.state.minRaise = Math.max(this.state.minRaise, raiseDiff);
          this.state.currentBet = newBet;
          this.actedThisRound.clear();
        }

        player.chips = 0;
        player.currentBet = newBet;
        player.totalRoundBet += allInAmount;
        this.state.pot += allInAmount;
        player.isAllIn = true;

        player.lastAction = {
          type: 'all-in',
          amount: newBet,
          text: `เทหมดหน้าตัก All-In ($${newBet})`,
        };
        this.actedThisRound.add(player.id);
        break;
      }
    }

    // Check if only 1 player remains (all others folded)
    const activeNonFolded = this.state.players.filter((p) => !p.folded);
    if (activeNonFolded.length === 1) {
      this.resolveSingleWinner(activeNonFolded[0]);
      return { success: true, showdown: true };
    }

    // Check if betting round complete
    if (this.isBettingRoundComplete()) {
      const isOver = this.advancePhase();
      return { success: true, nextRound: true, showdown: isOver };
    } else {
      this.advanceToNextActivePlayer();
      return { success: true };
    }
  }

  // Check if round is complete
  private isBettingRoundComplete(): boolean {
    const playersInHand = this.state.players.filter((p) => !p.folded);

    // Players who are still able to act (not folded and not all-in)
    const canActPlayers = playersInHand.filter((p) => !p.isAllIn);

    // If 0 or 1 player can act and everyone matched bet, round is complete
    if (canActPlayers.length <= 1) {
      const allMatched = canActPlayers.every(
        (p) => p.currentBet === this.state.currentBet
      );
      if (allMatched) return true;
    }

    // All active non-allin players must have acted and matched current bet
    for (const p of canActPlayers) {
      if (!this.actedThisRound.has(p.id)) return false;
      if (p.currentBet !== this.state.currentBet) return false;
    }

    return true;
  }

  // Advance turn to next active, non-folded, non-all-in player
  private advanceToNextActivePlayer() {
    const n = this.state.players.length;
    let nextIdx = (this.state.activePlayerIndex + 1) % n;
    let iterations = 0;

    while (iterations < n) {
      const p = this.state.players[nextIdx];
      if (!p.folded && !p.isAllIn) {
        this.state.activePlayerIndex = nextIdx;
        return;
      }
      nextIdx = (nextIdx + 1) % n;
      iterations++;
    }
  }

  // Advance to next street (Flop, Turn, River, Showdown)
  public advancePhase(): boolean {
    // Reset round bets
    for (const p of this.state.players) {
      p.currentBet = 0;
      if (p.lastAction && p.lastAction.type !== 'fold' && !p.isAllIn) {
        p.lastAction = undefined;
      }
    }
    this.state.currentBet = 0;
    this.state.minRaise = this.state.bigBlind;
    this.actedThisRound.clear();

    const playersCanAct = this.state.players.filter((p) => !p.folded && !p.isAllIn);

    if (this.state.phase === 'preflop') {
      // Burn 1 card, deal Flop (3 cards)
      this.deck.pop(); // burn
      this.state.communityCards.push(
        this.deck.pop()!,
        this.deck.pop()!,
        this.deck.pop()!
      );
      this.state.phase = 'flop';
    } else if (this.state.phase === 'flop') {
      // Burn 1, deal Turn (1 card)
      this.deck.pop(); // burn
      this.state.communityCards.push(this.deck.pop()!);
      this.state.phase = 'turn';
    } else if (this.state.phase === 'turn') {
      // Burn 1, deal River (1 card)
      this.deck.pop(); // burn
      this.state.communityCards.push(this.deck.pop()!);
      this.state.phase = 'river';
    } else if (this.state.phase === 'river') {
      // Showdown!
      this.resolveShowdown();
      return true;
    }

    // If 0 or 1 player can act (others all-in), run out community cards to showdown automatically
    if (playersCanAct.length <= 1) {
      while (this.state.communityCards.length < 5) {
        this.deck.pop(); // burn
        this.state.communityCards.push(this.deck.pop()!);
      }
      this.resolveShowdown();
      return true;
    }

    // Position next active player: first active player clockwise from dealer button
    const n = this.state.players.length;
    let nextIdx = (this.state.dealerIndex + 1) % n;
    let count = 0;
    while (count < n) {
      const p = this.state.players[nextIdx];
      if (!p.folded && !p.isAllIn) {
        this.state.activePlayerIndex = nextIdx;
        break;
      }
      nextIdx = (nextIdx + 1) % n;
      count++;
    }

    return false;
  }

  // Only 1 player left because everyone else folded
  private resolveSingleWinner(winner: Player) {
    this.state.phase = 'showdown';
    winner.chips += this.state.pot;

    this.state.winners = [
      {
        playerId: winner.id,
        playerName: winner.name,
        amount: this.state.pot,
        handName: 'ชนะจากการหมอบของผู้เล่นคนอื่น',
        winningCards: this.playerHoleCards.get(winner.id) || [],
      },
    ];

    winner.lastAction = {
      type: 'check',
      text: `🏆 ผู้ชนะ ($${this.state.pot})`,
    };
  }

  // Full 7-card showdown resolution
  public resolveShowdown() {
    this.state.phase = 'showdown';

    // Reveal and evaluate hands for all non-folded players
    const activePlayers = this.state.players.filter((p) => !p.folded);

    for (const p of activePlayers) {
      const hole = this.playerHoleCards.get(p.id) || [];
      p.cards = hole; // Reveal hole cards
      p.showCards = true;
      p.handEval = evaluateBestHand([...hole, ...this.state.communityCards]);
    }

    // Sort descending by hand evaluation
    activePlayers.sort((a, b) => {
      return compareEvaluations(b.handEval!, a.handEval!);
    });

    const bestScore = activePlayers[0].handEval!;
    // Find all players tied for best hand
    const winners = activePlayers.filter(
      (p) => compareEvaluations(p.handEval!, bestScore) === 0
    );

    const share = Math.floor(this.state.pot / winners.length);
    let remainder = this.state.pot % winners.length;

    const potWinners: PotWinner[] = [];

    for (const w of winners) {
      const awarded = share + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      w.chips += awarded;
      w.lastAction = {
        type: 'check',
        text: `🏆 ชนะรับ $${awarded}`,
      };

      potWinners.push({
        playerId: w.id,
        playerName: w.name,
        amount: awarded,
        handName: w.handEval!.nameTh,
        winningCards: w.handEval!.bestFiveCards,
      });
    }

    this.state.winners = potWinners;
  }

  // Generate sanitized state for a given client to prevent peeking at opponent cards before showdown
  public getSanitizedStateFor(viewerPeerId: string): GameState {
    const isShowdown = this.state.phase === 'showdown';

    const sanitizedPlayers = this.state.players.map((p) => {
      const isViewer = p.id === viewerPeerId;
      const trueCards = this.playerHoleCards.get(p.id) || [];

      if (isShowdown && !p.folded) {
        // Showdown: reveal
        return {
          ...p,
          cards: trueCards,
          showCards: true,
        };
      } else if (isViewer) {
        // Self: show cards
        return {
          ...p,
          cards: trueCards,
          showCards: true,
        };
      } else {
        // Opponent during active hand: 2 face-down cards
        return {
          ...p,
          cards: [null, null],
          showCards: false,
          handEval: undefined,
        };
      }
    });

    return {
      ...this.state,
      players: sanitizedPlayers,
    };
  }

  // Smart Bot AI Move Calculation
  public getBotAction(botPlayer: Player): {
    action: PlayerActionType;
    amount?: number;
  } {
    const hole = this.playerHoleCards.get(botPlayer.id) || [];
    const currentBet = this.state.currentBet;
    const callCost = currentBet - botPlayer.currentBet;
    const pot = this.state.pot;

    // Quick heuristic: card ranks
    const ranks = hole.map((c) => c.rank).sort((a, b) => b - a);
    const isPair = ranks[0] === ranks[1];
    const highCard = ranks[0];
    const isSuited = hole.length === 2 && hole[0].suit === hole[1].suit;

    // Free to check?
    if (callCost === 0) {
      // Occasional raise with high pair or high cards
      if ((isPair && highCard >= 10) || (highCard >= 13 && Math.random() < 0.35)) {
        const raiseSize = Math.min(botPlayer.chips, currentBet + this.state.minRaise);
        return { action: 'raise', amount: raiseSize };
      }
      return { action: 'check' };
    }

    // Faced with a bet
    const potOdds = callCost / (pot + callCost);

    // Strong starting hand (pocket pair, Ace-high, King-high)
    const isStrong =
      isPair ||
      (highCard >= 12 && ranks[1] >= 9) ||
      (isSuited && highCard >= 10);

    if (isStrong) {
      // 25% chance to re-raise if healthy stack
      if (Math.random() < 0.25 && botPlayer.chips > callCost * 2) {
        const raiseSize = Math.min(
          botPlayer.chips,
          currentBet + Math.max(this.state.minRaise, Math.floor(pot * 0.5))
        );
        return { action: 'raise', amount: raiseSize };
      }
      return { action: 'call' };
    }

    // Medium hand
    const isMedium = highCard >= 10 || isSuited || ranks[1] >= 8;
    if (isMedium && potOdds <= 0.35 && callCost <= botPlayer.chips * 0.2) {
      return { action: 'call' };
    }

    // Cheap call
    if (callCost <= this.state.bigBlind && Math.random() < 0.6) {
      return { action: 'call' };
    }

    // Otherwise Fold
    return { action: 'fold' };
  }
}
