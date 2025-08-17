import { 
  NodeModulesInfo, 
  DuplicatePackage, 
  DuplicateReport, 
  Statistics,
  AnalyzeOptions 
} from '../types/index';

export class Analyzer {
  async analyze(results: NodeModulesInfo[], options?: AnalyzeOptions): Promise<{
    results: NodeModulesInfo[];
    duplicates?: DuplicateReport;
    statistics: Statistics;
  }> {
    const opts: AnalyzeOptions = {
      sizeThreshold: 0,
      ageThreshold: 0,
      findDuplicates: true,
      ...options
    };

    let filteredResults = [...results];

    if (opts.sizeThreshold && opts.sizeThreshold > 0) {
      const threshold = opts.sizeThreshold;
      filteredResults = filteredResults.filter(r => r.size >= threshold);
    }

    if (opts.ageThreshold && opts.ageThreshold > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - opts.ageThreshold);
      filteredResults = filteredResults.filter(r => r.lastModified < cutoffDate);
    }

    const statistics = this.calculateStatistics(filteredResults);
    
    let duplicates: DuplicateReport | undefined;
    if (opts.findDuplicates) {
      duplicates = await this.analyzeDuplicates(filteredResults);
    }

    return {
      results: filteredResults,
      duplicates,
      statistics
    };
  }

  async analyzeDuplicates(results: NodeModulesInfo[]): Promise<DuplicateReport> {
    const packageMap = new Map<string, {
      versions: Set<string>;
      locations: string[];
      sizes: number[];
    }>();

    for (const nodeModules of results) {
      for (const pkg of nodeModules.packages) {
        if (!packageMap.has(pkg.name)) {
          packageMap.set(pkg.name, {
            versions: new Set(),
            locations: [],
            sizes: []
          });
        }
        
        const entry = packageMap.get(pkg.name)!;
        entry.versions.add(pkg.version);
        entry.locations.push(nodeModules.projectPath);
        entry.sizes.push(pkg.size);
      }
    }

    const duplicates: DuplicatePackage[] = [];
    let totalPotentialSavings = 0;

    for (const [name, data] of packageMap) {
      if (data.locations.length > 1) {
        const uniqueVersions = Array.from(data.versions);
        const totalSize = data.sizes.reduce((sum, size) => sum + size, 0);
        const avgSize = totalSize / data.sizes.length;
        const potentialSavings = totalSize - avgSize;

        duplicates.push({
          name,
          versions: uniqueVersions,
          locations: data.locations,
          totalSize,
          potentialSavings
        });

        totalPotentialSavings += potentialSavings;
      }
    }

    duplicates.sort((a, b) => b.potentialSavings - a.potentialSavings);

    return {
      totalDuplicates: duplicates.length,
      potentialSavings: totalPotentialSavings,
      packages: duplicates
    };
  }

  calculateStatistics(results: NodeModulesInfo[]): Statistics {
    const totalSize = results.reduce((sum, r) => sum + r.size, 0);
    const totalPackages = results.reduce((sum, r) => sum + r.packageCount, 0);
    const totalNodeModules = results.length;
    const averageSize = totalNodeModules > 0 ? totalSize / totalNodeModules : 0;

    const sortedBySize = [...results].sort((a, b) => b.size - a.size);
    const sortedByAge = [...results].sort(
      (a, b) => a.lastModified.getTime() - b.lastModified.getTime()
    );

    return {
      totalSize,
      totalPackages,
      totalNodeModules,
      averageSize,
      largestNodeModules: sortedBySize.slice(0, 10),
      oldestNodeModules: sortedByAge.slice(0, 10)
    };
  }

  findUnusedPackages(nodeModules: NodeModulesInfo): string[] {
    const unused: string[] = [];
    
    for (const pkg of nodeModules.packages) {
      const isDevDependency = pkg.name.includes('@types/') || 
                              pkg.name.includes('eslint') ||
                              pkg.name.includes('prettier') ||
                              pkg.name.includes('jest') ||
                              pkg.name.includes('webpack') ||
                              pkg.name.includes('babel');
      
      if (isDevDependency) {
        const daysSinceModified = 
          (Date.now() - nodeModules.lastModified.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceModified > 90) {
          unused.push(pkg.name);
        }
      }
    }
    
    return unused;
  }

  suggestCleanupTargets(results: NodeModulesInfo[]): NodeModulesInfo[] {
    const targets: NodeModulesInfo[] = [];
    
    for (const nodeModules of results) {
      const daysSinceModified = 
        (Date.now() - nodeModules.lastModified.getTime()) / (1000 * 60 * 60 * 24);
      
      const score = this.calculateCleanupScore(nodeModules, daysSinceModified);
      
      if (score >= 40) {
        targets.push(nodeModules);
      }
    }
    
    return targets.sort((a, b) => {
      const scoreA = this.calculateCleanupScore(
        a, 
        (Date.now() - a.lastModified.getTime()) / (1000 * 60 * 60 * 24)
      );
      const scoreB = this.calculateCleanupScore(
        b,
        (Date.now() - b.lastModified.getTime()) / (1000 * 60 * 60 * 24)
      );
      return scoreB - scoreA;
    });
  }

  private calculateCleanupScore(nodeModules: NodeModulesInfo, daysSinceModified: number): number {
    let score = 0;
    
    if (nodeModules.size > 500 * 1024 * 1024) score += 30;
    else if (nodeModules.size > 200 * 1024 * 1024) score += 20;
    else if (nodeModules.size > 100 * 1024 * 1024) score += 10;
    
    if (daysSinceModified > 180) score += 40;
    else if (daysSinceModified > 90) score += 30;
    else if (daysSinceModified > 30) score += 20;
    else if (daysSinceModified > 14) score += 10;
    
    if (nodeModules.packageCount > 1000) score += 20;
    else if (nodeModules.packageCount > 500) score += 10;
    
    const projectNameLower = (nodeModules.projectName || '').toLowerCase();
    if (projectNameLower.includes('test') || 
        projectNameLower.includes('temp') || 
        projectNameLower.includes('old') ||
        projectNameLower.includes('backup')) {
      score += 20;
    }
    
    return score;
  }

  generateReport(results: NodeModulesInfo[], statistics: Statistics): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(60));
    lines.push('NODE_MODULES ANALYSIS REPORT');
    lines.push('='.repeat(60));
    lines.push('');
    
    lines.push('SUMMARY');
    lines.push('-'.repeat(30));
    lines.push(`Total node_modules found: ${statistics.totalNodeModules}`);
    lines.push(`Total size: ${this.formatBytes(statistics.totalSize)}`);
    lines.push(`Total packages: ${statistics.totalPackages}`);
    lines.push(`Average size: ${this.formatBytes(statistics.averageSize)}`);
    lines.push('');
    
    lines.push('LARGEST NODE_MODULES');
    lines.push('-'.repeat(30));
    for (const nm of statistics.largestNodeModules.slice(0, 5)) {
      lines.push(`${nm.sizeFormatted.padEnd(10)} ${nm.projectPath}`);
    }
    lines.push('');
    
    lines.push('OLDEST NODE_MODULES');
    lines.push('-'.repeat(30));
    for (const nm of statistics.oldestNodeModules.slice(0, 5)) {
      const days = Math.floor(
        (Date.now() - nm.lastModified.getTime()) / (1000 * 60 * 60 * 24)
      );
      lines.push(`${days} days old - ${nm.projectPath}`);
    }
    lines.push('');
    
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export const analyzer = new Analyzer();