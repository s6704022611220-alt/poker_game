import { Card, HandEvaluation, HandRankCategory, Suit } from '../types/poker';

export const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

export const SUIT_NAMES_TH: Record<Suit, string> = {
  S: 'โพธิ์ดำ (Spades)',
  H: 'โพธิ์แดง (Hearts)',
  D: 'ข้าวหลามตัด (Diamonds)',
  C: 'ดอกจิก (Clubs)',
};

export function getRankLabel(rank: number): string {
  switch (rank) {
    case 14:
      return 'A';
    case 13:
      return 'K';
    case 12:
      return 'Q';
    case 11:
      return 'J';
    case 10:
      return '10';
    default:
      return rank.toString();
  }
}

// Generate all combinations of k elements from array
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = combinations(tail, k - 1).map((c) => [head, ...c]);
  const withoutHead = combinations(tail, k);
  return [...withHead, ...withoutHead];
}

// Evaluate exactly 5 cards
function evaluate5Cards(cards: Card[]): {
  category: HandRankCategory;
  categoryScore: number;
  kickerScores: number[];
  nameTh: string;
  nameEn: string;
} {
  // Sort descending by rank
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map((c) => c.rank);
  const suits = sorted.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // Check straight
  let isStraight = false;
  let straightHigh = 0;

  // Regular straight check
  if (
    ranks[0] - 1 === ranks[1] &&
    ranks[1] - 1 === ranks[2] &&
    ranks[2] - 1 === ranks[3] &&
    ranks[3] - 1 === ranks[4]
  ) {
    isStraight = true;
    straightHigh = ranks[0];
  } else if (
    ranks[0] === 14 &&
    ranks[1] === 5 &&
    ranks[2] === 4 &&
    ranks[3] === 3 &&
    ranks[4] === 2
  ) {
    // A-2-3-4-5 straight (Wheel)
    isStraight = true;
    straightHigh = 5;
  }

  // Count frequencies
  const counts: Record<number, number> = {};
  for (const r of ranks) {
    counts[r] = (counts[r] || 0) + 1;
  }

  const freqEntries = Object.entries(counts).map(([r, count]) => ({
    rank: Number(r),
    count,
  }));

  // Sort by count desc, then rank desc
  freqEntries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.rank - a.rank;
  });

  const primaryCounts = freqEntries.map((e) => e.count);
  const primaryRanks = freqEntries.map((e) => e.rank);

  // 1. Royal Flush / Straight Flush
  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return {
        category: 'ROYAL_FLUSH',
        categoryScore: 9,
        kickerScores: [14],
        nameTh: 'รอยัลสเตรทฟลัช (Royal Flush)',
        nameEn: 'Royal Flush',
      };
    }
    return {
      category: 'STRAIGHT_FLUSH',
      categoryScore: 8,
      kickerScores: [straightHigh],
      nameTh: `สเตรทฟลัช สูง ${getRankLabel(straightHigh)} (Straight Flush)`,
      nameEn: `Straight Flush, ${getRankLabel(straightHigh)} High`,
    };
  }

  // 2. Four of a kind
  if (primaryCounts[0] === 4) {
    return {
      category: 'FOUR_OF_A_KIND',
      categoryScore: 7,
      kickerScores: [primaryRanks[0], primaryRanks[1]],
      nameTh: `โฟร์การ์ด ${getRankLabel(primaryRanks[0])} (Four of a Kind)`,
      nameEn: `Four of a Kind, ${getRankLabel(primaryRanks[0])}s`,
    };
  }

  // 3. Full house
  if (primaryCounts[0] === 3 && primaryCounts[1] === 2) {
    return {
      category: 'FULL_HOUSE',
      categoryScore: 6,
      kickerScores: [primaryRanks[0], primaryRanks[1]],
      nameTh: `ฟูลเฮ้าส์ ตอง ${getRankLabel(primaryRanks[0])} คู่ ${getRankLabel(primaryRanks[1])} (Full House)`,
      nameEn: `Full House, ${getRankLabel(primaryRanks[0])}s full of ${getRankLabel(primaryRanks[1])}s`,
    };
  }

  // 4. Flush
  if (isFlush) {
    return {
      category: 'FLUSH',
      categoryScore: 5,
      kickerScores: ranks,
      nameTh: `ฟลัช / สี สูง ${getRankLabel(ranks[0])} (Flush)`,
      nameEn: `Flush, ${getRankLabel(ranks[0])} High`,
    };
  }

  // 5. Straight
  if (isStraight) {
    return {
      category: 'STRAIGHT',
      categoryScore: 4,
      kickerScores: [straightHigh],
      nameTh: `สเตรท / เรียง สูง ${getRankLabel(straightHigh)} (Straight)`,
      nameEn: `Straight, ${getRankLabel(straightHigh)} High`,
    };
  }

  // 6. Three of a kind
  if (primaryCounts[0] === 3) {
    return {
      category: 'THREE_OF_A_KIND',
      categoryScore: 3,
      kickerScores: [primaryRanks[0], primaryRanks[1], primaryRanks[2]],
      nameTh: `ตอง ${getRankLabel(primaryRanks[0])} (Three of a Kind)`,
      nameEn: `Three of a Kind, ${getRankLabel(primaryRanks[0])}s`,
    };
  }

  // 7. Two Pair
  if (primaryCounts[0] === 2 && primaryCounts[1] === 2) {
    const higherPair = Math.max(primaryRanks[0], primaryRanks[1]);
    const lowerPair = Math.min(primaryRanks[0], primaryRanks[1]);
    const kicker = primaryRanks[2];
    return {
      category: 'TWO_PAIR',
      categoryScore: 2,
      kickerScores: [higherPair, lowerPair, kicker],
      nameTh: `สองคู่ ${getRankLabel(higherPair)} และ ${getRankLabel(lowerPair)} (Two Pair)`,
      nameEn: `Two Pair, ${getRankLabel(higherPair)}s and ${getRankLabel(lowerPair)}s`,
    };
  }

  // 8. One Pair
  if (primaryCounts[0] === 2) {
    return {
      category: 'ONE_PAIR',
      categoryScore: 1,
      kickerScores: [primaryRanks[0], primaryRanks[1], primaryRanks[2], primaryRanks[3]],
      nameTh: `หนึ่งคู่ ${getRankLabel(primaryRanks[0])} (One Pair)`,
      nameEn: `One Pair of ${getRankLabel(primaryRanks[0])}s`,
    };
  }

  // 9. High card
  return {
    category: 'HIGH_CARD',
    categoryScore: 0,
    kickerScores: ranks,
    nameTh: `ไพ่สูง ${getRankLabel(ranks[0])} (High Card)`,
    nameEn: `High Card, ${getRankLabel(ranks[0])}`,
  };
}

