import * as path from 'path';
import * as fs from 'fs/promises';

export class Glob {
  private cache = new Map<string, RegExp>();

  match(pattern: string, filePath: string): boolean {
    const regex = this.patternToRegex(pattern);
    const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
    return regex.test(normalizedPath);
  }

  private patternToRegex(pattern: string): RegExp {
    if (this.cache.has(pattern)) {
      return this.cache.get(pattern)!;
    }

    let regexStr = pattern
      .replace(/\\/g, '/')
      .replace(/\./g, '\\.')
      .replace(/\+/g, '\\+')
      .replace(/\^/g, '\\^')
      .replace(/\$/g, '\\$')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\|/g, '\\|');

    regexStr = regexStr.replace(/\*\*/g, '{{DOUBLE_STAR}}');
    regexStr = regexStr.replace(/\*/g, '[^/]*');
    regexStr = regexStr.replace(/\?/g, '[^/]');
    regexStr = regexStr.replace(/{{DOUBLE_STAR}}/g, '.*');

    if (!regexStr.startsWith('^')) {
      regexStr = '^' + regexStr;
    }
    if (!regexStr.endsWith('$')) {
      regexStr = regexStr + '$';
    }

    const regex = new RegExp(regexStr);
    this.cache.set(pattern, regex);
    return regex;
  }

  async scan(
    pattern: string,
    rootPath: string = process.cwd(),
    options?: {
      excludePaths?: string[];
      includeHidden?: boolean;
      maxDepth?: number;
      followSymlinks?: boolean;
    }
  ): Promise<string[]> {
    const opts = {
      excludePaths: [],
      includeHidden: false,
      maxDepth: Infinity,
      followSymlinks: false,
      ...options
    };

    const results: string[] = [];
    const excludePatterns = opts.excludePaths.map(p => this.patternToRegex(p));

    const shouldExclude = (filePath: string): boolean => {
      const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
      
      if (!opts.includeHidden) {
        const parts = normalizedPath.split('/');
        if (parts.some(part => part.startsWith('.'))) {
          return true;
        }
      }

      return excludePatterns.some(regex => regex.test(normalizedPath));
    };

    const walk = async (currentPath: string, depth: number = 0): Promise<void> => {
      if (depth > opts.maxDepth) return;

      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/');

          if (shouldExclude(relativePath)) {
            continue;
          }

          if (entry.isDirectory()) {
            if (this.match(pattern, relativePath)) {
              results.push(fullPath);
            }
            await walk(fullPath, depth + 1);
          } else if (entry.isFile() || (opts.followSymlinks && entry.isSymbolicLink())) {
            if (this.match(pattern, relativePath)) {
              results.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning ${currentPath}:`, error);
      }
    };

    await walk(rootPath);
    return results;
  }

  isGlobPattern(str: string): boolean {
    return /[*?[\]{}]/.test(str) || str.includes('**');
  }

  parseGlobPattern(pattern: string): { base: string; pattern: string } {
    const parts = pattern.replace(/\\/g, '/').split('/');
    let baseIndex = 0;

    for (let i = 0; i < parts.length; i++) {
      if (this.isGlobPattern(parts[i])) {
        baseIndex = i;
        break;
      }
    }

    const base = parts.slice(0, baseIndex).join('/') || '.';
    const globPattern = parts.slice(baseIndex).join('/');

    return { base, pattern: globPattern || '*' };
  }

  expandBraces(pattern: string): string[] {
    const match = pattern.match(/\{([^}]+)\}/);
    if (!match) {
      return [pattern];
    }

    const [full, inner] = match;
    const options = inner.split(',');
    const results: string[] = [];

    for (const option of options) {
      const expanded = pattern.replace(full, option);
      results.push(...this.expandBraces(expanded));
    }

    return results;
  }
}

export const glob = new Glob();