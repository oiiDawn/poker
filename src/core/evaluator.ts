import { Card, HandEvaluation } from '../types';
import { RANK_VALUES } from './deck';

export const HAND_RANKS = {
  HIGH_CARD: 1, ONE_PAIR: 2, TWO_PAIR: 3, THREE_OF_A_KIND: 4,
  STRAIGHT: 5, FLUSH: 6, FULL_HOUSE: 7, FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9, ROYAL_FLUSH: 10
};

export const HAND_NAMES: Record<number, string> = {
  [HAND_RANKS.HIGH_CARD]: 'High Card',
  [HAND_RANKS.ONE_PAIR]: 'One Pair',
  [HAND_RANKS.TWO_PAIR]: 'Two Pair',
  [HAND_RANKS.THREE_OF_A_KIND]: 'Three of a Kind',
  [HAND_RANKS.STRAIGHT]: 'Straight',
  [HAND_RANKS.FLUSH]: 'Flush',
  [HAND_RANKS.FULL_HOUSE]: 'Full House',
  [HAND_RANKS.FOUR_OF_A_KIND]: 'Four of a Kind',
  [HAND_RANKS.STRAIGHT_FLUSH]: 'Straight Flush',
  [HAND_RANKS.ROYAL_FLUSH]: 'Royal Flush'
};

function evaluateFive(cards: Card[]): HandEvaluation {
  const vals = cards.map(c => c.value).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const rankCounts: Record<number, number> = {};
  vals.forEach(v => rankCounts[v] = (rankCounts[v] || 0) + 1);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const uniqueVals = Object.keys(rankCounts).map(Number).sort((a, b) => {
    const countDiff = rankCounts[b] - rankCounts[a];
    if (countDiff !== 0) return countDiff;
    return b - a;
  });

  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = vals[0] - vals[4] === 4 && new Set(vals).size === 5;
  const isWheel = vals[0] === 14 && vals[1] === 5 && vals[2] === 4 && vals[3] === 3 && vals[4] === 2;

  if (isFlush && isStraight) {
    if (vals[0] === 14 && vals[1] === 13) {
      return { rank: HAND_RANKS.ROYAL_FLUSH, compareValues: vals, name: HAND_NAMES[HAND_RANKS.ROYAL_FLUSH] };
    }
    return { rank: HAND_RANKS.STRAIGHT_FLUSH, compareValues: isWheel ? [5, 4, 3, 2, 1] : vals, name: HAND_NAMES[HAND_RANKS.STRAIGHT_FLUSH] };
  }
  if (counts[0] === 4) {
    return { rank: HAND_RANKS.FOUR_OF_A_KIND, compareValues: uniqueVals, name: HAND_NAMES[HAND_RANKS.FOUR_OF_A_KIND] };
  }
  if (counts[0] === 3 && counts[1] === 2) {
    return { rank: HAND_RANKS.FULL_HOUSE, compareValues: uniqueVals, name: HAND_NAMES[HAND_RANKS.FULL_HOUSE] };
  }
  if (isFlush) {
    return { rank: HAND_RANKS.FLUSH, compareValues: vals, name: HAND_NAMES[HAND_RANKS.FLUSH] };
  }
  if (isStraight || isWheel) {
    return { rank: HAND_RANKS.STRAIGHT, compareValues: isWheel ? [5, 4, 3, 2, 1] : vals, name: HAND_NAMES[HAND_RANKS.STRAIGHT] };
  }
  if (counts[0] === 3) {
    return { rank: HAND_RANKS.THREE_OF_A_KIND, compareValues: uniqueVals, name: HAND_NAMES[HAND_RANKS.THREE_OF_A_KIND] };
  }
  if (counts[0] === 2 && counts[1] === 2) {
    return { rank: HAND_RANKS.TWO_PAIR, compareValues: uniqueVals, name: HAND_NAMES[HAND_RANKS.TWO_PAIR] };
  }
  if (counts[0] === 2) {
    return { rank: HAND_RANKS.ONE_PAIR, compareValues: uniqueVals, name: HAND_NAMES[HAND_RANKS.ONE_PAIR] };
  }
  return { rank: HAND_RANKS.HIGH_CARD, compareValues: vals, name: HAND_NAMES[HAND_RANKS.HIGH_CARD] };
}

export function evaluateHand(hole: Card[], community: Card[]): HandEvaluation {
  const all = [...hole, ...community];
  if (all.length < 5) return { rank: 0, compareValues: [], name: 'Incomplete' };

  let best: HandEvaluation = { rank: 0, compareValues: [], name: '' };

  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      for (let k = j + 1; k < all.length; k++) {
        for (let l = k + 1; l < all.length; l++) {
          for (let m = l + 1; m < all.length; m++) {
            const hand = [all[i], all[j], all[k], all[l], all[m]];
            const ev = evaluateFive(hand);
            if (ev.rank > best.rank || (ev.rank === best.rank && compareValues(ev.compareValues, best.compareValues) > 0)) {
              best = ev;
            }
          }
        }
      }
    }
  }
  return best;
}

function compareValues(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function compareHands(evalA: HandEvaluation, evalB: HandEvaluation): number {
  if (evalA.rank !== evalB.rank) return evalA.rank - evalB.rank;
  return compareValues(evalA.compareValues, evalB.compareValues);
}
