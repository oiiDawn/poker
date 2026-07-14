import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { Card, AIDecision, GameStage, Player, LLMConfig } from '../types';
import { aiDecide } from './rule-based';
import { cardsStr } from '../ui/renderer';

const API_TIMEOUT = 10000;
const API_MAX_RETRIES = 2;

// ponytail: single-client cache — one game runs at a time
let _anthropicClient: Anthropic | null = null;
let _openaiClient: OpenAI | null = null;

const LLM_SYSTEM_PROMPT = `You are a professional Texas Hold'em poker player named Eve. You make rational decisions based on pot odds, hand strength, and opponent stacks, occasionally bluffing.

CRITICAL: You MUST respond in EXACTLY this format (two lines only):
REASONING: <one sentence>
ACTION: <fold|check|call|raise 50|allin>

Examples of CORRECT responses:
REASONING: I have a strong flush draw and good pot odds.
ACTION: call

REASONING: My pocket aces are strong pre-flop.
ACTION: raise 100

REASONING: The board is dangerous and I only have ace high.
ACTION: fold

REASONING: No one has bet yet and I want to see the next card.
ACTION: check

REASONING: I'm all-in with my remaining chips.
ACTION: allin

Rules:
- When callAmount is 0, you can check or raise (never call)
- When callAmount > 0, you must fold, call, raise, or allin (never check)
- "raise" MUST be followed by a POSITIVE number (minimum 20): "raise 50" not "raise 0"
- NEVER output "raise 0" - use "call" or "check" instead
- Output ONLY two lines, nothing else`;

function buildLlmPrompt(
  player: Player,
  community: Card[],
  pot: number,
  callAmount: number,
  players: Player[]
): string {
  const stage = community.length === 0 ? 'Pre-flop'
    : community.length === 3 ? 'Flop'
    : community.length === 4 ? 'Turn' : 'River';

  const opponents = players
    .filter(p => p.id !== player.id && !p.folded)
    .map(p => `  ${p.name}: ${p.chips} chips${p.allIn ? ' (all-in)' : ''}`)
    .join('\n');

  return `Stage: ${stage}
Your hand: ${cardsStr(player.hand)}
Community cards: ${community.length > 0 ? cardsStr(community) : '(none)'}
Pot: ${pot}
To call: ${callAmount} (0 means you can check)
Your chips: ${player.chips}
Other players:
${opponents}

Make your decision.`;
}

