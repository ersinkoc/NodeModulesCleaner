# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2025-08-18

### Fixed
- **Module Import Resolution**: Fixed dynamic import issues with `.js` extensions causing module resolution failures
- **File Watcher Resource Leak**: Improved `watchDirectory` function with proper error handling and type safety
- **Cache Cleaning Race Conditions**: Fixed timing issues in NPM/Yarn cache cleaning operations by using static imports
- **TypeScript Type Safety**: Enhanced type annotations and fixed FSWatcher return type

### Added
- Comprehensive test coverage for file watching functionality
- ESLint configuration for better code quality and consistency
- Proper error handling in file watcher operations

### Changed
- Improved import consistency across the codebase
- Enhanced error messages for file operations
- Better module resolution reliability

## [1.0.0] - 2025-08-17

### Added
- Initial release of NodeModulesCleaner (NMC)
- Core scanning functionality for node_modules directories
- Size calculation with human-readable formatting
- Command-line interface with multiple commands
- Support for various cleaning options
- Package dependency analysis
- Duplicate detection across projects
- Configurable exclude patterns
- JSON output format for automation
- Comprehensive test suite with 100% coverage

### Features
- **Scanner**: Recursively find all node_modules directories
- **Analyzer**: Analyze disk usage and find duplicates
- **Cleaner**: Safe deletion with multiple strategies
- **Reporter**: Generate detailed reports in multiple formats

### Security
- Safe deletion with validation checks
- Protection against accidental deletions
- .gitignore verification before cleaning

## [0.9.0] - 2025-08-16 (Beta)

### Added
- Beta release for testing
- Basic scanning and cleaning functionality
- Command-line argument parsing
- Size calculation utilities

### Changed
- Improved error handling
- Enhanced performance for large directories

### Fixed
- File permission issues on Windows
- Symbolic link handling
- Path resolution on different platforms

## [0.5.0] - 2025-08-15 (Alpha)

### Added
- Alpha release for internal testing
- Basic node_modules detection
- Simple deletion functionality

### Known Issues
- Limited error handling
- No backup functionality
- Performance issues with large projects

---

## Version History

- **1.0.1** - Bug fixes and stability improvements
- **1.0.0** - Production release
- **0.9.0** - Beta release
- **0.5.0** - Alpha release

[Unreleased]: https://github.com/ersinkoc/NodeModulesCleaner/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/ersinkoc/NodeModulesCleaner/releases/tag/v1.0.1
[1.0.0]: https://github.com/ersinkoc/NodeModulesCleaner/releases/tag/v1.0.0
[0.9.0]: https://github.com/ersinkoc/NodeModulesCleaner/releases/tag/v0.9.0
[0.5.0]: https://github.com/ersinkoc/NodeModulesCleaner/releases/tag/v0.5.0