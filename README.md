<p align="center">
  <img src="https://img.shields.io/badge/🃏-Texas%20Hold'em-ff6b6b?style=for-the-badge" alt="Texas Hold'em" />
</p>

<h1 align="center">♠️ Texas Hold'em Poker ♥️</h1>

<p align="center">
  <strong>A terminal-based poker game with AI opponents</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-16+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/version-2.0.0-blue?style=flat-square" alt="Version" />
</p>

---

## 📋 Table of Contents

- [📋 Table of Contents](#-table-of-contents)
- [✨ Features](#-features)
  - [AI Personalities (Rule-based)](#ai-personalities-rule-based)
- [🖥️ Preview](#️-preview)
- [🚀 Quick Start](#-quick-start)
  - [Production](#production)
- [⚙️ Configuration](#️-configuration)
- [🎯 How to Play](#-how-to-play)
- [📁 Project Structure](#-project-structure)
- [🧪 Scripts](#-scripts)
- [📜 License](#-license)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎮 **Full TUI** | Full-screen terminal UI with arrow-key navigation, no scrolling |
| 🤖 **Dual AI Modes** | Rule-based personalities or LLM-powered (Claude, GPT, local) |
| 🃏 **Complete Rules** | Blinds, betting rounds, side pots, showdown — strict poker logic |
| 👥 **1–4 Opponents** | Play against 1 to 4 AI players |
| 📊 **Win Probability** | Optional Monte Carlo win% indicator |
| 🔄 **Heads-up Support** | Correct dealer/SB/BB positions for 2-player games |

### AI Personalities (Rule-based)

| Personality | Style |
|-------------|-------|
| `aggressive` | Raises frequently, bluffs more |
| `conservative` | Tight, folds weak hands |
| `bluffer` | High bluff rate, unpredictable |
| `calling_station` | Calls often, rarely folds |

---

## 🖥️ Preview

```
╔══════════════════════════════════════════════════════════════════════╗
║ 【Pre-flop】   Pot: 60                                                ║
║ Community:  ??  ??  ??  ??  ??                                       ║
╠══════════════════════════════════════════════════════════════════════╣
║ You        1000       [Folded]                                       ║
║ Alice       980       [All-in]   Hand: A♠ K♥                        ║
║ Bob         960       [Active]   Hand: ?? ??                        ║
╠──────────────────────────────────────────────────────────────────────╣
║ Recent Actions:                                                      ║
║   ↳ Alice: Raise 40 💰                                               ║
║   ↳ Bob: Call 40 📞                                                  ║
╚══════════════════════════════════════════════════════════════════════╝

> Fold   Call (40)   Raise (min 40)   All-in (1000)
```

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/oiiDawn/poker.git
cd poker

# Install dependencies
npm install

# Run (development)
npm run dev
```

### Production

```bash
npm run build
npm start
```

---

## ⚙️ Configuration

Create a `.env` file (copy from `.env.example`):

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | For Claude AI mode | LLM only |
| `OPENAI_API_KEY` | For GPT AI mode | LLM only |
| `LOCAL_MODEL_URL` | URL for local models (e.g. llama.cpp) | Local only |

> **Tip:** If API keys are missing, the game falls back to rule-based AI automatically.

---

## 🎯 How to Play

1. **Select mode** — Rule-based AI or LLM AI
2. **Choose opponents** — 1 to 4 AI players
3. **Navigate** — Arrow keys to move, Enter to confirm
4. **Actions** — Fold, Check, Call, Raise, or All-in

**Rules:** Small blind 10, Big blind 20, dealer rotates each round.

---

## 📁 Project Structure

```
poker/
├── src/
│   ├── game/           # Game orchestration
│   │   ├── setup.ts    # Player init, LLM config
│   │   ├── betting.ts  # Betting rounds
│   │   └── showdown.ts # Hand evaluation, pots
│   ├── core/           # Pure logic
│   │   ├── deck.ts
│   │   ├── evaluator.ts
│   │   ├── pot.ts
│   │   └── probability.ts
│   ├── ai/             # AI decision
│   │   ├── rule-based.ts
│   │   └── llm.ts
│   └── ui/             # Terminal UI
│       ├── tui.ts
│       └── renderer.ts
└── ...
```

---

## 🧪 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run with hot reload (tsx) |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled build |
| `npm run type-check` | Type check only |
| `npm test` | Run tests |

---

## 📜 License

MIT

---

<p align="center">
  <sub>Made with ♣️ and ♦️</sub>
</p>
