export class Colors {
  private static readonly RESET = '\x1b[0m';
  private static readonly BOLD = '\x1b[1m';
  private static readonly DIM = '\x1b[2m';
  private static readonly ITALIC = '\x1b[3m';
  private static readonly UNDERLINE = '\x1b[4m';
  private static readonly INVERSE = '\x1b[7m';
  private static readonly HIDDEN = '\x1b[8m';
  private static readonly STRIKETHROUGH = '\x1b[9m';
  
  private static readonly BLACK = '\x1b[30m';
  private static readonly RED = '\x1b[31m';
  private static readonly GREEN = '\x1b[32m';
  private static readonly YELLOW = '\x1b[33m';
  private static readonly BLUE = '\x1b[34m';
  private static readonly MAGENTA = '\x1b[35m';
  private static readonly CYAN = '\x1b[36m';
  private static readonly WHITE = '\x1b[37m';
  private static readonly GRAY = '\x1b[90m';
  
  private static readonly BG_BLACK = '\x1b[40m';
  private static readonly BG_RED = '\x1b[41m';
  private static readonly BG_GREEN = '\x1b[42m';
  private static readonly BG_YELLOW = '\x1b[43m';
  private static readonly BG_BLUE = '\x1b[44m';
  private static readonly BG_MAGENTA = '\x1b[45m';
  private static readonly BG_CYAN = '\x1b[46m';
  private static readonly BG_WHITE = '\x1b[47m';

  private isEnabled: boolean;

  constructor(enabled: boolean = process.stdout.isTTY && !process.env.NO_COLOR) {
    this.isEnabled = enabled;
  }

  private colorize(text: string, ...codes: string[]): string {
    if (!this.isEnabled) return text;
    return codes.join('') + text + Colors.RESET;
  }

  red(text: string): string {
    return this.colorize(text, Colors.RED);
  }

  green(text: string): string {
    return this.colorize(text, Colors.GREEN);
  }

  yellow(text: string): string {
    return this.colorize(text, Colors.YELLOW);
  }

  blue(text: string): string {
    return this.colorize(text, Colors.BLUE);
  }

  magenta(text: string): string {
    return this.colorize(text, Colors.MAGENTA);
  }

  cyan(text: string): string {
    return this.colorize(text, Colors.CYAN);
  }

  white(text: string): string {
    return this.colorize(text, Colors.WHITE);
  }

  gray(text: string): string {
    return this.colorize(text, Colors.GRAY);
  }

  bold(text: string): string {
    return this.colorize(text, Colors.BOLD);
  }

  dim(text: string): string {
    return this.colorize(text, Colors.DIM);
  }

  underline(text: string): string {
    return this.colorize(text, Colors.UNDERLINE);
  }

  italic(text: string): string {
    return this.colorize(text, Colors.ITALIC);
  }

  inverse(text: string): string {
    return this.colorize(text, Colors.INVERSE);
  }

  hidden(text: string): string {
    return this.colorize(text, Colors.HIDDEN);
  }

  strikethrough(text: string): string {
    return this.colorize(text, Colors.STRIKETHROUGH);
  }

  reset(text: string): string {
    return this.colorize(text, Colors.RESET);
  }

  bgRed(text: string): string {
    return this.colorize(text, Colors.BG_RED, Colors.WHITE);
  }

  bgGreen(text: string): string {
    return this.colorize(text, Colors.BG_GREEN, Colors.BLACK);
  }

  bgYellow(text: string): string {
    return this.colorize(text, Colors.BG_YELLOW, Colors.BLACK);
  }

  bgBlue(text: string): string {
    return this.colorize(text, Colors.BG_BLUE, Colors.WHITE);
  }

  success(text: string): string {
    return this.colorize('✓ ' + text, Colors.GREEN, Colors.BOLD);
  }

  error(text: string): string {
    return this.colorize('✗ ' + text, Colors.RED, Colors.BOLD);
  }

  warning(text: string): string {
    return this.colorize('⚠ ' + text, Colors.YELLOW, Colors.BOLD);
  }

  info(text: string): string {
    return this.colorize('ℹ ' + text, Colors.BLUE, Colors.BOLD);
  }

  strip(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }
}

export const colors = new Colors();