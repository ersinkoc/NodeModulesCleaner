import { Analyzer } from '../../src/core/analyzer';
import { NodeModulesInfo } from '../../src/types';
import { createTestProject, TEST_FIXTURES_DIR } from '../setup';

describe('Analyzer', () => {
  let analyzer: Analyzer;
  let mockResults: NodeModulesInfo[];

  beforeEach(() => {
    analyzer = new Analyzer();
    
    // Create mock results
    mockResults = [
      {
        path: '/project1/node_modules',
        size: 50 * 1024 * 1024, // 50MB
        sizeFormatted: '50 MB',
        packageCount: 100,
        lastModified: new Date('2024-01-01'),
        packages: [
          { name: 'lodash', version: '4.17.21', size: 1000000, dependencies: 0, path: '/project1/node_modules/lodash' },
          { name: 'express', version: '4.18.0', size: 2000000, dependencies: 10, path: '/project1/node_modules/express' }
        ],
        projectName: 'project1',
        projectPath: '/project1'
      },
      {
        path: '/project2/node_modules',
        size: 100 * 1024 * 1024, // 100MB
        sizeFormatted: '100 MB',
        packageCount: 200,
        lastModified: new Date('2024-06-01'),
        packages: [
          { name: 'lodash', version: '4.17.21', size: 1000000, dependencies: 0, path: '/project2/node_modules/lodash' },
          { name: 'react', version: '18.2.0', size: 3000000, dependencies: 5, path: '/project2/node_modules/react' }
        ],
        projectName: 'project2',
        projectPath: '/project2'
      }
    ];
  });

  describe('analyze', () => {
    it('should analyze results with default options', async () => {
      const analysis = await analyzer.analyze(mockResults);
      
      expect(analysis).toHaveProperty('results');
      expect(analysis).toHaveProperty('statistics');
      expect(analysis.results.length).toBe(2);
    });

    it('should filter by size threshold', async () => {
      const analysis = await analyzer.analyze(mockResults, {
        sizeThreshold: 75 * 1024 * 1024 // 75MB
      });
      
      expect(analysis.results.length).toBe(1);
      expect(analysis.results[0].projectName).toBe('project2');
    });

    it('should filter by age threshold', async () => {
      const analysis = await analyzer.analyze(mockResults, {
        ageThreshold: 200 // 200 days old
      });
      
      // Depending on current date, this should filter results
      expect(analysis.results.length).toBeLessThanOrEqual(2);
    });

    it('should find duplicates when enabled', async () => {
      const analysis = await analyzer.analyze(mockResults, {
        findDuplicates: true
      });
      
      expect(analysis.duplicates).toBeDefined();
      expect(analysis.duplicates?.totalDuplicates).toBeGreaterThan(0);
    });

    it('should not find duplicates when disabled', async () => {
      const analysis = await analyzer.analyze(mockResults, {
        findDuplicates: false
      });
      
      expect(analysis.duplicates).toBeUndefined();
    });
  });

  describe('analyzeDuplicates', () => {
    it('should identify duplicate packages', async () => {
      const duplicates = await analyzer.analyzeDuplicates(mockResults);
      
      expect(duplicates.totalDuplicates).toBe(1);
      expect(duplicates.packages.length).toBe(1);
      expect(duplicates.packages[0].name).toBe('lodash');
    });

    it('should calculate potential savings', async () => {
      const duplicates = await analyzer.analyzeDuplicates(mockResults);
      
      expect(duplicates.potentialSavings).toBeGreaterThan(0);
      expect(duplicates.packages[0].potentialSavings).toBeGreaterThan(0);
    });

    it('should track multiple versions', async () => {
      // Add different version of lodash
      mockResults[1].packages[0].version = '4.17.20';
      
      const duplicates = await analyzer.analyzeDuplicates(mockResults);
      
      expect(duplicates.packages[0].versions.length).toBe(2);
      expect(duplicates.packages[0].versions).toContain('4.17.21');
      expect(duplicates.packages[0].versions).toContain('4.17.20');
    });

    it('should list all locations', async () => {
      const duplicates = await analyzer.analyzeDuplicates(mockResults);
      
      expect(duplicates.packages[0].locations.length).toBe(2);
      expect(duplicates.packages[0].locations).toContain('/project1');
      expect(duplicates.packages[0].locations).toContain('/project2');
    });

    it('should sort by potential savings', async () => {
      // Add more duplicates
      mockResults[0].packages.push({
        name: 'webpack',
        version: '5.0.0',
        size: 5000000,
        dependencies: 20,
        path: '/project1/node_modules/webpack'
      });
      mockResults[1].packages.push({
        name: 'webpack',
        version: '5.0.0',
        size: 5000000,
        dependencies: 20,
        path: '/project2/node_modules/webpack'
      });
      
      const duplicates = await analyzer.analyzeDuplicates(mockResults);
      
      // Webpack should be first due to larger size
      expect(duplicates.packages[0].name).toBe('webpack');
    });
  });

  describe('calculateStatistics', () => {
    it('should calculate correct statistics', () => {
      const stats = analyzer.calculateStatistics(mockResults);
      
      expect(stats.totalSize).toBe(150 * 1024 * 1024);
      expect(stats.totalPackages).toBe(300);
      expect(stats.totalNodeModules).toBe(2);
      expect(stats.averageSize).toBe(75 * 1024 * 1024);
    });

    it('should identify largest node_modules', () => {
      const stats = analyzer.calculateStatistics(mockResults);
      
      expect(stats.largestNodeModules.length).toBeLessThanOrEqual(10);
      expect(stats.largestNodeModules[0].projectName).toBe('project2');
    });

    it('should identify oldest node_modules', () => {
      const stats = analyzer.calculateStatistics(mockResults);
      
      expect(stats.oldestNodeModules.length).toBeLessThanOrEqual(10);
      expect(stats.oldestNodeModules[0].projectName).toBe('project1');
    });

    it('should handle empty results', () => {
      const stats = analyzer.calculateStatistics([]);
      
      expect(stats.totalSize).toBe(0);
      expect(stats.totalPackages).toBe(0);
      expect(stats.totalNodeModules).toBe(0);
      expect(stats.averageSize).toBe(0);
      expect(stats.largestNodeModules).toEqual([]);
      expect(stats.oldestNodeModules).toEqual([]);
    });
  });

  describe('findUnusedPackages', () => {
    it('should identify dev dependencies as potentially unused', () => {
      const nodeModules: NodeModulesInfo = {
        ...mockResults[0],
        lastModified: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days old
        packages: [
          { name: '@types/node', version: '20.0.0', size: 100000, dependencies: 0, path: '' },
          { name: 'eslint', version: '8.0.0', size: 200000, dependencies: 10, path: '' },
          { name: 'prettier', version: '3.0.0', size: 150000, dependencies: 5, path: '' }
        ]
      };
      
      const unused = analyzer.findUnusedPackages(nodeModules);
      
      expect(unused.length).toBeGreaterThan(0);
      expect(unused).toContain('@types/node');
      expect(unused).toContain('eslint');
      expect(unused).toContain('prettier');
    });

    it('should not mark recent dev dependencies as unused', () => {
      const nodeModules: NodeModulesInfo = {
        ...mockResults[0],
        lastModified: new Date(), // Today
        packages: [
          { name: 'eslint', version: '8.0.0', size: 200000, dependencies: 10, path: '' }
        ]
      };
      
      const unused = analyzer.findUnusedPackages(nodeModules);
      
      expect(unused.length).toBe(0);
    });
  });

  describe('suggestCleanupTargets', () => {
    it('should suggest old and large node_modules for cleanup', () => {
      // Make one old and large
      mockResults[0].lastModified = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
      mockResults[0].size = 200 * 1024 * 1024;
      
      const suggestions = analyzer.suggestCleanupTargets(mockResults);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].projectName).toBe('project1');
    });

    it('should prioritize by cleanup score', () => {
      // Create various scenarios
      const results: NodeModulesInfo[] = [
        {
          ...mockResults[0],
          size: 500 * 1024 * 1024, // Very large
          lastModified: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days
        },
        {
          ...mockResults[1],
          size: 50 * 1024 * 1024, // Small
          lastModified: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000) // Very old
        }
      ];
      
      const suggestions = analyzer.suggestCleanupTargets(results);
      
      expect(suggestions.length).toBeGreaterThan(0);
      // Should be sorted by score
      expect(suggestions[0]).toBeDefined();
    });

    it('should give bonus score to test/temp/old projects', () => {
      const testProject: NodeModulesInfo = {
        ...mockResults[0],
        projectName: 'test-project',
        lastModified: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000)
      };
      
      const suggestions = analyzer.suggestCleanupTargets([testProject]);
      
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('generateReport', () => {
    it('should generate text report', () => {
      const stats = analyzer.calculateStatistics(mockResults);
      const report = analyzer.generateReport(mockResults, stats);
      
      expect(report).toContain('NODE_MODULES ANALYSIS REPORT');
      expect(report).toContain('SUMMARY');
      expect(report).toContain('LARGEST NODE_MODULES');
      expect(report).toContain('OLDEST NODE_MODULES');
    });

    it('should format sizes correctly', () => {
      const stats = analyzer.calculateStatistics(mockResults);
      const report = analyzer.generateReport(mockResults, stats);
      
      expect(report).toMatch(/\d+(\.\d+)?\s+(B|KB|MB|GB|TB)/);
    });

    it('should include all statistics', () => {
      const stats = analyzer.calculateStatistics(mockResults);
      const report = analyzer.generateReport(mockResults, stats);
      
      expect(report).toContain(`Total node_modules found: ${stats.totalNodeModules}`);
      expect(report).toContain(`Total packages: ${stats.totalPackages}`);
    });
  });
});