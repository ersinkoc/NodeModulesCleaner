import { scanner } from '../src/core/scanner';
import { fileUtils } from '../src/lib/file-utils';
import * as path from 'path';

describe('Scanner', () => {
  it('should find node_modules directories', async () => {
    const testDir = path.join(process.cwd(), 'test-fixtures');
    const results = await scanner.scan(testDir);
    
    expect(Array.isArray(results)).toBeTruthy();
  });

  it('should respect maxDepth option', async () => {
    const testDir = process.cwd();
    const shallowResults = await scanner.scan(testDir, { maxDepth: 1 });
    const deepResults = await scanner.scan(testDir, { maxDepth: 10 });
    
    expect(deepResults.length >= shallowResults.length).toBeTruthy();
  });

  it('should calculate size correctly', async () => {
    const testDir = process.cwd();
    const results = await scanner.scan(testDir, { maxDepth: 1 });
    
    if (results.length > 0) {
      expect(results[0].size > 0).toBeTruthy();
      expect(results[0].sizeFormatted).toContain('B');
    }
  });

  it('should extract package information', async () => {
    const testDir = process.cwd();
    const results = await scanner.scan(testDir, { maxDepth: 1 });
    
    if (results.length > 0) {
      expect(Array.isArray(results[0].packages)).toBeTruthy();
      expect(results[0].packageCount >= 0).toBeTruthy();
    }
  });

  it('should handle non-existent directories gracefully', async () => {
    const nonExistentDir = path.join(process.cwd(), 'does-not-exist-12345');
    const results = await scanner.scan(nonExistentDir);
    
    expect(results).toEqual([]);
  });
});

describe('FileUtils', () => {
  it('should format bytes correctly', () => {
    expect(fileUtils.formatBytes(0)).toBe('0 B');
    expect(fileUtils.formatBytes(1024)).toBe('1 KB');
    expect(fileUtils.formatBytes(1024 * 1024)).toBe('1 MB');
    expect(fileUtils.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('should check file existence', async () => {
    const exists = await fileUtils.exists(__filename);
    expect(exists).toBeTruthy();
    
    const notExists = await fileUtils.exists('/path/that/does/not/exist');
    expect(notExists).toBeFalsy();
  });

  it('should determine if path is directory', async () => {
    const isDir = await fileUtils.isDirectory(process.cwd());
    expect(isDir).toBeTruthy();
    
    const isNotDir = await fileUtils.isDirectory(__filename);
    expect(isNotDir).toBeFalsy();
  });
});