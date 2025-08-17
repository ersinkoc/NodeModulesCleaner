import { CommandHandler, ParsedArgs } from '../../types/index';
import { webServer } from '../../web/server';
import { colors } from '../colors';
import * as path from 'path';
import * as fs from 'fs/promises';

export const webCommand: CommandHandler = {
  name: 'web',
  description: 'Launch web interface',
  options: [
    {
      name: 'port',
      alias: 'p',
      type: 'number',
      description: 'Port to run the server on',
      default: 3001
    },
    {
      name: 'open',
      alias: 'o',
      type: 'boolean',
      description: 'Open browser automatically',
      default: true
    },
    {
      name: 'host',
      alias: 'h',
      type: 'string',
      description: 'Host to bind to',
      default: 'localhost'
    }
  ],
  execute: async (args: ParsedArgs) => {
    const port = args.options.port || 3001;
    const host = args.options.host || 'localhost';
    const shouldOpen = args.options.open !== false;

    console.log(colors.cyan('Starting NodeModulesCleaner Web Interface...\n'));

    await ensureWebUIExists();

    try {
      await webServer.start(port);
      
      const url = `http://${host}:${port}`;
      console.log(colors.success(`Web interface running at: ${colors.underline(url)}`));
      console.log(colors.gray('\nPress Ctrl+C to stop the server\n'));

      if (shouldOpen) {
        await openBrowser(url);
      }

      process.on('SIGINT', async () => {
        console.log('\n' + colors.yellow('Shutting down server...'));
        await webServer.stop();
        process.exit(0);
      });

    } catch (error: any) {
      if (error.code === 'EADDRINUSE') {
        console.error(colors.error(`Port ${port} is already in use. Try a different port with --port`));
      } else {
        console.error(colors.error(`Failed to start server: ${error.message}`));
      }
      process.exit(1);
    }
  }
};

async function ensureWebUIExists(): Promise<void> {
  const webUIPath = path.join(process.cwd(), 'web-ui', 'public');
  
  try {
    await fs.access(webUIPath);
  } catch {
    console.log(colors.yellow('Web UI not found. Creating default interface...'));
    await createDefaultWebUI();
  }
}

