import {
  Player,
  Card,
  GameStage,
  Action,
  AIDecision,
  AIPersonality,
  BettingState,
} from "../types";
import { colors } from "../ui/tui";
import { arrowMenu, readLine } from "../ui/tui";
import { printTable } from "../ui/renderer";
import { aiDecide } from "../ai/rule-based";
import { llmDecideWithFallback } from "../ai/llm";

export interface BettingRoundContext {
  players: Player[];
  stage: GameStage;
  community: Card[];
  bigBlind: number;
  getPot: () => number;
  addEvent: (msg: string) => void;
  clearScreen: () => void;
  printTable: (
    stage: GameStage,
    pot: number,
    community: Card[],
    players: Player[],
    events: string[],
    showWinProb: boolean,
    initialChips: number,
  ) => void;
  eventLog: string[];
  getShowWinProb: () => boolean;
  setShowWinProb: (v: boolean) => void;
  initialChips: number;
  roundNumber: number;
  llmConfig?: import("../types").LLMConfig;
  handActions: Map<string, Action[]>;
}

export function handleAction(
  player: Player,
  action: Action,
  amount: number,
  callAmount: number,
  addEvent: (msg: string) => void,
): void {
  const nameColor = player.id === "player" ? colors.green : colors.cyan;

  switch (action) {
    case "fold":
      player.folded = true;
      addEvent(
        ` ${nameColor}↳ ${player.name}${colors.reset}: ${colors.red}Fold 🗑️${colors.reset}`,
      );
      break;
    case "check":
      addEvent(
        ` ${nameColor}↳ ${player.name}${colors.reset}: ${colors.gray}Check ✋${colors.reset}`,
      );
      break;
    case "call": {
      const amt = Math.min(callAmount, player.chips);
      player.chips -= amt;
      player.bet += amt;
      player.totalContributed += amt;
      if (player.chips === 0) player.allIn = true;
      if (amt === 0) {
        addEvent(
          ` ${nameColor}↳ ${player.name}${colors.reset}: ${colors.gray}Check ✋${colors.reset}`,
        );
      } else {
        addEvent(
          ` ${nameColor}↳ ${player.name}${colors.reset}: ${colors.blue}Call ${amt} 📞${colors.reset}`,
        );
      }
      break;
    }
    case "raise": {
      const totalBet = callAmount + amount;
      const amt = Math.min(totalBet, player.chips);
      player.chips -= amt;
      player.bet += amt;
      player.totalContributed += amt;
      if (player.chips === 0) player.allIn = true;
      addEvent(
        ` ${nameColor}↳ ${player.name}${colors.reset}: ${colors.yellow}${colors.bright}Raise ${amount} 💰${colors.reset}`,
      );
      break;
    }
    case "allin": {
      const amt = player.chips;
      player.chips = 0;
      player.bet += amt;
      player.totalContributed += amt;
      player.allIn = true;
      addEvent(
        ` ${nameColor}↳ ${player.name}${colors.reset}: ${colors.yellow}${colors.bright}All-in ${amt} 💰${colors.reset}`,
      );
      break;
    }
  }
}

export async function playerAction(
  player: Player,
  callAmount: number,
  minRaise: number,
  stage: GameStage,
  ctx: BettingRoundContext,
): Promise<AIDecision> {
  ctx.clearScreen();
  ctx.printTable(
    ctx.stage,
    ctx.getPot(),
    ctx.community,
    ctx.players,
    ctx.eventLog,
    ctx.getShowWinProb(),
    ctx.initialChips,
  );

  let options: string[];

  if (callAmount > 0) {
    if (callAmount >= player.chips) {
      options = [
        "Fold",
        `Call  (${player.chips}) [All-in]`,
        `Toggle Win% ${ctx.getShowWinProb() ? "✓" : "✗"}`,
      ];
    } else {
      options = [
        "Fold",
        `Call  (${Math.min(callAmount, player.chips)})`,
        `Raise  (min ${minRaise})`,
        `All-in  (${player.chips})`,
        `Toggle Win% ${ctx.getShowWinProb() ? "✓" : "✗"}`,
      ];
    }
  } else {
    options = [
      "Check",
      `Raise  (min ${minRaise})`,
      `All-in  (${player.chips})`,
      `Toggle Win% ${ctx.getShowWinProb() ? "✓" : "✗"}`,
    ];
  }

  const idx = await arrowMenu(options);

  if (callAmount > 0) {
    if (callAmount >= player.chips) {
      if (idx === 0) return { action: "fold" };
      if (idx === 1) return { action: "call" };
      if (idx === 2) {
        ctx.setShowWinProb(!ctx.getShowWinProb());
        return playerAction(player, callAmount, minRaise, stage, ctx);
      }
    } else {
      if (idx === 0) return { action: "fold" };
      if (idx === 1) return { action: "call" };
      if (idx === 4) {
        ctx.setShowWinProb(!ctx.getShowWinProb());
        return playerAction(player, callAmount, minRaise, stage, ctx);
      }
      if (idx === 3) {
        const raiseAmount = player.chips - callAmount;
        return { action: "raise", amount: raiseAmount };
      }
    }
  } else {
    if (idx === 0) return { action: "check" };
    if (idx === 3) {
      ctx.setShowWinProb(!ctx.getShowWinProb());
      return playerAction(player, callAmount, minRaise, stage, ctx);
    }
    if (idx === 2) {
      if (player.chips <= 0) return { action: "check" };
      return { action: "raise", amount: player.chips };
    }
  }

  while (true) {
    const answer = await readLine(
      ` Raise amount (min ${minRaise}, you have ${player.chips}): `,
    );
    const amt = parseInt(answer, 10);
    if (
      !isNaN(amt) &&
      amt >= minRaise &&
      amt <= player.chips &&
      amt <= Number.MAX_SAFE_INTEGER
    ) {
      return { action: "raise", amount: amt };
    }
    process.stdout.write(" Invalid amount, please try again\n");
  }
}

