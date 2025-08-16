import { Column } from '../types/index.js';
import { colors } from './colors.js';

export class Table {
  private data: any[] = [];
  private columns: Column[] = [];
  private widths: number[] = [];

  setColumns(columns: Column[]): void {
    this.columns = columns;
    this.calculateWidths();
  }

  setData(data: any[]): void {
    this.data = data;
    this.calculateWidths();
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
    
    return String(value);
  }

  private padCell(text: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
    const strippedText = colors.strip(text);
    const padding = width - strippedText.length;
    
    if (padding <= 0) {
      return text.substring(0, width);
    }
    
    switch (align) {
      case 'center':
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
      case 'right':
        return ' '.repeat(padding) + text;
      default:
        return text + ' '.repeat(padding);
    }
  }

  private renderSeparator(char: string = '─', junction: string = '┼'): string {
    return this.widths.map(w => char.repeat(w)).join(junction);
  }

  render(): string {
    if (this.columns.length === 0 || this.data.length === 0) {
      return '';
    }

    const lines: string[] = [];

    const topBorder = '┌' + this.widths.map(w => '─'.repeat(w)).join('┬') + '┐';
    lines.push(topBorder);

    const headerCells = this.columns.map((col, i) => {
      return this.padCell(colors.bold(col.header), this.widths[i], col.align || 'left');
    });
    lines.push('│' + headerCells.join('│') + '│');

    const headerSeparator = '├' + this.widths.map(w => '─'.repeat(w)).join('┼') + '┤';
    lines.push(headerSeparator);

    for (const row of this.data) {
      const cells = this.columns.map((col, i) => {
        const value = this.formatValue(row[col.key], col);
        return this.padCell(value, this.widths[i], col.align || 'left');
      });
      lines.push('│' + cells.join('│') + '│');
    }

    const bottomBorder = '└' + this.widths.map(w => '─'.repeat(w)).join('┴') + '┘';
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
  return table.render();
}

export function createSimpleTable(data: any[], columns: Column[]): string {
  const table = new Table();
  table.setColumns(columns);
  table.setData(data);
  return table.renderSimple();
}