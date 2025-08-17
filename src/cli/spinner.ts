import { colors } from './colors';

export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;
  private interval: NodeJS.Timeout | null = null;
  private text = '';
  private stream = process.stderr;
  private isEnabled = process.stderr.isTTY && !process.env.CI;
  
  // Allow override for testing
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  constructor(text?: string) {
    if (text) {
      this.text = text;
    }
  }

  start(text: string = ''): void {
    if (text) {
      this.text = text;
    }
    this.currentFrame = 0;
    
    if (!this.isEnabled) {
      const output = `${colors.cyan(this.frames[0])} ${this.text}`;
      process.stdout.write(output);
      return;
    }
    
    if (this.interval) {
      return; // Already running, don't restart
    }
    
    // Render immediately
    this.render();

    this.interval = setInterval(() => {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.render();
    }, 80);
  }

  private render(): void {
    const frame = this.frames[this.currentFrame];
    const output = `${colors.cyan(frame)} ${this.text}`;
    
    if (this.stream && this.stream.clearLine) {
      this.stream.clearLine(0);
      this.stream.cursorTo(0);
    }
    process.stdout.write(output);
  }

  update(text: string): void {
    this.text = text;
    if (this.isEnabled && this.interval) {
      this.render();
    } else if (!this.isEnabled) {
      console.log(text);
    }
  }

  success(text?: string): void {
    this.succeed(text);
  }

  error(text?: string): void {
    this.fail(text);
  }

  succeed(text?: string): void {
    this.stop();
    const finalText = text || this.text;
    const output = `${colors.success('✓')} ${finalText}\n`;
    if (this.isEnabled) {
      if (this.stream && this.stream.clearLine) {
        this.stream.clearLine(0);
        this.stream.cursorTo(0);
      }
    }
    process.stdout.write(output);
  }

  fail(text?: string): void {
    this.stop();
    const finalText = text || this.text;
    const output = `${colors.error('✗')} ${finalText}\n`;
    if (this.isEnabled) {
      if (this.stream && this.stream.clearLine) {
        this.stream.clearLine(0);
        this.stream.cursorTo(0);
      }
    }
    process.stdout.write(output);
  }

  warn(text?: string): void {
    this.stop();
    const finalText = text || this.text;
    const output = `${colors.warning('⚠')} ${finalText}\n`;
    if (this.isEnabled) {
      if (this.stream && this.stream.clearLine) {
        this.stream.clearLine(0);
        this.stream.cursorTo(0);
      }
    }
    process.stdout.write(output);
  }

  info(text?: string): void {
    this.stop();
    const finalText = text || this.text;
    const output = `${colors.info('ℹ')} ${finalText}\n`;
    if (this.isEnabled) {
      if (this.stream && this.stream.clearLine) {
        this.stream.clearLine(0);
        this.stream.cursorTo(0);
      }
    }
    process.stdout.write(output);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      
      if (this.isEnabled) {
        // Clear the line
        process.stdout.write('\r\x1b[K');
      }
    }
  }

  clear(): void {
    this.stop();
  }
}

export const spinner = new Spinner();