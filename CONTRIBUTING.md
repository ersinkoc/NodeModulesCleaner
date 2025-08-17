# Contributing to NodeModulesCleaner (NMC)

First off, thank you for considering contributing to NodeModulesCleaner! It's people like you that make NMC such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by the [NMC Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed and what behavior you expected**
* **Include screenshots if applicable**
* **Include your environment details** (OS, Node.js version, npm version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a detailed description of the suggested enhancement**
* **Provide specific examples to demonstrate the use case**
* **Describe the current behavior and expected behavior**
* **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repo and create your branch from `main`:
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Make your changes and ensure tests pass:
   ```bash
   npm test
   ```

4. Run the linter:
   ```bash
   npm run lint
   ```

5. Add tests for any new functionality

6. Update documentation as needed

7. Commit your changes using conventional commits:
   ```bash
   git commit -m "feat: add amazing feature"
   ```

### Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

* `feat:` - New feature
* `fix:` - Bug fix
* `docs:` - Documentation only changes
* `style:` - Code style changes (formatting, semicolons, etc)
* `refactor:` - Code change that neither fixes a bug nor adds a feature
* `perf:` - Performance improvements
* `test:` - Adding or updating tests
* `chore:` - Changes to build process or auxiliary tools

Examples:
```
feat: add backup functionality before deletion
fix: resolve Windows permission issues
docs: update README with new CLI options
test: add tests for scanner module
```

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/ersinkoc/NodeModulesCleaner.git
   cd NodeModulesCleaner
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

5. **Run in Development Mode**
   ```bash
   npm run dev
   ```

## Project Structure

```
NodeModulesCleaner/
├── src/
│   ├── cli/          # CLI components (arg-parser, colors, prompt, etc.)
│   ├── core/         # Core functionality (scanner, analyzer, cleaner)
│   ├── lib/          # Utilities (file-utils, glob, logger)
│   ├── types/        # TypeScript type definitions
│   └── index.ts      # Main entry point
├── tests/            # Test files
├── docs/             # Documentation
└── examples/         # Usage examples
```

## Testing

We maintain 100% test coverage. Please ensure your changes include appropriate tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/core/scanner.test.ts
```

## Code Style

We use TypeScript and follow these conventions:

* Use meaningful variable and function names
* Add JSDoc comments for public APIs
* Keep functions small and focused
* Use async/await over callbacks
* Handle errors appropriately
* Follow existing code patterns

## Documentation

* Update README.md if you change functionality
* Add JSDoc comments for new functions
* Update CHANGELOG.md following Keep a Changelog format
* Include examples for new features

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create a pull request
4. After merge, create a GitHub release
5. Publish to npm (maintainers only)

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

## Recognition

Contributors will be recognized in:
* README.md contributors section
* GitHub contributors page
* Release notes

Thank you for contributing! 🎉