#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function buildWeb() {
  console.log('Building web UI...');
  
  const srcDir = path.join(__dirname, '..', 'web-ui', 'src');
  const publicDir = path.join(__dirname, '..', 'web-ui', 'public');
  
  try {
    await fs.mkdir(publicDir, { recursive: true });
    
    // Bundle JavaScript files
    const jsFiles = [
      'components/Scanner.js',
      'components/Analyzer.js',
      'components/Cleaner.js',
      'components/Chart.js',
      'components/Table.js',
      'utils/dom.js',
      'utils/http.js',
      'utils/events.js',
      'utils/formatting.js',
      'app.js'
    ];
    
    let bundledJS = '// NodeModulesCleaner Web UI Bundle\n';
    bundledJS += '(function() {\n';
    bundledJS += '"use strict";\n\n';
    
    for (const file of jsFiles) {
      const filePath = path.join(srcDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        bundledJS += `// ${file}\n${content}\n\n`;
      } catch (error) {
        console.warn(`Warning: Could not read ${file}`);
      }
    }
    
    bundledJS += '})();\n';
    
    await fs.writeFile(path.join(publicDir, 'bundle.js'), bundledJS);
    
    // Bundle CSS files
    const cssFiles = [
      'styles/main.css',
      'styles/components.css',
      'styles/themes.css'
    ];
    
    let bundledCSS = '/* NodeModulesCleaner Web UI Styles */\n\n';
    
    for (const file of cssFiles) {
      const filePath = path.join(srcDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        bundledCSS += `/* ${file} */\n${content}\n\n`;
      } catch (error) {
        console.warn(`Warning: Could not read ${file}`);
      }
    }
    
    await fs.writeFile(path.join(publicDir, 'bundle.css'), bundledCSS);
    
    // Copy HTML file
    try {
      const htmlPath = path.join(srcDir, 'index.html');
      const htmlContent = await fs.readFile(htmlPath, 'utf8');
      await fs.writeFile(path.join(publicDir, 'index.html'), htmlContent);
    } catch (error) {
      console.warn('Warning: Could not copy index.html');
    }
    
    console.log('Web UI build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildWeb();