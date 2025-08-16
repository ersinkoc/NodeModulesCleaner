import { colors } from './colors.js';

export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;
  private interval: NodeJS.Timeout | null = null;
  private text = '';
  private stream = process.stderr;
  private isEnabled = process.stderr.isTTY && !process.env.CI;

  start(text: string = ''): void {
    if (!this.isEnabled) {
      console.error(text);
      return;
    }

    this.text = text;
    this.currentFrame = 0;
    
    if (this.interval) {
      this.stop();
    }

    this.interval = setInterval(() => {
      this.render();
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 80);
  }

  private render(): void {
    const frame = this.frames[this.currentFrame];
    const output = `${colors.cyan(frame)} ${this.text}`;
    
    this.stream.clearLine(0);
    this.stream.cursorTo(0);
    this.stream.write(output);
  }

  update(text: string): void {
    this.text = text;
    if (this.isEnabled && this.interval) {
      this.render();
    } else if (!this.isEnabled) {
      console.error(text);
    }
  }

  succeed(text?: string): void {
    this.stop();
    const finalText = text || this.text;
    if (this.isEnabled) {
      this.stream.clearLine(0);
      this.stream.cursorTo(0);
      this.stream.write(colors.success(finalText) + '\n');
    } else {
      console.error(colors.success(finalText));
    }
  }

  fail(text?: string): void {
    this.stop();
    const finalText = text || this.text;
    if (this.isEnabled) {
      this.stream.clearLine(0);
      this.stream.cursorTo(0);
      this.stream.write(colors.error(finalText) + '\n');
    } else {
      console.error(colors.error(finalText));
    }
  }

  warn(text?: string): void {
    this.stop();
    const finalText = text || this.text;
    if (this.isEnabled) {
      this.stream.clearLine(0);
      this.stream.cursorTo(0);
      this.stream.write(colors.warning(finalText) + '\n');
    } else {
      console.error(colors.warning(finalText));
    }
  }

  info(text?: string): void {
    this.stop();
    const finalText = text || this.text;
    if (this.isEnabled) {
      this.stream.clearLine(0);
      this.stream.cursorTo(0);
      this.stream.write(colors.info(finalText) + '\n');
    } else {
      console.error(colors.info(finalText));
    }
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      
      if (this.isEnabled) {
        this.stream.clearLine(0);
        this.stream.cursorTo(0);
      }
    }
  }

  clear(): void {
    this.stop();
  }
}

export const spinner = new Spinner();