import { ArgParser } from '../../src/cli/arg-parser';

describe('ArgParser', () => {
  let parser: ArgParser;

  beforeEach(() => {
    parser = new ArgParser();
  });

  describe('option', () => {
    it('should add option to parser', () => {
      parser.option('-t, --test', 'Test option', 'default');
      
      const result = parser.parse(['node', 'script']);
      expect(result.options.test).toBe('default');
    });

    it('should handle boolean flags', () => {
      parser.option('-v, --verbose', 'Verbose output');
      
      const result = parser.parse(['node', 'script', '--verbose']);
      expect(result.options.verbose).toBe(true);
    });

    it('should handle options with values', () => {
      parser.option('-o, --output <path>', 'Output path');
      
      const result = parser.parse(['node', 'script', '--output', '/tmp/out']);
      expect(result.options.output).toBe('/tmp/out');
    });

    it('should handle short flags', () => {
      parser.option('-d, --debug', 'Debug mode');
      
      const result = parser.parse(['node', 'script', '-d']);
      expect(result.options.debug).toBe(true);
    });

    it('should handle multiple options', () => {
      parser
        .option('-v, --verbose', 'Verbose')
        .option('-d, --debug', 'Debug')
        .option('-o, --output <path>', 'Output');
      
      const result = parser.parse(['node', 'script', '-v', '-d', '--output', 'test.txt']);
      
      expect(result.options.verbose).toBe(true);
      expect(result.options.debug).toBe(true);
      expect(result.options.output).toBe('test.txt');
    });

    it('should use default values', () => {
      parser.option('-p, --port <number>', 'Port number', '3000');
      
      const result = parser.parse(['node', 'script']);
      expect(result.options.port).toBe('3000');
    });

    it('should override default values', () => {
      parser.option('-p, --port <number>', 'Port number', '3000');
      
      const result = parser.parse(['node', 'script', '--port', '8080']);
      expect(result.options.port).toBe('8080');
    });
  });

  describe('command', () => {
    it('should register command', () => {
      const handler = jest.fn();
      parser.command('test <arg>', 'Test command', handler);
      
      parser.parse(['node', 'script', 'test', 'value']);
      
      expect(handler).toHaveBeenCalledWith(['value'], expect.any(Object));
    });

    it('should handle command with multiple arguments', () => {
      const handler = jest.fn();
      parser.command('deploy <env> <version>', 'Deploy command', handler);
      
      parser.parse(['node', 'script', 'deploy', 'prod', 'v1.0.0']);
      
      expect(handler).toHaveBeenCalledWith(['prod', 'v1.0.0'], expect.any(Object));
    });

    it('should handle optional command arguments', () => {
      const handler = jest.fn();
      parser.command('init [name]', 'Init command', handler);
      
      parser.parse(['node', 'script', 'init']);
      
      expect(handler).toHaveBeenCalledWith([], expect.any(Object));
    });

    it('should pass options to command handler', () => {
      const handler = jest.fn();
      parser.option('-v, --verbose', 'Verbose');
      parser.command('test', 'Test command', handler);
      
      parser.parse(['node', 'script', 'test', '--verbose']);
      
      expect(handler).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ verbose: true })
      );
    });

    it('should handle nested commands', () => {
      const handler = jest.fn();
      parser.command('db:migrate', 'Database migration', handler);
      
      parser.parse(['node', 'script', 'db:migrate']);
      
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('parse', () => {
    it('should parse arguments', () => {
      const result = parser.parse(['node', 'script', 'arg1', 'arg2']);
      
      expect(result.args).toEqual(['arg1', 'arg2']);
      expect(result.options).toEqual({});
    });

    it('should separate args and options', () => {
      parser.option('-v, --verbose', 'Verbose');
      
      const result = parser.parse(['node', 'script', 'file.txt', '--verbose']);
      
      expect(result.args).toEqual(['file.txt']);
      expect(result.options.verbose).toBe(true);
    });

    it('should handle equals syntax', () => {
      parser.option('-o, --output <path>', 'Output');
      
      const result = parser.parse(['node', 'script', '--output=test.txt']);
      
      expect(result.options.output).toBe('test.txt');
    });

    it('should handle combined short flags', () => {
      parser
        .option('-a, --all', 'All')
        .option('-b, --binary', 'Binary')
        .option('-c, --color', 'Color');
      
      const result = parser.parse(['node', 'script', '-abc']);
      
      expect(result.options.all).toBe(true);
      expect(result.options.binary).toBe(true);
      expect(result.options.color).toBe(true);
    });

    it('should handle double dash separator', () => {
      parser.option('-v, --verbose', 'Verbose');
      
      const result = parser.parse(['node', 'script', '--verbose', '--', '--not-an-option']);
      
      expect(result.options.verbose).toBe(true);
      expect(result.args).toContain('--not-an-option');
    });

    it('should handle empty arguments', () => {
      const result = parser.parse(['node', 'script']);
      
      expect(result.args).toEqual([]);
      expect(result.options).toEqual({});
    });

    it('should handle negated options', () => {
      parser.option('--no-color', 'Disable color');
      
      const result = parser.parse(['node', 'script', '--no-color']);
      
      expect(result.options.color).toBe(false);
    });
  });

  describe('help', () => {
    it('should generate help text', () => {
      parser
        .option('-v, --verbose', 'Verbose output')
        .option('-d, --debug', 'Debug mode')
        .command('test <file>', 'Run tests', jest.fn());
      
      const help = parser.help();
      
      expect(help).toContain('Options:');
      expect(help).toContain('-v, --verbose');
      expect(help).toContain('Verbose output');
      expect(help).toContain('Commands:');
      expect(help).toContain('test <file>');
      expect(help).toContain('Run tests');
    });

    it('should format help text properly', () => {
      parser
        .option('-o, --output <path>', 'Specify output path for results')
        .option('-f, --force', 'Force operation');
      
      const help = parser.help();
      
      expect(help).toMatch(/-o, --output <path>\s+Specify output path for results/);
      expect(help).toMatch(/-f, --force\s+Force operation/);
    });
  });

  describe('version', () => {
    it('should set version', () => {
      parser.version('1.0.0');
      
      const result = parser.parse(['node', 'script', '--version']);
      
      expect(result.options.version).toBe(true);
    });

    it('should handle -V flag', () => {
      parser.version('1.0.0');
      
      const result = parser.parse(['node', 'script', '-V']);
      
      expect(result.options.version).toBe(true);
    });
  });

  describe('description', () => {
    it('should set description', () => {
      parser.description('Test CLI tool');
      
      const help = parser.help();
      
      expect(help).toContain('Test CLI tool');
    });
  });

  describe('edge cases', () => {
    it('should handle options with hyphens', () => {
      parser.option('--dry-run', 'Dry run mode');
      
      const result = parser.parse(['node', 'script', '--dry-run']);
      
      expect(result.options.dryRun).toBe(true);
    });

    it('should handle numeric values', () => {
      parser.option('-p, --port <number>', 'Port');
      
      const result = parser.parse(['node', 'script', '--port', '8080']);
      
      expect(result.options.port).toBe('8080');
    });

    it('should handle quoted values', () => {
      parser.option('-m, --message <text>', 'Message');
      
      const result = parser.parse(['node', 'script', '--message', 'Hello World']);
      
      expect(result.options.message).toBe('Hello World');
    });

    it('should handle invalid options gracefully', () => {
      const result = parser.parse(['node', 'script', '--unknown-option']);
      
      expect(result.args).toContain('--unknown-option');
    });

    it('should handle missing required argument for option', () => {
      parser.option('-o, --output <path>', 'Output');
      
      const result = parser.parse(['node', 'script', '--output']);
      
      expect(result.options.output).toBe(true);
    });
  });
});