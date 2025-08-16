import * as fs from 'fs/promises';
import * as path from 'path';
import { ProgressCallback } from '../types/index.js';

export class SizeCalculator {
  private cache = new Map<string, { size: number; timestamp: number }>();
  private cacheTimeout = 60000;

  async calculateDirSize(dirPath: string): Promise<number> {
    const cached = this.cache.get(dirPath);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.size;
    }

    let totalSize = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      const promises = entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);

        try {
          if (entry.isDirectory()) {
            return await this.calculateDirSize(fullPath);
          } else if (entry.isFile()) {
            const stats = await fs.stat(fullPath);
            return stats.size;
          } else if (entry.isSymbolicLink()) {
            try {
              const stats = await fs.stat(fullPath);
              return stats.size;
            } catch {
              return 0;
            }
          }
          return 0;
        } catch (error) {
          console.error(`Error calculating size for ${fullPath}:`, error);
          return 0;
        }
      });

      const sizes = await Promise.all(promises);
      totalSize = sizes.reduce((sum, size) => sum + size, 0);

      this.cache.set(dirPath, { size: totalSize, timestamp: Date.now() });
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }

    return totalSize;
  }

  async calculateWithProgress(
    dirPath: string,
    callback: ProgressCallback
  ): Promise<number> {
    let processedFiles = 0;
    let totalFiles = 0;
    let totalSize = 0;

    const countFiles = async (dir: string): Promise<number> => {
      let count = 0;
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            count += await countFiles(path.join(dir, entry.name));
          } else {
            count++;
          }
        }
      } catch {}
      return count;
    };

    totalFiles = await countFiles(dirPath);

    const processDirectory = async (dir: string): Promise<number> => {
      let size = 0;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          try {
            if (entry.isDirectory()) {
              size += await processDirectory(fullPath);
            } else if (entry.isFile()) {
              const stats = await fs.stat(fullPath);
              size += stats.size;
              processedFiles++;
              callback(processedFiles, totalFiles, `Processing: ${entry.name}`);
            }
          } catch {}
        }
      } catch {}

      return size;
    };

    totalSize = await processDirectory(dirPath);
    callback(totalFiles, totalFiles, 'Complete');

    return totalSize;
  }

  async calculateMultiple(dirPaths: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    
    const promises = dirPaths.map(async (dirPath) => {
      const size = await this.calculateDirSize(dirPath);
      return { path: dirPath, size };
    });

    const sizes = await Promise.all(promises);
    
    for (const { path: dirPath, size } of sizes) {
      results.set(dirPath, size);
    }

    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }

  setCacheTimeout(ms: number): void {
    this.cacheTimeout = ms;
  }

  async getDirectoryStats(dirPath: string): Promise<{
    totalSize: number;
    fileCount: number;
    directoryCount: number;
    largestFile: { path: string; size: number } | null;
    averageFileSize: number;
  }> {
    let totalSize = 0;
    let fileCount = 0;
    let directoryCount = 0;
    let largestFile: { path: string; size: number } | null = null;

    const processDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            directoryCount++;
            await processDirectory(fullPath);
          } else if (entry.isFile()) {
            try {
              const stats = await fs.stat(fullPath);
              totalSize += stats.size;
              fileCount++;

              if (!largestFile || stats.size > largestFile.size) {
                largestFile = { path: fullPath, size: stats.size };
              }
            } catch {}
          }
        }
      } catch {}
    };

    await processDirectory(dirPath);

    return {
      totalSize,
      fileCount,
      directoryCount,
      largestFile,
      averageFileSize: fileCount > 0 ? totalSize / fileCount : 0
    };
  }
}

export const sizeCalculator = new SizeCalculator();