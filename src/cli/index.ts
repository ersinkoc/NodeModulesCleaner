#!/usr/bin/env node

import { argParser } from './arg-parser';
import { colors } from './colors';
import { scanCommand } from './commands/scan';
import { analyzeCommand } from './commands/analyze';
import { cleanCommand } from './commands/clean';
import { webCommand } from './commands/web';

async function main() {
  argParser.addGlobalOption({
    name: 'help',
    alias: 'h',
    type: 'boolean',
    description: 'Show help information'
  });

  argParser.addGlobalOption({
    name: 'version',
    alias: 'v',
    type: 'boolean',
    description: 'Show version information'
  });

  argParser.addCommand('scan', scanCommand);
  argParser.addCommand('analyze', analyzeCommand);
  argParser.addCommand('clean', cleanCommand);
  argParser.addCommand('web', webCommand);

  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    argParser.showHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('NodeModulesCleaner v1.0.0');
    process.exit(0);
  }

  const parsed = argParser.parse(args);
  
  if (parsed.options.help) {
    argParser.showHelp(parsed.command);
    process.exit(0);
  }

  const command = argParser.getCommand(parsed.command);
  
  if (!command) {
    if (parsed.command) {
      console.error(colors.error(`Unknown command: ${parsed.command}\n`));
    }
    argParser.showHelp();
    process.exit(1);
  }

  try {
    await command.execute(parsed);
  } catch (error: any) {
    console.error(colors.error(`Command failed: ${error.message}`));
    if (error.stack && process.env.DEBUG) {
      console.error(colors.gray(error.stack));
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(colors.error(`Fatal error: ${error.message}`));
  process.exit(1);
});