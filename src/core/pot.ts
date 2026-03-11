import { Player } from '../types';

interface Pot {
  amount: number;
  eligible: Player[];
}

export function buildPots(players: Player[]): Pot[] {
  const contributors = players.filter(p => p.totalContributed > 0);
  const thresholds = [...new Set(contributors.map(p => p.totalContributed))].sort((a, b) => a - b);
  const pots: Pot[] = [];
  let prev = 0;

  for (const t of thresholds) {
    const amount = contributors.reduce(
      (sum, p) => sum + Math.min(p.totalContributed, t) - Math.min(p.totalContributed, prev),
      0
    );
    const eligible = players.filter(p => !p.folded && p.totalContributed >= t);
    if (amount > 0) pots.push({ amount, eligible });
    prev = t;
  }
  return pots;
}

export function distributePots(players: Player[], pots: Pot[]): void {
  for (const pot of pots) {
    const eligible = pot.eligible.filter(p => !p.folded);
    if (eligible.length === 0) continue;

    const share = Math.floor(pot.amount / eligible.length);
    eligible.forEach(p => p.chips += share);
  }
}
