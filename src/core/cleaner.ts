import * as path from 'path';
import { NodeModulesInfo, CleanOptions } from '../types/index.js';
import { fileUtils } from '../lib/file-utils.js';
import { colors } from '../cli/colors.js';

export class Cleaner {
  async clean(
    targets: NodeModulesInfo[], 
    options?: CleanOptions
  ): Promise<{
    cleaned: string[];
    failed: string[];
    savedSpace: number;
  }> {
    const opts: CleanOptions = {
      dryRun: false,
      backup: false,
      force: false,
      interactive: false,
      ...options
    };

    const cleaned: string[] = [];
    const failed: string[] = [];
    let savedSpace = 0;

    for (const target of targets) {
      try {
        if (opts.dryRun) {
          console.log(colors.yellow(`[DRY RUN] Would delete: ${target.path}`));
          console.log(colors.gray(`  Size: ${target.sizeFormatted}`));
          console.log(colors.gray(`  Packages: ${target.packageCount}`));
          savedSpace += target.size;
          cleaned.push(target.path);
        } else {
          if (opts.backup) {
            await this.backup(target.path);
          }

          await this.deleteNodeModules(target.path, opts.force);
          
          savedSpace += target.size;
          cleaned.push(target.path);
          
          console.log(colors.success(`Deleted: ${target.path}`));
          console.log(colors.gray(`  Freed: ${target.sizeFormatted}`));
        }
      } catch (error) {
        failed.push(target.path);
        console.error(colors.error(`Failed to delete: ${target.path}`));
        console.error(colors.gray(`  Error: ${error}`));
      }
    }

    return {
      cleaned,
      failed,
      savedSpace
    };
  }

  async cleanSingle(
    nodeModulesPath: string,
    options?: CleanOptions
  ): Promise<boolean> {
    const opts: CleanOptions = {
      dryRun: false,
      backup: false,
      force: false,
      ...options
    };

    try {
      if (!await fileUtils.exists(nodeModulesPath)) {
        console.log(colors.warning(`Path does not exist: ${nodeModulesPath}`));
        return false;
      }

      if (opts.dryRun) {
        console.log(colors.yellow(`[DRY RUN] Would delete: ${nodeModulesPath}`));
        return true;
      }

      if (opts.backup) {
        await this.backup(nodeModulesPath);
      }

      await this.deleteNodeModules(nodeModulesPath, opts.force);
      console.log(colors.success(`Deleted: ${nodeModulesPath}`));
      
      return true;
    } catch (error) {
      console.error(colors.error(`Failed to delete: ${nodeModulesPath}`));
      console.error(colors.gray(`  Error: ${error}`));
      return false;
    }
  }

  private async deleteNodeModules(nodeModulesPath: string, force: boolean = false): Promise<void> {
    if (!force) {
      const isNodeModules = path.basename(nodeModulesPath) === 'node_modules';
      if (!isNodeModules) {
        throw new Error('Path is not a node_modules directory. Use --force to override.');
      }
    }

    await fileUtils.removeDirectory(nodeModulesPath, { recursive: true, force: true });
  }

  private async backup(nodeModulesPath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const projectPath = path.dirname(nodeModulesPath);
    const projectName = path.basename(projectPath);
    
    const tmpDir = await fileUtils.getTempDirectory();
    const backupPath = path.join(tmpDir, `${projectName}_node_modules_${timestamp}`);
    
    console.log(colors.info(`Creating backup at: ${backupPath}`));
    
    await fileUtils.copyDirectory(nodeModulesPath, backupPath);
    
    console.log(colors.success(`Backup created successfully`));
    
    return backupPath;
  }

  async cleanByAge(
    rootPath: string,
    ageInDays: number,
    options?: CleanOptions
  ): Promise<{
    cleaned: string[];
    failed: string[];
    savedSpace: number;
  }> {
    const { scanner } = await import('./scanner.js');
    const results = await scanner.scan(rootPath);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
    
    const oldTargets = results.filter(r => r.lastModified < cutoffDate);
    
    console.log(colors.info(`Found ${oldTargets.length} node_modules older than ${ageInDays} days`));
    
    return await this.clean(oldTargets, options);
  }

  async cleanBySize(
    rootPath: string,
    sizeThresholdMB: number,
    options?: CleanOptions
  ): Promise<{
    cleaned: string[];
    failed: string[];
    savedSpace: number;
  }> {
    const { scanner } = await import('./scanner.js');
    const results = await scanner.scan(rootPath);
    
    const sizeThreshold = sizeThresholdMB * 1024 * 1024;
    const largeTargets = results.filter(r => r.size >= sizeThreshold);
    
    console.log(colors.info(`Found ${largeTargets.length} node_modules larger than ${sizeThresholdMB}MB`));
    
    return await this.clean(largeTargets, options);
  }

  async cleanDuplicates(
    rootPath: string,
    options?: CleanOptions
  ): Promise<{
    cleaned: string[];
    failed: string[];
    savedSpace: number;
  }> {
    const { scanner } = await import('./scanner.js');
    const { analyzer } = await import('./analyzer.js');
    
    const results = await scanner.scan(rootPath);
    const duplicates = await analyzer.analyzeDuplicates(results);
    
    const targetsToClean: NodeModulesInfo[] = [];
    
    for (const dup of duplicates.packages) {
      if (dup.locations.length > 1) {
        const sortedLocations = results
          .filter(r => dup.locations.includes(r.projectPath))
          .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
        
        if (sortedLocations.length > 1) {
          targetsToClean.push(...sortedLocations.slice(1));
        }
      }
    }
    
    console.log(colors.info(`Found ${targetsToClean.length} duplicate node_modules to clean`));
    
    return await this.clean(targetsToClean, options);
  }

  async validateBeforeClean(nodeModulesPath: string): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    if (!await fileUtils.exists(nodeModulesPath)) {
      return { valid: false, reason: 'Path does not exist' };
    }

    if (!await fileUtils.isDirectory(nodeModulesPath)) {
      return { valid: false, reason: 'Path is not a directory' };
    }

    const basename = path.basename(nodeModulesPath);
    if (basename !== 'node_modules') {
      return { valid: false, reason: 'Directory is not named node_modules' };
    }

    const projectPath = path.dirname(nodeModulesPath);
    const gitPath = path.join(projectPath, '.git');
    
    if (await fileUtils.exists(gitPath)) {
      const gitignorePath = path.join(projectPath, '.gitignore');
      if (await fileUtils.exists(gitignorePath)) {
        const gitignore = await fileUtils.readFile(gitignorePath);
        if (!gitignore.includes('node_modules')) {
          return { 
            valid: false, 
            reason: 'node_modules is not in .gitignore - may be tracked by git' 
          };
        }
      }
    }

    return { valid: true };
  }
}

export const cleaner = new Cleaner();