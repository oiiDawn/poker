// Core type definitions

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
  readonly value: number;
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  hand: Card[];
  folded: boolean;
  allIn: boolean;
  bet: number;
  totalContributed: number;
  rebuys: number;
  personality: AIPersonality | "llm" | null;
}

export type AIMode = "rule" | "llm";
export type AIPersonality =
  | "aggressive"
  | "conservative"
  | "bluffer"
  | "calling_station";
export type GameStage = "preflop" | "flop" | "turn" | "river";
export type Action = "fold" | "check" | "call" | "raise" | "allin";
export type LLMProvider = "anthropic" | "openai";

export interface HandEvaluation {
  rank: number;
  compareValues: number[];
  name: string;
}

export interface AIDecision {
  action: Action;
  amount?: number;
}

/** Betting round state for proper minimum raise tracking */
export interface BettingState {
  currentBet: number;
  lastRaiseSize: number;
  lastRaiserId: string | null;
  acted: Set<string>;
}

/** Result of showdown evaluation for a single player */
export interface ShowdownEntry {
  player: Player;
  handResult: HandEvaluation | null;
}

/** Full showdown result with evaluation map and formatted output lines */
export interface ShowdownResult {
  handResults: Map<string, HandEvaluation>;
  outputLines: string[];
}

export interface PersonalityModifiers {
  aggressionBonus: number;
  bluffRate: number;
  foldBias: number;
}

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string;
  modelName?: string;
}

export interface GameConfig {
  aiMode: AIMode;
  numOpponents: number;
  smallBlind: number;
  bigBlind: number;
  initialChips: number;
  llmConfig?: LLMConfig;
}
