import * as path from 'path';
import { CommandHandler, ParsedArgs } from '../../types/index.js';
import { scanner } from '../../core/scanner.js';
import { analyzer } from '../../core/analyzer.js';
import { colors } from '../colors.js';
import { spinner } from '../spinner.js';
import { createTable } from '../table.js';
import { fileUtils } from '../../lib/file-utils.js';

export const analyzeCommand: CommandHandler = {
  name: 'analyze',
  description: 'Detailed analysis with duplicate detection',
  options: [
    {
      name: 'depth',
      alias: 'd',
      type: 'number',
      description: 'Maximum directory depth to scan',
      default: 10
    },
    {
      name: 'size-threshold',
      type: 'number',
      description: 'Minimum size in MB to include',
      default: 0
    },
    {
      name: 'age-threshold',
      type: 'number',
      description: 'Minimum age in days to include',
      default: 0
    },
    {
      name: 'duplicates',
      type: 'boolean',
      description: 'Find duplicate packages',
      default: true
    },
    {
      name: 'json',
      alias: 'j',
      type: 'boolean',
      description: 'Output results as JSON',
      default: false
    },
    {
      name: 'report',
      alias: 'r',
      type: 'string',
      description: 'Save report to file'
    }
  ],
  execute: async (args: ParsedArgs) => {
    const targetPath = args.args[0] || process.cwd();
    const absolutePath = path.resolve(targetPath);

    console.log(colors.cyan(`Analyzing node_modules in: ${absolutePath}\n`));
    
    spinner.start('Scanning directories...');

    try {
      const scanResults = await scanner.scan(absolutePath, {
        maxDepth: args.options.depth,
        parallel: true
      });

      spinner.update('Analyzing results...');

      const analysis = await analyzer.analyze(scanResults, {
        sizeThreshold: (args.options['size-threshold'] || 0) * 1024 * 1024,
        ageThreshold: args.options['age-threshold'] || 0,
        findDuplicates: args.options.duplicates
      });

      spinner.succeed('Analysis complete');

      if (args.options.json) {
        console.log(JSON.stringify(analysis, null, 2));
        return;
      }

      displayAnalysis(analysis);

      const suggestions = analyzer.suggestCleanupTargets(analysis.results);
      if (suggestions.length > 0) {
        console.log('\n' + colors.bold('Cleanup Suggestions:'));
        console.log(colors.yellow('The following node_modules are good candidates for cleanup:'));
        
        for (const suggestion of suggestions.slice(0, 5)) {
          const age = Math.floor(
            (Date.now() - suggestion.lastModified.getTime()) / (1000 * 60 * 60 * 24)
          );
          console.log(`  • ${suggestion.projectPath}`);
          console.log(colors.gray(`    Size: ${suggestion.sizeFormatted}, Age: ${age} days`));
        }

        if (suggestions.length > 5) {
          console.log(colors.gray(`  ... and ${suggestions.length - 5} more`));
        }
      }

      if (args.options.report) {
        const report = analyzer.generateReport(analysis.results, analysis.statistics);
        await fileUtils.writeFile(args.options.report, report);
        console.log(colors.success(`\nReport saved to: ${args.options.report}`));
      }

    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(colors.error(`Error: ${error}`));
      process.exit(1);
    }
  }
};

function displayAnalysis(analysis: any): void {
  const { statistics, duplicates, results } = analysis;

  console.log('\n' + colors.bold('Statistics:'));
  console.log(`  Total node_modules: ${colors.cyan(statistics.totalNodeModules.toString())}`);
  console.log(`  Total size: ${colors.yellow(fileUtils.formatBytes(statistics.totalSize))}`);
  console.log(`  Total packages: ${colors.green(statistics.totalPackages.toString())}`);
  console.log(`  Average size: ${colors.blue(fileUtils.formatBytes(statistics.averageSize))}`);

  if (statistics.largestNodeModules.length > 0) {
    console.log('\n' + colors.bold('Largest node_modules:'));
    const tableData = statistics.largestNodeModules.slice(0, 5).map((nm: any) => ({
      project: nm.projectName || path.basename(nm.projectPath),
      size: nm.sizeFormatted,
      packages: nm.packageCount,
      path: truncatePath(nm.projectPath, 40)
    }));

    const table = createTable(tableData, [
      { key: 'project', header: 'Project', width: 20 },
      { key: 'size', header: 'Size', width: 10, align: 'right' },
      { key: 'packages', header: 'Packages', width: 10, align: 'right' },
      { key: 'path', header: 'Path', width: 40 }
    ]);

    console.log(table);
  }

  if (duplicates && duplicates.packages.length > 0) {
    console.log('\n' + colors.bold('Duplicate Packages:'));
    console.log(`  Total duplicates: ${colors.red(duplicates.totalDuplicates.toString())}`);
    console.log(`  Potential savings: ${colors.green(fileUtils.formatBytes(duplicates.potentialSavings))}`);

    console.log('\n' + colors.bold('Top duplicated packages:'));
    for (const dup of duplicates.packages.slice(0, 5)) {
      console.log(`  • ${colors.cyan(dup.name)}`);
      console.log(`    Versions: ${dup.versions.join(', ')}`);
      console.log(`    Found in ${dup.locations.length} projects`);
      console.log(colors.gray(`    Potential savings: ${fileUtils.formatBytes(dup.potentialSavings)}`));
    }

    if (duplicates.packages.length > 5) {
      console.log(colors.gray(`\n  ... and ${duplicates.packages.length - 5} more duplicated packages`));
    }
  }

  if (statistics.oldestNodeModules.length > 0) {
    console.log('\n' + colors.bold('Oldest node_modules:'));
    for (const nm of statistics.oldestNodeModules.slice(0, 3)) {
      const age = Math.floor(
        (Date.now() - nm.lastModified.getTime()) / (1000 * 60 * 60 * 24)
      );
      console.log(`  • ${nm.projectPath}`);
      console.log(colors.gray(`    ${age} days old, ${nm.sizeFormatted}`));
    }
  }
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