#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function packageBinary() {
  console.log('Packaging NodeModulesCleaner as standalone binary...\n');

  const platforms = [
    { name: 'windows', target: 'node16-win-x64', ext: '.exe' },
    { name: 'macos', target: 'node16-macos-x64', ext: '' },
    { name: 'linux', target: 'node16-linux-x64', ext: '' }
  ];

  // Build TypeScript first
  console.log('Building TypeScript...');
  try {
    await execAsync('npm run build');
    console.log('Build complete\n');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }

  // Create binaries directory
  const binDir = path.join(__dirname, '..', 'binaries');
  await fs.mkdir(binDir, { recursive: true });

  // Create single-file bundle
  console.log('Creating bundle...');
  const entryPoint = path.join(__dirname, '..', 'dist', 'cli', 'index.js');
  const bundlePath = path.join(binDir, 'nmc-bundle.js');

  // Simple bundler - concatenate all files
  const bundle = await createBundle(entryPoint);
  await fs.writeFile(bundlePath, bundle);

  console.log('Bundle created\n');

  // Package for each platform using Node.js
  for (const platform of platforms) {
    console.log(`Packaging for ${platform.name}...`);
    
    const outputPath = path.join(binDir, `nmc-${platform.name}${platform.ext}`);
    
    // Create platform-specific wrapper
    if (platform.name === 'windows') {
      await createWindowsExecutable(bundlePath, outputPath);
    } else {
      await createUnixExecutable(bundlePath, outputPath);
    }
    
    console.log(`  Created: ${outputPath}`);
  }

  console.log('\nPackaging complete!');
  console.log(`Binaries available in: ${binDir}`);
}

async function createBundle(entryPoint) {
  const visited = new Set();
  const bundle = [];

  async function processFile(filePath) {
    if (visited.has(filePath)) return;
    visited.add(filePath);

    try {
      let content = await fs.readFile(filePath, 'utf8');
      
      // Find and process require statements
      const requirePattern = /require\(['"](.+?)['"]\)/g;
      let match;
      
      while ((match = requirePattern.exec(content)) !== null) {
        const modulePath = match[1];
        
        if (modulePath.startsWith('.')) {
          const resolvedPath = path.resolve(path.dirname(filePath), modulePath);
          const jsPath = resolvedPath.endsWith('.js') ? resolvedPath : resolvedPath + '.js';
          
          await processFile(jsPath);
        }
      }
      
      // Remove require statements for local modules
      content = content.replace(/const .+ = require\(['"]\..+?['"]\);?\n/g, '');
      content = content.replace(/import .+ from ['"]\..+?['"];?\n/g, '');
      
      bundle.push(`// File: ${filePath}\n${content}\n`);
    } catch (error) {
      console.warn(`Warning: Could not process ${filePath}`);
    }
  }

  await processFile(entryPoint);
  
  return `#!/usr/bin/env node
// NodeModulesCleaner - Zero Dependency Bundle
(function() {
  'use strict';
  
${bundle.join('\n')}

})();`;
}

async function createWindowsExecutable(bundlePath, outputPath) {
  // Create a batch file wrapper
  const batchContent = `@echo off
node "%~dp0\\nmc-bundle.js" %*`;
  
  await fs.writeFile(outputPath.replace('.exe', '.bat'), batchContent);
  
  // Copy the bundle
  await fs.copyFile(bundlePath, outputPath.replace('.exe', '.js'));
}

async function createUnixExecutable(bundlePath, outputPath) {
  // Create shell script wrapper
  const scriptContent = `#!/bin/sh
DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$DIR/nmc-bundle.js" "$@"`;
  
  await fs.writeFile(outputPath, scriptContent);
  
  // Make it executable
  await fs.chmod(outputPath, '755');
  
  // Copy the bundle
  await fs.copyFile(bundlePath, outputPath + '-bundle.js');
}

packageBinary();