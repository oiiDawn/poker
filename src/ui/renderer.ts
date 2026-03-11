import { Player, Card, GameStage } from '../types';
import { colors } from './tui';
import { calculateWinProbability } from '../core/probability';

const stringWidth = require('string-width');

export function visibleLength(str: string): number {
  return stringWidth(str);
}

export function padToWidth(str: string, width: number): string {
  const visible = visibleLength(str);
  const padding = Math.max(0, width - visible);
  return str + ' '.repeat(padding);
}

export function padLeftToWidth(str: string, width: number): string {
  const visible = visibleLength(str);
  const padding = Math.max(0, width - visible);
  return ' '.repeat(padding) + str;
}

export function colorCard(card: Card): string {
  const isRed = card.suit === '♥' || card.suit === '♦';
  const color = isRed ? colors.red : colors.white;
  return `${color}${colors.bright}${card.rank}${card.suit}${colors.reset}`;
}

export function colorCards(cards: Card[]): string {
  return cards.map(colorCard).join('  ');
}

export function cardStr(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function cardsStr(cards: Card[]): string {
  return cards.map(cardStr).join(' ');
}

export function renderWinProbIndicator(winProb: number): string {
  const percentage = Math.round(winProb * 100);
  const barLength = 10;
  const filled = Math.round(winProb * barLength);

  let color;
  if (winProb >= 0.7) color = colors.green;
  else if (winProb >= 0.4) color = colors.yellow;
  else color = colors.red;

  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  return `${color}${bar} ${percentage}%${colors.reset}`;
}

export function printTable(
  stage: GameStage,
  pot: number,
  community: Card[],
  players: Player[],
  events: string[],
  showWinProb: boolean = false,
  initialChips: number = 1000,
  showdownResults: string[] = []
): void {
  const W = 80;
  const contentWidth = W - 2;
  const topBar = `╔${'═'.repeat(contentWidth)}╗`;
  const midBar = `╠${'═'.repeat(contentWidth)}╣`;
  const botBar = `╚${'═'.repeat(contentWidth)}╝`;
  const thinBar = `├${'─'.repeat(contentWidth)}┤`;

  process.stdout.write(topBar + '\n');

  const stageNames: Record<GameStage, string> = {
    preflop: 'Pre-flop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River'
  };
  const stageText = `${colors.cyan}${colors.bright}【${stageNames[stage]}】${colors.reset}`;
  const potText = `${colors.yellow}${colors.bright}Pot: ${pot}${colors.reset}`;
  const headerContent = ` ${stageText}   ${potText}`;
  process.stdout.write('║' + padToWidth(headerContent, contentWidth) + '║\n');

  const slots = Array(5).fill(null).map((_, i) => {
    if (community[i]) {
      return colorCard(community[i]);
    }
    return `${colors.dim}${colors.gray}??${colors.reset}`;
  });
  const communityContent = ` ${colors.bright}Community:${colors.reset}  ${slots.join('  ')}`;
  process.stdout.write('║' + padToWidth(communityContent, contentWidth) + '║\n');

  process.stdout.write(midBar + '\n');

  for (const p of players) {
    const nameColor = p.id === 'player' ? colors.green : colors.cyan;
    const name = `${nameColor}${colors.bright}${p.name}${colors.reset}`;
    const nameCol = padToWidth(name, 12);

    const chipsColor = p.chips > initialChips * 1.5 ? colors.green
      : p.chips > initialChips * 0.5 ? colors.yellow
      : colors.red;
    const chips = `${chipsColor}${p.chips}${colors.reset}`;
    const chipsCol = padLeftToWidth(chips, 10);

    let status = '';
    if (p.folded) {
      status = `${colors.red}[Folded]${colors.reset}`;
    } else if (p.allIn) {
      status = `${colors.magenta}${colors.bright}[All-in]${colors.reset}`;
    }
    const statusCol = padToWidth(status, 10);

    let hand = '';
    if (p.id === 'player' && !p.folded && p.hand.length) {
      hand = `${colors.bright}Hand:${colors.reset} ${colorCards(p.hand)}`;

      if (showWinProb) {
        const activeOpponents = players.filter(pp => pp.id !== 'player' && !pp.folded).length;
        const winProb = calculateWinProbability(p.hand, community, activeOpponents);
        hand += `  ${renderWinProbIndicator(winProb)}`;
      }
    }

    const playerContent = ` ${nameCol}  ${chipsCol}  ${statusCol}  ${hand}`;
    process.stdout.write('║' + padToWidth(playerContent, contentWidth) + '║\n');
  }

  // Showdown results section (if any)
  if (showdownResults.length > 0) {
    process.stdout.write(thinBar + '\n');
    const showdownHeaderContent = ` ${colors.yellow}${colors.bright}🏆 Showdown Results:${colors.reset}`;
    process.stdout.write('║' + padToWidth(showdownHeaderContent, contentWidth) + '║\n');
    for (const line of showdownResults) {
      const displayContent = ` ${line}`;
      process.stdout.write('║' + padToWidth(displayContent, contentWidth) + '║\n');
    }
  }

  // Recent actions section
  process.stdout.write(thinBar + '\n');
  const logHeaderContent = ` ${colors.bright}Recent Actions:${colors.reset}`;
  process.stdout.write('║' + padToWidth(logHeaderContent, contentWidth) + '║\n');
  const logDisplayCount = 6;
  const logLines = events.slice(-logDisplayCount);
  for (let i = 0; i < logDisplayCount; i++) {
    const line = logLines[i] || '';
    const displayContent = ` ${colors.gray}${line}${colors.reset}`;
    process.stdout.write('║' + padToWidth(displayContent, contentWidth) + '║\n');
  }

  process.stdout.write(botBar + '\n');
}
