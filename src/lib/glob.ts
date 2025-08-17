import * as path from 'path';
import * as fs from 'fs/promises';

export class Glob {
  private cache = new Map<string, RegExp>();

  async match(pattern: string | string[], dirPath: string, options?: any): Promise<string[]> {
    if (Array.isArray(pattern)) {
      return this.matchMultiple(pattern, dirPath, options);
    }
    
    // Handle brace expansion first
    const expandedPatterns = this.expandBraces(pattern);
    const allMatches = new Set<string>();
    
    for (const expandedPattern of expandedPatterns) {
      const matches = await this.matchSingle(expandedPattern, dirPath, options);
      matches.forEach(m => allMatches.add(m));
    }
    
    return Array.from(allMatches);
  }

  private async matchMultiple(patterns: string[], dirPath: string, options?: any): Promise<string[]> {
    const includes: string[] = [];
    const excludes: string[] = [];
    
    for (const pattern of patterns) {
      if (pattern.startsWith('!')) {
        excludes.push(pattern.slice(1));
      } else {
        includes.push(pattern);
      }
    }
    
    const allMatches = new Set<string>();
    
    for (const includePattern of includes) {
      const matches = await this.match(includePattern, dirPath, options);
      matches.forEach(m => allMatches.add(m));
    }
    
    for (const excludePattern of excludes) {
      const matches = await this.match(excludePattern, dirPath, options);
      matches.forEach(m => allMatches.delete(m));
    }
    
    return Array.from(allMatches);
  }

