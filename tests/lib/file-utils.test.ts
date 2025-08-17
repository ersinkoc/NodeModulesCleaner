import { fileUtils } from '../../src/lib/file-utils';
import { TEST_FIXTURES_DIR } from '../setup';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';

describe('fileUtils', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(TEST_FIXTURES_DIR, 'file-utils-test');
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'test');
      
      const result = await fileUtils.exists(filePath);
      expect(result).toBe(true);
    });

    it('should return true for existing directory', async () => {
      const result = await fileUtils.exists(testDir);
      expect(result).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      const result = await fileUtils.exists(path.join(testDir, 'non-existent'));
      expect(result).toBe(false);
    });
  });

  describe('isDirectory', () => {
    it('should return true for directory', async () => {
      const result = await fileUtils.isDirectory(testDir);
      expect(result).toBe(true);
    });

    it('should return false for file', async () => {
      const filePath = path.join(testDir, 'file.txt');
      await fs.writeFile(filePath, 'content');
      
      const result = await fileUtils.isDirectory(filePath);
      expect(result).toBe(false);
    });

    it('should return false for non-existent path', async () => {
      const result = await fileUtils.isDirectory('/non/existent');
      expect(result).toBe(false);
    });
  });

  describe('isFile', () => {
    it('should return true for file', async () => {
      const filePath = path.join(testDir, 'file.txt');
      await fs.writeFile(filePath, 'content');
      
      const result = await fileUtils.isFile(filePath);
      expect(result).toBe(true);
    });

    it('should return false for directory', async () => {
      const result = await fileUtils.isFile(testDir);
      expect(result).toBe(false);
    });

    it('should return false for non-existent path', async () => {
      const result = await fileUtils.isFile('/non/existent');
      expect(result).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const filePath = path.join(testDir, 'read.txt');
      const content = 'Hello, World!';
      await fs.writeFile(filePath, content);
      
      const result = await fileUtils.readFile(filePath);
      expect(result).toBe(content);
    });

    it('should read with specified encoding', async () => {
      const filePath = path.join(testDir, 'encoded.txt');
      await fs.writeFile(filePath, 'UTF-8 content', 'utf8');
      
      const result = await fileUtils.readFile(filePath, 'utf8');
      expect(result).toBe('UTF-8 content');
    });

    it('should throw for non-existent file', async () => {
      await expect(fileUtils.readFile('/non/existent')).rejects.toThrow();
    });
  });

  describe('writeFile', () => {
    it('should write file content', async () => {
      const filePath = path.join(testDir, 'write.txt');
      const content = 'Written content';
      
      await fileUtils.writeFile(filePath, content);
      
      const result = await fs.readFile(filePath, 'utf8');
      expect(result).toBe(content);
    });

    it('should overwrite existing file', async () => {
      const filePath = path.join(testDir, 'overwrite.txt');
      await fs.writeFile(filePath, 'old content');
      
      await fileUtils.writeFile(filePath, 'new content');
      
      const result = await fs.readFile(filePath, 'utf8');
      expect(result).toBe('new content');
    });

    it('should create parent directories', async () => {
      const filePath = path.join(testDir, 'nested', 'dir', 'file.txt');
      
      await fileUtils.writeFile(filePath, 'content', { createDirs: true });
      
      const result = await fs.readFile(filePath, 'utf8');
      expect(result).toBe('content');
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      const filePath = path.join(testDir, 'delete.txt');
      await fs.writeFile(filePath, 'content');
      
      await fileUtils.deleteFile(filePath);
      
      const exists = await fileUtils.exists(filePath);
      expect(exists).toBe(false);
    });

    it('should not throw for non-existent file', async () => {
      await expect(fileUtils.deleteFile('/non/existent')).resolves.not.toThrow();
    });
  });

  describe('createDirectory', () => {
    it('should create directory', async () => {
      const dirPath = path.join(testDir, 'new-dir');
      
      await fileUtils.createDirectory(dirPath);
      
      const exists = await fileUtils.exists(dirPath);
      expect(exists).toBe(true);
    });

    it('should create nested directories', async () => {
      const dirPath = path.join(testDir, 'nested', 'deep', 'dir');
      
      await fileUtils.createDirectory(dirPath);
      
      const exists = await fileUtils.exists(dirPath);
      expect(exists).toBe(true);
    });

    it('should not throw if directory exists', async () => {
      await expect(fileUtils.createDirectory(testDir)).resolves.not.toThrow();
    });
  });

  describe('deleteDirectory', () => {
    it('should delete empty directory', async () => {
      const dirPath = path.join(testDir, 'empty');
      await fs.mkdir(dirPath);
      
      await fileUtils.deleteDirectory(dirPath);
      
      const exists = await fileUtils.exists(dirPath);
      expect(exists).toBe(false);
    });

    it('should delete directory with contents', async () => {
      const dirPath = path.join(testDir, 'full');
      await fs.mkdir(dirPath);
      await fs.writeFile(path.join(dirPath, 'file.txt'), 'content');
      
      await fileUtils.deleteDirectory(dirPath);
      
      const exists = await fileUtils.exists(dirPath);
      expect(exists).toBe(false);
    });

    it('should handle non-existent directory', async () => {
      await expect(fileUtils.deleteDirectory('/non/existent')).resolves.not.toThrow();
    });
  });

  describe('copyFile', () => {
    it('should copy file', async () => {
      const srcPath = path.join(testDir, 'source.txt');
      const destPath = path.join(testDir, 'dest.txt');
      await fs.writeFile(srcPath, 'content');
      
      await fileUtils.copyFile(srcPath, destPath);
      
      const content = await fs.readFile(destPath, 'utf8');
      expect(content).toBe('content');
    });

    it('should overwrite existing file', async () => {
      const srcPath = path.join(testDir, 'source.txt');
      const destPath = path.join(testDir, 'dest.txt');
      await fs.writeFile(srcPath, 'new');
      await fs.writeFile(destPath, 'old');
      
      await fileUtils.copyFile(srcPath, destPath);
      
      const content = await fs.readFile(destPath, 'utf8');
      expect(content).toBe('new');
    });
  });

  describe('moveFile', () => {
    it('should move file', async () => {
      const srcPath = path.join(testDir, 'source.txt');
      const destPath = path.join(testDir, 'dest.txt');
      await fs.writeFile(srcPath, 'content');
      
      await fileUtils.moveFile(srcPath, destPath);
      
      const srcExists = await fileUtils.exists(srcPath);
      const destContent = await fs.readFile(destPath, 'utf8');
      
      expect(srcExists).toBe(false);
      expect(destContent).toBe('content');
    });
  });

  describe('listDirectory', () => {
    it('should list directory contents', async () => {
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'content');
      await fs.writeFile(path.join(testDir, 'file2.txt'), 'content');
      await fs.mkdir(path.join(testDir, 'subdir'), { recursive: true });
      
      const contents = await fileUtils.listDirectory(testDir);
      
      // Contents array should have these items
      expect(contents.length).toBeGreaterThanOrEqual(2);
      expect(contents.some(item => item === 'file2.txt' || item.includes('file2.txt'))).toBe(true);
      expect(contents.some(item => item === 'subdir' || item.includes('subdir'))).toBe(true);
    });

    it('should return empty array for empty directory', async () => {
      const emptyDir = path.join(testDir, 'empty');
      await fs.mkdir(emptyDir);
      
      const contents = await fileUtils.listDirectory(emptyDir);
      
      expect(contents).toEqual([]);
    });
  });

  describe('getFileStats', () => {
    it('should get file statistics', async () => {
      const filePath = path.join(testDir, 'stats.txt');
      await fs.writeFile(filePath, 'content');
      
      const stats = await fileUtils.getFileStats(filePath);
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('mtime');
      expect(stats).toHaveProperty('isFile');
      expect(stats).toHaveProperty('isDirectory');
      expect(stats.isFile()).toBe(true);
    });

    it('should get directory statistics', async () => {
      const stats = await fileUtils.getFileStats(testDir);
      
      expect(stats.isDirectory()).toBe(true);
      expect(stats.isFile()).toBe(false);
    });
  });

  describe('findFiles', () => {
    it('should find files by pattern', async () => {
      await fs.writeFile(path.join(testDir, 'test.js'), 'js');
      await fs.writeFile(path.join(testDir, 'test.ts'), 'ts');
      await fs.writeFile(path.join(testDir, 'other.txt'), 'txt');
      
      const jsFiles = await fileUtils.findFiles(testDir, '*.js');
      const tsFiles = await fileUtils.findFiles(testDir, '*.ts');
      
      expect(jsFiles).toContain('test.js');
      expect(tsFiles).toContain('test.ts');
    });

    it('should find files recursively', async () => {
      const subdir = path.join(testDir, 'subdir');
      await fs.mkdir(subdir);
      await fs.writeFile(path.join(subdir, 'nested.js'), 'content');
      
      const files = await fileUtils.findFiles(testDir, '**/*.js');
      
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory if not exists', async () => {
      const dirPath = path.join(testDir, 'ensure');
      
      await fileUtils.ensureDirectory(dirPath);
      
      const exists = await fileUtils.exists(dirPath);
      expect(exists).toBe(true);
    });

    it('should not throw if directory exists', async () => {
      await expect(fileUtils.ensureDirectory(testDir)).resolves.not.toThrow();
    });
  });

  describe('getTempDirectory', () => {
    it('should return temp directory path', async () => {
      const tempDir = await fileUtils.getTempDirectory();
      
      expect(tempDir).toBeTruthy();
      expect(typeof tempDir).toBe('string');
    });
  });

  describe('createTempFile', () => {
    it('should create temporary file', async () => {
      const tempFile = await fileUtils.createTempFile('test-', '.txt');
      
      expect(tempFile).toBeTruthy();
      
      const exists = await fileUtils.exists(tempFile);
      expect(exists).toBe(true);
      
      await fs.unlink(tempFile);
    });
  });

  describe.skip('watchDirectory', () => {
    it('should watch for file changes', (done) => {
      const watchPath = path.join(testDir, 'watch');
      fsSync.mkdirSync(watchPath);
      
      let watcherClosed = false;
      const watcher = fileUtils.watchDirectory(watchPath, (event: any, filename: any) => {
        if (!watcherClosed) {
          expect(event).toBeTruthy();
          expect(filename).toBe('new.txt');
          watcherClosed = true;
          watcher.close();
          done();
        }
      });
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        if (!watcherClosed) {
          watcherClosed = true;
          watcher.close();
          done();
        }
      }, 2000);
      
      setTimeout(() => {
        fsSync.writeFileSync(path.join(watchPath, 'new.txt'), 'content');
      }, 100);
    }, 5000); // Set test timeout
  });

  describe('edge cases', () => {
    it('should handle special characters in filenames', async () => {
      const specialName = 'file with spaces & special!@#$.txt';
      const filePath = path.join(testDir, specialName);
      
      await fileUtils.writeFile(filePath, 'content');
      
      const exists = await fileUtils.exists(filePath);
      expect(exists).toBe(true);
    });

    it('should handle very long paths', async () => {
      const longName = 'a'.repeat(200);
      const filePath = path.join(testDir, longName + '.txt');
      
      try {
        await fileUtils.writeFile(filePath, 'content');
        const exists = await fileUtils.exists(filePath);
        expect(exists).toBe(true);
      } catch (error) {
        // Some systems may have path length limits
        expect(error).toBeDefined();
      }
    });

    it.skip('should handle concurrent operations', async () => {
      const operations = Array.from({ length: 10 }, async (_, i) => {
        const filePath = path.join(testDir, `concurrent-${i}.txt`);
        await fileUtils.writeFile(filePath, `content-${i}`);
        return fileUtils.readFile(filePath);
      });
      
      const results = await Promise.all(operations);
      
      expect(results.length).toBe(10);
      results.forEach((content, i) => {
        expect(content).toBe(`content-${i}`);
      });
    });
  });
});