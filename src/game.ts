import { Player, Card, GameStage, GameConfig } from "./types";
import { createDeck, shuffle } from "./core/deck";
import { setupGame } from "./game/setup";
import { runBettingRound, BettingRoundContext } from "./game/betting";
import { runShowdown, awardPotToWinner } from "./game/showdown";
import { clearScreen, arrowMenu, colors } from "./ui/tui";
import { printTable, cardsStr, padToWidth } from "./ui/renderer";

const STREETS: { stage: GameStage; deal: number }[] = [
  { stage: "flop", deal: 3 },
  { stage: "turn", deal: 1 },
  { stage: "river", deal: 1 },
];

export class PokerGame {
  private players: Player[] = [];
  private dealerIndex: number = 0;
  private eventLog: string[] = [];
  private roundNumber: number = 0;
  private showWinProb: boolean = false;
  private config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  addEvent(msg: string): void {
    this.eventLog.push(msg);
    if (this.eventLog.length > 50) this.eventLog.shift();
  }

  getPot(): number {
    return this.players.reduce((sum, p) => sum + p.totalContributed, 0);
  }

  nextActiveFrom(startIndex: number): number {
    const n = this.players.length;
    for (let i = 1; i <= n; i++) {
      const idx = (startIndex + i) % n;
      if (this.players[idx].chips > 0 && !this.players[idx].folded) return idx;
    }
    return startIndex;
  }

  private buildBettingContext(
    stage: GameStage,
    community: Card[],
  ): BettingRoundContext {
    return {
      players: this.players,
      stage,
      community,
      bigBlind: this.config.bigBlind,
      getPot: () => this.getPot(),
      addEvent: (msg) => this.addEvent(msg),
      clearScreen,
      printTable,
      eventLog: this.eventLog,
      getShowWinProb: () => this.showWinProb,
      setShowWinProb: (v) => {
        this.showWinProb = v;
      },
      initialChips: this.config.initialChips,
      roundNumber: this.roundNumber,
      llmConfig: this.config.llmConfig,
    };
  }

  private getActivePlayers(): Player[] {
    return this.players.filter((p) => !p.folded);
  }

  private canBet(): number {
    return this.players.filter((p) => !p.folded && !p.allIn && p.chips > 0)
      .length;
  }

  private resolveFoldOut(winner: Player): void {
    awardPotToWinner(winner, this.getPot());
    this.addEvent(`${winner.name} wins pot ${this.getPot()}`);
  }

  private doShowdown(community: Card[]): void {
    const { outputLines } = runShowdown(this.players, community);
    clearScreen();
    printTable(
      "river",
      this.getPot(),
      community,
      this.players,
      this.eventLog,
      this.showWinProb,
      this.config.initialChips,
      outputLines,
    );
  }

  async playRound(): Promise<Card[]> {
    this.roundNumber++;
    this.eventLog = [];
    const deck = shuffle(createDeck());
    const community: Card[] = [];

    for (const p of this.players) {
      p.hand = [];
      p.folded = p.chips === 0;
      p.allIn = false;
      p.bet = 0;
      p.totalContributed = 0;
    }

    const isHeadsUp = this.players.filter((p) => p.chips > 0).length === 2;
    const smallBlind = this.config.smallBlind;
    const bigBlind = this.config.bigBlind;

    let sbIndex: number;
    let bbIndex: number;
    let preflopFirst: number;

    if (isHeadsUp) {
      sbIndex = this.dealerIndex;
      bbIndex = (this.dealerIndex + 1) % this.players.length;
      preflopFirst = sbIndex;
    } else {
      sbIndex = this.nextActiveFrom(this.dealerIndex);
      bbIndex = this.nextActiveFrom(sbIndex);
      preflopFirst = this.nextActiveFrom(bbIndex);
    }

    const sbPlayer = this.players[sbIndex];
    const bbPlayer = this.players[bbIndex];

    const sbAmount = Math.min(smallBlind, sbPlayer.chips);
    sbPlayer.chips -= sbAmount;
    sbPlayer.bet = sbAmount;
    sbPlayer.totalContributed = sbAmount;
    if (sbPlayer.chips === 0) sbPlayer.allIn = true;

    const bbAmount = Math.min(bigBlind, bbPlayer.chips);
    bbPlayer.chips -= bbAmount;
    bbPlayer.bet = bbAmount;
    bbPlayer.totalContributed = bbAmount;
    if (bbPlayer.chips === 0) bbPlayer.allIn = true;

    for (const p of this.players) {
      if (!p.folded) p.hand = [deck.pop()!, deck.pop()!];
    }

    const playerObj = this.players.find((p) => p.id === "player");
    this.addEvent(
      `${colors.bright}New Round${colors.reset}  Dealer: ${colors.cyan}${this.players[this.dealerIndex].name}${colors.reset}`,
    );
    this.addEvent(
      `Small blind: ${colors.cyan}${sbPlayer.name}${colors.reset}(${colors.yellow}${sbAmount}${colors.reset})  Big blind: ${colors.cyan}${bbPlayer.name}${colors.reset}(${colors.yellow}${bbAmount}${colors.reset})`,
    );
    if (playerObj && !playerObj.folded) {
      this.addEvent(`Your hand: ${cardsStr(playerObj.hand)}`);
    }

    const preflopCtx = this.buildBettingContext("preflop", community);
    let result = await runBettingRound(
      preflopFirst,
      bigBlind,
      bigBlind,
      bbPlayer.id,
      preflopCtx,
    );

    let active = this.getActivePlayers();
    if (active.length === 1) {
      this.resolveFoldOut(active[0]);
      return community;
    }

    const postflopFirst = this.nextActiveFrom(this.dealerIndex);

    for (const street of STREETS) {
      for (let i = 0; i < street.deal; i++) {
        community.push(deck.pop()!);
      }
      const streetName =
        street.stage === "flop"
          ? "Flop"
          : street.stage === "turn"
            ? "Turn"
            : "River";
      this.addEvent(
        `${colors.bright}${streetName}${colors.reset}  ──  ${cardsStr(community)}`,
      );

      active = this.getActivePlayers();
      if (active.length === 1) {
        this.resolveFoldOut(active[0]);
        return community;
      }

      if (this.canBet() === 0) {
        this.addEvent(
          `${colors.magenta}⚡ Remaining players all-in, revealing cards!${colors.reset}`,
        );
        while (community.length < 5) community.push(deck.pop()!);
        this.addEvent(`Community: ${cardsStr(community)}`);
        this.doShowdown(community);
        return community;
      }

      this.players.forEach((p) => (p.bet = 0));
      const streetCtx = this.buildBettingContext(street.stage, community);
      result = await runBettingRound(postflopFirst, 0, 0, null, streetCtx);

      active = this.getActivePlayers();
      if (active.length === 1) {
        this.resolveFoldOut(active[0]);
        return community;
      }
    }

    this.doShowdown(community);
    return community;
  }

