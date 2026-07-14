import { Player, Card, HandEvaluation, ShowdownResult } from "../types";
import { evaluateHand, compareHands } from "../core/evaluator";
import { buildPots, Pot } from "../core/pot";
import { cardsStr } from "../ui/renderer";
import { colors } from "../ui/tui";

export function runShowdown(
  players: Player[],
  community: Card[],
): ShowdownResult {
  const handResults = new Map<string, HandEvaluation>();
  const outputLines: string[] = [];

  const activePlayers = players.filter((p) => !p.folded);

  outputLines.push(`${colors.bright}══ Showdown ══${colors.reset}`);
  if (community.length > 0) {
    outputLines.push(`Community: ${cardsStr(community)}`);
  }

  for (const p of activePlayers) {
    const nameColor = p.id === "player" ? colors.green : colors.cyan;
    if (p.hand.length === 0) {
      outputLines.push(
        ` ${nameColor}${p.name.padEnd(7)}${colors.reset}  ${colors.red}[ERROR: No hand]${colors.reset}`,
      );
      continue;
    }

    if (community.length >= 3) {
      const handResult = evaluateHand(p.hand, community);
      handResults.set(p.id, handResult);
      outputLines.push(
        ` ${nameColor}${p.name.padEnd(7)}${colors.reset}  ${cardsStr(p.hand)}  →  ${colors.yellow}${handResult.name}${colors.reset}`,
      );
    } else {
      outputLines.push(
        ` ${nameColor}${p.name.padEnd(7)}${colors.reset}  ${cardsStr(p.hand)}`,
      );
    }
  }

  const pots: Pot[] = buildPots(players);

  for (let i = 0; i < pots.length; i++) {
    const { amount, eligible } = pots[i];
    const withHands = eligible.filter((p) => handResults.has(p.id));
    const potLabel = i === 0 ? "Main pot" : `Side pot ${i}`;

    if (withHands.length === 0) {
      const share = Math.floor(amount / eligible.length);
      const rem = amount - share * eligible.length;
      eligible.forEach((p, idx) => {
        p.chips += share + (idx === 0 ? rem : 0);
      });
      outputLines.push(
        `🤝 ${potLabel} ${colors.yellow}${amount}${colors.reset} split: ${eligible.map((p) => p.name).join(", ")}`,
      );
      continue;
    }

    let bestResult: HandEvaluation | null = null;
    const winners: Player[] = [];
    for (const p of withHands) {
      const result = handResults.get(p.id)!;
      const cmp = bestResult ? compareHands(result, bestResult) : 1;
      if (cmp > 0) {
        bestResult = result;
        winners.length = 0;
        winners.push(p);
      } else if (cmp === 0) {
        winners.push(p);
      }
    }

    const share = Math.floor(amount / winners.length);
    const rem = amount - share * winners.length;
    winners.forEach((p, idx) => {
      p.chips += share + (idx === 0 ? rem : 0);
    });

    if (winners.length === 1 && bestResult) {
      const nameColor = winners[0].id === "player" ? colors.green : colors.cyan;
      outputLines.push(
        `🏆 ${potLabel} ${colors.yellow}${amount}${colors.reset} → ${nameColor}${winners[0].name}${colors.reset} (${bestResult.name})`,
      );
    } else if (bestResult) {
      outputLines.push(
        `🤝 ${potLabel} ${colors.yellow}${amount}${colors.reset} split: ${winners.map((p) => p.name).join(", ")} (${bestResult.name})`,
      );
    }
  }

  return { handResults, outputLines };
}

/** Award entire pot to winner when all others have folded (no showdown). */
export function awardPotToWinner(winner: Player, pot: number): void {
  winner.chips += pot;
}
