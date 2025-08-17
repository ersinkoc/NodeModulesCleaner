import * as path from 'path';
import { CommandHandler, ParsedArgs } from '../../types/index';
import { scanner } from '../../core/scanner';
import { colors } from '../colors';
import { spinner } from '../spinner';
import { createSimpleTable } from '../table';
import { fileUtils } from '../../lib/file-utils';

export const scanCommand: CommandHandler = {
  name: 'scan',
  description: 'Scan for node_modules directories',
  options: [
    {
      name: 'depth',
      alias: 'd',
      type: 'number',
      description: 'Maximum directory depth to scan',
      default: 10
    },
    {
      name: 'hidden',
      alias: 'h',
      type: 'boolean',
      description: 'Include hidden directories',
      default: false
    },
    {
      name: 'json',
      alias: 'j',
      type: 'boolean',
      description: 'Output results as JSON',
      default: false
    },
    {
      name: 'sort',
      alias: 's',
      type: 'string',
      description: 'Sort by: size, age, name, packages',
      default: 'size'
    }
  ],
  execute: async (args: ParsedArgs) => {
    const targetPath = args.args[0] || process.cwd();
    const absolutePath = path.resolve(targetPath);

    console.log(colors.cyan(`Scanning for node_modules in: ${absolutePath}\n`));
    
    spinner.start('Scanning directories...');

    try {
      const results = await scanner.scan(absolutePath, {
        maxDepth: args.options.depth,
        includeHidden: args.options.hidden,
        parallel: true
      });

      spinner.succeed(`Found ${results.length} node_modules directories`);

      if (results.length === 0) {
        console.log(colors.yellow('\nNo node_modules directories found.'));
        return;
      }

      switch (args.options.sort) {
        case 'age':
          results.sort((a, b) => a.lastModified.getTime() - b.lastModified.getTime());
          break;
        case 'name':
          results.sort((a, b) => (a.projectName || '').localeCompare(b.projectName || ''));
          break;
        case 'packages':
          results.sort((a, b) => b.packageCount - a.packageCount);
          break;
        case 'size':
        default:
          results.sort((a, b) => b.size - a.size);
          break;
      }

      if (args.options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        displayResults(results);
      }

      const totalSize = results.reduce((sum, r) => sum + r.size, 0);
      const totalPackages = results.reduce((sum, r) => sum + r.packageCount, 0);

      console.log('\n' + colors.bold('Summary:'));
      console.log(`  Total node_modules: ${colors.cyan(results.length.toString())}`);
      console.log(`  Total size: ${colors.yellow(fileUtils.formatBytes(totalSize))}`);
      console.log(`  Total packages: ${colors.green(totalPackages.toString())}`);
      
      if (totalSize > 1024 * 1024 * 1024) {
        console.log('\n' + colors.warning('Consider running "nmc clean" to free up disk space.'));
      }
    } catch (error) {
      spinner.fail('Scan failed');
      console.error(colors.error(`Error: ${error}`));
      process.exit(1);
    }
  }
};

function displayResults(results: any[]): void {
  console.log('');
  
  const tableData = results.slice(0, 20).map(r => ({
    project: r.projectName || path.basename(r.projectPath),
    size: r.sizeFormatted,
    packages: r.packageCount,
    age: formatAge(r.lastModified),
    path: truncatePath(r.projectPath, 50)
  }));

  const table = createSimpleTable(tableData, [
    { key: 'project', header: 'Project', width: 25 },
    { key: 'size', header: 'Size', width: 10, align: 'right' },
    { key: 'packages', header: 'Packages', width: 10, align: 'right' },
    { key: 'age', header: 'Age', width: 12, align: 'right' },
    { key: 'path', header: 'Path', width: 50 }
  ]);

  console.log(table);

  if (results.length > 20) {
    console.log(colors.gray(`\n... and ${results.length - 20} more`));
  }
}

function formatAge(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  
  return `${Math.floor(days / 365)} years`;
}

function truncatePath(filePath: string, maxLength: number): string {
  if (filePath.length <= maxLength) return filePath;
  
  const parts = filePath.split(path.sep);
  let result = parts[parts.length - 1];
  
  for (let i = parts.length - 2; i >= 0; i--) {
    const newResult = path.join(parts[i], result);
    if (newResult.length > maxLength - 3) {
      return '...' + path.sep + result;
    }
    result = newResult;
  }
  
  return result;
}