  async run(): Promise<void> {
    this.players = await setupGame(this.config);

    while (true) {
      const active = this.players.filter((p) => p.chips > 0);
      if (active.length < 2) break;

      await this.playRound();

      for (const p of this.players) {
        if (p.chips === 0) {
          p.rebuys++;
          p.chips = this.config.initialChips;
          const nameColor = p.id === "player" ? colors.green : colors.cyan;
          this.addEvent(
            `${colors.yellow}${colors.bright}💰 ${nameColor}${p.name}${colors.reset}${colors.yellow}${colors.bright} is bankrupt! Adding ${this.config.initialChips} chips (Rebuy #${p.rebuys})${colors.reset}`,
          );
        }
      }

      const chipsStr = this.players
        .map((p) => {
          const nameColor = p.id === "player" ? colors.green : colors.cyan;
          const chipColor =
            p.chips > this.config.initialChips * 1.5
              ? colors.green
              : p.chips > this.config.initialChips * 0.5
                ? colors.yellow
                : colors.red;
          return `${nameColor}${p.name}${colors.reset}: ${chipColor}${p.chips}${colors.reset}`;
        })
        .join(" | ");
      this.addEvent(`💰 Chips — ${chipsStr}`);

      process.stdout.write("\n");
      const contIdx = await arrowMenu(
        ["Yes, continue", "No, quit"],
        "Continue next round?",
      );
      if (contIdx !== 0) break;

      do {
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
      } while (this.players[this.dealerIndex].chips === 0);
    }

    clearScreen();
    process.stdout.write("\n");
    const statsWidth = 39;
    const statsContentWidth = statsWidth - 2;
    const statsTopBar = `${colors.cyan}${colors.bright}╔${"═".repeat(statsContentWidth)}╗${colors.reset}`;
    const statsBotBar = `${colors.cyan}${colors.bright}╚${"═".repeat(statsContentWidth)}╝${colors.reset}`;
    const statsTitle = `  ${colors.yellow}📊 Game Statistics${colors.cyan}`;
    const statsTitleLine = `${colors.cyan}${colors.bright}║${colors.reset}${padToWidth(statsTitle, statsContentWidth)}${colors.cyan}${colors.bright}║${colors.reset}`;

    process.stdout.write(statsTopBar + "\n");
    process.stdout.write(statsTitleLine + "\n");
    process.stdout.write(statsBotBar + "\n\n");

    for (const p of this.players) {
      const totalInvested = this.config.initialChips * (1 + p.rebuys);
      const profit = p.chips - totalInvested;
      const profitStr = profit >= 0 ? `+${profit}` : `${profit}`;
      const emoji = profit > 0 ? "📈" : profit < 0 ? "📉" : "➖";
      const profitColor =
        profit > 0 ? colors.green : profit < 0 ? colors.red : colors.gray;
      const nameColor = p.id === "player" ? colors.green : colors.cyan;

      let statsLine = ` ${emoji} ${nameColor}${colors.bright}${p.name.padEnd(7)}${colors.reset}  Final: ${colors.yellow}${String(p.chips).padStart(5)}${colors.reset}  P/L: ${profitColor}${colors.bright}${profitStr}${colors.reset}`;
      if (p.rebuys > 0) {
        statsLine += `  ${colors.gray}(${p.rebuys} rebuy${p.rebuys > 1 ? "s" : ""})${colors.reset}`;
      }
      process.stdout.write(statsLine + "\n");
    }

    process.stdout.write(
      `\n${colors.cyan}${colors.bright}Thanks for playing! Goodbye 👋${colors.reset}\n`,
    );
  }

  getPlayers(): Player[] {
    return this.players;
  }
}
