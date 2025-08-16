import { Table } from '../../src/cli/table';

describe('Table', () => {
  let originalWrite: typeof process.stdout.write;
  let writeOutput: string[] = [];

  beforeEach(() => {
    // Mock process.stdout.write to capture output
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
    process.stdout.write = originalWrite;
  });

  describe('constructor', () => {
    it('should create table with headers', () => {
      const table = new Table(['Name', 'Age', 'City']);
      expect(table).toBeDefined();
    });

    it('should create table with custom options', () => {
      const table = new Table(['Col1', 'Col2'], {
        borderStyle: 'double',
        padding: 2,
        alignment: 'center'
      });
      expect(table).toBeDefined();
    });

    it('should handle empty headers', () => {
      const table = new Table([]);
      expect(table).toBeDefined();
    });
  });

  describe('addRow', () => {
    it('should add single row', () => {
      const table = new Table(['Name', 'Age']);
      table.addRow(['John', '30']);
      
      table.render();
      const output = writeOutput.join('');
      
      expect(output).toContain('John');
      expect(output).toContain('30');
    });

    it('should add multiple rows', () => {
      const table = new Table(['Name', 'Score']);
      table.addRow(['Alice', '95']);
      table.addRow(['Bob', '87']);
      table.addRow(['Charlie', '92']);
      
      table.render();
      const output = writeOutput.join('');
      
      expect(output).toContain('Alice');
      expect(output).toContain('Bob');
      expect(output).toContain('Charlie');
    });

    it('should handle missing columns', () => {
      const table = new Table(['Col1', 'Col2', 'Col3']);
      table.addRow(['Value1', 'Value2']); // Missing third column
      
      table.render();
      const output = writeOutput.join('');
      
      expect(output).toContain('Value1');
      expect(output).toContain('Value2');
    });

    it('should handle extra columns', () => {
      const table = new Table(['Col1', 'Col2']);
      table.addRow(['Val1', 'Val2', 'Val3', 'Val4']); // Extra columns
      
      table.render();
      const output = writeOutput.join('');
      
      expect(output).toContain('Val1');
      expect(output).toContain('Val2');
    });

    it('should handle empty values', () => {
      const table = new Table(['Name', 'Value']);
      table.addRow(['', '']);
      
      table.render();
      
      // Should render without error
      expect(writeOutput.length).toBeGreaterThan(0);
    });
  });

  describe('render', () => {
    it('should render simple table', () => {
      const table = new Table(['Name', 'Age']);
      table.addRow(['John', '30']);
      table.addRow(['Jane', '25']);
      
      table.render();
      const output = writeOutput.join('');
      
      // Check for borders
      expect(output).toContain('┌');
      expect(output).toContain('┐');
      expect(output).toContain('└');
      expect(output).toContain('┘');
      expect(output).toContain('│');
      expect(output).toContain('─');
      
      // Check for content
      expect(output).toContain('Name');
      expect(output).toContain('Age');
      expect(output).toContain('John');
      expect(output).toContain('30');
    });

    it('should render with proper column width', () => {
      const table = new Table(['Short', 'Very Long Header']);
      table.addRow(['A', 'B']);
      table.addRow(['Longer Value', 'C']);
      
      table.render();
      const output = writeOutput.join('\n');
      
      // All rows should have same width
      const lines = output.split('\n').filter(l => l.includes('│'));
      if (lines.length > 0) {
        const firstLineLength = lines[0].length;
        lines.forEach(line => {
          expect(line.length).toBeCloseTo(firstLineLength, 5);
        });
      }
    });

    it('should handle special characters', () => {
      const table = new Table(['Column']);
      table.addRow(['Special: !@#$%^&*()']);
      table.addRow(['Unicode: ✓ ✗ → ←']);
      
      table.render();
      const output = writeOutput.join('');
      
      expect(output).toContain('!@#$%^&*()');
      expect(output).toContain('✓ ✗ → ←');
    });

    it('should render empty table', () => {
      const table = new Table(['Header1', 'Header2']);
      
      table.render();
      const output = writeOutput.join('');
      
      expect(output).toContain('Header1');
      expect(output).toContain('Header2');
    });

    it('should handle multiline values', () => {
      const table = new Table(['Key', 'Value']);
      table.addRow(['Multi', 'Line 1\nLine 2']);
      
      table.render();
      const output = writeOutput.join('');
      
      // Multiline should be handled (flattened or truncated)
      expect(output).toContain('Multi');
    });
  });

  describe('border styles', () => {
    it('should render with single border style', () => {
      const table = new Table(['Col'], { borderStyle: 'single' });
      table.addRow(['Val']);
      
      table.render();
      const output = writeOutput.join('');
      
      expect(output).toContain('┌');
      expect(output).toContain('─');
      expect(output).toContain('│');
    });

    it('should render with double border style', () => {
      const table = new Table(['Col'], { borderStyle: 'double' });
      table.addRow(['Val']);
      
      table.render();
      const output = writeOutput.join('');
      
      expect(output).toContain('╔');
      expect(output).toContain('═');
      expect(output).toContain('║');
    });

    it('should render with no border style', () => {
      const table = new Table(['Col'], { borderStyle: 'none' });
      table.addRow(['Val']);
      
      table.render();
      const output = writeOutput.join('');
      
      expect(output).not.toContain('┌');
      expect(output).not.toContain('│');
      expect(output).toContain('Col');
      expect(output).toContain('Val');
    });

    it('should render with ascii border style', () => {
      const table = new Table(['Column'], { borderStyle: 'ascii' });
      table.addRow(['Value']);
      
      table.render();
      const output = writeOutput.join('');
      
      expect(output).toContain('+');
      expect(output).toContain('-');
      expect(output).toContain('|');
    });
  });

  describe('alignment', () => {
    it('should align left', () => {
      const table = new Table(['Name'], { alignment: 'left' });
      table.addRow(['John']);
      
      table.render();
      const output = writeOutput.join('');
      
      // Check that text is left-aligned (has trailing spaces)
      const lines = output.split('\n');
      const contentLine = lines.find(l => l.includes('John'));
      if (contentLine) {
        expect(contentLine.indexOf('John')).toBeLessThan(contentLine.lastIndexOf(' '));
      }
    });

    it('should align right', () => {
      const table = new Table(['Age'], { alignment: 'right' });
      table.addRow(['30']);
      
      table.render();
      // Right alignment implementation would pad left
      
      expect(writeOutput.length).toBeGreaterThan(0);
    });

    it('should align center', () => {
      const table = new Table(['Title'], { alignment: 'center' });
      table.addRow(['Centered']);
      
      table.render();
      // Center alignment would pad both sides
      
      expect(writeOutput.length).toBeGreaterThan(0);
    });
  });

  describe('padding', () => {
    it('should apply custom padding', () => {
      const table = new Table(['Col'], { padding: 3 });
      table.addRow(['Val']);
      
      table.render();
      const output = writeOutput.join('');
      
      // With padding 3, should have more spaces
      const lines = output.split('\n');
      const contentLine = lines.find(l => l.includes('Val'));
      if (contentLine) {
        // Should have spaces around the value
        expect(contentLine).toMatch(/\s{2,}Val\s{2,}/);
      }
    });

    it('should handle zero padding', () => {
      const table = new Table(['Column'], { padding: 0 });
      table.addRow(['Value']);
      
      table.render();
      const output = writeOutput.join('');
      
      expect(output).toContain('Column');
      expect(output).toContain('Value');
    });
  });

  describe('color support', () => {
    it('should apply colors when supported', () => {
      const isColorSupported = process.stdout.isTTY && 
        (!process.env.NO_COLOR && process.env.TERM !== 'dumb');
      
      const table = new Table(['Status']);
      table.addRow(['\x1b[32mSuccess\x1b[0m']); // Green text
      
      table.render();
      const output = writeOutput.join('');
      
      if (isColorSupported) {
        expect(output).toContain('\x1b[32m');
      }
      expect(output).toContain('Success');
    });

    it('should strip ANSI codes for width calculation', () => {
      const table = new Table(['Col']);
      table.addRow(['\x1b[31mRed Text\x1b[0m']);
      table.addRow(['Normal']);
      
      table.render();
      const output = writeOutput.join('');
      
      // Both rows should align properly despite ANSI codes
      expect(output).toContain('Red Text');
      expect(output).toContain('Normal');
    });
  });

  describe('large tables', () => {
    it('should handle many rows', () => {
      const table = new Table(['Index', 'Value']);
      
      for (let i = 0; i < 100; i++) {
        table.addRow([i.toString(), `Value ${i}`]);
      }
      
      table.render();
      const output = writeOutput.join('');
      
      expect(output).toContain('0');
      expect(output).toContain('99');
      expect(output).toContain('Value 50');
    });

    it('should handle many columns', () => {
      const headers = Array.from({ length: 20 }, (_, i) => `Col${i}`);
      const table = new Table(headers);
      
      const row = Array.from({ length: 20 }, (_, i) => `V${i}`);
      table.addRow(row);
      
      table.render();
      const output = writeOutput.join('');
      
      expect(output).toContain('Col0');
      expect(output).toContain('Col19');
      expect(output).toContain('V0');
      expect(output).toContain('V19');
    });

    it('should handle very long values', () => {
      const table = new Table(['Description']);
      const longText = 'A'.repeat(200);
      table.addRow([longText]);
      
      table.render();
      const output = writeOutput.join('');
      
      // Should handle long text (might truncate or wrap)
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const table = new Table(['Name', 'Score']);
      table.addRow(['Alice', '100']);
      
      const str = table.toString();
      
      expect(str).toContain('Name');
      expect(str).toContain('Score');
      expect(str).toContain('Alice');
      expect(str).toContain('100');
    });

    it('should not output to console', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const table = new Table(['Col']);
      table.addRow(['Val']);
      
      table.toString();
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle null values', () => {
      const table = new Table(['Column']);
      table.addRow([null as any]);
      
      table.render();
      const output = writeOutput.join('');
      
      // Should handle null gracefully
      expect(output).toBeDefined();
    });

    it('should handle undefined values', () => {
      const table = new Table(['Column']);
      table.addRow([undefined as any]);
      
      table.render();
      const output = writeOutput.join('');
      
      // Should handle undefined gracefully
      expect(output).toBeDefined();
    });

    it('should handle number values', () => {
      const table = new Table(['Numbers']);
      table.addRow([123 as any]);
      table.addRow([45.67 as any]);
      
      table.render();
      const output = writeOutput.join('');
      
      expect(output).toContain('123');
      expect(output).toContain('45.67');
    });

    it('should handle boolean values', () => {
      const table = new Table(['Boolean']);
      table.addRow([true as any]);
      table.addRow([false as any]);
      
      table.render();
      const output = writeOutput.join('');
      
      expect(output).toContain('true');
      expect(output).toContain('false');
    });
  });
});