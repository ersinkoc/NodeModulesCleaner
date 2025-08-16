import * as fs from 'fs/promises';
import * as path from 'path';
import { constants, Stats, Dirent } from 'fs';

export class FileUtils {
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async isDirectory(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async isFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  async isSymlink(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.lstat(filePath);
      return stats.isSymbolicLink();
    } catch {
      return false;
    }
  }

  async getStats(filePath: string): Promise<Stats | null> {
    try {
      return await fs.stat(filePath);
    } catch {
      return null;
    }
  }

  async removeDirectory(dirPath: string, options?: { force?: boolean; recursive?: boolean }): Promise<void> {
    const opts = { force: true, recursive: true, ...options };
    
    if (!await this.exists(dirPath)) {
      if (!opts.force) {
        throw new Error(`Directory does not exist: ${dirPath}`);
      }
      return;
    }

    if (opts.recursive) {
      await fs.rm(dirPath, { recursive: true, force: opts.force });
    } else {
      await fs.rmdir(dirPath);
    }
  }

  async copyDirectory(src: string, dest: string): Promise<void> {
    await this.ensureDirectory(dest);
    
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else if (entry.isFile()) {
        await fs.copyFile(srcPath, destPath);
      } else if (entry.isSymbolicLink()) {
        const link = await fs.readlink(srcPath);
        await fs.symlink(link, destPath);
      }
    }
  }

  async moveDirectory(src: string, dest: string): Promise<void> {
    try {
      await fs.rename(src, dest);
    } catch (error: any) {
      if (error.code === 'EXDEV') {
        await this.copyDirectory(src, dest);
        await this.removeDirectory(src);
      } else {
        throw error;
      }
    }
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async readDirectory(dirPath: string): Promise<string[]> {
    try {
      return await fs.readdir(dirPath);
    } catch {
      return [];
    }
  }

  async readDirectoryWithTypes(dirPath: string): Promise<Dirent[]> {
    try {
      return await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return [];
    }
  }

  async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    return await fs.readFile(filePath, encoding);
  }

  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    await fs.writeFile(filePath, content);
  }

  async appendFile(filePath: string, content: string | Buffer): Promise<void> {
    await fs.appendFile(filePath, content);
  }

  async readJson(filePath: string): Promise<any> {
    const content = await this.readFile(filePath);
    return JSON.parse(content);
  }

  async writeJson(filePath: string, data: any, indent: number = 2): Promise<void> {
    const content = JSON.stringify(data, null, indent);
    await this.writeFile(filePath, content);
  }

  async getFileSize(filePath: string): Promise<number> {
    const stats = await this.getStats(filePath);
    return stats?.size || 0;
  }

  async getModifiedTime(filePath: string): Promise<Date | null> {
    const stats = await this.getStats(filePath);
    return stats?.mtime || null;
  }

  async walkDirectory(
    dirPath: string,
    callback: (filePath: string, stats: Stats) => Promise<void> | void,
    options?: { followSymlinks?: boolean; maxDepth?: number }
  ): Promise<void> {
    const opts = { followSymlinks: false, maxDepth: Infinity, ...options };
    
    async function walk(currentPath: string, depth: number): Promise<void> {
      if (depth > opts.maxDepth) return;
      
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          const stats = await fs.stat(fullPath);
          await callback(fullPath, stats);
          await walk(fullPath, depth + 1);
        } else if (entry.isFile() || (opts.followSymlinks && entry.isSymbolicLink())) {
          const stats = await fs.stat(fullPath);
          await callback(fullPath, stats);
        }
      }
    }
    
    await walk(dirPath, 0);
  }

  formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async getTempDirectory(): Promise<string> {
    const tmpDir = process.platform === 'win32' 
      ? process.env.TEMP || process.env.TMP || 'C:\\Temp'
      : '/tmp';
    
    const nmcTmpDir = path.join(tmpDir, 'nmc');
    await this.ensureDirectory(nmcTmpDir);
    return nmcTmpDir;
  }
}

export const fileUtils = new FileUtils();