# CLAUDE.md

This file provides guidance for Claude Code when working with this Texas Hold'em Poker game project.

## Overview

A single-player terminal-based Texas Hold'em poker game where the player competes against 1-4 AI opponents. Features a full-screen TUI with arrow-key navigation, dual AI modes (rule-based personalities and LLM-powered), and complete poker hand evaluation.

**Key Features**:
- Full-screen TUI with in-place screen refresh (no scrolling)
- Arrow-key menu navigation with Enter to confirm
- Rule-based AI with 4 personalities (aggressive, conservative, bluffer, calling_station)
- Multi-provider LLM AI: Anthropic Claude or OpenAI GPT
- Rolling event log showing last 6 game actions
- Complete poker rules: blinds, betting rounds, side pots, showdown
- **TypeScript with modular architecture**

## Project Structure

```
poker/
├── src/
│   ├── types.ts              # Core type definitions
│   ├── game/
│   │   ├── setup.ts          # Player init, welcome UI, LLM config
│   │   ├── betting.ts        # Betting round, handleAction, playerAction
│   │   └── showdown.ts       # Hand evaluation, pot distribution
│   ├── core/
│   │   ├── deck.ts           # Deck operations
│   │   ├── evaluator.ts      # Hand evaluation
│   │   ├── pot.ts            # Pot calculation
│   │   └── probability.ts    # Win probability (Monte Carlo)
│   ├── ai/
│   │   ├── rule-based.ts     # Rule-based AI
│   │   └── llm.ts            # LLM AI with fallback
│   ├── ui/
│   │   ├── tui.ts            # Terminal primitives
│   │   └── renderer.ts       # Game state rendering
│   ├── game.ts               # PokerGame orchestrator (~300 lines)
│   └── index.ts              # Entry point
├── dist/                     # Compiled JavaScript
├── tsconfig.json             # TypeScript configuration
├── package.json              # Dependencies & scripts
└── .env                      # Environment configuration
```

## Setup & Installation

### Prerequisites
- Node.js 16+ (uses CommonJS)
- Windows Terminal or terminal with ANSI support
- API keys (optional, for LLM mode):
  - Anthropic API key for Claude
  - OpenAI API key for GPT

### Installation
```bash
npm install
```

### Configuration
Create `.env` file:
```env
# Anthropic Configuration
ANTHROPIC_API_KEY=your_api_key_here
# ANTHROPIC_AUTH_TOKEN=alternative_auth
# ANTHROPIC_BASE_URL=custom_endpoint
ANTHROPIC_MODEL=claude-haiku-4-5-20251001

# OpenAI Configuration
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-4o-mini
```

### Running
```bash
# Development (no build needed)
npm run dev

# Production
npm run build
npm start

# Type checking only
npm run type-check
```

## Architecture

### Module Organization

**Core Logic** (`src/core/`):
- `deck.ts` - Pure functions for deck creation and shuffling
- `evaluator.ts` - Hand evaluation and comparison (no side effects)
- `pot.ts` - Side pot calculation and distribution

**AI Modules** (`src/ai/`):
- `rule-based.ts` - Personality-based decision making
- `llm.ts` - Multi-provider LLM integration (Anthropic, OpenAI, local) with fallback

**UI Layer** (`src/ui/`):
- `tui.ts` - Terminal primitives (clearScreen, arrowMenu, readLine)
- `renderer.ts` - Game state rendering (printTable, formatCard)

**Game Orchestration** (`src/game.ts` + `src/game/`):
- `PokerGame` class coordinates all modules
- `game/setup.ts` - Player initialization, LLM config selection
- `game/betting.ts` - Betting rounds with lastRaiseSize tracking, heads-up support
- `game/showdown.ts` - Hand evaluation, pot distribution, awardPotToWinner
- No business logic in orchestrator - delegates to game/core/ai modules

### Type System

All types defined in `src/types.ts`:
- `Card`, `Player`, `HandEvaluation` - Core data structures
- `AIMode`, `AIPersonality`, `GameStage`, `Action`, `LLMProvider` - Enums
- `LLMConfig` - LLM provider configuration (provider, apiKey, baseUrl, modelName)
- `GameConfig` - Configuration object (includes optional llmConfig)
- `BettingState` - Tracks currentBet, lastRaiseSize, lastRaiserId, acted
- `ShowdownResult` - handResults Map + outputLines for display
- All types are immutable where possible (readonly)

### Poker Rules (Strict)

- **Heads-up (2 players)**: Dealer posts SB, acts first preflop, last postflop
- **Minimum raise**: Re-raise must be at least the size of the last raise increment (or big blind)
- **AI stage**: Rule-based AI receives actual GameStage (preflop/flop/turn/river)

