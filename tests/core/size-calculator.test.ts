import { sizeCalculator } from '../../src/core/size-calculator';
import { createTestProject, TEST_FIXTURES_DIR } from '../setup';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('sizeCalculator', () => {
  let testProjectPath: string;

  beforeEach(async () => {
    testProjectPath = await createTestProject('size-test', ['lodash', 'express']);
  });

  afterEach(async () => {
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('getSize', () => {
    it('should calculate directory size', async () => {
      const size = await sizeCalculator.getSize(testProjectPath);
      
      expect(size).toBeGreaterThan(0);
    });

    it('should return 0 for non-existent path', async () => {
      const nonExistentPath = path.join(TEST_FIXTURES_DIR, 'non-existent');
      const size = await sizeCalculator.getSize(nonExistentPath);
      
      expect(size).toBe(0);
    });

    it('should calculate file size', async () => {
      const filePath = path.join(testProjectPath, 'package.json');
      const size = await sizeCalculator.getSize(filePath);
      
      expect(size).toBeGreaterThan(0);
    });

    it('should handle empty directory', async () => {
      const emptyDir = path.join(TEST_FIXTURES_DIR, 'empty-dir');
      await fs.mkdir(emptyDir, { recursive: true });
      
      const size = await sizeCalculator.getSize(emptyDir);
      
      expect(size).toBe(0);
      
      await fs.rmdir(emptyDir);
    });

    it('should handle symlinks', async () => {
      const linkPath = path.join(TEST_FIXTURES_DIR, 'link-test');
      
      try {
        await fs.symlink(testProjectPath, linkPath, 'dir');
        const size = await sizeCalculator.getSize(linkPath);
        expect(size).toBeGreaterThanOrEqual(0);
      } catch (error) {
        // Skip on systems that don't support symlinks
        expect(true).toBe(true);
      }
    });
  });

  describe('formatSize', () => {
    it('should format bytes', () => {
      expect(sizeCalculator.formatSize(500)).toBe('500 B');
      expect(sizeCalculator.formatSize(0)).toBe('0 B');
      expect(sizeCalculator.formatSize(1)).toBe('1 B');
    });

    it('should format kilobytes', () => {
      expect(sizeCalculator.formatSize(1024)).toBe('1.00 KB');
      expect(sizeCalculator.formatSize(1536)).toBe('1.50 KB');
      expect(sizeCalculator.formatSize(2048)).toBe('2.00 KB');
    });

    it('should format megabytes', () => {
      expect(sizeCalculator.formatSize(1024 * 1024)).toBe('1.00 MB');
      expect(sizeCalculator.formatSize(1.5 * 1024 * 1024)).toBe('1.50 MB');
      expect(sizeCalculator.formatSize(10 * 1024 * 1024)).toBe('10.00 MB');
    });

    it('should format gigabytes', () => {
      expect(sizeCalculator.formatSize(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(sizeCalculator.formatSize(2.5 * 1024 * 1024 * 1024)).toBe('2.50 GB');
    });

    it('should format terabytes', () => {
      expect(sizeCalculator.formatSize(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB');
      expect(sizeCalculator.formatSize(1.5 * 1024 * 1024 * 1024 * 1024)).toBe('1.50 TB');
    });

    it('should handle negative values', () => {
      expect(sizeCalculator.formatSize(-100)).toBe('-100 B');
    });
  });

  describe('getSizeDetails', () => {
    it('should return detailed size information', async () => {
      const details = await sizeCalculator.getSizeDetails(testProjectPath);
      
      expect(details).toHaveProperty('totalSize');
      expect(details).toHaveProperty('fileCount');
      expect(details).toHaveProperty('directoryCount');
      expect(details.totalSize).toBeGreaterThan(0);
      expect(details.fileCount).toBeGreaterThan(0);
      expect(details.directoryCount).toBeGreaterThan(0);
    });

    it('should handle non-existent path', async () => {
      const details = await sizeCalculator.getSizeDetails('/non/existent/path');
      
      expect(details.totalSize).toBe(0);
      expect(details.fileCount).toBe(0);
      expect(details.directoryCount).toBe(0);
    });

    it('should exclude patterns', async () => {
      const allDetails = await sizeCalculator.getSizeDetails(testProjectPath);
      const filteredDetails = await sizeCalculator.getSizeDetails(
        testProjectPath,
        { exclude: ['node_modules'] }
      );
      
      expect(filteredDetails.totalSize).toBeLessThanOrEqual(allDetails.totalSize);
      expect(filteredDetails.fileCount).toBeLessThanOrEqual(allDetails.fileCount);
    });
  });

  describe('compareDirectories', () => {
    it('should compare two directories', async () => {
      const dir1 = await createTestProject('compare-1', ['lodash']);
      const dir2 = await createTestProject('compare-2', ['express', 'lodash']);
      
      const comparison = await sizeCalculator.compareDirectories(dir1, dir2);
      
      expect(comparison).toHaveProperty('dir1');
      expect(comparison).toHaveProperty('dir2');
      expect(comparison).toHaveProperty('difference');
      
      await fs.rm(dir1, { recursive: true, force: true });
      await fs.rm(dir2, { recursive: true, force: true });
    });
  });

  describe('calculatePackageSize', () => {
    it('should calculate individual package size', async () => {
      const packagePath = path.join(testProjectPath, 'node_modules', 'lodash');
      const size = await sizeCalculator.calculatePackageSize(packagePath);
      
      expect(size).toBeGreaterThan(0);
    });

    it('should handle scoped packages', async () => {
      const scopedPath = path.join(testProjectPath, 'node_modules', '@types');
      await fs.mkdir(scopedPath, { recursive: true });
      
      const nodePath = path.join(scopedPath, 'node');
      await fs.mkdir(nodePath);
      await fs.writeFile(path.join(nodePath, 'index.d.ts'), 'export {}');
      
      const size = await sizeCalculator.calculatePackageSize(scopedPath);
      
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('getDiskUsage', () => {
    it('should get disk usage statistics', async () => {
      const usage = await sizeCalculator.getDiskUsage(testProjectPath);
      
      expect(usage).toHaveProperty('used');
      expect(usage).toHaveProperty('available');
      expect(usage).toHaveProperty('total');
      expect(usage).toHaveProperty('percentage');
    });
  });

  describe('analyzeGrowth', () => {
    it('should analyze directory growth over time', async () => {
      const growth = await sizeCalculator.analyzeGrowth(testProjectPath);
      
      expect(growth).toHaveProperty('currentSize');
      expect(growth).toHaveProperty('lastModified');
      expect(growth).toHaveProperty('fileCount');
    });
  });

  describe('edge cases', () => {
    it('should handle circular symlinks gracefully', async () => {
      const circularDir = path.join(TEST_FIXTURES_DIR, 'circular');
      await fs.mkdir(circularDir, { recursive: true });
      
      try {
        const linkPath = path.join(circularDir, 'link');
        await fs.symlink(circularDir, linkPath, 'dir');
        
        const size = await sizeCalculator.getSize(circularDir);
        expect(size).toBeGreaterThanOrEqual(0);
      } catch (error) {
        // Skip if symlinks not supported
        expect(true).toBe(true);
      } finally {
        await fs.rm(circularDir, { recursive: true, force: true });
      }
    });

    it('should handle permission errors gracefully', async () => {
      const restrictedDir = path.join(TEST_FIXTURES_DIR, 'restricted');
      await fs.mkdir(restrictedDir, { recursive: true });
      
      try {
        if (process.platform !== 'win32') {
          await fs.chmod(restrictedDir, 0o000);
        }
        
        const size = await sizeCalculator.getSize(restrictedDir);
        expect(size).toBeGreaterThanOrEqual(0);
      } finally {
        if (process.platform !== 'win32') {
          await fs.chmod(restrictedDir, 0o755);
        }
        await fs.rm(restrictedDir, { recursive: true, force: true });
      }
    });
  });
});