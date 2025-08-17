import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Mock console methods during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Create test fixtures directory
export const TEST_FIXTURES_DIR = path.join(process.cwd(), 'test-fixtures-temp');

beforeAll(async () => {
  // Create temporary test fixtures
  await fs.mkdir(TEST_FIXTURES_DIR, { recursive: true });
});

afterAll(async () => {
  // Clean up test fixtures
  try {
    await fs.rm(TEST_FIXTURES_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
});

// Helper to create test project structure
export async function createTestProject(name: string, packages: string[] = []): Promise<string> {
  const projectPath = path.join(TEST_FIXTURES_DIR, name);
  await fs.mkdir(projectPath, { recursive: true });
  
  // Create package.json
  const packageJson = {
    name: `test-${name}`,
    version: '1.0.0',
    dependencies: packages.reduce((deps, pkg) => {
      deps[pkg] = '^1.0.0';
      return deps;
    }, {} as Record<string, string>)
  };
  
  await fs.writeFile(
    path.join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create node_modules
  const nodeModulesPath = path.join(projectPath, 'node_modules');
  await fs.mkdir(nodeModulesPath, { recursive: true });
  
  // Create mock packages
  for (const pkg of packages) {
    const pkgPath = path.join(nodeModulesPath, pkg);
    await fs.mkdir(pkgPath, { recursive: true });
    
    try {
      await fs.writeFile(
        path.join(pkgPath, 'package.json'),
        JSON.stringify({ name: pkg, version: '1.0.0' }, null, 2)
      );
      
      await fs.writeFile(
        path.join(pkgPath, 'index.js'),
        `module.exports = { name: '${pkg}' };`
      );
    } catch (error: any) {
      // Ignore write errors in test environment
      if (error.code !== 'EPERM') {
        throw error;
      }
    }
  }
  
  return projectPath;
}

// Helper to get size of directory (mock)
export async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;
  
  async function calculateSize(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        await calculateSize(fullPath);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
  }
  
  await calculateSize(dirPath);
  return totalSize;
}