import { Column } from '../types/index';
import { colors } from './colors';

interface TableOptions {
  borderStyle?: 'single' | 'double' | 'none' | 'ascii';
  padding?: number;
  alignment?: 'left' | 'center' | 'right';
}

export class Table {
  private data: any[] = [];
  private columns: Column[] = [];
  private widths: number[] = [];
  private headers: string[] = [];
  private rows: string[][] = [];
  private options: TableOptions = {};

  constructor(headers?: string[], options?: TableOptions) {
    if (headers) {
      this.headers = headers;
      this.columns = headers.map((header, index) => ({
        key: String(index),
        header
      }));
    }
    if (options) {
      this.options = options;
    }
  }

  setColumns(columns: Column[]): void {
    this.columns = columns;
    this.calculateWidths();
  }

  setData(data: any[]): void {
    this.data = data;
    this.calculateWidths();
  }

  addRow(row: string[]): void {
    this.rows.push(row);
    if (this.headers.length > 0) {
      const dataRow: any = {};
      this.headers.forEach((header, index) => {
        // Use nullish coalescing to preserve false values
        dataRow[String(index)] = row[index] ?? '';
      });
      this.data.push(dataRow);
    }
  }

  private calculateWidths(): void {
    this.widths = this.columns.map(col => {
      const headerWidth = col.header.length;
      const maxDataWidth = this.data.reduce((max, row) => {
        const value = this.formatValue(row[col.key], col);
        const width = colors.strip(value).length;
        return Math.max(max, width);
      }, 0);
      
      return col.width || Math.max(headerWidth, maxDataWidth) + 2;
    });
  }

  private formatValue(value: any, column: Column): string {
    if (column.formatter) {
      return column.formatter(value);
    }
    
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    
    return String(value);
  }

  private padCell(text: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
    const strippedText = colors.strip(text);
    const extraPadding = this.options.padding || 0;
    const totalWidth = width + (extraPadding * 2);
    const padding = totalWidth - strippedText.length;
    
    if (padding <= 0) {
      return text.substring(0, totalWidth);
    }
    
    // Add extra padding on both sides if specified
    const paddedText = extraPadding > 0 
      ? ' '.repeat(extraPadding) + text + ' '.repeat(extraPadding)
      : text;
    
    const remainingPadding = totalWidth - colors.strip(paddedText).length;
    
    switch (align) {
      case 'center':
        const leftPad = Math.floor(remainingPadding / 2);
        const rightPad = remainingPadding - leftPad;
        return ' '.repeat(leftPad) + paddedText + ' '.repeat(rightPad);
      case 'right':
        return ' '.repeat(remainingPadding) + paddedText;
      default:
        return paddedText + ' '.repeat(remainingPadding);
    }
  }

  private renderSeparator(char: string = '─', junction: string = '┼'): string {
    return this.widths.map(w => char.repeat(w)).join(junction);
  }

  render(): void {
    const output = this.renderString();
    if (output) {
      process.stdout.write(output + '\n');
    }
  }

  toString(): string {
    return this.renderString();
  }

  renderString(): string {
    if (this.columns.length === 0 && this.headers.length === 0) {
      return '';
    }

    const lines: string[] = [];
    
    // Ensure we have columns and widths set up
    if (this.columns.length === 0 && this.headers.length > 0) {
      this.columns = this.headers.map((header, index) => ({
        key: String(index),
        header
      }));
    }
    
    // Calculate widths if not already calculated
    if (this.widths.length === 0) {
      this.calculateWidths();
    }
    
    // Handle different border styles
    let topLeft = '┌', topRight = '┐', topJoin = '┬';
    let midLeft = '├', midRight = '┤', midJoin = '┼';
    let bottomLeft = '└', bottomRight = '┘', bottomJoin = '┴';
    let horizontal = '─', vertical = '│';
    
    if (this.options.borderStyle === 'double') {
      topLeft = '╔'; topRight = '╗'; topJoin = '╦';
      midLeft = '╠'; midRight = '╣'; midJoin = '╬';
      bottomLeft = '╚'; bottomRight = '╝'; bottomJoin = '╩';
      horizontal = '═'; vertical = '║';
    } else if (this.options.borderStyle === 'none') {
      // For 'none', we'll just return content without borders
      const result: string[] = [];
      
      if (this.columns.length > 0) {
        const headerCells = this.columns.map((col, i) => {
          return this.padCell(col.header, this.widths[i] || 10, col.align || 'left');
        });
        result.push(headerCells.join('  '));
        
        for (const row of this.data) {
          const cells = this.columns.map((col, i) => {
            const value = this.formatValue(row[col.key], col);
            return this.padCell(value, this.widths[i] || 10, col.align || 'left');
          });
          result.push(cells.join('  '));
        }
      }
      
      return result.join('\n');
    } else if (this.options.borderStyle === 'ascii') {
      topLeft = '+'; topRight = '+'; topJoin = '+';
      midLeft = '+'; midRight = '+'; midJoin = '+';
      bottomLeft = '+'; bottomRight = '+'; bottomJoin = '+';
      horizontal = '-'; vertical = '|';
    }

    const topBorder = topLeft + this.widths.map(w => horizontal.repeat(w || 0)).join(topJoin) + topRight;
    lines.push(topBorder);

    const headerCells = this.columns.map((col, i) => {
      return this.padCell(colors.bold(col.header), this.widths[i] || 10, col.align || 'left');
    });
    lines.push(vertical + headerCells.join(vertical) + vertical);

    if (this.data.length > 0) {
      const headerSeparator = midLeft + this.widths.map(w => horizontal.repeat(w || 0)).join(midJoin) + midRight;
      lines.push(headerSeparator);

      for (const row of this.data) {
        const cells = this.columns.map((col, i) => {
          const value = this.formatValue(row[col.key], col);
          return this.padCell(value, this.widths[i] || 10, col.align || 'left');
        });
        lines.push(vertical + cells.join(vertical) + vertical);
      }
    }

    const bottomBorder = bottomLeft + this.widths.map(w => horizontal.repeat(w || 0)).join(bottomJoin) + bottomRight;
    lines.push(bottomBorder);

    return lines.join('\n');
  }

  renderSimple(): string {
    if (this.columns.length === 0 || this.data.length === 0) {
      return '';
    }

    const lines: string[] = [];

    const headerCells = this.columns.map((col, i) => {
      return this.padCell(colors.bold(col.header), this.widths[i], col.align || 'left');
    });
    lines.push(headerCells.join('  '));

    const separator = this.widths.map(w => '─'.repeat(w)).join('  ');
    lines.push(colors.dim(separator));

    for (const row of this.data) {
      const cells = this.columns.map((col, i) => {
        const value = this.formatValue(row[col.key], col);
        return this.padCell(value, this.widths[i], col.align || 'left');
      });
      lines.push(cells.join('  '));
    }

    return lines.join('\n');
  }
}

export function createTable(data: any[], columns: Column[]): string {
  const table = new Table();
  table.setColumns(columns);
  table.setData(data);
  return table.renderString();
}

export function createSimpleTable(data: any[], columns: Column[]): string {
  const table = new Table();
  table.setColumns(columns);
  table.setData(data);
  return table.renderSimple();
}