import { colors } from '../../src/cli/colors';

describe('colors', () => {
  const isColorSupported = process.stdout.isTTY && 
    (!process.env.NO_COLOR && process.env.TERM !== 'dumb');

  describe('color functions', () => {
    it('should apply red color', () => {
      const result = colors.red('error');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[31m');
        expect(result).toContain('error');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('error');
      }
    });

    it('should apply green color', () => {
      const result = colors.green('success');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[32m');
        expect(result).toContain('success');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('success');
      }
    });

    it('should apply yellow color', () => {
      const result = colors.yellow('warning');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[33m');
        expect(result).toContain('warning');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('warning');
      }
    });

    it('should apply blue color', () => {
      const result = colors.blue('info');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[34m');
        expect(result).toContain('info');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('info');
      }
    });

    it('should apply magenta color', () => {
      const result = colors.magenta('special');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[35m');
        expect(result).toContain('special');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('special');
      }
    });

    it('should apply cyan color', () => {
      const result = colors.cyan('highlight');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[36m');
        expect(result).toContain('highlight');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('highlight');
      }
    });

    it('should apply white color', () => {
      const result = colors.white('text');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[37m');
        expect(result).toContain('text');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('text');
      }
    });

    it('should apply gray color', () => {
      const result = colors.gray('muted');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[90m');
        expect(result).toContain('muted');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('muted');
      }
    });
  });

  describe('style functions', () => {
    it('should apply bold style', () => {
      const result = colors.bold('important');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[1m');
        expect(result).toContain('important');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('important');
      }
    });

    it('should apply dim style', () => {
      const result = colors.dim('subtle');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[2m');
        expect(result).toContain('subtle');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('subtle');
      }
    });

    it('should apply italic style', () => {
      const result = colors.italic('emphasis');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[3m');
        expect(result).toContain('emphasis');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('emphasis');
      }
    });

    it('should apply underline style', () => {
      const result = colors.underline('link');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[4m');
        expect(result).toContain('link');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('link');
      }
    });

    it('should apply inverse style', () => {
      const result = colors.inverse('inverted');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[7m');
        expect(result).toContain('inverted');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('inverted');
      }
    });

    it('should apply hidden style', () => {
      const result = colors.hidden('secret');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[8m');
        expect(result).toContain('secret');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('secret');
      }
    });

    it('should apply strikethrough style', () => {
      const result = colors.strikethrough('deleted');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[9m');
        expect(result).toContain('deleted');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('deleted');
      }
    });
  });

  describe('background colors', () => {
    it('should apply bgRed', () => {
      const result = colors.bgRed('error bg');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[41m');
        expect(result).toContain('error bg');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('error bg');
      }
    });

    it('should apply bgGreen', () => {
      const result = colors.bgGreen('success bg');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[42m');
        expect(result).toContain('success bg');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('success bg');
      }
    });

    it('should apply bgYellow', () => {
      const result = colors.bgYellow('warning bg');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[43m');
        expect(result).toContain('warning bg');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('warning bg');
      }
    });

    it('should apply bgBlue', () => {
      const result = colors.bgBlue('info bg');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[44m');
        expect(result).toContain('info bg');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('info bg');
      }
    });
  });

  describe('combination styles', () => {
    it('should combine multiple styles', () => {
      const result = colors.bold(colors.red('error'));
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[1m');
        expect(result).toContain('\x1b[31m');
        expect(result).toContain('error');
      } else {
        expect(result).toBe('error');
      }
    });

    it('should handle nested styles', () => {
      const result = colors.underline(colors.bold(colors.blue('link')));
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[4m');
        expect(result).toContain('\x1b[1m');
        expect(result).toContain('\x1b[34m');
        expect(result).toContain('link');
      } else {
        expect(result).toBe('link');
      }
    });
  });

  describe('reset function', () => {
    it('should reset all styles', () => {
      const result = colors.reset('reset text');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[0m');
        expect(result).toContain('reset text');
      } else {
        expect(result).toBe('reset text');
      }
    });
  });

  describe('strip function', () => {
    it('should remove ANSI codes', () => {
      const colored = colors.red(colors.bold('test'));
      const stripped = colors.strip(colored);
      
      expect(stripped).toBe('test');
      expect(stripped).not.toContain('\x1b');
    });

    it('should handle plain text', () => {
      const plain = 'plain text';
      const stripped = colors.strip(plain);
      
      expect(stripped).toBe('plain text');
    });

    it('should handle complex ANSI sequences', () => {
      const complex = '\x1b[1m\x1b[31mError:\x1b[0m \x1b[33mWarning\x1b[0m';
      const stripped = colors.strip(complex);
      
      expect(stripped).toBe('Error: Warning');
    });
  });

  describe('NO_COLOR environment', () => {
    let originalNoColor: string | undefined;
    let originalTerm: string | undefined;

    beforeEach(() => {
      originalNoColor = process.env.NO_COLOR;
      originalTerm = process.env.TERM;
    });

    afterEach(() => {
      if (originalNoColor !== undefined) {
        process.env.NO_COLOR = originalNoColor;
      } else {
        delete process.env.NO_COLOR;
      }
      
      if (originalTerm !== undefined) {
        process.env.TERM = originalTerm;
      } else {
        delete process.env.TERM;
      }
    });

    it('should respect NO_COLOR environment variable', () => {
      process.env.NO_COLOR = '1';
      
      // Re-import to apply env change
      jest.resetModules();
      const { colors: noColorInstance } = require('../../src/cli/colors');
      
      const result = noColorInstance.red('test');
      expect(result).toBe('test');
    });

    it('should respect TERM=dumb', () => {
      process.env.TERM = 'dumb';
      
      // Re-import to apply env change
      jest.resetModules();
      const { colors: dumbTermInstance } = require('../../src/cli/colors');
      
      const result = dumbTermInstance.red('test');
      expect(result).toBe('test');
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      const result = colors.red('');
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[31m');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe('');
      }
    });

    it('should handle multiline text', () => {
      const multiline = 'line1\nline2\nline3';
      const result = colors.green(multiline);
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[32m');
        expect(result).toContain('line1\nline2\nline3');
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe(multiline);
      }
    });

    it('should handle special characters', () => {
      const special = '!@#$%^&*()[]{}|\\";\'<>?,./';
      const result = colors.yellow(special);
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[33m');
        expect(result).toContain(special);
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe(special);
      }
    });

    it('should handle Unicode characters', () => {
      const unicode = '✓ ✗ → ← ↑ ↓ ⚠ ⚡ ★ ☆';
      const result = colors.cyan(unicode);
      
      if (isColorSupported) {
        expect(result).toContain('\x1b[36m');
        expect(result).toContain(unicode);
        expect(result).toContain('\x1b[0m');
      } else {
        expect(result).toBe(unicode);
      }
    });
  });
});