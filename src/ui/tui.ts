import * as readline from 'readline';

export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

export function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

function renderMenu(title: string | undefined, options: string[], selectedIdx: number): void {
  if (title) process.stdout.write(` ${title}\n`);
  for (let i = 0; i < options.length; i++) {
    const prefix = i === selectedIdx ? '\x1b[7m>' : ' ';
    const suffix = i === selectedIdx ? '\x1b[0m' : '';
    process.stdout.write(`${prefix} ${options[i]}${suffix}\n`);
  }
}

function eraseLines(n: number): void {
  for (let i = 0; i < n; i++) {
    process.stdout.write('\x1b[1A\x1b[2K');
  }
}

export function arrowMenu(options: string[], title?: string): Promise<number> {
  return new Promise((resolve) => {
    let selected = 0;
    const lineCount = (title ? 1 : 0) + options.length;

    if (!process.stdin.isTTY) {
      renderMenu(title, options, selected);
      resolve(selected);
      return;
    }

    readline.emitKeypressEvents(process.stdin);
    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true);

    renderMenu(title, options, selected);

    function onKeypress(str: string, key: readline.Key): void {
      if (!key) return;

      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }

      if (key.name === 'up') {
        selected = (selected - 1 + options.length) % options.length;
        eraseLines(lineCount);
        renderMenu(title, options, selected);
      } else if (key.name === 'down') {
        selected = (selected + 1) % options.length;
        eraseLines(lineCount);
        renderMenu(title, options, selected);
      } else if (key.name === 'return') {
        cleanup();
        process.stdout.write('\n');
        resolve(selected);
      }
    }

    function cleanup(): void {
      process.stdin.setRawMode(wasRaw);
      process.stdin.removeListener('keypress', onKeypress);
    }

    process.stdin.on('keypress', onKeypress);
  });
}

export function readLine(prompt?: string): Promise<string> {
  return new Promise((resolve) => {
    if (prompt) process.stdout.write(prompt);

    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('', answer => {
        rl.close();
        resolve(answer);
      });
      return;
    }

    let input = '';
    readline.emitKeypressEvents(process.stdin);
    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true);

    function onKeypress(str: string, key: readline.Key): void {
      if (!key) return;

      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }

      if (key.name === 'return') {
        cleanup();
        process.stdout.write('\n');
        resolve(input);
      } else if (key.name === 'backspace') {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (str && str.length === 1 && str >= ' ' && str <= '~') {
        input += str;
        process.stdout.write(str);
      }
    }

    function cleanup(): void {
      process.stdin.setRawMode(wasRaw);
      process.stdin.removeListener('keypress', onKeypress);
    }

    process.stdin.on('keypress', onKeypress);
  });
}
