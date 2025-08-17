import { ParsedArgs, CommandHandler, OptionConfig } from '../types/index';

export class ArgParser {
  private commands = new Map<string, CommandHandler>();
  private globalOptions = new Map<string, OptionConfig>();
  private aliases = new Map<string, string>();
  private versionString: string = '';
  private descriptionString: string = '';

  addCommand(name: string, handler: CommandHandler): void {
    this.commands.set(name, handler);
  }

  addGlobalOption(config: OptionConfig): void {
    this.globalOptions.set(config.name, config);
    if (config.alias) {
      this.aliases.set(config.alias, config.name);
    }
  }

  option(flags: string, description: string, defaultValue?: string): this {
    const parts = flags.split(/[, ]+/);
    const shortFlag = parts.find(p => p.startsWith('-') && !p.startsWith('--'));
    const longFlag = parts.find(p => p.startsWith('--'));
    
    const hasValue = flags.includes('<') || flags.includes('[');
    let name = longFlag ? longFlag.replace('--', '').replace(/\s*<.*>|\s*\[.*\]/, '') : shortFlag?.replace('-', '') || '';
    const alias = shortFlag ? shortFlag.replace('-', '') : undefined;
    
    // Extract the placeholder (e.g., "<path>" from "--output <path>")
    let placeholder = '';
    const placeholderMatch = flags.match(/<[^>]+>|\[[^\]]+\]/);
    if (placeholderMatch) {
      placeholder = ' ' + placeholderMatch[0];
    }
    
    // Store the original option name (including 'no-' prefix if present)
    this.addGlobalOption({
      name,
      alias,
      description,
      type: hasValue ? 'string' : 'boolean',
      default: defaultValue,
      flags: flags // Store original flags for help text
    } as any);
    
    return this;
  }

  command(cmd: string, description: string, handler: (args: any, options?: any) => void): this {
    const parts = cmd.split(' ');
    const commandName = parts[0];
    const cmdArgs = parts.slice(1);
    
    this.addCommand(commandName, {
      name: cmd, // Store full command string for help text
      description,
      execute: async (parsedArgs: ParsedArgs) => {
        // Extract command arguments from parsed args
        const commandArgs = parsedArgs.args.slice(0, cmdArgs.length);
        handler(commandArgs, parsedArgs.options);
      },
      options: []
    });
    
    return this;
  }

  version(v: string): this {
    this.versionString = v;
    // Add version as a global option
    this.addGlobalOption({
      name: 'version',
      alias: 'V',
      description: 'Show version number',
      type: 'boolean'
    });
    return this;
  }

  description(desc: string): this {
    this.descriptionString = desc;
    return this;
  }

  help(): string {
    const lines: string[] = [];
    
    if (this.descriptionString) {
      lines.push(this.descriptionString);
      lines.push('');
    }
    
    if (this.versionString) {
      lines.push(`Version: ${this.versionString}`);
      lines.push('');
    }
    
    if (this.globalOptions.size > 0) {
      lines.push('Options:');
      for (const [name, option] of this.globalOptions) {
        // Use original flags if available, otherwise reconstruct
        let flags;
        if ((option as any).flags) {
          flags = (option as any).flags;
        } else {
          flags = option.alias ? `-${option.alias}, --${name}` : `--${name}`;
        }
        lines.push(`  ${flags.padEnd(25)} ${option.description || ''}`);
      }
      lines.push('');
    }
    
    if (this.commands.size > 0) {
      lines.push('Commands:');
      for (const [key, cmd] of this.commands) {
        // Use cmd.name which has the full command string (e.g., "test <file>")
        lines.push(`  ${cmd.name.padEnd(25)} ${cmd.description || ''}`);
      }
    }
    
    return lines.join('\n');
  }

  parse(args: string[]): ParsedArgs {
    const result: ParsedArgs = {
      command: '',
      args: [],
      options: {},
      flags: new Set()
    };

    let i = 0;
    
    // Skip 'node' and 'script' arguments if present
    if (args.length >= 2 && (args[0] === 'node' || args[0].endsWith('node') || args[0].endsWith('node.exe'))) {
      i = 2; // Skip node and script name
    }
    
    // Check if the first non-skipped arg looks like a command (check if it's registered)
    let possibleCommand = '';
    if (i < args.length && !args[i].startsWith('-')) {
      possibleCommand = args[i];
      
      // Only treat it as a command if it's registered
      if (this.commands.has(possibleCommand)) {
        result.command = possibleCommand;
        i++;
      }
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

    let stopParsing = false;
    let collectingCommandArgs = !!result.command;
    
    while (i < args.length) {
      const arg = args[i];
      
      // Handle double dash separator
      if (arg === '--') {
        stopParsing = true;
        i++;
        continue;
      }
      
      // After --, treat everything as arguments
      if (stopParsing) {
        result.args.push(arg);
        i++;
        continue;
      }
      
      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const equalIndex = key.indexOf('=');
        
        if (equalIndex > -1) {
          const optionName = key.slice(0, equalIndex);
          const value = key.slice(equalIndex + 1);
          const option = availableOptions.get(optionName);
          
          if (option) {
            const camelKey = this.toCamelCase(optionName);
            result.options[camelKey] = this.parseValue(value, option.type);
          } else {
            const camelKey = this.toCamelCase(optionName);
            result.options[camelKey] = value;
          }
        } else {
          // Handle negated options like --no-color
          let optionKey = key;
          let setValue = true;
          
          if (key.startsWith('no-')) {
            const positiveKey = key.slice(3);
            const negatedOption = availableOptions.get(key);
            
            if (negatedOption) {
              // Option was registered as --no-xxx
              result.flags.add(positiveKey);
              result.options[positiveKey] = false;
              i++;
              continue;
            }
          }
          
          const option = availableOptions.get(optionKey);
          
          if (!option) {
            // Unknown option - treat as argument
            result.args.push(arg);
          } else {
            const camelKey = this.toCamelCase(optionKey);
            
            if (option.type === 'boolean') {
              result.flags.add(camelKey);
              result.options[camelKey] = setValue;
            } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
              i++;
              const value = args[i];
              result.options[camelKey] = this.parseValue(value, option.type);
            } else {
              // Missing value for option, treat as boolean
              result.flags.add(camelKey);
              result.options[camelKey] = true;
            }
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
        // Non-option argument
        result.args.push(arg);
      }
      
      i++;
    }

    for (const [name, option] of availableOptions) {
      if (!(name in result.options) && option.default !== undefined) {
        result.options[name] = option.default;
      }
    }

    // Execute command if found
    if (command && command.execute) {
      command.execute(result);
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
  
  private toCamelCase(str: string): string {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
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