// Compare two 5-card evaluations
export function compareEvaluations(
  a: { categoryScore: number; kickerScores: number[] },
  b: { categoryScore: number; kickerScores: number[] }
): number {
  if (a.categoryScore !== b.categoryScore) {
    return a.categoryScore - b.categoryScore;
  }
  for (let i = 0; i < Math.min(a.kickerScores.length, b.kickerScores.length); i++) {
    if (a.kickerScores[i] !== b.kickerScores[i]) {
      return a.kickerScores[i] - b.kickerScores[i];
    }
  }
  return 0;
}

// Evaluate best 5 cards from 5 to 7 cards (Hold'em: 2 hole + up to 5 community)
export function evaluateBestHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    // Partial evaluation if fewer than 5 cards
    const sorted = [...cards].sort((a, b) => b.rank - a.rank);
    // Check if hole cards are a pair
    const isPair = cards.length >= 2 && cards[0].rank === cards[1].rank;
    const cat: HandRankCategory = isPair ? 'ONE_PAIR' : 'HIGH_CARD';
    return {
      category: cat,
      categoryScore: isPair ? 1 : 0,
      kickerScores: sorted.map((c) => c.rank),
      nameTh: isPair
        ? `หนึ่งคู่ ${getRankLabel(cards[0].rank)} (Pocket Pair)`
        : `ไพ่สูง ${cards.length ? getRankLabel(sorted[0].rank) : '-'}`,
      nameEn: isPair
        ? `Pocket Pair of ${getRankLabel(cards[0].rank)}s`
        : `High Card ${cards.length ? getRankLabel(sorted[0].rank) : '-'}`,
      bestFiveCards: sorted,
    };
  }

  const all5CardCombos = combinations(cards, 5);
  let bestEval: ReturnType<typeof evaluate5Cards> | null = null;
  let bestCards: Card[] = all5CardCombos[0];

  for (const combo of all5CardCombos) {
    const currentEval = evaluate5Cards(combo);
    if (!bestEval || compareEvaluations(currentEval, bestEval) > 0) {
      bestEval = currentEval;
      bestCards = combo;
    }
  }

  return {
    category: bestEval!.category,
    categoryScore: bestEval!.categoryScore,
    kickerScores: bestEval!.kickerScores,
    nameTh: bestEval!.nameTh,
    nameEn: bestEval!.nameEn,
    bestFiveCards: [...bestCards].sort((a, b) => b.rank - a.rank),
  };
}

// Get clear descriptive string for player's current hand
export function getHandDescription(holeCards: (Card | null)[], communityCards: Card[]): string {
  const validHole = holeCards.filter((c): c is Card => c !== null);
  if (validHole.length < 2) return 'กำลังรอแจกไพ่...';

  const totalCards = [...validHole, ...communityCards];
  if (communityCards.length === 0) {
    // Pre-Flop description
    const sorted = [...validHole].sort((a, b) => b.rank - a.rank);
    if (sorted[0].rank === sorted[1].rank) {
      return `พ็อกเก็ตคู่ ${getRankLabel(sorted[0].rank)} (Pocket Pair)`;
    }
    const isSuited = sorted[0].suit === sorted[1].suit;
    const isConnected = sorted[0].rank - sorted[1].rank === 1;
    if (isSuited && isConnected) {
      return `ไพ่เรียงดอกเดียว ${getRankLabel(sorted[0].rank)}-${getRankLabel(sorted[1].rank)} (Suited Connector)`;
    }
    if (isSuited) {
      return `ไพ่ดอกเดียวกัน ${getRankLabel(sorted[0].rank)}-${getRankLabel(sorted[1].rank)} (Suited)`;
    }
    if (isConnected) {
      return `ไพ่เรียง ${getRankLabel(sorted[0].rank)}-${getRankLabel(sorted[1].rank)} (Connector)`;
    }
    return `ไพ่สูง ${getRankLabel(sorted[0].rank)} และ ${getRankLabel(sorted[1].rank)}`;
  }

  // Flop, Turn, River
  const evaluation = evaluateBestHand(totalCards);
  return evaluation.nameTh;
}

// Create a standard fresh 52-card deck
export function createDeck(): Card[] {
  const suits: Suit[] = ['S', 'H', 'D', 'C'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

// Fisher-Yates shuffle
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
