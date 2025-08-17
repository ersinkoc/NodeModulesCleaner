import * as path from 'path';
import { NodeModulesInfo, CleanOptions } from '../types/index';
import { fileUtils } from '../lib/file-utils';
import { colors } from '../cli/colors';

export class Cleaner {
  async clean(
    targets: NodeModulesInfo[] | string[], 
    options?: CleanOptions
  ): Promise<{
    cleaned: string[];
    failed: string[];
    savedSpace: number;
    success?: boolean;
    deletedCount?: number;
    totalSizeFreed?: number;
    errors?: string[];
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
    const errors: string[] = [];
    let savedSpace = 0;

    // Convert string[] to NodeModulesInfo[] if needed
    let nodeModulesInfos: NodeModulesInfo[];
    if (targets.length > 0 && typeof targets[0] === 'string') {
      const { SizeCalculator } = await import('./size-calculator');
      const sizeCalc = new SizeCalculator();
      
      nodeModulesInfos = [];
      for (const targetPath of targets as string[]) {
        try {
          if (!await fileUtils.exists(targetPath)) {
            errors.push(`Path not found: ${targetPath}`);
            failed.push(targetPath);
            continue;
          }
          
          const size = await sizeCalc.calculateDirSize(targetPath);
          const packageCount = await this.countPackages(targetPath);
          
          nodeModulesInfos.push({
            path: targetPath,
            size,
            sizeFormatted: sizeCalc.formatSize(size),
            packageCount,
            lastModified: new Date(),
            packages: [],
            projectPath: path.dirname(targetPath),
            projectName: path.basename(path.dirname(targetPath))
          });
        } catch (error) {
          errors.push(`Failed to process ${targetPath}: ${error}`);
          failed.push(targetPath);
        }
      }
    } else {
      nodeModulesInfos = targets as NodeModulesInfo[];
    }

    for (const target of nodeModulesInfos) {
      try {
        if (opts.dryRun) {
          console.log(colors.yellow(`[DRY RUN] Would delete: ${target.path}`));
          console.log(colors.gray(`  Size: ${target.sizeFormatted}`));
          console.log(colors.gray(`  Packages: ${target.packageCount}`));
          // Don't count as cleaned in dry run
          // savedSpace += target.size;
          // cleaned.push(target.path);
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
        errors.push(`Failed to delete ${target.path}: ${error}`);
        console.error(colors.error(`Failed to delete: ${target.path}`));
        console.error(colors.gray(`  Error: ${error}`));
      }
    }

    return {
      cleaned,
      failed,
      savedSpace,
      success: true,  // Always return success, errors are in the errors array
      deletedCount: cleaned.length,
      totalSizeFreed: savedSpace,
      errors
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

  async backup(nodeModulesPath: string): Promise<string> {
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

  async cleanFromInfo(infos: NodeModulesInfo[]): Promise<any> {
    return this.clean(infos);
  }

  async calculateSize(dirPath: string): Promise<number> {
    try {
      const { sizeCalculator } = await import('./size-calculator');
      return await sizeCalculator.calculateDirSize(dirPath);
    } catch {
      return 0;
    }
  }
  
  private async countPackages(nodeModulesPath: string): Promise<number> {
    try {
      const entries = await fileUtils.readDirectory(nodeModulesPath);
      return entries.filter(entry => !entry.startsWith('.')).length;
    } catch {
      return 0;
    }
  }
  
  async deleteDirectory(dirPath: string): Promise<void> {
    if (!await fileUtils.exists(dirPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }
    await fileUtils.removeDirectory(dirPath, { recursive: true, force: true });
  }
  
  async cleanPackageLockFiles(projectPaths: string[]): Promise<{ cleaned: string[]; failed: string[]; deletedCount?: number; errors?: string[] }> {
    const cleaned: string[] = [];
    const failed: string[] = [];
    const errors: string[] = [];
    
    for (const projectPath of projectPaths) {
      try {
        const lockFile = path.join(projectPath, 'package-lock.json');
        if (await fileUtils.exists(lockFile)) {
          await fileUtils.deleteFile(lockFile);
          cleaned.push(lockFile);
        }
      } catch (error) {
        failed.push(projectPath);
        errors.push(`Failed to delete lock file in ${projectPath}: ${error}`);
      }
    }
    
    return { cleaned, failed, deletedCount: cleaned.length, errors };
  }
  
  async cleanYarnLockFiles(projectPaths: string[]): Promise<{ cleaned: string[]; failed: string[]; deletedCount?: number; errors?: string[] }> {
    const cleaned: string[] = [];
    const failed: string[] = [];
    const errors: string[] = [];
    
    for (const projectPath of projectPaths) {
      try {
        const lockFile = path.join(projectPath, 'yarn.lock');
        if (await fileUtils.exists(lockFile)) {
          await fileUtils.deleteFile(lockFile);
          cleaned.push(lockFile);
        }
      } catch (error) {
        failed.push(projectPath);
        errors.push(`Failed to delete lock file in ${projectPath}: ${error}`);
      }
    }
    
    return { cleaned, failed, deletedCount: cleaned.length, errors };
  }
  
  async cleanNpmCache(): Promise<{ success: boolean; message: string; sizeFreed?: number }> {
    try {
      const { execSync } = await import('child_process');
      execSync('npm cache clean --force', { stdio: 'pipe' });
      return { success: true, message: 'NPM cache cleaned successfully', sizeFreed: 0 };
    } catch (error) {
      return { success: false, message: `Failed to clean NPM cache: ${error}`, sizeFreed: 0 };
    }
  }
  
  async cleanYarnCache(): Promise<{ success: boolean; message: string; sizeFreed?: number }> {
    try {
      const { execSync } = await import('child_process');
      execSync('yarn cache clean', { stdio: 'pipe' });
      return { success: true, message: 'Yarn cache cleaned successfully', sizeFreed: 0 };
    } catch (error) {
      return { success: false, message: `Failed to clean Yarn cache: ${error}`, sizeFreed: 0 };
    }
  }
  
  getBackupPath(originalPath: string): string {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').replace(/\..+/, '').substring(0, 14);
    const projectName = path.basename(path.dirname(originalPath));
    return path.join(fileUtils.getTempDirectorySync(), `${projectName}_node_modules.backup.${timestamp}`);
  }
  
  async restore(backupPath: string, targetPath: string): Promise<void> {
    if (!await fileUtils.exists(backupPath)) {
      throw new Error(`Backup not found: ${backupPath}`);
    }
    
    // Remove existing if it exists
    if (await fileUtils.exists(targetPath)) {
      await fileUtils.removeDirectory(targetPath, { recursive: true, force: true });
    }
    
    // Copy backup to target
    await fileUtils.copyDirectory(backupPath, targetPath);
  }
}

export const cleaner = new Cleaner();