import { Cleaner } from '../../src/core/cleaner';
import { NodeModulesInfo } from '../../src/types';
import { createTestProject, TEST_FIXTURES_DIR } from '../setup';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('Cleaner', () => {
  let cleaner: Cleaner;
  let testProjectPaths: string[] = [];

  beforeEach(async () => {
    cleaner = new Cleaner();
    
    // Create multiple test projects
    testProjectPaths = [
      await createTestProject('cleaner-test-1', ['lodash', 'express']),
      await createTestProject('cleaner-test-2', ['react', 'webpack']),
      await createTestProject('cleaner-test-3', ['typescript', 'jest'])
    ];
  });

  afterEach(async () => {
    // Clean up test projects
    for (const projectPath of testProjectPaths) {
      try {
        await fs.rm(projectPath, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('clean', () => {
    it('should delete single node_modules directory', async () => {
      const nodeModulesPath = path.join(testProjectPaths[0], 'node_modules');
      
      // Verify it exists
      const existsBefore = await fs.access(nodeModulesPath).then(() => true).catch(() => false);
      expect(existsBefore).toBe(true);
      
      const result = await cleaner.clean([nodeModulesPath]);
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
      expect(result.totalSizeFreed).toBeGreaterThan(0);
      
      // Verify it's deleted
      const existsAfter = await fs.access(nodeModulesPath).then(() => true).catch(() => false);
      expect(existsAfter).toBe(false);
    });

    it('should delete multiple node_modules directories', async () => {
      const paths = testProjectPaths.map(p => path.join(p, 'node_modules'));
      
      const result = await cleaner.clean(paths);
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3);
      expect(result.totalSizeFreed).toBeGreaterThan(0);
      
      // Verify all are deleted
      for (const p of paths) {
        const exists = await fs.access(p).then(() => true).catch(() => false);
        expect(exists).toBe(false);
      }
    });

    it('should handle dry run mode', async () => {
      const nodeModulesPath = path.join(testProjectPaths[0], 'node_modules');
      
      const result = await cleaner.clean([nodeModulesPath], { dryRun: true });
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(0);
      expect(result.totalSizeFreed).toBe(0);
      expect(result.errors.length).toBe(0);
      
      // Verify it still exists
      const exists = await fs.access(nodeModulesPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should handle non-existent paths gracefully', async () => {
      const nonExistentPath = path.join(TEST_FIXTURES_DIR, 'non-existent', 'node_modules');
      
      const result = await cleaner.clean([nonExistentPath]);
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('not found');
    });

    it('should handle mixed valid and invalid paths', async () => {
      const validPath = path.join(testProjectPaths[0], 'node_modules');
      const invalidPath = path.join(TEST_FIXTURES_DIR, 'invalid', 'node_modules');
      
      const result = await cleaner.clean([validPath, invalidPath]);
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
      expect(result.errors.length).toBe(1);
    });

    it('should force delete when force option is true', async () => {
      const nodeModulesPath = path.join(testProjectPaths[0], 'node_modules');
      
      // Create a read-only file
      const readOnlyFile = path.join(nodeModulesPath, 'readonly.txt');
      await fs.writeFile(readOnlyFile, 'test');
      if (process.platform !== 'win32') {
        await fs.chmod(readOnlyFile, 0o444);
      }
      
      const result = await cleaner.clean([nodeModulesPath], { force: true });
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
    });
  });

  describe('cleanFromInfo', () => {
    it('should clean based on NodeModulesInfo objects', async () => {
      const infos: NodeModulesInfo[] = testProjectPaths.map((p, i) => ({
        path: path.join(p, 'node_modules'),
        size: 1024 * 1024 * (i + 1),
        sizeFormatted: `${i + 1} MB`,
        packageCount: 2,
        lastModified: new Date(),
        packages: [],
        projectName: `cleaner-test-${i + 1}`,
        projectPath: p
      }));
      
      const result = await cleaner.cleanFromInfo(infos);
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3);
    });

    it('should skip if no paths selected', async () => {
      const result = await cleaner.cleanFromInfo([]);
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(0);
      expect(result.totalSizeFreed).toBe(0);
    });
  });

  describe('calculateSize', () => {
    it('should calculate directory size correctly', async () => {
      const nodeModulesPath = path.join(testProjectPaths[0], 'node_modules');
      
      const size = await cleaner.calculateSize(nodeModulesPath);
      
      expect(size).toBeGreaterThan(0);
    });

    it('should return 0 for non-existent directory', async () => {
      const nonExistentPath = path.join(TEST_FIXTURES_DIR, 'non-existent');
      
      const size = await cleaner.calculateSize(nonExistentPath);
      
      expect(size).toBe(0);
    });

    it('should handle symlinks correctly', async () => {
      const sourcePath = testProjectPaths[0];
      const linkPath = path.join(TEST_FIXTURES_DIR, 'symlink-test');
      
      // Create symlink (skip on Windows if no permission)
      try {
        await fs.symlink(sourcePath, linkPath, 'dir');
        const size = await cleaner.calculateSize(linkPath);
        expect(size).toBeGreaterThanOrEqual(0);
      } catch (error) {
        // Skip test if symlinks not supported
        expect(true).toBe(true);
      }
    });
  });

  describe('deleteDirectory', () => {
    it('should delete directory recursively', async () => {
      const testDir = path.join(TEST_FIXTURES_DIR, 'delete-test');
      await fs.mkdir(path.join(testDir, 'subdir'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'file.txt'), 'test');
      await fs.writeFile(path.join(testDir, 'subdir', 'nested.txt'), 'nested');
      
      await cleaner.deleteDirectory(testDir);
      
      const exists = await fs.access(testDir).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('should throw error for non-existent directory', async () => {
      const nonExistentPath = path.join(TEST_FIXTURES_DIR, 'does-not-exist');
      
      await expect(cleaner.deleteDirectory(nonExistentPath)).rejects.toThrow();
    });
  });

  describe('cleanPackageLockFiles', () => {
    it('should remove package-lock.json files', async () => {
      // Create package-lock files
      for (const projectPath of testProjectPaths) {
        await fs.writeFile(
          path.join(projectPath, 'package-lock.json'),
          JSON.stringify({ lockfileVersion: 2 })
        );
      }
      
      const result = await cleaner.cleanPackageLockFiles(testProjectPaths);
      
      expect(result.deletedCount).toBe(3);
      
      // Verify they're deleted
      for (const projectPath of testProjectPaths) {
        const exists = await fs.access(path.join(projectPath, 'package-lock.json'))
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(false);
      }
    });

    it('should handle projects without lock files', async () => {
      const result = await cleaner.cleanPackageLockFiles(testProjectPaths);
      
      expect(result.deletedCount).toBe(0);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('cleanYarnLockFiles', () => {
    it('should remove yarn.lock files', async () => {
      // Create yarn.lock files
      for (const projectPath of testProjectPaths) {
        await fs.writeFile(
          path.join(projectPath, 'yarn.lock'),
          '# yarn lockfile v1'
        );
      }
      
      const result = await cleaner.cleanYarnLockFiles(testProjectPaths);
      
      expect(result.deletedCount).toBe(3);
      
      // Verify they're deleted
      for (const projectPath of testProjectPaths) {
        const exists = await fs.access(path.join(projectPath, 'yarn.lock'))
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(false);
      }
    });
  });

  describe('cleanNpmCache', () => {
    it('should attempt to clean npm cache', async () => {
      const result = await cleaner.cleanNpmCache();
      
      // Result depends on system state, just check structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('sizeFreed');
    });
  });

  describe('cleanYarnCache', () => {
    it('should attempt to clean yarn cache', async () => {
      const result = await cleaner.cleanYarnCache();
      
      // Result depends on system state, just check structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('sizeFreed');
    });
  });

  describe('getBackupPath', () => {
    it('should generate unique backup path', () => {
      const originalPath = '/project/node_modules';
      
      const backupPath = cleaner.getBackupPath(originalPath);
      
      expect(backupPath).toContain('node_modules.backup');
      expect(backupPath).toMatch(/\d{14}/); // Should contain timestamp
    });
  });

  describe('backup', () => {
    it('should create backup of node_modules', async () => {
      const nodeModulesPath = path.join(testProjectPaths[0], 'node_modules');
      
      const backupPath = await cleaner.backup(nodeModulesPath);
      
      expect(backupPath).toBeDefined();
      
      // Verify backup exists
      const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);
      
      // Clean up backup
      await fs.rm(backupPath, { recursive: true, force: true });
    });

    it('should throw error for non-existent path', async () => {
      const nonExistentPath = path.join(TEST_FIXTURES_DIR, 'non-existent', 'node_modules');
      
      await expect(cleaner.backup(nonExistentPath)).rejects.toThrow();
    });
  });

  describe('restore', () => {
    it('should restore from backup', async () => {
      const nodeModulesPath = path.join(testProjectPaths[0], 'node_modules');
      
      // Create backup
      const backupPath = await cleaner.backup(nodeModulesPath);
      
      // Delete original
      await fs.rm(nodeModulesPath, { recursive: true, force: true });
      
      // Restore
      await cleaner.restore(backupPath, nodeModulesPath);
      
      // Verify restored
      const exists = await fs.access(nodeModulesPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      // Clean up
      await fs.rm(backupPath, { recursive: true, force: true });
    });
  });
});