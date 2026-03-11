import { Card, AIDecision, AIPersonality, PersonalityModifiers, GameStage } from '../types';
import { evaluateHand, HAND_RANKS } from '../core/evaluator';

const PERSONALITY_MODIFIERS: Record<AIPersonality, PersonalityModifiers> = {
  aggressive: { aggressionBonus: 0.12, bluffRate: 0.22, foldBias: -0.08 },
  conservative: { aggressionBonus: -0.18, bluffRate: 0.04, foldBias: 0.18 },
  bluffer: { aggressionBonus: 0.08, bluffRate: 0.35, foldBias: -0.03 },
  calling_station: { aggressionBonus: -0.22, bluffRate: 0.03, foldBias: -0.18 }
};

function estimateHandStrength(aiHand: Card[], community: Card[]): number {
  if (community.length === 0) {
    const v1 = aiHand[0].value, v2 = aiHand[1].value;
    const paired = v1 === v2;
    const suited = aiHand[0].suit === aiHand[1].suit;
    const high = Math.max(v1, v2);
    const gap = Math.abs(v1 - v2);
    let score = high / 14 * 0.5;
    if (paired) score += 0.3;
    if (suited) score += 0.1;
    if (gap <= 2) score += 0.1;
    return Math.min(score, 1);
  }

  const result = evaluateHand(aiHand, community);
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

export function aiDecide(
  aiHand: Card[],
  community: Card[],
  pot: number,
  callAmount: number,
  aiChips: number,
  personality: AIPersonality,
  stage: GameStage,
  roundNumber: number = 1
): AIDecision {
  const mod = PERSONALITY_MODIFIERS[personality];
  const handStrength = estimateHandStrength(aiHand, community);
  const isPreflop = community.length === 0;
  const rand = Math.random();

  const effectivePot = Math.max(pot, 1);
  const spr = aiChips / effectivePot;
  const isShortStack = spr < 3;
  const isDeepStack = spr > 10;

  function calcRaiseAmount(strengthMultiplier: number = 1.0): number {
    const potMultiplier = isPreflop ? (0.3 + strengthMultiplier * 0.5) : (0.5 + strengthMultiplier * 1.0);
    const base = Math.max(20, Math.floor(pot * potMultiplier));
    const jitter = 1 + (Math.random() * 0.3 - 0.15);
    const chipCap = isDeepStack ? 0.25 : isShortStack ? 0.75 : 0.40;
    return Math.min(Math.floor(base * jitter), Math.floor(aiChips * chipCap));
  }

  const potOdds = callAmount > 0 ? callAmount / (pot + callAmount) : 0;
  const result = community.length > 0 ? evaluateHand(aiHand, community) : null;
  const isNutHand = result && result.rank >= HAND_RANKS.FOUR_OF_A_KIND;
  const slowPlay = isNutHand && rand < 0.35 && !isShortStack;
  const isBluffing = handStrength < 0.3 && rand < mod.bluffRate && !isShortStack;
  const effectiveStrength = isBluffing ? 0.65 : handStrength;

  if (isShortStack) {
    const commitThreshold = 0.45 + mod.foldBias;
    if (handStrength > commitThreshold) return { action: 'raise', amount: aiChips };
    if (callAmount === 0) return { action: 'check' };
    if (handStrength > commitThreshold - 0.15 && potOdds < 0.4) return { action: 'call' };
    return { action: 'fold' };
  }

  const roundFactor = Math.min(1.0, (roundNumber - 1) / 10);
  const baseAllInChance = 0.08 + mod.aggressionBonus * 0.3;
  const allInChance = Math.max(0, baseAllInChance * roundFactor);

  if (!isPreflop && !isDeepStack && handStrength > 0.92 && Math.random() < allInChance) {
    return { action: 'raise', amount: aiChips };
  }

  const raiseThreshold = isPreflop ? (isDeepStack ? 0.78 : 0.72) : (isDeepStack ? 0.68 : 0.58);
  const raiseBonus = isPreflop ? mod.aggressionBonus * 0.3 : mod.aggressionBonus;

  if (callAmount === 0) {
    if (slowPlay) return { action: 'check' };
    if (effectiveStrength + raiseBonus > raiseThreshold) {
      return { action: 'raise', amount: calcRaiseAmount(effectiveStrength) };
    }
    return { action: 'check' };
  }

  if (slowPlay) return { action: 'call' };

  const callThreshold = 0.25 - (0.15 * (1 - potOdds)) + mod.foldBias;

  if (effectiveStrength + raiseBonus > raiseThreshold) {
    return { action: 'raise', amount: calcRaiseAmount(effectiveStrength) };
  }
  if (effectiveStrength > callThreshold) {
    return { action: 'call' };
  }
  if (potOdds < 0.15 && effectiveStrength > 0.15) {
    return { action: 'call' };
  }
  return { action: 'fold' };
}
