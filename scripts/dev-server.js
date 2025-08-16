#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3001;
const PUBLIC_DIR = path.join(__dirname, '..', 'web-ui', 'public');

// Watch for TypeScript changes and rebuild
const srcDir = path.join(__dirname, '..', 'src');
console.log('Watching for changes in:', srcDir);

// Simple file watcher
function watchFiles(dir, callback) {
  fs.readdir(dir, { withFileTypes: true }, (err, entries) => {
    if (err) return;
    
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        watchFiles(fullPath, callback);
      } else if (entry.isFile() && fullPath.endsWith('.ts')) {
        fs.watchFile(fullPath, { interval: 1000 }, () => {
          callback(fullPath);
        });
      }
    });
  });
}

// Rebuild TypeScript on change
function rebuild() {
  console.log('Rebuilding TypeScript...');
  exec('npm run build', (error, stdout, stderr) => {
    if (error) {
      console.error('Build error:', stderr);
    } else {
      console.log('Build complete');
    }
  });
}

watchFiles(srcDir, (file) => {
  console.log('File changed:', file);
  rebuild();
});

// Simple HTTP server
const server = http.createServer((req, res) => {
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  
  const extname = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Development server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop\n');
  
  // Initial build
  rebuild();
});