async function aiAction(
  player: Player,
  community: Card[],
  callAmount: number,
  stage: GameStage,
  ctx: BettingRoundContext,
): Promise<AIDecision> {
  if (player.personality === "llm") {
    return await llmDecideWithFallback(
      player,
      community,
      ctx.getPot(),
      callAmount,
      ctx.players,
      (msg) => ctx.addEvent(msg),
      ctx.roundNumber,
      ctx.llmConfig,
    );
  }
  const personality = player.personality as AIPersonality;
  const myPreviousActions = ctx.handActions.get(player.id) || [];
  return aiDecide(
    player.hand,
    community,
    ctx.getPot(),
    callAmount,
    player.chips,
    personality,
    stage,
    ctx.roundNumber,
    myPreviousActions,
    player.totalContributed,
  );
}

export interface BettingRoundResult {
  onlyOneLeft: boolean;
  winner?: Player;
  pot: number;
}

export async function runBettingRound(
  startIdx: number,
  minBet: number,
  lastRaiseSize: number,
  lastRaiserId: string | null,
  ctx: BettingRoundContext,
): Promise<BettingRoundResult> {
  const state: BettingState = {
    currentBet: minBet,
    lastRaiseSize,
    lastRaiserId,
    acted: new Set(),
  };

  let idx = startIdx;

  while (true) {
    const player = ctx.players[idx];

    if (!player.folded && !player.allIn && player.chips > 0) {
      const callAmount = state.currentBet - player.bet;
      const minRaise = Math.max(state.lastRaiseSize, ctx.bigBlind);

      let decision: AIDecision;
      if (player.id === "player") {
        decision = await playerAction(
          player,
          callAmount,
          minRaise,
          ctx.stage,
          ctx,
        );
      } else {
        ctx.clearScreen();
        ctx.printTable(
          ctx.stage,
          ctx.getPot(),
          ctx.community,
          ctx.players,
          ctx.eventLog,
          ctx.getShowWinProb(),
          ctx.initialChips,
        );
        decision = await aiAction(
          player,
          ctx.community,
          callAmount,
          ctx.stage,
          ctx,
        );
      }

      handleAction(
        player,
        decision.action,
        decision.amount || 0,
        callAmount,
        ctx.addEvent,
      );

      // Record action for deviation calculation
      const playerActions = ctx.handActions.get(player.id) || [];
      playerActions.push(decision.action);
      ctx.handActions.set(player.id, playerActions);

      const raiseIncrement =
        decision.action === "raise"
          ? (decision.amount ?? 0)
          : decision.action === "allin"
            ? player.bet - state.currentBet
            : 0;
      if (
        (decision.action === "raise" || decision.action === "allin") &&
        raiseIncrement >= minRaise
      ) {
        state.currentBet = Math.max(state.currentBet, player.bet);
        state.lastRaiseSize = raiseIncrement;
        state.lastRaiserId = player.id;
        state.acted.clear();
      }
      state.acted.add(player.id);
    }

    const active = ctx.players.filter((p) => !p.folded);
    if (active.length === 1) {
      return { onlyOneLeft: true, winner: active[0], pot: ctx.getPot() };
    }

    idx = (idx + 1) % ctx.players.length;

    const canAct = ctx.players.filter(
      (p) => !p.folded && !p.allIn && p.chips > 0,
    );
    if (canAct.length === 0) break;

    // If only one player can act and they've matched the bet, end betting
    if (canAct.length === 1) {
      const player = canAct[0];
      if (player.bet >= state.currentBet) {
        break;
      }
    }

    const allMatched = canAct.every((p) => p.bet === state.currentBet);
    const allActed = canAct.every((p) => state.acted.has(p.id));
    if (allMatched && allActed) break;
  }

  return { onlyOneLeft: false, pot: ctx.getPot() };
}
