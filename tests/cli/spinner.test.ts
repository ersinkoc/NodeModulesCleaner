import { Spinner } from '../../src/cli/spinner';

describe('Spinner', () => {
  let spinner: Spinner;
  let originalWrite: typeof process.stdout.write;
  let writeOutput: string[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    
    // Mock process.stdout.write
    originalWrite = process.stdout.write;
    process.stdout.write = jest.fn((str: string | Uint8Array) => {
      if (typeof str === 'string') {
        writeOutput.push(str);
      }
      return true;
    }) as any;
    
    writeOutput = [];
  });

  afterEach(() => {
    if (spinner) {
      spinner.stop();
    }
    jest.useRealTimers();
    process.stdout.write = originalWrite;
  });

  describe('constructor', () => {
    it('should create spinner with default message', () => {
      spinner = new Spinner();
      expect(spinner).toBeDefined();
    });

    it('should create spinner with custom message', () => {
      spinner = new Spinner('Loading...');
      expect(spinner).toBeDefined();
    });
  });

  describe('start', () => {
    it('should start spinning', () => {
      spinner = new Spinner('Testing');
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.start();
      
      expect(writeOutput.length).toBeGreaterThan(0);
      expect(writeOutput[0]).toContain('Testing');
    });

    it('should update frames on interval', () => {
      spinner = new Spinner('Loading');
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.start();
      
      const initialOutput = writeOutput.length;
      
      jest.advanceTimersByTime(80);
      
      expect(writeOutput.length).toBeGreaterThan(initialOutput);
    });

    it('should cycle through frames', () => {
      spinner = new Spinner('Processing');
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.start();
      
      const frames: string[] = [];
      
      for (let i = 0; i < 8; i++) {
        jest.advanceTimersByTime(80);
        if (writeOutput.length > i) {
          frames.push(writeOutput[i]);
        }
      }
      
      // Should have different frames
      const uniqueFrames = new Set(frames);
      expect(uniqueFrames.size).toBeGreaterThan(1);
    });

    it('should not start if already running', () => {
      spinner = new Spinner();
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.start();
      
      const initialLength = writeOutput.length;
      
      spinner.start();
      
      expect(writeOutput.length).toBe(initialLength);
    });

    it('should handle color support', () => {
      const isColorSupported = process.stdout.isTTY && 
        (!process.env.NO_COLOR && process.env.TERM !== 'dumb');
      
      spinner = new Spinner('Colored');
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.start();
      
      if (isColorSupported) {
        expect(writeOutput[0]).toContain('\x1b[36m'); // Cyan color
      }
    });
  });

  describe('stop', () => {
    it('should stop spinning', () => {
      spinner = new Spinner('Stopping');
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.start();
      
      jest.advanceTimersByTime(160);
      const lengthBeforeStop = writeOutput.length;
      
      spinner.stop();
      
      jest.advanceTimersByTime(160);
      expect(writeOutput.length).toBe(lengthBeforeStop + 1); // Only clear line added
    });

    it('should clear the line when stopping', () => {
      spinner = new Spinner('Clear');
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.start();
      spinner.stop();
      
      const lastOutput = writeOutput[writeOutput.length - 1];
      expect(lastOutput).toContain('\r\x1b[K'); // Clear line sequence
    });

    it('should handle stopping when not started', () => {
      spinner = new Spinner();
      
      expect(() => spinner.stop()).not.toThrow();
    });

    it('should handle multiple stops', () => {
      spinner = new Spinner();
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.start();
      spinner.stop();
      
      expect(() => spinner.stop()).not.toThrow();
    });
  });

  describe('success', () => {
    it('should show success message', () => {
      spinner = new Spinner('Task');
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.start();
      spinner.success('Complete!');
      
      const output = writeOutput.join('');
      expect(output).toContain('✓');
      expect(output).toContain('Complete!');
    });

    it('should use green color for success', () => {
      const isColorSupported = process.stdout.isTTY && 
        (!process.env.NO_COLOR && process.env.TERM !== 'dumb');
      
      spinner = new Spinner();
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.success('Done');
      
      const output = writeOutput.join('');
      
      if (isColorSupported) {
        expect(output).toContain('\x1b[32m'); // Green color
      }
    });

    it('should stop spinner before showing success', () => {
      spinner = new Spinner();
      (spinner as any).setEnabled(true);  // Enable for testing
      const stopSpy = jest.spyOn(spinner, 'stop');
      
      spinner.start();
      spinner.success('OK');
      
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should show error message', () => {
      spinner = new Spinner('Task');
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.start();
      spinner.error('Failed!');
      
      const output = writeOutput.join('');
      expect(output).toContain('✗');
      expect(output).toContain('Failed!');
    });

    it('should use red color for error', () => {
      const isColorSupported = process.stdout.isTTY && 
        (!process.env.NO_COLOR && process.env.TERM !== 'dumb');
      
      spinner = new Spinner();
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.error('Error');
      
      const output = writeOutput.join('');
      
      if (isColorSupported) {
        expect(output).toContain('\x1b[31m'); // Red color
      }
    });

    it('should stop spinner before showing error', () => {
      spinner = new Spinner();
      (spinner as any).setEnabled(true);  // Enable for testing
      const stopSpy = jest.spyOn(spinner, 'stop');
      
      spinner.start();
      spinner.error('Fail');
      
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should show info message', () => {
      spinner = new Spinner();
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.info('Information');
      
      const output = writeOutput.join('');
      expect(output).toContain('ℹ');
      expect(output).toContain('Information');
    });

    it('should use blue color for info', () => {
      const isColorSupported = process.stdout.isTTY && 
        (!process.env.NO_COLOR && process.env.TERM !== 'dumb');
      
      spinner = new Spinner();
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.info('Info');
      
      const output = writeOutput.join('');
      
      if (isColorSupported) {
        expect(output).toContain('\x1b[34m'); // Blue color
      }
    });

    it('should stop spinner before showing info', () => {
      spinner = new Spinner();
      (spinner as any).setEnabled(true);  // Enable for testing
      const stopSpy = jest.spyOn(spinner, 'stop');
      
      spinner.start();
      spinner.info('Note');
      
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should show warning message', () => {
      spinner = new Spinner();
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.warn('Warning!');
      
      const output = writeOutput.join('');
      expect(output).toContain('⚠');
      expect(output).toContain('Warning!');
    });

    it('should use yellow color for warning', () => {
      const isColorSupported = process.stdout.isTTY && 
        (!process.env.NO_COLOR && process.env.TERM !== 'dumb');
      
      spinner = new Spinner();
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.warn('Caution');
      
      const output = writeOutput.join('');
      
      if (isColorSupported) {
        expect(output).toContain('\x1b[33m'); // Yellow color
      }
    });

    it('should stop spinner before showing warning', () => {
      spinner = new Spinner();
      (spinner as any).setEnabled(true);  // Enable for testing
      const stopSpy = jest.spyOn(spinner, 'stop');
      
      spinner.start();
      spinner.warn('Alert');
      
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update spinner text', () => {
      spinner = new Spinner('Initial');
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.start();
      
      spinner.update('Updated');
      
      jest.advanceTimersByTime(80);
      
      const output = writeOutput.join('');
      expect(output).toContain('Updated');
    });

    it('should continue spinning with new text', () => {
      spinner = new Spinner('First');
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.start();
      
      jest.advanceTimersByTime(80);
      
      spinner.update('Second');
      
      jest.advanceTimersByTime(80);
      
      const output = writeOutput.join('');
      expect(output).toContain('Second');
    });
  });

  describe('frames', () => {
    it('should use default frames', () => {
      spinner = new Spinner();
      (spinner as any).setEnabled(true);  // Enable for testing
      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      
      spinner.start();
      
      for (const frame of frames) {
        jest.advanceTimersByTime(80);
      }
      
      const output = writeOutput.join('');
      
      // Check that at least some frames appear
      const foundFrames = frames.filter(f => output.includes(f));
      expect(foundFrames.length).toBeGreaterThan(0);
    });
  });

  describe('non-TTY environment', () => {
    let originalIsTTY: boolean | undefined;

    beforeEach(() => {
      originalIsTTY = process.stdout.isTTY;
    });

    afterEach(() => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalIsTTY,
        writable: true
      });
    });

    it('should handle non-TTY environment', () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        writable: true
      });
      
      spinner = new Spinner('Non-TTY');
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.start();
      
      // Should still output something
      expect(writeOutput.length).toBeGreaterThan(0);
    });
  });

  describe('long running spinner', () => {
    it('should handle long running operations', () => {
      spinner = new Spinner('Long task');
      (spinner as any).setEnabled(true);  // Enable for testing
      spinner.start();
      
      // Simulate long running task
      for (let i = 0; i < 100; i++) {
        jest.advanceTimersByTime(80);
      }
      
      spinner.stop();
      
      // Should have many outputs
      expect(writeOutput.length).toBeGreaterThan(50);
    });

    it('should cycle through all frames repeatedly', () => {
      spinner = new Spinner('Cycling');
      (spinner as any).setEnabled(true);  // Enable for testing
      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      
      spinner.start();
      
      // Run through frames multiple times
      for (let cycle = 0; cycle < 3; cycle++) {
        for (let i = 0; i < frames.length; i++) {
          jest.advanceTimersByTime(80);
        }
      }
      
      spinner.stop();
      
      // Should see frames multiple times
      expect(writeOutput.length).toBeGreaterThan(frames.length * 2);
    });
  });
});