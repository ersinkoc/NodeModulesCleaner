import * as path from 'path';
import * as fs from 'fs/promises';
import { NodeModulesInfo, ScanOptions, PackageInfo } from '../types/index';
import { fileUtils } from '../lib/file-utils';
import { sizeCalculator } from './size-calculator';
import { glob } from '../lib/glob';

export class Scanner {
  async scan(rootPath: string, options?: ScanOptions): Promise<NodeModulesInfo[]> {
    const opts: ScanOptions = {
      maxDepth: 10,
      excludePaths: ['**/node_modules/node_modules/**'],
      includeHidden: false,
      parallel: true,
      showProgress: false,
      ...options
    };

    const nodeModulesPaths = await this.findNodeModules(rootPath, opts);
    
    if (opts.parallel) {
      return await this.scanParallel(nodeModulesPaths);
    } else {
      return await this.scanSequential(nodeModulesPaths);
    }
  }

  private async findNodeModules(rootPath: string, options: ScanOptions): Promise<string[]> {
    const results: string[] = [];
    const visited = new Set<string>();
    
    const shouldExclude = (dirPath: string): boolean => {
      if (!options.includeHidden) {
        const parts = dirPath.split(path.sep);
        if (parts.some(part => part.startsWith('.') && part !== '.')) {
          return true;
        }
      }
      
      if (options.excludePaths) {
        for (const pattern of options.excludePaths) {
          if (glob.isMatch(dirPath, pattern)) {
            return true;
          }
        }
      }
      
      return false;
    };

    const walk = async (currentPath: string, depth: number = 0): Promise<void> => {
      if (depth > (options.maxDepth || 10)) return;
      
      const normalizedPath = path.normalize(currentPath);
      if (visited.has(normalizedPath)) return;
      visited.add(normalizedPath);

      try {
        const entries = await fileUtils.readDirectoryWithTypes(currentPath);
        
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          
          const fullPath = path.join(currentPath, entry.name);
          
          if (shouldExclude(fullPath)) continue;
          
          if (entry.name === 'node_modules') {
            results.push(fullPath);
            continue;
          }
          
          await walk(fullPath, depth + 1);
        }
      } catch (error) {
        console.error(`Error scanning ${currentPath}:`, error);
      }
    };

    await walk(rootPath);
    return results;
  }

  private async scanParallel(paths: string[]): Promise<NodeModulesInfo[]> {
    const promises = paths.map(p => this.scanSingleNodeModules(p));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<NodeModulesInfo>).value)
      .filter(r => r !== null) as NodeModulesInfo[];
  }

  private async scanSequential(paths: string[]): Promise<NodeModulesInfo[]> {
    const results: NodeModulesInfo[] = [];
    
    for (const p of paths) {
      const info = await this.scanSingleNodeModules(p);
      if (info) {
        results.push(info);
      }
    }
    
    return results;
  }

  private async scanSingleNodeModules(nodeModulesPath: string): Promise<NodeModulesInfo | null> {
    try {
      const stats = await fileUtils.getStats(nodeModulesPath);
      if (!stats) return null;

      const size = await sizeCalculator.calculateDirSize(nodeModulesPath);
      const packages = await this.getPackages(nodeModulesPath);
      const projectPath = path.dirname(nodeModulesPath);
      const projectName = await this.getProjectName(projectPath);

      return {
        path: nodeModulesPath,
        size,
        sizeFormatted: fileUtils.formatBytes(size),
        packageCount: packages.length,
        lastModified: stats.mtime,
        packages,
        projectName,
        projectPath
      };
    } catch (error) {
      console.error(`Error scanning ${nodeModulesPath}:`, error);
      return null;
    }
  }

  private async getPackages(nodeModulesPath: string): Promise<PackageInfo[]> {
    const packages: PackageInfo[] = [];
    
    try {
      const entries = await fileUtils.readDirectoryWithTypes(nodeModulesPath);
      
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        
        const packagePath = path.join(nodeModulesPath, entry.name);
        
        if (entry.name.startsWith('@')) {
          const scopedEntries = await fileUtils.readDirectoryWithTypes(packagePath);
          for (const scopedEntry of scopedEntries) {
            if (scopedEntry.isDirectory()) {
              const scopedPackagePath = path.join(packagePath, scopedEntry.name);
              const info = await this.getPackageInfo(scopedPackagePath, `${entry.name}/${scopedEntry.name}`);
              if (info) packages.push(info);
            }
          }
        } else {
          const info = await this.getPackageInfo(packagePath, entry.name);
          if (info) packages.push(info);
        }
      }
    } catch (error) {
      console.error(`Error reading packages from ${nodeModulesPath}:`, error);
    }
    
    return packages;
  }

  private async getPackageInfo(packagePath: string, packageName: string): Promise<PackageInfo | null> {
    try {
      const packageJsonPath = path.join(packagePath, 'package.json');
      
      if (!await fileUtils.exists(packageJsonPath)) {
        return null;
      }
      
      const packageJson = await fileUtils.readJson(packageJsonPath);
      const size = await sizeCalculator.calculateDirSize(packagePath);
      
      return {
        name: packageName,
        version: packageJson.version || 'unknown',
        size,
        dependencies: Object.keys(packageJson.dependencies || {}).length +
                     Object.keys(packageJson.devDependencies || {}).length,
        path: packagePath
      };
    } catch {
      return null;
    }
  }

  private async getProjectName(projectPath: string): Promise<string | undefined> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      
      if (await fileUtils.exists(packageJsonPath)) {
        const packageJson = await fileUtils.readJson(packageJsonPath);
        return packageJson.name;
      }
    } catch {}
    
    return path.basename(projectPath);
  }

  async findAllProjects(rootPath: string, maxDepth: number = 5): Promise<string[]> {
    const projects: string[] = [];
    const visited = new Set<string>();
    
    const walk = async (currentPath: string, depth: number = 0): Promise<void> => {
      if (depth > maxDepth) return;
      
      const normalizedPath = path.normalize(currentPath);
      if (visited.has(normalizedPath)) return;
      visited.add(normalizedPath);
      
      const packageJsonPath = path.join(currentPath, 'package.json');
      if (await fileUtils.exists(packageJsonPath)) {
        projects.push(currentPath);
      }
      
      try {
        const entries = await fileUtils.readDirectoryWithTypes(currentPath);
        
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (entry.name === 'node_modules') continue;
          if (entry.name.startsWith('.')) continue;
          
          const fullPath = path.join(currentPath, entry.name);
          await walk(fullPath, depth + 1);
        }
      } catch {}
    };
    
    await walk(rootPath);
    return projects;
  }
}

export const scanner = new Scanner();