import { Scanner } from '../../src/core/scanner';
import { createTestProject, TEST_FIXTURES_DIR } from '../setup';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('Scanner', () => {
  let scanner: Scanner;
  let testProjectPath: string;

  beforeEach(async () => {
    scanner = new Scanner();
    testProjectPath = await createTestProject('scanner-test', ['lodash', 'express']);
  });

  describe('scan', () => {
    it('should find node_modules directories', async () => {
      const results = await scanner.scan(TEST_FIXTURES_DIR);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return NodeModulesInfo with correct properties', async () => {
      const results = await scanner.scan(testProjectPath);
      
      expect(results.length).toBe(1);
      const info = results[0];
      
      expect(info).toHaveProperty('path');
      expect(info).toHaveProperty('size');
      expect(info).toHaveProperty('sizeFormatted');
      expect(info).toHaveProperty('packageCount');
      expect(info).toHaveProperty('lastModified');
      expect(info).toHaveProperty('packages');
      expect(info).toHaveProperty('projectName');
      expect(info).toHaveProperty('projectPath');
    });

    it('should respect maxDepth option', async () => {
      const shallowResults = await scanner.scan(TEST_FIXTURES_DIR, { maxDepth: 1 });
      const deepResults = await scanner.scan(TEST_FIXTURES_DIR, { maxDepth: 10 });
      
      expect(deepResults.length).toBeGreaterThanOrEqual(shallowResults.length);
    });

    it('should exclude paths based on excludePaths option', async () => {
      const allResults = await scanner.scan(TEST_FIXTURES_DIR);
      const excludedResults = await scanner.scan(TEST_FIXTURES_DIR, {
        excludePaths: ['**/scanner-test/**']
      });
      
      expect(excludedResults.length).toBeLessThan(allResults.length);
    });

    it('should handle includeHidden option', async () => {
      // Create hidden directory
      const hiddenPath = path.join(TEST_FIXTURES_DIR, '.hidden-project');
      await fs.mkdir(hiddenPath, { recursive: true });
      await fs.mkdir(path.join(hiddenPath, 'node_modules'), { recursive: true });
      
      const withoutHidden = await scanner.scan(TEST_FIXTURES_DIR, { includeHidden: false });
      const withHidden = await scanner.scan(TEST_FIXTURES_DIR, { includeHidden: true });
      
      expect(withHidden.length).toBeGreaterThanOrEqual(withoutHidden.length);
    });

    it('should handle non-existent path gracefully', async () => {
      const results = await scanner.scan('/non/existent/path');
      
      expect(results).toEqual([]);
    });

    it('should scan in parallel mode', async () => {
      const results = await scanner.scan(TEST_FIXTURES_DIR, { parallel: true });
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should scan in sequential mode', async () => {
      const results = await scanner.scan(TEST_FIXTURES_DIR, { parallel: false });
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('findAllProjects', () => {
    it('should find all projects with package.json', async () => {
      const projects = await scanner.findAllProjects(TEST_FIXTURES_DIR);
      
      expect(projects).toBeDefined();
      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThan(0);
    });

    it('should respect maxDepth parameter', async () => {
      const shallowProjects = await scanner.findAllProjects(TEST_FIXTURES_DIR, 1);
      const deepProjects = await scanner.findAllProjects(TEST_FIXTURES_DIR, 5);
      
      expect(deepProjects.length).toBeGreaterThanOrEqual(shallowProjects.length);
    });

    it('should not include node_modules in project list', async () => {
      const projects = await scanner.findAllProjects(TEST_FIXTURES_DIR);
      
      const hasNodeModules = projects.some(p => p.includes('node_modules'));
      expect(hasNodeModules).toBe(false);
    });
  });

  describe('getPackages', () => {
    it('should extract package information correctly', async () => {
      const results = await scanner.scan(testProjectPath);
      const packages = results[0].packages;
      
      expect(packages).toBeDefined();
      expect(packages.length).toBe(2);
      
      const packageNames = packages.map(p => p.name);
      expect(packageNames).toContain('lodash');
      expect(packageNames).toContain('express');
    });

    it('should handle scoped packages', async () => {
      // Create scoped package
      const scopedPath = path.join(testProjectPath, 'node_modules', '@types');
      await fs.mkdir(scopedPath, { recursive: true });
      
      const nodePath = path.join(scopedPath, 'node');
      await fs.mkdir(nodePath, { recursive: true });
      await fs.writeFile(
        path.join(nodePath, 'package.json'),
        JSON.stringify({ name: '@types/node', version: '20.0.0' })
      );
      
      const results = await scanner.scan(testProjectPath);
      const packages = results[0].packages;
      
      const scopedPackage = packages.find(p => p.name === '@types/node');
      expect(scopedPackage).toBeDefined();
    });

    it('should calculate package size', async () => {
      const results = await scanner.scan(testProjectPath);
      const packages = results[0].packages;
      
      packages.forEach(pkg => {
        expect(pkg.size).toBeGreaterThan(0);
        expect(pkg.version).toBeDefined();
        expect(pkg.dependencies).toBeDefined();
      });
    });
  });

  describe('getProjectName', () => {
    it('should extract project name from package.json', async () => {
      const results = await scanner.scan(testProjectPath);
      
      expect(results[0].projectName).toBe('test-scanner-test');
    });

    it('should fallback to directory name if no package.json', async () => {
      const noPackagePath = path.join(TEST_FIXTURES_DIR, 'no-package');
      await fs.mkdir(path.join(noPackagePath, 'node_modules'), { recursive: true });
      
      const results = await scanner.scan(noPackagePath);
      
      if (results.length > 0) {
        expect(results[0].projectName).toBe('no-package');
      }
    });
  });
});