### Game Flow
1. **Setup**: Choose AI mode, select LLM provider (if LLM mode), select number of opponents
2. **Round Loop**: Deal cards → Betting rounds → Showdown
3. **Betting Round**: Players act in turn, handle raises/folds
4. **Showdown**: Evaluate hands, distribute pots
5. **Continue**: Prompt to play next round or exit

### AI Decision-Making

**Rule-Based AI** (`aiDecide` in `src/ai/rule-based.ts`):
- Estimates hand strength based on hole cards and community cards
- Considers pot odds and stack-to-pot ratio
- Applies personality modifiers (aggression, bluff rate, fold bias)

**LLM-Powered AI** (`llmDecideWithFallback` in `src/ai/llm.ts`):
- Supports 2 providers: Anthropic Claude, OpenAI GPT
- Builds structured prompt with game state
- Routes to provider-specific API based on configuration
- Model name is configurable via `ANTHROPIC_MODEL` and `OPENAI_MODEL` env vars
- Parses response format: `ACTION: fold|check|call|raise N|allin`
- Falls back to rule-based AI on errors

### TUI System

**Primitives** (`src/ui/tui.ts`): `clearScreen`, `arrowMenu`, `readLine`, `colors`.

**Rendering** (`src/ui/renderer.ts`): `printTable(stage, pot, community, players, events, showWinProb?, initialChips?, showdownResults?)` — optional `showdownResults` displays a “Showdown Results” or “Round Result” block; player hand can show optional Win% bar when `showWinProb` is true.

**Screen Layout** (80‑char width, box-drawing; line count varies with player count and result block):
```
╔══════════════════════════════════════════════════════════════════════════════╗
║ 【Pre-flop】   Pot: 340                                                      ║
║ Community:  A♠   K♥   7♦    ??   ??                                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Player       Chips   [Status]   Hand: ...  [optional Win% bar]               ║
║ ...                                                                          ║
║ ├──────────────────────────────────────────────────────────────────────────┤
║ 🏆 Showdown Results:   (or ══ Round Result ══ when someone wins by fold)   ║
║   ... result lines ...                                                       ║
║ ├──────────────────────────────────────────────────────────────────────────┤
║ Recent Actions:                                                              ║
║   ↳ Event 1                                                                 ║
║   ...                                                                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

 Action Menu (arrow keys + Enter)
```

- **Showdown**: After river betting, `doShowdown()` clears screen and calls `printTable(..., outputLines)` with showdown hand names and pot winners.
- **Fold-out**: When all but one fold, `resolveFoldOut()` clears screen and calls `printTable(..., outputLines)` with “Round Result” and “wins by fold” so the final state is always visible before “Continue next round?”.

**Interaction Pattern**:
1. `clearScreen()` — Clear terminal
2. `printTable(...)` — Render game state (and optional result block)
3. `arrowMenu()` — Show options, capture input
4. `readLine()` — For numeric input (e.g. raise amounts)

## Code Guidelines

### Type Safety
- All functions have explicit type annotations
- No `any` types allowed
- Use `readonly` for immutable data (Card objects)
- Strict TypeScript mode enabled

### Immutability
- Card objects are immutable (readonly properties)
- Deck operations return new arrays (shuffle creates copy)
- Player state is mutated during rounds (chips, bets, folded status)

### Error Handling
- LLM API errors: Catch and fall back to rule-based AI
- Invalid user input: Loop until valid (raise amounts, menu selections)
- Stdin state: Ensure raw mode is properly restored

### Module Dependencies
- Core modules have no dependencies on AI or UI
- AI modules depend only on core and types
- UI modules are independent
- Game class orchestrates all modules

## Modification Guidelines

### Adding New Features
- **New AI personality**: Add to `PERSONALITY_MODIFIERS` in `src/ai/rule-based.ts`
- **New hand type**: Update `HAND_RANKS`, `HAND_NAMES`, and `evaluateFive()` in `src/core/evaluator.ts`
- **UI changes**: Modify `printTable()` in `src/ui/renderer.ts`
- **New menu options**: Add to `arrowMenu()` calls in `src/game.ts` or `src/game/setup.ts`

### Code Style
- Use English for all UI text and user-facing messages
- Use English for code identifiers (variables, functions)
- Keep functions focused: <50 lines preferred
- Use descriptive names: `runBettingRound()`, `playerAction()`, `runShowdown()`

### Testing
After changes:
1. Run `npm run type-check` to verify types
2. Run `npm run build` to compile
3. Test with `npm run dev` for quick iteration
4. Manual test scenarios: basic gameplay, all-in, LLM mode, edge cases

---

**Last Updated**: 2026-03-11
**Version**: 2.0.0 (TypeScript)
**Primary Language**: TypeScript (Node.js)
**UI Language**: English
