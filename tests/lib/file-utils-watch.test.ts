import * as fs from 'fs';
import * as path from 'path';
import { fileUtils } from '../../src/lib/file-utils';

describe('FileUtils - watchDirectory', () => {
  let tempDir: string;
  let watcher: fs.FSWatcher | null = null;

  beforeEach(async () => {
    tempDir = path.join(process.cwd(), 'test-watch-' + Date.now());
    await fileUtils.ensureDirectory(tempDir);
  });

  afterEach(async () => {
    if (watcher) {
      watcher.close();
      watcher = null;
    }
    if (await fileUtils.exists(tempDir)) {
      await fileUtils.removeDirectory(tempDir, { recursive: true, force: true });
    }
  });

  it('should watch directory and handle events', (done) => {
    const events: Array<{ event: string; filename: string }> = [];
    
    watcher = fileUtils.watchDirectory(tempDir, (event, filename) => {
      events.push({ event, filename });
      
      if (events.length === 1) {
        expect(events[0].filename).toBe('test.txt');
        done();
      }
    });

    // Create a file to trigger the watch event
    setTimeout(async () => {
      await fileUtils.writeFile(path.join(tempDir, 'test.txt'), 'test content');
    }, 100);
  });

  it('should handle watch errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    watcher = fileUtils.watchDirectory(tempDir, () => {});
    
    // Simulate an error event
    watcher.emit('error', new Error('Test error'));
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Watch error'),
      expect.any(Error)
    );
    
    consoleSpy.mockRestore();
  });

  it('should return FSWatcher instance', () => {
    watcher = fileUtils.watchDirectory(tempDir, () => {});
    
    expect(watcher).toBeDefined();
    expect(watcher.close).toBeDefined();
    expect(typeof watcher.close).toBe('function');
  });
});