async function createDefaultWebUI(): Promise<void> {
  const publicDir = path.join(process.cwd(), 'web-ui', 'public');
  await fs.mkdir(publicDir, { recursive: true });

  const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodeModulesCleaner</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div id="app">
    <header>
      <h1>NodeModulesCleaner</h1>
      <p>Zero-dependency tool for managing node_modules</p>
    </header>
    
    <nav>
      <button class="nav-btn active" data-tab="scan">Scan</button>
      <button class="nav-btn" data-tab="analyze">Analyze</button>
      <button class="nav-btn" data-tab="clean">Clean</button>
    </nav>
    
    <main>
      <div id="scan-tab" class="tab-content active">
        <h2>Scan for node_modules</h2>
        <div class="controls">
          <input type="text" id="scan-path" placeholder="Enter path to scan" value=".">
          <button id="scan-btn">Start Scan</button>
        </div>
        <div id="scan-results"></div>
      </div>
      
      <div id="analyze-tab" class="tab-content">
        <h2>Analyze node_modules</h2>
        <div class="controls">
          <input type="text" id="analyze-path" placeholder="Enter path to analyze" value=".">
          <button id="analyze-btn">Analyze</button>
        </div>
        <div id="analyze-results"></div>
      </div>
      
      <div id="clean-tab" class="tab-content">
        <h2>Clean node_modules</h2>
        <div id="clean-list"></div>
        <div class="controls">
          <label>
            <input type="checkbox" id="dry-run"> Dry Run
          </label>
          <label>
            <input type="checkbox" id="backup"> Create Backup
          </label>
          <button id="clean-btn" disabled>Clean Selected</button>
        </div>
      </div>
    </main>
    
    <footer>
      <div id="status"></div>
    </footer>
  </div>
  
  <script src="/app.js"></script>
</body>
</html>`;

  const styleCSS = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
}

#app {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  overflow: hidden;
}

header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  text-align: center;
}

header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
}

header p {
  opacity: 0.9;
}

nav {
  display: flex;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.nav-btn {
  flex: 1;
  padding: 15px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.nav-btn:hover {
  background: #e0e0e0;
}

.nav-btn.active {
  background: white;
  border-bottom: 3px solid #667eea;
  font-weight: bold;
}

main {
  padding: 30px;
  min-height: 400px;
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

input[type="text"] {
  flex: 1;
  padding: 10px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

button {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

button:hover:not(:disabled) {
  background: #5a67d8;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-item {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 10px;
}

.result-item h3 {
  color: #333;
  margin-bottom: 5px;
}

.result-item .meta {
  color: #666;
  font-size: 14px;
}

footer {
  background: #f5f5f5;
  padding: 15px 30px;
  border-top: 1px solid #ddd;
}

#status {
  color: #666;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  background: #fee;
  color: #c00;
  padding: 15px;
  border-radius: 6px;
  margin: 10px 0;
}

.success {
  background: #efe;
  color: #060;
  padding: 15px;
  border-radius: 6px;
  margin: 10px 0;
}`;

  const appJS = `const API_BASE = '';
let eventSource = null;
let scanResults = [];

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initEventSource();
  initScanTab();
  initAnalyzeTab();
  initCleanTab();
});

function initTabs() {
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === tabName + '-tab');
  });
}

function initEventSource() {
  eventSource = new EventSource('/api/events');
  
  eventSource.addEventListener('connected', (e) => {
    updateStatus('Connected to server');
  });
  
  eventSource.addEventListener('scan:complete', (e) => {
    const data = JSON.parse(e.data);
    updateStatus(\`Scan complete: found \${data.count} node_modules\`);
  });
  
  eventSource.addEventListener('error', () => {
    updateStatus('Connection lost. Reconnecting...');
  });
}

function initScanTab() {
  const scanBtn = document.getElementById('scan-btn');
  const scanPath = document.getElementById('scan-path');
  const scanResults = document.getElementById('scan-results');
  
  scanBtn.addEventListener('click', async () => {
    const path = scanPath.value || '.';
    scanBtn.disabled = true;
    scanResults.innerHTML = '<div class="loading">Scanning...</div>';
    
    try {
      const response = await fetch(\`/api/scan?path=\${encodeURIComponent(path)}\`);
      const data = await response.json();
      
      if (data.success) {
        displayScanResults(data.results);
      } else {
        scanResults.innerHTML = \`<div class="error">Error: \${data.error}</div>\`;
      }
    } catch (error) {
      scanResults.innerHTML = \`<div class="error">Failed to scan: \${error.message}</div>\`;
    } finally {
      scanBtn.disabled = false;
    }
  });
}

function displayScanResults(results) {
  const container = document.getElementById('scan-results');
  
  if (results.length === 0) {
    container.innerHTML = '<div class="error">No node_modules found</div>';
    return;
  }
  
  scanResults = results;
  
  const html = results.map(r => \`
    <div class="result-item">
      <h3>\${r.projectName || 'Unknown Project'}</h3>
      <div class="meta">
        Size: \${r.sizeFormatted} | 
        Packages: \${r.packageCount} | 
        Path: \${r.projectPath}
      </div>
    </div>
  \`).join('');
  
  container.innerHTML = html;
}

function initAnalyzeTab() {
  const analyzeBtn = document.getElementById('analyze-btn');
  const analyzePath = document.getElementById('analyze-path');
  const analyzeResults = document.getElementById('analyze-results');
  
  analyzeBtn.addEventListener('click', async () => {
    const path = analyzePath.value || '.';
    analyzeBtn.disabled = true;
    analyzeResults.innerHTML = '<div class="loading">Analyzing...</div>';
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      
      const data = await response.json();
      
      if (data.success) {
        displayAnalyzeResults(data.analysis);
      } else {
        analyzeResults.innerHTML = \`<div class="error">Error: \${data.error}</div>\`;
      }
    } catch (error) {
      analyzeResults.innerHTML = \`<div class="error">Failed to analyze: \${error.message}</div>\`;
    } finally {
      analyzeBtn.disabled = false;
    }
  });
}

function displayAnalyzeResults(analysis) {
  const container = document.getElementById('analyze-results');
  const stats = analysis.statistics;
  
  const html = \`
    <div class="result-item">
      <h3>Statistics</h3>
      <div class="meta">
        Total node_modules: \${stats.totalNodeModules}<br>
        Total size: \${formatBytes(stats.totalSize)}<br>
        Total packages: \${stats.totalPackages}<br>
        Average size: \${formatBytes(stats.averageSize)}
      </div>
    </div>
    \${analysis.duplicates ? \`
      <div class="result-item">
        <h3>Duplicates</h3>
        <div class="meta">
          Total duplicates: \${analysis.duplicates.totalDuplicates}<br>
          Potential savings: \${formatBytes(analysis.duplicates.potentialSavings)}
        </div>
      </div>
    \` : ''}
  \`;
  
  container.innerHTML = html;
}

function initCleanTab() {
  updateCleanList();
}

function updateCleanList() {
  const container = document.getElementById('clean-list');
  
  if (scanResults.length === 0) {
    container.innerHTML = '<div class="error">No scan results. Please scan first.</div>';
    return;
  }
  
  const html = scanResults.map((r, i) => \`
    <div class="result-item">
      <label>
        <input type="checkbox" data-index="\${i}">
        <strong>\${r.projectName || 'Unknown'}</strong> - \${r.sizeFormatted}
      </label>
    </div>
  \`).join('');
  
  container.innerHTML = html;
  
  document.getElementById('clean-btn').disabled = false;
}

function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function updateStatus(message) {
  document.getElementById('status').textContent = message;
}`;

  await fs.writeFile(path.join(publicDir, 'index.html'), indexHTML);
  await fs.writeFile(path.join(publicDir, 'style.css'), styleCSS);
  await fs.writeFile(path.join(publicDir, 'app.js'), appJS);
  
  console.log(colors.success('Default web UI created successfully'));
}

async function openBrowser(url: string): Promise<void> {
  const { exec } = await import('child_process');
  
  const platform = process.platform;
  let command: string;
  
  if (platform === 'darwin') {
    command = `open ${url}`;
  } else if (platform === 'win32') {
    command = `start ${url}`;
  } else {
    command = `xdg-open ${url}`;
  }
  
  exec(command, (error) => {
    if (error) {
      console.log(colors.gray('Could not open browser automatically'));
    }
  });
}