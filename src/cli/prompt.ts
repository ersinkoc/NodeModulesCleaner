import * as readline from 'readline';
import { colors } from './colors.js';

export class Prompt {
  private rl: readline.Interface | null = null;

  private createInterface(): readline.Interface {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
    return this.rl;
  }

  private closeInterface(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  async ask(question: string): Promise<string> {
    const rl = this.createInterface();
    
    return new Promise((resolve) => {
      rl.question(colors.cyan('? ') + question + ' ', (answer) => {
        this.closeInterface();
        resolve(answer.trim());
      });
    });
  }

  async confirm(question: string, defaultValue: boolean = false): Promise<boolean> {
    const defaultText = defaultValue ? '(Y/n)' : '(y/N)';
    const answer = await this.ask(`${question} ${colors.gray(defaultText)}`);
    
    if (!answer) {
      return defaultValue;
    }
    
    return answer.toLowerCase().startsWith('y');
  }

  async select(question: string, choices: string[]): Promise<string> {
    const rl = this.createInterface();
    
    console.log(colors.cyan('? ') + question);
    choices.forEach((choice, index) => {
      console.log(colors.gray(`  ${index + 1}) `) + choice);
    });
    
    return new Promise((resolve) => {
      const askForChoice = () => {
        rl.question(colors.cyan('  Select (1-' + choices.length + '): '), (answer) => {
          const index = parseInt(answer) - 1;
          
          if (isNaN(index) || index < 0 || index >= choices.length) {
            console.log(colors.red('  Invalid selection. Please try again.'));
            askForChoice();
          } else {
            this.closeInterface();
            resolve(choices[index]);
          }
        });
      };
      
      askForChoice();
    });
  }

  async multiSelect(question: string, choices: string[]): Promise<string[]> {
    const rl = this.createInterface();
    
    console.log(colors.cyan('? ') + question);
    console.log(colors.gray('  (Use space-separated numbers or ranges like 1-3)'));
    choices.forEach((choice, index) => {
      console.log(colors.gray(`  ${index + 1}) `) + choice);
    });
    
    return new Promise((resolve) => {
      rl.question(colors.cyan('  Select: '), (answer) => {
        this.closeInterface();
        
        const selected: number[] = [];
        const parts = answer.split(/\s+/);
        
        for (const part of parts) {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n));
            if (!isNaN(start) && !isNaN(end)) {
              for (let i = start; i <= end; i++) {
                if (i > 0 && i <= choices.length) {
                  selected.push(i - 1);
                }
              }
            }
          } else {
            const index = parseInt(part) - 1;
            if (!isNaN(index) && index >= 0 && index < choices.length) {
              selected.push(index);
            }
          }
        }
        
        const uniqueSelected = [...new Set(selected)];
        resolve(uniqueSelected.map(i => choices[i]));
      });
    });
  }

  async password(question: string): Promise<string> {
    const rl = this.createInterface();
    
    return new Promise((resolve) => {
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      
      if (stdin.isTTY) {
        stdin.setRawMode(true);
      }
      
      process.stdout.write(colors.cyan('? ') + question + ' ');
      
      let password = '';
      
      const onData = (char: Buffer) => {
        const ch = char.toString('utf8');
        
        switch (ch) {
          case '\n':
          case '\r':
          case '\u0004':
            if (stdin.isTTY) {
              stdin.setRawMode(wasRaw);
            }
            stdin.removeListener('data', onData);
            process.stdout.write('\n');
            this.closeInterface();
            resolve(password);
            break;
          case '\u0003':
            process.exit();
            break;
          case '\u007f':
          case '\b':
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.write('\b \b');
            }
            break;
          default:
            password += ch;
            process.stdout.write('*');
            break;
        }
      };
      
      stdin.on('data', onData);
    });
  }
}

export const prompt = new Prompt();