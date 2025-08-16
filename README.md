# NodeModulesCleaner

![Version](https://img.shields.io/npm/v/@oxog/nmc)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Dependencies](https://img.shields.io/badge/dependencies-0-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)

A **ZERO DEPENDENCY** Node.js/TypeScript tool for finding, analyzing, and cleaning `node_modules` directories across your projects. Built entirely from scratch using only native Node.js APIs.

## Features

- **Zero Dependencies** - Everything built from scratch using native Node.js APIs
- **Fast Scanning** - Parallel processing for quick directory traversal
- **Smart Analysis** - Find duplicates, calculate statistics, suggest cleanup targets
- **Safe Cleaning** - Dry run mode, backup options, validation checks
- **Web Interface** - Beautiful vanilla JavaScript UI with real-time updates
- **Cross-Platform** - Works on Windows, macOS, and Linux
- **Custom CLI** - Beautiful colored output with spinners and tables
- **TypeScript** - Fully typed for better development experience

## Installation

### Via NPM (Global)
```bash
npm install -g @oxog/nmc
```

### Via NPM (Local)
```bash
npm install --save-dev @oxog/nmc
```

### From Source
```bash
git clone https://github.com/ersinkoc/NodeModulesCleaner.git
cd NodeModulesCleaner
npm install
npm run build
npm link
```

## Usage

### CLI Commands

#### Scan for node_modules
```bash
# Scan current directory
nmc scan

# Scan specific directory
nmc scan /path/to/projects

# Scan with options
nmc scan --depth 5 --hidden --sort size
```

#### Analyze with duplicate detection
```bash
# Basic analysis
nmc analyze

# Filter by size and age
nmc analyze --size-threshold 100 --age-threshold 30

# Save report to file
nmc analyze --report analysis.txt
```

#### Clean node_modules
```bash
# Interactive selection
nmc clean --interactive

# Clean all found
nmc clean --all

# Dry run to see what would be deleted
nmc clean --dry-run

# Clean with backup
nmc clean --backup

# Clean by age (older than 30 days)
nmc clean --age 30

# Clean by size (larger than 100MB)
nmc clean --size 100

# Clean duplicates only
nmc clean --duplicates
```

#### Web Interface
```bash
# Launch web UI on default port 3001
nmc web

# Custom port
nmc web --port 8080

# Don't open browser
nmc web --no-open
```

## Web Interface

The web interface provides:
- Real-time scanning with progress updates
- Interactive file browser
- Visual charts and statistics
- Drag-and-drop selection for cleaning
- Server-Sent Events for live updates
- Dark/light theme support

Access at `http://localhost:3001` after running `nmc web`

## API Usage

```typescript
import { scanner, analyzer, cleaner } from '@oxog/nmc';

// Scan for node_modules
const results = await scanner.scan('/path/to/projects', {
  maxDepth: 10,
  includeHidden: false,
  parallel: true
});

// Analyze results
const analysis = await analyzer.analyze(results, {
  findDuplicates: true,
  sizeThreshold: 50 * 1024 * 1024, // 50MB
  ageThreshold: 30 // days
});

// Clean selected directories
const cleanResult = await cleaner.clean(targets, {
  dryRun: false,
  backup: true
});
```

## Configuration

Create a `.nmcrc` file in your project root:

```json
{
  "scanOptions": {
    "maxDepth": 10,
    "excludePaths": ["**/vendor/**", "**/cache/**"],
    "includeHidden": false
  },
  "cleanOptions": {
    "backup": true,
    "dryRun": false
  },
  "webOptions": {
    "port": 3001,
    "open": true
  }
}
```

## How It Works

### Zero Dependencies Philosophy

Every feature is implemented from scratch:

- **CLI Framework** - Custom argument parser, ANSI colors, spinners, tables
- **File System** - Native fs/promises with custom glob matching
- **HTTP Server** - Native http module with custom routing
- **Frontend** - Vanilla JavaScript, no frameworks
- **Build System** - Custom bundler and packager

### Architecture

```
Core Modules:
- Scanner: Finds all node_modules directories
- Analyzer: Generates statistics and finds duplicates  
- Cleaner: Safely removes selected directories
- SizeCalculator: Efficiently calculates directory sizes

CLI Modules:
- ArgParser: Parses command-line arguments
- Colors: ANSI color formatting
- Spinner: Loading animations
- Prompt: Interactive user input
- Table: ASCII table formatting

Web Modules:
- Router: HTTP request routing
- SSEManager: Server-Sent Events
- WebServer: Native HTTP server
```

## Performance

- Parallel scanning using Promise.all()
- Caching for repeated size calculations
- Stream processing for large datasets
- Efficient memory usage with iterators
- Smart traversal avoiding symlink loops

## Safety Features

- Validates node_modules directories before deletion
- Checks for .gitignore to avoid tracked files
- Dry run mode to preview changes
- Backup option before deletion
- Force flag required for non-standard deletions
- Interactive confirmation prompts

## Development

```bash
# Install dev dependencies (only TypeScript)
npm install

# Build TypeScript
npm run build

# Development mode with watch
npm run dev

# Run tests
npm run test

# Build web UI
npm run build:web

# Package as binaries
npm run package
```

## Contributing

Contributions are welcome! Please ensure:
- No external dependencies are added
- All code is TypeScript
- Tests are included
- Code follows existing patterns

## Benchmarks

Tested on a system with 50+ projects:

- **Scanning**: ~2 seconds for 10,000 directories
- **Analysis**: ~1 second for 100 node_modules
- **Cleaning**: ~5 seconds for 10GB of data
- **Memory**: < 50MB for large operations

## Troubleshooting

### Permission Errors
Run with elevated permissions or use sudo on Unix systems.

### Symbolic Links
The scanner follows symlinks by default. Use `--no-follow` to skip them.

### Large Directories
For very large projects, increase Node's memory limit:
```bash
node --max-old-space-size=4096 nmc scan
```

## License

MIT License - See [LICENSE](LICENSE) file

## Author

**Ersin Koc**
- GitHub: [@ersinkoc](https://github.com/ersinkoc)
- Repository: [NodeModulesCleaner](https://github.com/ersinkoc/NodeModulesCleaner)

## Acknowledgments

Built as a showcase of what's possible with zero dependencies - proving that Node.js native APIs are powerful enough for complex tools.

---

**Remember**: This tool helps you reclaim disk space, but always ensure you can reinstall dependencies before cleaning!