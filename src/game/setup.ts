import {
  Player,
  AIPersonality,
  GameConfig,
  LLMConfig,
  LLMProvider,
} from "../types";
import { arrowMenu, colors, clearScreen } from "../ui/tui";
import { padToWidth } from "../ui/renderer";

const AI_NAMES = [
  "Alice",
  "Bob",
  "Carol",
  "Dave",
  "Frank",
  "Grace",
  "Henry",
  "Iris",
];
const AI_PERSONALITIES: AIPersonality[] = [
  "aggressive",
  "conservative",
  "bluffer",
  "calling_station",
];

export function renderWelcomeBanner(): void {
  const welcomeWidth = 39;
  const welcomeContentWidth = welcomeWidth - 2;
  const welcomeTopBar = `${colors.cyan}${colors.bright}╔${"═".repeat(welcomeContentWidth)}╗${colors.reset}`;
  const welcomeBotBar = `${colors.cyan}${colors.bright}╚${"═".repeat(welcomeContentWidth)}╝${colors.reset}`;
  const emptyLine = `${colors.cyan}${colors.bright}║${" ".repeat(welcomeContentWidth)}║${colors.reset}`;
  const welcomeText = `  ${colors.yellow}🃏  Welcome to Texas Hold'em!${colors.cyan}`;
  const welcomeLine = `${colors.cyan}${colors.bright}║${colors.reset}${padToWidth(welcomeText, welcomeContentWidth)}${colors.cyan}${colors.bright}║${colors.reset}`;

  process.stdout.write("\n");
  process.stdout.write(welcomeTopBar + "\n");
  process.stdout.write(emptyLine + "\n");
  process.stdout.write(welcomeLine + "\n");
  process.stdout.write(emptyLine + "\n");
  process.stdout.write(welcomeBotBar + "\n\n");
}

async function selectLLMConfig(): Promise<LLMConfig | undefined> {
  const providerIdx = await arrowMenu(
    ["Anthropic Claude", "OpenAI GPT", "Local model"],
    "Select LLM provider:",
  );
  const providers: LLMProvider[] = ["anthropic", "openai", "local"];
  const provider = providers[providerIdx];

  if (provider === "anthropic") {
    const apiKey =
      process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
    if (!apiKey) {
      process.stdout.write(" ⚠️  ANTHROPIC_API_KEY not set, using rule-based AI\n");
      return undefined;
    }
    return { provider, apiKey, baseUrl: process.env.ANTHROPIC_BASE_URL };
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      process.stdout.write(" ⚠️  OPENAI_API_KEY not set, using rule-based AI\n");
      return undefined;
    }
    return { provider, apiKey };
  }

  const baseUrl =
    process.env.LOCAL_MODEL_URL || "http://localhost:8080/completion";
  return { provider, apiKey: "", baseUrl };
}

export async function setupGame(config: GameConfig): Promise<Player[]> {
  clearScreen();
  renderWelcomeBanner();

  const modeIdx = await arrowMenu(["Rule-based AI", "LLM AI"], "Select mode:");
  const useLLM = modeIdx === 1;

  let llmConfig: LLMConfig | undefined;
  if (useLLM) {
    llmConfig = await selectLLMConfig();
    if (llmConfig) {
      config.llmConfig = llmConfig;
    }
  }

  const numAIIdx = await arrowMenu(
    ["1 opponent", "2 opponents", "3 opponents", "4 opponents"],
    "Number of AI opponents:",
  );
  const numAI = numAIIdx + 1;

  let roster: { name: string; personality: AIPersonality | "llm" }[];
  if (useLLM && llmConfig) {
    const llmNames = ["Eve", "Eve-2", "Eve-3", "Eve-4"];
    roster = llmNames
      .slice(0, numAI)
      .map((name) => ({ name, personality: "llm" as const }));
  } else {
    const shuffledNames = [...AI_NAMES]
      .sort(() => Math.random() - 0.5)
      .slice(0, numAI);
    const shuffledPersonalities = [...AI_PERSONALITIES].sort(
      () => Math.random() - 0.5,
    );
    roster = shuffledNames.map((name, i) => ({
      name,
      personality: shuffledPersonalities[i % shuffledPersonalities.length],
    }));
  }

  const players: Player[] = [
    {
      id: "player",
      name: "You",
      chips: config.initialChips,
      personality: null,
      hand: [],
      folded: false,
      allIn: false,
      bet: 0,
      totalContributed: 0,
      rebuys: 0,
    },
    ...roster.map((r, i) => ({
      id: `ai_${i}`,
      name: r.name,
      chips: config.initialChips,
      personality: r.personality,
      hand: [],
      folded: false,
      allIn: false,
      bet: 0,
      totalContributed: 0,
      rebuys: 0,
    })),
  ];

  const aiDesc = players
    .slice(1)
    .map((p) => `${colors.cyan}${p.name}${colors.reset}`)
    .join(", ");
  process.stdout.write(
    `\n${colors.bright}Opponents:${colors.reset} ${aiDesc}\n`,
  );
  process.stdout.write(
    `${colors.yellow}Rules: Small blind 10, Big blind 20, Dealer rotates each round${colors.reset}\n\n`,
  );

  return players;
}
