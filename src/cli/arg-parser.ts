import { ParsedArgs, CommandHandler, OptionConfig } from '../types/index.js';

export class ArgParser {
  private commands = new Map<string, CommandHandler>();
  private globalOptions = new Map<string, OptionConfig>();
  private aliases = new Map<string, string>();

  addCommand(name: string, handler: CommandHandler): void {
    this.commands.set(name, handler);
  }

  addGlobalOption(config: OptionConfig): void {
    this.globalOptions.set(config.name, config);
    if (config.alias) {
      this.aliases.set(config.alias, config.name);
    }
  }

  parse(args: string[]): ParsedArgs {
    const result: ParsedArgs = {
      command: '',
      args: [],
      options: {},
      flags: new Set()
    };

    let i = 0;
    
    if (args.length > 0 && !args[0].startsWith('-')) {
      result.command = args[0];
      i = 1;
    }

    const command = this.commands.get(result.command);
    const availableOptions = new Map<string, OptionConfig>();
    
    for (const [name, option] of this.globalOptions) {
      availableOptions.set(name, option);
    }
    
    if (command && command.options) {
      for (const option of command.options) {
        availableOptions.set(option.name, option);
        if (option.alias) {
          this.aliases.set(option.alias, option.name);
        }
      }
    }

    while (i < args.length) {
      const arg = args[i];
      
      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const equalIndex = key.indexOf('=');
        
        if (equalIndex > -1) {
          const optionName = key.slice(0, equalIndex);
          const value = key.slice(equalIndex + 1);
          const option = availableOptions.get(optionName);
          
          if (option) {
            result.options[optionName] = this.parseValue(value, option.type);
          } else {
            result.options[optionName] = value;
          }
        } else {
          const option = availableOptions.get(key);
          
          if (option && option.type === 'boolean') {
            result.flags.add(key);
            result.options[key] = true;
          } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
            i++;
            const value = args[i];
            
            if (option) {
              result.options[key] = this.parseValue(value, option.type);
            } else {
              result.options[key] = value;
            }
          } else {
            result.flags.add(key);
            result.options[key] = true;
          }
        }
      } else if (arg.startsWith('-')) {
        const flags = arg.slice(1);
        
        for (let j = 0; j < flags.length; j++) {
          const flag = flags[j];
          const fullName = this.aliases.get(flag) || flag;
          const option = availableOptions.get(fullName);
          
          if (option && option.type !== 'boolean' && j === flags.length - 1) {
            if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
              i++;
              result.options[fullName] = this.parseValue(args[i], option.type);
            }
          } else {
            result.flags.add(fullName);
            result.options[fullName] = true;
          }
        }
      } else {
        result.args.push(arg);
      }
      
      i++;
    }

    for (const [name, option] of availableOptions) {
      if (!(name in result.options) && option.default !== undefined) {
        result.options[name] = option.default;
      }
    }

    return result;
  }

  private parseValue(value: string, type: 'string' | 'number' | 'boolean'): any {
    switch (type) {
      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      case 'boolean':
        return value.toLowerCase() !== 'false' && value !== '0';
      default:
        return value;
    }
  }

  getCommand(name: string): CommandHandler | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): CommandHandler[] {
    return Array.from(this.commands.values());
  }

  showHelp(commandName?: string): void {
    if (commandName) {
      const command = this.commands.get(commandName);
      if (command) {
        console.log(`\nUsage: nmc ${command.name} [options]\n`);
        console.log(command.description + '\n');
        
        if (command.options && command.options.length > 0) {
          console.log('Options:');
          for (const option of command.options) {
            const alias = option.alias ? `, -${option.alias}` : '';
            const defaultText = option.default !== undefined ? ` (default: ${option.default})` : '';
            console.log(`  --${option.name}${alias}`);
            console.log(`      ${option.description}${defaultText}\n`);
          }
        }
      } else {
        console.log(`Unknown command: ${commandName}`);
      }
    } else {
      console.log('\nNodeModulesCleaner - Zero-dependency tool for managing node_modules\n');
      console.log('Usage: nmc <command> [options]\n');
      console.log('Commands:');
      
      for (const command of this.commands.values()) {
        console.log(`  ${command.name.padEnd(12)} ${command.description}`);
      }
      
      console.log('\nGlobal Options:');
      for (const [name, option] of this.globalOptions) {
        const alias = option.alias ? `, -${option.alias}` : '';
        console.log(`  --${name}${alias}`);
        console.log(`      ${option.description}\n`);
      }
      
      console.log('Run "nmc <command> --help" for command-specific help.\n');
    }
  }
}

export const argParser = new ArgParser();