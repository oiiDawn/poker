import 'dotenv/config';
import { PokerGame } from './game';

async function main(): Promise<void> {
  const game = new PokerGame({
    aiMode: 'rule',
    numOpponents: 1,
    smallBlind: 10,
    bigBlind: 20,
    initialChips: 1000
  });

  await game.run();
  process.exit(0);
}

main().catch(err => {
  console.error('Game error:', err);
  process.exit(1);
});
