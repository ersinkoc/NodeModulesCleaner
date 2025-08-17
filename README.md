# @oxog/nmc - Node Modules Cleaner

![npm](https://img.shields.io/npm/v/@oxog/nmc?style=flat-square) ![npm downloads](https://img.shields.io/npm/dm/@oxog/nmc?style=flat-square) ![Codecov](https://img.shields.io/codecov/c/github/ersinkoc/NodeModulesCleaner?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square) ![Dependencies](https://img.shields.io/badge/dependencies-0-green.svg?style=flat-square) ![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg?style=flat-square) [![GitHub stars](https://img.shields.io/github/stars/ersinkoc/NodeModulesCleaner?style=flat-square)](https://github.com/ersinkoc/NodeModulesCleaner/stargazers)

**🚀 A zero-dependency, lightning-fast CLI tool for managing node_modules directories**

[Installation](#installation) • [Quick Start](#quick-start) • [Commands](#commands) • [Web UI](#web-interface) • [Contributing](#contributing)


## 🎯 Why NMC?

Ever wondered how much disk space your `node_modules` folders are consuming? NMC helps you:

- 📊 **Visualize** disk usage across all your projects
- 🔍 **Find** duplicate packages and outdated modules
- 🧹 **Clean** unused node_modules with confidence
- 💾 **Save** gigabytes of disk space
- ⚡ **Speed up** your development environment

## ✨ Features

### Core Features
- 🚫 **Zero Dependencies** - Built entirely with Node.js native APIs
- 🌍 **Cross-Platform** - Works seamlessly on Windows, macOS, and Linux
- ⚡ **Lightning Fast** - Parallel scanning with optimized algorithms
- 🛡️ **Safe Operations** - Dry-run mode, backup options, validation checks
- 🎨 **Beautiful CLI** - Colored output, progress bars, interactive mode
- 🌐 **Web Interface** - Modern browser-based UI for visual management

### Advanced Features
- 📈 **Smart Analysis** - Find duplicates, analyze trends, get insights
- 🔄 **Multiple Strategies** - Clean by age, size, or duplicates
- 📝 **Detailed Reports** - Export results in JSON, CSV, or HTML
- 🎯 **Precise Filtering** - Glob patterns, size thresholds, age limits
- 🔒 **Security First** - Path validation, gitignore checks, safe deletion
- 🌙 **Dark Mode** - Eye-friendly interface for the web UI

## 📦 Installation

```bash
# Global installation (recommended)
npm install -g @oxog/nmc

# Or using yarn
yarn global add @oxog/nmc

# Or run directly with npx
npx @oxog/nmc scan
```

## 🚀 Quick Start

```bash
# Scan current directory for node_modules
nmc scan

# Analyze your projects folder
nmc analyze ~/projects

# Clean with interactive selection
nmc clean ~/projects --interactive

# Launch web interface
nmc web --open
```

## 📖 Commands

### 🔍 `scan [path]`
Find all node_modules directories in the specified path.

```bash
nmc scan ~/projects --depth 5 --sort size
```

**Options:**
- `--depth <n>` - Maximum directory depth (default: 10)
- `--sort <field>` - Sort by: `size`, `date`, `name`, `packages`
- `--limit <n>` - Limit number of results
- `--min-size <MB>` - Minimum size threshold
- `--exclude <patterns>` - Exclude paths (glob patterns)
- `--json` - Output as JSON

**Example Output:**
```
📦 Found 12 node_modules directories (3.2 GB total)

┌─────┬──────────────────────┬──────────┬──────────┬───────────┐
│ #   │ Project              │ Size     │ Packages │ Modified  │
├─────┼──────────────────────┼──────────┼──────────┼───────────┤
│ 1   │ my-app               │ 523 MB   │ 1,234    │ 2 days    │
│ 2   │ another-project      │ 412 MB   │ 987      │ 1 week    │
└─────┴──────────────────────┴──────────┴──────────┴───────────┘
```

### 📊 `analyze [path]`
Analyze node_modules for duplicates and statistics.

```bash
nmc analyze ~/projects --find-duplicates
```

**Options:**
- `--find-duplicates` - Find duplicate packages
- `--min-size <MB>` - Minimum size threshold
- `--max-age <days>` - Maximum age in days
- `--show-versions` - Show package versions

**Example Output:**
```
📊 Analysis Results

Total Size: 3.2 GB
Total Projects: 12
Total Packages: 5,432
Unique Packages: 892

🔄 Top Duplicates:
• react (18.2.0): Found in 8 projects (120 MB total)
• lodash (4.17.21): Found in 6 projects (45 MB total)
• webpack (5.89.0): Found in 5 projects (230 MB total)

💡 Recommendations:
• Consider using pnpm for better deduplication
• 5 projects haven't been used in 30+ days
• Potential space savings: 1.8 GB
```

### 🧹 `clean [paths...]`
Clean specified node_modules directories.

```bash
nmc clean ./old-project --backup --dry-run
```

**Options:**
- `--dry-run` - Preview what would be deleted
- `--backup` - Create backup before deletion
- `--force` - Skip confirmation prompts
- `--interactive` - Interactive selection mode
- `--older-than <days>` - Clean if older than X days
- `--larger-than <MB>` - Clean if larger than X MB

### 🌐 `web [path]`
Launch web interface for visual management.

```bash
nmc web --port 3001 --open
```

**Options:**
- `--port <n>` - Server port (default: 3001)
- `--host <string>` - Server host (default: localhost)
- `--open` - Open browser automatically
- `--no-color` - Disable colored output

## 🎨 Web Interface

The web UI provides:
- 📊 Interactive dashboard with charts
- 🗂️ Project explorer with search
- 📈 Disk usage visualization
- 🔄 Real-time updates
- 🎯 Bulk operations
- 📱 Responsive design

## ⚙️ Configuration

Create `.nmcrc` or `nmc.config.json` in your home directory:

```json
{
  "defaultPath": "~/projects",
  "maxDepth": 5,
  "excludePaths": ["**/vendor/**", "**/.*"],
  "autoBackup": true,
  "colors": true,
  "interactive": true
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/ersinkoc/NodeModulesCleaner.git
cd NodeModulesCleaner

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Project Structure

```
NodeModulesCleaner/
├── src/
│   ├── cli/          # CLI components
│   ├── core/         # Core functionality
│   ├── lib/          # Utilities
│   └── types/        # TypeScript types
├── tests/            # Test files
└── web-ui/           # Web interface
```

## 📄 License

MIT © [Ersin Koç](https://github.com/ersinkoc)

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/@oxog/nmc)
- [GitHub Repository](https://github.com/ersinkoc/NodeModulesCleaner)
- [Issue Tracker](https://github.com/ersinkoc/NodeModulesCleaner/issues)
- [Changelog](CHANGELOG.md)

---


Made with ❤️

[⬆ Back to top](#oxognmc---node-modules-cleaner)