function parseLlmResponse(text: string, player: Player, callAmount: number, addEvent: (msg: string) => void): AIDecision {
  if (!text || text.trim().length === 0) {
    throw new Error('LLM returned empty response');
  }
  // Try to find ACTION line
  const actionMatch = text.match(/ACTION:\s*(\w+)(?:\s+(\d+))?/i);
  if (!actionMatch) {
    // Fallback: try to find action keywords anywhere in the text
    const lowerText = text.toLowerCase();
    if (lowerText.includes('fold')) return { action: 'fold' };
    if (lowerText.includes('allin') || lowerText.includes('all-in') || lowerText.includes('all in')) {
      return { action: 'raise', amount: player.chips };
    }
    if (lowerText.includes('check') && callAmount === 0) return { action: 'check' };
    if (lowerText.includes('call')) return { action: 'call' };
    // If we find "raise" anywhere, try to extract a number
    const raiseMatch = lowerText.match(/raise\s+(\d+)/);
    if (raiseMatch) {
      const amount = parseInt(raiseMatch[1]);
      // Handle invalid "raise 0"
      if (amount <= 0) {
        return callAmount > 0 ? { action: 'call' } : { action: 'check' };
      }
      const minRaise = Math.max(callAmount, 20);
      // If amount is less than minimum, treat as call if there's a callAmount
      if (amount < minRaise && callAmount > 0 && amount <= callAmount) {
        return { action: 'call' };
      }
      const effectiveAmount = Math.max(amount, minRaise);
      return { action: 'raise', amount: Math.min(effectiveAmount, player.chips) };
    }
    if (!lowerText.includes('raise') && !lowerText.includes('call') &&
        !lowerText.includes('check') && !lowerText.includes('fold') &&
        !lowerText.includes('allin') && !lowerText.includes('all-in')) {
      // No English keywords found — try Chinese
      if (lowerText.includes('弃牌')) return { action: 'fold' };
      if (lowerText.includes('全下') || lowerText.includes('全押')) {
        return { action: 'raise', amount: player.chips };
      }
      if ((lowerText.includes('过牌') || lowerText.includes('看牌')) && callAmount === 0) return { action: 'check' };
      if (lowerText.includes('跟注') || lowerText.includes('跟')) return { action: 'call' };
      const cnRaiseMatch = text.match(/加注\s*(\d+)/);
      if (cnRaiseMatch) {
        const amount = parseInt(cnRaiseMatch[1]);
        const minRaise = Math.max(callAmount, 20);
        const effectiveAmount = Math.max(amount, minRaise);
        return { action: 'raise', amount: Math.min(effectiveAmount, player.chips) };
      }
    }
    // No explicit keyword found — try natural language intent patterns
    if (/i('ll|\s+will|\s+should|\s+want\s+to|\s+gonna)\s+fold/i.test(text)) return { action: 'fold' };
    if (/i('ll|\s+will|\s+should|\s+want\s+to|\s+gonna)\s+(check|pass)/i.test(text)) {
      return callAmount > 0 ? { action: 'call' } : { action: 'check' };
    }
    if (/i('ll|\s+will|\s+should|\s+want\s+to|\s+gonna)\s+call/i.test(text)) return { action: 'call' };
    if (/i('ll|\s+will|\s+should|\s+want\s+to|\s+gonna)\s+raise/i.test(text)) {
      const raiseAmount = Math.max(callAmount * 3, 60);
      return { action: 'raise', amount: Math.min(raiseAmount, player.chips) };
    }
    // Final fallback: infer from hand strength language
    if (/weak|fold|dump|trash|junk|terrible/i.test(text) && callAmount > 0) return { action: 'fold' };
    if (/weak|fold|dump|trash|junk|terrible/i.test(text) && callAmount === 0) return { action: 'check' };
    // Default to conservative play
    return callAmount > 0 ? { action: 'call' } : { action: 'check' };
  }

  const verb = actionMatch[1].toLowerCase();
  const amount = actionMatch[2] ? parseInt(actionMatch[2]) : null;

  if (verb === 'fold') return { action: 'fold' };
  if (verb === 'check') return callAmount > 0 ? { action: 'call' } : { action: 'check' };
  if (verb === 'call') return { action: 'call' };
  if (verb === 'allin') return { action: 'raise', amount: player.chips };
  if (verb === 'raise') {
    const minRaise = Math.max(callAmount, 20);

    // Handle invalid "raise 0" or "raise" with amount less than minimum
    if (amount !== null && amount <= 0) {
      // "raise 0" is invalid - convert to call or check
      return callAmount > 0 ? { action: 'call' } : { action: 'check' };
    }

    if (amount !== null && amount < minRaise) {
      // Amount too small - if it's close to callAmount, treat as call
      if (callAmount > 0 && amount <= callAmount) {
        return { action: 'call' };
      }
      // Otherwise enforce minimum raise
      return { action: 'raise', amount: Math.min(minRaise, player.chips) };
    }

    // Valid raise amount or no amount specified
    const effectiveAmount = amount ? Math.max(amount, minRaise) : minRaise;
    return { action: 'raise', amount: Math.min(effectiveAmount, player.chips) };
  }
  throw new Error(`Unknown action: ${verb}`);
}

async function callAnthropicAPI(config: LLMConfig, prompt: string): Promise<string> {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({ apiKey: config.apiKey, baseURL: config.baseUrl, timeout: API_TIMEOUT, maxRetries: API_MAX_RETRIES });
  }
  const response = await _anthropicClient.messages.create({
    model: config.modelName || 'claude-haiku-4-5-20251001',
    max_tokens: 120,
    system: LLM_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });
  // Find text content — prefer 'text' block, fall back to 'thinking' block (some proxies use this)
  const textBlock = response.content.find(b => b.type === 'text') as { type: 'text'; text: string } | undefined;
  if (textBlock) return textBlock.text.trim();
  const thinkingBlock = response.content.find(b => b.type === 'thinking') as { type: 'thinking'; thinking: string } | undefined;
  if (thinkingBlock) return thinkingBlock.thinking.trim();
  throw new Error(`No text in response. Content types: ${response.content.map(b => b.type).join(', ')}`);
}

async function callOpenAIAPI(config: LLMConfig, prompt: string): Promise<string> {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl, timeout: API_TIMEOUT, maxRetries: API_MAX_RETRIES });
  }
  const response = await _openaiClient.chat.completions.create({
    model: config.modelName || 'gpt-4o-mini',
    max_tokens: 120,
    messages: [
      { role: 'system', content: LLM_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]
  });
  return response.choices[0]?.message?.content?.trim() || '';
}

export async function llmDecideWithFallback(
  player: Player,
  community: Card[],
  pot: number,
  callAmount: number,
  players: Player[],
  addEvent: (msg: string) => void,
  roundNumber: number = 1,
  config?: LLMConfig
): Promise<AIDecision> {
  try {
    process.stdout.write(' ⏳ Eve thinking...');

    const prompt = buildLlmPrompt(player, community, pot, callAmount, players);
    let responseText: string;

    if (!config || config.provider === 'anthropic') {
      responseText = await callAnthropicAPI(config || { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY || '' }, prompt);
    } else {
      responseText = await callOpenAIAPI(config, prompt);
    }

    const decision = parseLlmResponse(responseText, player, callAmount, addEvent);
    process.stdout.write('\r' + ' '.repeat(20) + '\r');
    return decision;
  } catch (err) {
    process.stdout.write('\r' + ' '.repeat(20) + '\r');
    if (err instanceof Anthropic.APIError) {
      if (err.status === 401) addEvent(` ⚠️  Authentication failed`);
      else if (err.status === 429) addEvent(` ⚠️  Rate limit exceeded`);
      else addEvent(` ⚠️  API error: ${err.message}`);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('Cannot parse:') || msg.startsWith('Unknown action:')) {
        addEvent(` ⚠️  LLM response error: ${msg}`);
      } else {
        addEvent(` ⚠️  Network error: ${msg}`);
      }
    }
    return aiDecide(player.hand, community, pot, callAmount, player.chips, 'conservative', 'preflop', roundNumber);
  }
}
