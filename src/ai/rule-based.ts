import { Card, AIDecision, AIPersonality, PersonalityModifiers, GameStage, Action } from '../types';
import { evaluateHand, HAND_RANKS } from '../core/evaluator';
import { estimateHandStrength } from '../core/probability';

const PERSONALITY_MODIFIERS: Record<AIPersonality, PersonalityModifiers> = {
  aggressive: { aggressionBonus: 0.25, foldBias: -0.15 },
  conservative: { aggressionBonus: -0.25, foldBias: 0.25 },
  bluffer: { aggressionBonus: 0.20, foldBias: -0.10 },
  calling_station: { aggressionBonus: -0.30, foldBias: -0.20 }
};

// ponytail: deviation config - simple arrays, no abstractions
const BASE_DEVIATION_RATE: Record<AIPersonality, number> = {
  aggressive: 0.05,
  conservative: 0.03,
  bluffer: 0.10,
  calling_station: 0.07
};

const STAGE_MULTIPLIER: Record<GameStage, number> = {
  preflop: 0.7,
  flop: 1.0,
  turn: 1.0,
  river: 1.3
};

// 0=inertia (aggressive→坚定), 1=compensation (aggressive→偏离), 2=sunk_cost (投入→坚定)
const DEVIATION_MODE: Record<AIPersonality, 0 | 1 | 2> = {
  aggressive: 0,
  conservative: 1,
  bluffer: 0,
  calling_station: 2
};

const ACTION_AGGRESSION: Record<Action, number> = {
  fold: 0, check: 1, call: 2, raise: 3, allin: 4
};

const ALL_ACTIONS: Action[] = ['fold', 'check', 'call', 'raise', 'allin'];

function rationalDecide(
  aiHand: Card[],
  community: Card[],
  pot: number,
  callAmount: number,
  aiChips: number,
  personality: AIPersonality,
  stage: GameStage,
  roundNumber: number
): AIDecision {
  const mod = PERSONALITY_MODIFIERS[personality];
  const handStrength = estimateHandStrength(aiHand, community);
  const isPreflop = community.length === 0;

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
  const slowPlay = isNutHand && Math.random() < 0.35 && !isShortStack;

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
    if (handStrength + raiseBonus > raiseThreshold) {
      return { action: 'raise', amount: calcRaiseAmount(handStrength) };
    }
    return { action: 'check' };
  }

  if (slowPlay) return { action: 'call' };

  const callThreshold = 0.25 - (0.15 * (1 - potOdds)) + mod.foldBias;

  if (handStrength + raiseBonus > raiseThreshold) {
    return { action: 'raise', amount: calcRaiseAmount(handStrength) };
  }
  if (handStrength > callThreshold) {
    return { action: 'call' };
  }
  if (potOdds < 0.15 && handStrength > 0.15) {
    return { action: 'call' };
  }
  return { action: 'fold' };
}

export function aiDecide(
  aiHand: Card[],
  community: Card[],
  pot: number,
  callAmount: number,
  aiChips: number,
  personality: AIPersonality,
  stage: GameStage,
  roundNumber: number = 1,
  myPreviousActions: Action[] = [],
  myTotalBet: number = 0
): AIDecision {
  const rationalDecision = rationalDecide(aiHand, community, pot, callAmount, aiChips, personality, stage, roundNumber);

  // Calculate deviation rate (inline, no separate function)
  let deviationRate = BASE_DEVIATION_RATE[personality] * STAGE_MULTIPLIER[stage];
  if (myPreviousActions.length > 0) {
    const avgAggression = myPreviousActions.reduce((s, a) => s + ACTION_AGGRESSION[a], 0) / myPreviousActions.length / 4;
    const mode = DEVIATION_MODE[personality];
    deviationRate *= mode === 0 ? (1 - avgAggression * 0.5)  // inertia
                   : mode === 1 ? (1 + avgAggression * 0.5)  // compensation
                   : (1 - Math.min(myTotalBet / Math.max(pot, 1), 0.5)); // sunk_cost
  }

  // Roll for deviation
  if (Math.random() >= deviationRate) return rationalDecision;

  // Get legal actions, exclude rational and unreasonable
  const handStrength = estimateHandStrength(aiHand, community);
  const candidates = ALL_ACTIONS.filter(a =>
    a !== rationalDecision.action &&
    !(a === 'check' && callAmount > 0) &&
    !(a === 'call' && callAmount === 0) &&
    !(a === 'raise' && aiChips <= callAmount) &&
    !(a === 'allin' && aiChips <= 0) &&
    !(handStrength < 0.3 && a === 'raise') &&
    !(handStrength > 0.7 && a === 'fold')
  );

  if (candidates.length === 0) return rationalDecision;

  // Uniform random pick (ponytail: weighted selection not worth complexity for 2-4 options)
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  return target === 'raise'
    ? { action: 'raise', amount: Math.min(Math.max(20, Math.floor(pot * 0.5)), aiChips) }
    : { action: target };
}