  private async matchSingle(pattern: string, dirPath: string, options?: any): Promise<string[]> {
    const results: string[] = [];
    const regex = this.patternToRegex(pattern);
    const isDirectoryPattern = pattern.endsWith('/');
    const includeDot = options?.dot === true;
    
    const walk = async (currentPath: string, relativePath: string = ''): Promise<void> => {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const name = entry.name;
          
          // Skip dot files unless dot option is true
          if (!includeDot && name.startsWith('.')) {
            continue;
          }
          
          const fullPath = path.join(currentPath, name);
          const relPath = relativePath ? path.join(relativePath, name) : name;
          const normalizedPath = relPath.replace(/\\/g, '/');
          
          if (entry.isDirectory()) {
            const dirPath = normalizedPath + '/';
            if (isDirectoryPattern && regex.test(normalizedPath)) {
              results.push(dirPath);
            } else if (!isDirectoryPattern && regex.test(normalizedPath)) {
              // Also match directories without trailing slash
              results.push(normalizedPath);
            }
            
            // Continue walking for ** patterns or if pattern includes directories
            if (pattern.includes('**') || pattern.includes('/')) {
              await walk(fullPath, relPath);
            }
          } else if (entry.isFile() && !isDirectoryPattern) {
            if (regex.test(normalizedPath)) {
              results.push(normalizedPath);
            }
          }
        }
      } catch (error) {
        // Ignore errors
      }
    };
    
    await walk(dirPath);
    return results;
  }

  isMatch(filePath: string, pattern: string | string[], options?: any): boolean {
    if (Array.isArray(pattern)) {
      const includes = pattern.filter(p => !p.startsWith('!'));
      const excludes = pattern.filter(p => p.startsWith('!')).map(p => p.slice(1));
      
      const included = includes.some(p => this.isMatch(filePath, p, options));
      const excluded = excludes.some(p => this.isMatch(filePath, p, options));
      
      return included && !excluded;
    }
    
    const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
    let testPath = normalizedPath;
    
    if (options?.nocase) {
      testPath = testPath.toLowerCase();
      pattern = pattern.toLowerCase();
    }
    
    // Handle brace expansion
    const expandedPatterns = this.expandBraces(pattern);
    for (const expandedPattern of expandedPatterns) {
      const regex = this.patternToRegex(expandedPattern);
      if (regex.test(testPath)) {
        return true;
      }
    }
    
    return false;
  }

  private patternToRegex(pattern: string): RegExp {
    // Remove trailing slash for directory patterns
    const cleanPattern = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;
    
    if (this.cache.has(cleanPattern)) {
      return this.cache.get(cleanPattern)!;
    }
    
    // Handle escaped characters first - replace with placeholders
    let expandedPattern = cleanPattern
      .replace(/\\\\/g, '__ESCAPED_BACKSLASH__')
      .replace(/\\\*/g, '__ESCAPED_STAR__')
      .replace(/\\\?/g, '__ESCAPED_QUESTION__')
      .replace(/\\\[/g, '__ESCAPED_LBRACKET__')
      .replace(/\\\]/g, '__ESCAPED_RBRACKET__')
      .replace(/\\\{/g, '__ESCAPED_LBRACE__')
      .replace(/\\\}/g, '__ESCAPED_RBRACE__')
      .replace(/\\\(/g, '__ESCAPED_LPAREN__')
      .replace(/\\\)/g, '__ESCAPED_RPAREN__');
    
    // Handle brace expansion like {js,ts} BEFORE escaping
    if (expandedPattern.includes('{') && expandedPattern.includes('}') && !expandedPattern.includes('__ESCAPED_')) {
      const braceMatch = expandedPattern.match(/\{([^}]+)\}/);
      if (braceMatch) {
        const options = braceMatch[1].split(',');
        expandedPattern = expandedPattern.replace(braceMatch[0], `(${options.join('|')})`);
      }
    }

    // First save special patterns with unique markers that won't be escaped
    expandedPattern = expandedPattern.replace(/\*\*/g, '__DOUBLE_STAR__');
    expandedPattern = expandedPattern.replace(/\*/g, '__SINGLE_STAR__');
    expandedPattern = expandedPattern.replace(/\?/g, '__QUESTION__');
    
    // Now escape special regex characters
    let regexStr = expandedPattern
      .replace(/\\/g, '/')
      .replace(/\./g, '\\.')
      .replace(/\+/g, '\\+')
      .replace(/\^/g, '\\^')
      .replace(/\$/g, '\\$')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

    // Now replace glob patterns
    regexStr = regexStr.replace(/__SINGLE_STAR__/g, '[^/]*');
    regexStr = regexStr.replace(/__QUESTION__/g, '[^/]');
    regexStr = regexStr.replace(/__DOUBLE_STAR__/g, '.*');
    
    // Replace escaped characters with their literal versions
    regexStr = regexStr
      .replace(/__ESCAPED_BACKSLASH__/g, '\\\\')
      .replace(/__ESCAPED_STAR__/g, '\\*')
      .replace(/__ESCAPED_QUESTION__/g, '\\?')
      .replace(/__ESCAPED_LBRACKET__/g, '\\[')
      .replace(/__ESCAPED_RBRACKET__/g, '\\]')
      .replace(/__ESCAPED_LBRACE__/g, '\\{')
      .replace(/__ESCAPED_RBRACE__/g, '\\}')
      .replace(/__ESCAPED_LPAREN__/g, '\\(')
      .replace(/__ESCAPED_RPAREN__/g, '\\)');

    if (!regexStr.startsWith('^')) {
      regexStr = '^' + regexStr;
    }
    if (!regexStr.endsWith('$')) {
      regexStr = regexStr + '$';
    }

    const regex = new RegExp(regexStr);
    this.cache.set(cleanPattern, regex);
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
            if (this.isMatch(relativePath, pattern)) {
              results.push(fullPath);
            }
            await walk(fullPath, depth + 1);
          } else if (entry.isFile() || (opts.followSymlinks && entry.isSymbolicLink())) {
            if (this.isMatch(relativePath, pattern)) {
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

  expand(pattern: string): string[] {
    // Handle numeric and character ranges
    const numericRange = pattern.match(/\{(\d+)\.\.(\d+)\}/);
    if (numericRange) {
      const results: string[] = [];
      const start = parseInt(numericRange[1]);
      const end = parseInt(numericRange[2]);
      for (let i = start; i <= end; i++) {
        results.push(pattern.replace(numericRange[0], String(i)));
      }
      return results;
    }
    
    const charRange = pattern.match(/\{([a-z])\.\.([a-z])\}/i);
    if (charRange) {
      const results: string[] = [];
      const start = charRange[1].charCodeAt(0);
      const end = charRange[2].charCodeAt(0);
      for (let i = start; i <= end; i++) {
        results.push(pattern.replace(charRange[0], String.fromCharCode(i)));
      }
      return results;
    }
    
    return this.expandBraces(pattern);
  }

  escape(str: string): string {
    // Escape special glob characters by replacing them with their literal versions
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\*/g, '\\*')
      .replace(/\?/g, '\\?')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\+/g, '\\+')
      .replace(/\^/g, '\\^')
      .replace(/\$/g, '\\$')
      .replace(/\|/g, '\\|');
  }

  isValidPattern(pattern: any): boolean {
    if (!pattern || typeof pattern !== 'string') {
      return false;
    }
    return pattern.length > 0;
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