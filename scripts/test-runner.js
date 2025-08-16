#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class TestRunner {
  constructor() {
    this.tests = [];
    this.currentSuite = null;
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
  }

  describe(name, fn) {
    this.currentSuite = name;
    fn();
    this.currentSuite = null;
  }

  it(name, fn) {
    this.tests.push({
      suite: this.currentSuite,
      name,
      fn
    });
  }

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      toContain: (value) => {
        if (!actual.includes(value)) {
          throw new Error(`Expected ${actual} to contain ${value}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected ${actual} to be truthy`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected ${actual} to be falsy`);
        }
      },
      toThrow: () => {
        try {
          actual();
          throw new Error('Expected function to throw');
        } catch (e) {
          // Expected
        }
      }
    };
  }

  async runTests() {
    console.log('Running tests...\n');

    for (const test of this.tests) {
      const fullName = test.suite ? `${test.suite} > ${test.name}` : test.name;
      
      try {
        await test.fn();
        this.results.passed++;
        console.log(`✓ ${fullName}`);
      } catch (error) {
        this.results.failed++;
        this.results.errors.push({ test: fullName, error: error.message });
        console.log(`✗ ${fullName}`);
        console.log(`  ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Tests: ${this.results.passed} passed, ${this.results.failed} failed`);
    
    if (this.results.failed > 0) {
      process.exit(1);
    }
  }
}

async function loadTests() {
  const testDir = path.join(__dirname, '..', 'tests');
  const runner = new TestRunner();

  // Make runner available globally for test files
  global.describe = runner.describe.bind(runner);
  global.it = runner.it.bind(runner);
  global.expect = runner.expect.bind(runner);

  try {
    const files = await fs.readdir(testDir);
    const testFiles = files.filter(f => f.endsWith('.test.js'));

    for (const file of testFiles) {
      console.log(`Loading ${file}...`);
      require(path.join(testDir, file));
    }

    await runner.runTests();
  } catch (error) {
    console.error('Test runner error:', error);
    process.exit(1);
  }
}

// Compile TypeScript tests first
console.log('Compiling tests...');
const tsc = spawn('npx', ['tsc', '--project', 'tsconfig.test.json'], {
  stdio: 'inherit',
  shell: true
});

tsc.on('close', (code) => {
  if (code === 0) {
    loadTests();
  } else {
    console.error('TypeScript compilation failed');
    process.exit(1);
  }
});