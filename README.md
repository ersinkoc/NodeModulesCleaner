# @oxog/nmc - Node Modules Cleaner

![Version](https://img.shields.io/npm/v/@oxog/nmc)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Dependencies](https://img.shields.io/badge/dependencies-0-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)

A **zero-dependency**, cross-platform CLI tool for finding, analyzing, and cleaning `node_modules` directories across your projects. Save disk space and keep your development environment tidy!

## Features

- **Zero Dependencies** - Built entirely with Node.js native APIs
- **Cross-Platform** - Works on Windows, macOS, and Linux
- **Fast Scanning** - Parallel scanning with customizable depth
- **Smart Analysis** - Find duplicates, analyze package sizes, get cleanup suggestions
- **Safe Cleaning** - Dry-run mode, backup options, interactive selection
- **Web Interface** - Browser-based UI for visual management
- **CLI First** - Powerful command-line interface with intuitive commands

## Installation

```bash
# Global installation (recommended)
npm install -g @oxog/nmc

# Or use npx directly
npx @oxog/nmc scan
```

## Quick Start

```bash
# Scan current directory for node_modules
nmc scan

# Scan specific directory
nmc scan ~/projects

# Analyze and find duplicates
nmc analyze ~/projects

# Clean with interactive mode
nmc clean ~/projects --interactive

# Dry run to see what would be deleted
nmc clean ~/projects --dry-run
```

## Commands

### `scan [path]`
Find all node_modules directories in the specified path.

```bash
nmc scan ~/projects --depth 5 --sort size
```

Options:
- `--depth <number>` - Maximum directory depth (default: 10)
- `--sort <field>` - Sort by: size, date, name, packages (default: size)
- `--limit <number>` - Limit results
- `--min-size <MB>` - Minimum size threshold
- `--exclude <patterns>` - Exclude paths (comma-separated glob patterns)

### `analyze [path]`
Analyze node_modules for duplicates and statistics.

```bash
nmc analyze ~/projects --find-duplicates
```

Options:
- `--find-duplicates` - Find duplicate packages
- `--min-size <MB>` - Minimum size threshold
- `--max-age <days>` - Maximum age in days

### `clean [paths...]`
Clean specified node_modules directories.

```bash
nmc clean ./project1 ./project2 --backup
```

Options:
- `--dry-run` - Preview what would be deleted
- `--backup` - Create backup before deletion
- `--force` - Skip confirmation prompts
- `--interactive` - Interactive selection mode

### `web [path]`
Launch web interface for visual management.

```bash
nmc web --port 3001 --open
```

Options:
- `--port <number>` - Server port (default: 3001)
- `--host <string>` - Server host (default: localhost)
- `--open` - Open browser automatically
- `--no-open` - Don't open browser

## Web Interface

The web interface provides:
- Visual directory tree navigation
- Real-time scanning progress
- Interactive selection for batch operations
- Statistics dashboard
- Export results to JSON/CSV

Access at `http://localhost:3001` after running `nmc web`.

## Configuration

Create a `.nmcrc` file in your home directory or project root:

```json
{
  "defaultDepth": 10,
  "excludePaths": ["**/vendor/**", "**/venv/**"],
  "backupLocation": "~/.nmc-backups",
  "defaultSort": "size",
  "minSize": 50,
  "interactive": true
}
```

## Use Cases

### 1. Regular Maintenance
Clean up old projects periodically:
```bash
# Find node_modules older than 30 days
nmc analyze ~/projects --max-age 30

# Clean them with backup
nmc clean ~/projects --max-age 30 --backup
```

### 2. Free Up Space Quickly
When running low on disk space:
```bash
# Find largest node_modules
nmc scan ~ --sort size --limit 10

# Clean the largest ones
nmc clean ~/large-project --dry-run
nmc clean ~/large-project
```

### 3. CI/CD Pipeline
Keep CI environments clean:
```bash
# Clean all node_modules in workspace
nmc clean $WORKSPACE --force --no-backup
```

### 4. Project Migration
Before backing up or moving projects:
```bash
# Analyze all projects
nmc analyze ~/projects > analysis.json

# Clean selectively
nmc clean ~/projects --interactive
```

## Performance

- Scans 1000+ projects in seconds
- Handles nested node_modules efficiently
- Low memory footprint
- Parallel processing for faster operations

## Safety Features

- **Dry Run Mode** - Preview changes before execution
- **Backup Option** - Create backups before deletion
- **Interactive Mode** - Select specific directories
- **Confirmation Prompts** - Prevent accidental deletions
- **Detailed Logging** - Track all operations

## Comparison with Alternatives

| Feature | @oxog/nmc | npkill | node-prune |
|---------|-----------|--------|------------|
| Zero Dependencies | ✅ | ❌ | ❌ |
| Web Interface | ✅ | ❌ | ❌ |
| Duplicate Detection | ✅ | ❌ | ❌ |
| Backup Support | ✅ | ❌ | ❌ |
| Cross-Platform | ✅ | ✅ | ⚠️ |
| Interactive Mode | ✅ | ✅ | ❌ |

## API Usage

```javascript
import { Scanner, Analyzer, Cleaner } from '@oxog/nmc';

// Scan for node_modules
const scanner = new Scanner();
const results = await scanner.scan('/path/to/projects');

// Analyze results
const analyzer = new Analyzer();
const analysis = await analyzer.analyze(results);

// Clean selected directories
const cleaner = new Cleaner();
await cleaner.clean(analysis.suggestions, { dryRun: true });
```

## Contributing

Contributions are welcome! This project maintains zero production dependencies.

1. Fork the repository
2. Create your feature branch
3. Ensure tests pass
4. Submit a pull request

## Development

```bash
# Clone repository
git clone https://github.com/ersinkoc/NodeModulesCleaner.git
cd NodeModulesCleaner

# Install dev dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## License

MIT © Ersin Koc

## Support

- Issues: [GitHub Issues](https://github.com/ersinkoc/NodeModulesCleaner/issues)
- Discussions: [GitHub Discussions](https://github.com/ersinkoc/NodeModulesCleaner/discussions)

## Changelog

### v1.0.0
- Initial release
- Zero-dependency implementation
- Core scanning, analyzing, and cleaning features
- Web interface
- Cross-platform support

---

Made with ❤️ for developers who value disk space and clean codebases.