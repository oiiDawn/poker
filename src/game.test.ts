import { PokerGame } from "./game";
import { Card, Player } from "./types";

const mockRunBettingRound = jest.fn();
const mockPrintTable = jest.fn();
const mockClearScreen = jest.fn();

jest.mock("./game/betting", () => ({
  runBettingRound: (...args: unknown[]) => mockRunBettingRound(...args),
}));

jest.mock("./ui/renderer", () => ({
  printTable: (...args: unknown[]) => mockPrintTable(...args),
  cardsStr: (cards: Card[]) => cards.map((c) => `${c.rank}${c.suit}`).join(" "),
  padToWidth: (str: string) => str,
}));

jest.mock("./ui/tui", () => ({
  clearScreen: () => mockClearScreen(),
  arrowMenu: jest.fn(),
  colors: {
    reset: "",
    bright: "",
    dim: "",
    red: "",
    green: "",
    yellow: "",
    blue: "",
    magenta: "",
    cyan: "",
    white: "",
    gray: "",
  },
}));

jest.mock("./core/deck", () => {
  const makeCard = (value: number): Card => ({
    suit: "♠",
    rank: "A",
    value,
  });

  const deck = Array.from({ length: 20 }, (_, i) => makeCard(i + 1));

  return {
    createDeck: () => deck.slice(),
    shuffle: (cards: Card[]) => cards.slice(),
  };
});

function makePlayers(): Player[] {
  return [
    {
      id: "player",
      name: "You",
      chips: 1000,
      hand: [],
      folded: false,
      allIn: false,
      bet: 0,
      totalContributed: 0,
      rebuys: 0,
      personality: null,
    },
    {
      id: "ai1",
      name: "Bot1",
      chips: 1000,
      hand: [],
      folded: false,
      allIn: false,
      bet: 0,
      totalContributed: 0,
      rebuys: 0,
      personality: "aggressive",
    },
  ];
}

describe("PokerGame round result rendering", () => {
  beforeEach(() => {
    mockRunBettingRound.mockReset();
    mockPrintTable.mockReset();
    mockClearScreen.mockReset();
  });

  it("shows final result panel when round ends by fold on river", async () => {
    const game = new PokerGame({
      aiMode: "rule",
      numOpponents: 1,
      smallBlind: 10,
      bigBlind: 20,
      initialChips: 1000,
    });

    const players = makePlayers();
    (game as any).players = players;

    let callCount = 0;
    mockRunBettingRound.mockImplementation(async () => {
      callCount += 1;
      if (callCount === 4) {
        players[1].folded = true;
        return { onlyOneLeft: true, winner: players[0], pot: 30 };
      }
      return { onlyOneLeft: false, pot: 30 };
    });

    await game.playRound();

    expect(players[0].chips).toBe(1020);
    expect(mockPrintTable).toHaveBeenCalledTimes(1);
    const lastCallArgs = mockPrintTable.mock.calls[0];
    const showdownLines = lastCallArgs[7] as string[];
    expect(showdownLines.join(" ")).toContain("wins by fold");
  });
});
