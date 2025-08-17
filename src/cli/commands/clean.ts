import * as path from 'path';
import { CommandHandler, ParsedArgs } from '../../types/index';
import { scanner } from '../../core/scanner';
import { cleaner } from '../../core/cleaner';
import { analyzer } from '../../core/analyzer';
import { colors } from '../colors';
import { spinner } from '../spinner';
import { prompt } from '../prompt';
import { fileUtils } from '../../lib/file-utils';

export const cleanCommand: CommandHandler = {
  name: 'clean',
  description: 'Clean selected or all node_modules',
  options: [
    {
      name: 'all',
      alias: 'a',
      type: 'boolean',
      description: 'Clean all found node_modules',
      default: false
    },
    {
      name: 'dry-run',
      alias: 'n',
      type: 'boolean',
      description: 'Show what would be deleted without deleting',
      default: false
    },
    {
      name: 'backup',
      alias: 'b',
      type: 'boolean',
      description: 'Create backup before deletion',
      default: false
    },
    {
      name: 'force',
      alias: 'f',
      type: 'boolean',
      description: 'Force deletion without confirmation',
      default: false
    },
    {
      name: 'age',
      type: 'number',
      description: 'Clean node_modules older than N days'
    },
    {
      name: 'size',
      type: 'number',
      description: 'Clean node_modules larger than N MB'
    },
    {
      name: 'duplicates',
      type: 'boolean',
      description: 'Clean duplicate packages only',
      default: false
    },
    {
      name: 'interactive',
      alias: 'i',
      type: 'boolean',
      description: 'Interactive selection mode',
      default: false
    }
  ],
  execute: async (args: ParsedArgs) => {
    const targetPath = args.args[0] || process.cwd();
    const absolutePath = path.resolve(targetPath);

    console.log(colors.cyan(`Cleaning node_modules in: ${absolutePath}\n`));

    if (args.options['dry-run']) {
      console.log(colors.yellow('DRY RUN MODE - No files will be deleted\n'));
    }

    try {
      let targets: any[] = [];

      if (args.options.age) {
        const result = await cleaner.cleanByAge(
          absolutePath,
          args.options.age,
          {
            dryRun: args.options['dry-run'],
            backup: args.options.backup,
            force: args.options.force
          }
        );
        
        displayCleanResults(result);
        return;
      }

      if (args.options.size) {
        const result = await cleaner.cleanBySize(
          absolutePath,
          args.options.size,
          {
            dryRun: args.options['dry-run'],
            backup: args.options.backup,
            force: args.options.force
          }
        );
        
        displayCleanResults(result);
        return;
      }

      if (args.options.duplicates) {
        const result = await cleaner.cleanDuplicates(
          absolutePath,
          {
            dryRun: args.options['dry-run'],
            backup: args.options.backup,
            force: args.options.force
          }
        );
        
        displayCleanResults(result);
        return;
      }

      spinner.start('Scanning for node_modules...');
      const scanResults = await scanner.scan(absolutePath, { parallel: true });
      spinner.succeed(`Found ${scanResults.length} node_modules directories`);

      if (scanResults.length === 0) {
        console.log(colors.yellow('\nNo node_modules directories found.'));
        return;
      }

      if (args.options.interactive) {
        targets = await interactiveSelection(scanResults);
      } else if (args.options.all) {
        targets = scanResults;
      } else {
        const suggestions = analyzer.suggestCleanupTargets(scanResults);
        
        if (suggestions.length === 0) {
          console.log(colors.yellow('\nNo cleanup suggestions. Use --all or --interactive to select manually.'));
          return;
        }

        console.log('\n' + colors.bold('Suggested for cleanup:'));
        for (const suggestion of suggestions) {
          console.log(`  • ${suggestion.projectPath}`);
          console.log(colors.gray(`    Size: ${suggestion.sizeFormatted}, Last modified: ${formatDate(suggestion.lastModified)}`));
        }

        targets = suggestions;
      }

      if (targets.length === 0) {
        console.log(colors.yellow('\nNo targets selected for cleanup.'));
        return;
      }

      const totalSize = targets.reduce((sum: number, t: any) => sum + t.size, 0);
      console.log('\n' + colors.bold('Summary:'));
      console.log(`  Directories to clean: ${colors.red(targets.length.toString())}`);
      console.log(`  Total space to free: ${colors.green(fileUtils.formatBytes(totalSize))}`);

      if (!args.options.force && !args.options['dry-run']) {
        const confirmed = await prompt.confirm('\nAre you sure you want to proceed?', false);
        if (!confirmed) {
          console.log(colors.yellow('\nOperation cancelled.'));
          return;
        }
      }

      console.log('');
      const result = await cleaner.clean(targets, {
        dryRun: args.options['dry-run'],
        backup: args.options.backup,
        force: args.options.force
      });

      displayCleanResults(result);

    } catch (error) {
      console.error(colors.error(`Error: ${error}`));
      process.exit(1);
    }
  }
};

async function interactiveSelection(results: any[]): Promise<any[]> {
  console.log('\n' + colors.bold('Interactive Selection Mode'));
  console.log(colors.gray('Select node_modules to clean:\n'));

  const choices = results.map((r, i) => {
    const age = Math.floor(
      (Date.now() - r.lastModified.getTime()) / (1000 * 60 * 60 * 24)
    );
    return `${r.projectName || path.basename(r.projectPath)} (${r.sizeFormatted}, ${age} days old)`;
  });

  const selected = await prompt.multiSelect('Select directories to clean:', choices);
  
  return selected.map(choice => {
    const index = choices.indexOf(choice);
    return results[index];
  });
}

function displayCleanResults(result: any): void {
  console.log('\n' + colors.bold('Clean Results:'));
  console.log(`  Cleaned: ${colors.green(result.cleaned.length.toString())} directories`);
  console.log(`  Failed: ${colors.red(result.failed.length.toString())} directories`);
  console.log(`  Space freed: ${colors.cyan(fileUtils.formatBytes(result.savedSpace))}`);

  if (result.failed.length > 0) {
    console.log('\n' + colors.bold('Failed to clean:'));
    for (const failedPath of result.failed) {
      console.log(colors.red(`  • ${failedPath}`));
    }
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}