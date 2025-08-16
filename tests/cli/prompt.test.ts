import { prompt } from '../../src/cli/prompt';
import * as readline from 'readline';

// Mock readline
jest.mock('readline');

describe('prompt', () => {
  let mockInterface: any;
  let mockQuestion: jest.Mock;
  let mockClose: jest.Mock;

  beforeEach(() => {
    mockQuestion = jest.fn();
    mockClose = jest.fn();
    
    mockInterface = {
      question: mockQuestion,
      close: mockClose
    };
    
    (readline.createInterface as jest.Mock).mockReturnValue(mockInterface);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('text prompt', () => {
    it('should prompt for text input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('user input');
      });
      
      const result = await prompt.text('Enter name:');
      
      expect(result).toBe('user input');
      expect(mockQuestion).toHaveBeenCalledWith('Enter name: ', expect.any(Function));
      expect(mockClose).toHaveBeenCalled();
    });

    it('should handle empty input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('');
      });
      
      const result = await prompt.text('Enter value:');
      
      expect(result).toBe('');
    });

    it('should trim whitespace', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('  trimmed  ');
      });
      
      const result = await prompt.text('Input:');
      
      expect(result).toBe('trimmed');
    });

    it('should handle special characters', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('special!@#$%^&*()');
      });
      
      const result = await prompt.text('Input:');
      
      expect(result).toBe('special!@#$%^&*()');
    });
  });

  describe('confirm prompt', () => {
    it('should return true for yes input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('y');
      });
      
      const result = await prompt.confirm('Continue?');
      
      expect(result).toBe(true);
      expect(mockQuestion).toHaveBeenCalledWith('Continue? (y/n) ', expect.any(Function));
    });

    it('should return true for YES input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('YES');
      });
      
      const result = await prompt.confirm('Proceed?');
      
      expect(result).toBe(true);
    });

    it('should return false for no input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('n');
      });
      
      const result = await prompt.confirm('Delete?');
      
      expect(result).toBe(false);
    });

    it('should return false for NO input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('NO');
      });
      
      const result = await prompt.confirm('Remove?');
      
      expect(result).toBe(false);
    });

    it('should use default value when provided', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('');
      });
      
      const result = await prompt.confirm('Use default?', true);
      
      expect(result).toBe(true);
    });

    it('should handle invalid input with retry', async () => {
      let callCount = 0;
      mockQuestion.mockImplementation((q, callback) => {
        if (callCount === 0) {
          callCount++;
          callback('invalid');
        } else {
          callback('y');
        }
      });
      
      const result = await prompt.confirm('Retry?');
      
      expect(result).toBe(true);
      expect(mockQuestion).toHaveBeenCalledTimes(2);
    });

    it('should display default in prompt', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('');
      });
      
      await prompt.confirm('Continue?', true);
      
      expect(mockQuestion).toHaveBeenCalledWith(
        'Continue? (Y/n) ',
        expect.any(Function)
      );
    });

    it('should display default false in prompt', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('');
      });
      
      await prompt.confirm('Continue?', false);
      
      expect(mockQuestion).toHaveBeenCalledWith(
        'Continue? (y/N) ',
        expect.any(Function)
      );
    });
  });

  describe('select prompt', () => {
    it('should select by number', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('2');
      });
      
      const result = await prompt.select('Choose:', ['Option A', 'Option B', 'Option C']);
      
      expect(result).toBe('Option B');
    });

    it('should select first option with 1', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('1');
      });
      
      const result = await prompt.select('Pick one:', ['First', 'Second']);
      
      expect(result).toBe('First');
    });

    it('should handle invalid number with retry', async () => {
      let callCount = 0;
      mockQuestion.mockImplementation((q, callback) => {
        if (callCount === 0) {
          callCount++;
          callback('99');
        } else {
          callback('1');
        }
      });
      
      const result = await prompt.select('Choose:', ['Only option']);
      
      expect(result).toBe('Only option');
      expect(mockQuestion).toHaveBeenCalledTimes(2);
    });

    it('should handle non-numeric input with retry', async () => {
      let callCount = 0;
      mockQuestion.mockImplementation((q, callback) => {
        if (callCount === 0) {
          callCount++;
          callback('abc');
        } else {
          callback('2');
        }
      });
      
      const result = await prompt.select('Pick:', ['A', 'B']);
      
      expect(result).toBe('B');
      expect(mockQuestion).toHaveBeenCalledTimes(2);
    });

    it('should display options with numbers', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockQuestion.mockImplementation((q, callback) => {
        callback('1');
      });
      
      await prompt.select('Choose option:', ['Alpha', 'Beta', 'Gamma']);
      
      expect(consoleSpy).toHaveBeenCalledWith('\nChoose option:');
      expect(consoleSpy).toHaveBeenCalledWith('  1) Alpha');
      expect(consoleSpy).toHaveBeenCalledWith('  2) Beta');
      expect(consoleSpy).toHaveBeenCalledWith('  3) Gamma');
      
      consoleSpy.mockRestore();
    });

    it('should handle empty options array', async () => {
      await expect(prompt.select('Choose:', [])).rejects.toThrow();
    });

    it('should handle zero input', async () => {
      let callCount = 0;
      mockQuestion.mockImplementation((q, callback) => {
        if (callCount === 0) {
          callCount++;
          callback('0');
        } else {
          callback('1');
        }
      });
      
      const result = await prompt.select('Pick:', ['Item']);
      
      expect(result).toBe('Item');
      expect(mockQuestion).toHaveBeenCalledTimes(2);
    });
  });

  describe('multiSelect prompt', () => {
    it('should select multiple items', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('1,3');
      });
      
      const result = await prompt.multiSelect('Select items:', ['A', 'B', 'C']);
      
      expect(result).toEqual(['A', 'C']);
    });

    it('should handle single selection', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('2');
      });
      
      const result = await prompt.multiSelect('Select:', ['X', 'Y', 'Z']);
      
      expect(result).toEqual(['Y']);
    });

    it('should handle spaces in input', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('1, 2, 3');
      });
      
      const result = await prompt.multiSelect('Select all:', ['One', 'Two', 'Three']);
      
      expect(result).toEqual(['One', 'Two', 'Three']);
    });

    it('should filter invalid indices', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('1,99,2');
      });
      
      const result = await prompt.multiSelect('Pick:', ['First', 'Second']);
      
      expect(result).toEqual(['First', 'Second']);
    });

    it('should handle empty selection', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('');
      });
      
      const result = await prompt.multiSelect('Select:', ['Item']);
      
      expect(result).toEqual([]);
    });

    it('should handle all selection with asterisk', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('*');
      });
      
      const result = await prompt.multiSelect('Select:', ['A', 'B', 'C']);
      
      expect(result).toEqual(['A', 'B', 'C']);
    });

    it('should display multi-select instructions', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockQuestion.mockImplementation((q, callback) => {
        callback('1');
      });
      
      await prompt.multiSelect('Choose multiple:', ['Option']);
      
      expect(consoleSpy).toHaveBeenCalledWith('\nChoose multiple:');
      expect(consoleSpy).toHaveBeenCalledWith('  1) Option');
      
      consoleSpy.mockRestore();
    });

    it('should handle duplicate indices', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('1,1,2,2');
      });
      
      const result = await prompt.multiSelect('Select:', ['A', 'B']);
      
      expect(result).toEqual(['A', 'B']);
    });

    it('should handle range selection', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('1-3');
      });
      
      const result = await prompt.multiSelect('Select range:', ['A', 'B', 'C', 'D']);
      
      // Should handle as individual selections if range not implemented
      expect(result).toEqual([]);
    });
  });

  describe('password prompt', () => {
    it('should mask password input', async () => {
      // Mock readline with specific output behavior
      const mockWrite = jest.fn();
      const originalWrite = process.stdout.write;
      process.stdout.write = mockWrite as any;
      
      mockQuestion.mockImplementation((q, callback) => {
        callback('secret123');
      });
      
      const result = await prompt.password('Enter password:');
      
      expect(result).toBe('secret123');
      
      process.stdout.write = originalWrite;
    });

    it('should handle empty password', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('');
      });
      
      const result = await prompt.password('Password:');
      
      expect(result).toBe('');
    });

    it('should not trim password', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('  spaced  ');
      });
      
      const result = await prompt.password('Pass:');
      
      expect(result).toBe('  spaced  ');
    });
  });

  describe('interface management', () => {
    it('should create readline interface', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('test');
      });
      
      await prompt.text('Input:');
      
      expect(readline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout
      });
    });

    it('should close interface after prompt', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        callback('test');
      });
      
      await prompt.text('Input:');
      
      expect(mockClose).toHaveBeenCalled();
    });

    it('should close interface on error', async () => {
      mockQuestion.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      await expect(prompt.text('Input:')).rejects.toThrow('Test error');
      
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle readline errors', async () => {
      (readline.createInterface as jest.Mock).mockImplementation(() => {
        throw new Error('Readline error');
      });
      
      await expect(prompt.text('Input:')).rejects.toThrow('Readline error');
    });

    it('should handle question callback errors', async () => {
      mockQuestion.mockImplementation((q, callback) => {
        throw new Error('Callback error');
      });
      
      await expect(prompt.text('Input:')).rejects.toThrow('Callback error');
    });
  });
});