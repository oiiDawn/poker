import { Card, HandEvaluation } from '../types';
import { RANK_VALUES } from '../core/deck';
import { evaluateHand, HAND_RANKS } from '../core/evaluator';

export const PREFLOP_STRENGTH: Record<string, number> = {
  'AA': 0.85, 'KK': 0.82, 'QQ': 0.80, 'JJ': 0.77, 'TT': 0.75,
  'AKs': 0.67, 'AQs': 0.66, 'AJs': 0.65, 'AKo': 0.65, 'KQs': 0.63,
  '99': 0.72, '88': 0.69, '77': 0.66, '66': 0.64, '55': 0.62,
  'ATs': 0.62, 'AQo': 0.63, 'KJs': 0.61, 'QJs': 0.60, 'JTs': 0.59,
};

export function getPreflopKey(holeCards: Card[]): string {
  const [c1, c2] = holeCards;
  const r1 = c1.rank === '10' ? 'T' : c1.rank;
  const r2 = c2.rank === '10' ? 'T' : c2.rank;
  const suited = c1.suit === c2.suit ? 's' : 'o';

  if (RANK_VALUES[c1.rank] >= RANK_VALUES[c2.rank]) {
    return r1 === r2 ? r1 + r2 : r1 + r2 + suited;
  } else {
    return r1 === r2 ? r1 + r2 : r2 + r1 + suited;
  }
}

export function calculateWinProbability(holeCards: Card[], community: Card[], numOpponents: number): number {
  if (community.length === 0) {
    const key = getPreflopKey(holeCards);
    const baseStrength = PREFLOP_STRENGTH[key] || estimateHandStrength(holeCards, []);
    return Math.max(0.1, baseStrength - (numOpponents - 1) * 0.08);
  }

  const myHand = evaluateHand(holeCards, community);
  const myRank = myHand.rank;

  let baseWinRate = 0;
  if (myRank >= HAND_RANKS.STRAIGHT_FLUSH) baseWinRate = 0.98;
  else if (myRank >= HAND_RANKS.FOUR_OF_A_KIND) baseWinRate = 0.95;
  else if (myRank >= HAND_RANKS.FULL_HOUSE) baseWinRate = 0.88;
  else if (myRank >= HAND_RANKS.FLUSH) baseWinRate = 0.75;
  else if (myRank >= HAND_RANKS.STRAIGHT) baseWinRate = 0.65;
  else if (myRank >= HAND_RANKS.THREE_OF_A_KIND) baseWinRate = 0.55;
  else if (myRank >= HAND_RANKS.TWO_PAIR) baseWinRate = 0.45;
  else if (myRank >= HAND_RANKS.ONE_PAIR) baseWinRate = 0.30;
  else baseWinRate = 0.15;

  const cardsToGo = 5 - community.length;
  const opponentFactor = Math.pow(0.94, numOpponents - 1);
  const uncertaintyFactor = 1 - (cardsToGo * 0.05);

  const finalOpponentFactor = myRank >= HAND_RANKS.FOUR_OF_A_KIND ?
    Math.max(opponentFactor, 0.95) : opponentFactor;

  return Math.max(0.05, Math.min(0.99, baseWinRate * finalOpponentFactor * uncertaintyFactor));
}

export function estimateHandStrength(holeCards: Card[], community: Card[]): number {
  if (community.length === 0) {
    const v1 = holeCards[0].value, v2 = holeCards[1].value;
    const paired = v1 === v2;
    const suited = holeCards[0].suit === holeCards[1].suit;
    const high = Math.max(v1, v2);
    const gap = Math.abs(v1 - v2);
    let score = high / 14 * 0.5;
    if (paired) score += 0.3;
    if (suited) score += 0.1;
    if (gap <= 2) score += 0.1;
    return Math.min(score, 1);
  }

  const result = evaluateHand(holeCards, community);
  const strengthMap: Record<number, [number, number]> = {
    [HAND_RANKS.HIGH_CARD]: [0.05, 0.15],
    [HAND_RANKS.ONE_PAIR]: [0.25, 0.35],
    [HAND_RANKS.TWO_PAIR]: [0.40, 0.50],
    [HAND_RANKS.THREE_OF_A_KIND]: [0.50, 0.60],
    [HAND_RANKS.STRAIGHT]: [0.60, 0.70],
    [HAND_RANKS.FLUSH]: [0.62, 0.72],
    [HAND_RANKS.FULL_HOUSE]: [0.72, 0.80],
    [HAND_RANKS.FOUR_OF_A_KIND]: [0.88, 0.95],
    [HAND_RANKS.STRAIGHT_FLUSH]: [0.92, 0.97],
    [HAND_RANKS.ROYAL_FLUSH]: [1.00, 1.00],
  };
  const [lo, hi] = strengthMap[result.rank] || [0.05, 0.15];
  const kickerNorm = (result.compareValues[0] || 2) / 14;
  return lo + (hi - lo) * kickerNorm;
}
