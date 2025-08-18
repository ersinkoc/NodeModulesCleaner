import * as http from 'http';
import * as path from 'path';
import { Router } from './router';
import { SSEManager } from './sse';
import { RouteHandler } from '../types/index';

export class WebServer {
  private server: http.Server | null = null;
  private router = new Router();
  private sseManager = new SSEManager();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.addRoute('GET', '/api/health', this.handleHealth.bind(this));
    this.router.addRoute('GET', '/api/scan', this.handleScan.bind(this));
    this.router.addRoute('POST', '/api/analyze', this.handleAnalyze.bind(this));
    this.router.addRoute('POST', '/api/clean', this.handleClean.bind(this));
    this.router.addRoute('GET', '/api/projects', this.handleProjects.bind(this));
    this.router.addRoute('GET', '/api/events', this.handleSSE.bind(this));
    
    const publicDir = path.join(process.cwd(), 'web-ui', 'public');
    this.router.addStaticRoute('/', publicDir);
  }

  addRoute(method: string, path: string, handler: RouteHandler): void {
    this.router.addRoute(method, path, handler);
  }

  addStaticRoute(prefix: string, directory: string): void {
    this.router.addStaticRoute(prefix, directory);
  }

  enableSSE(path: string): SSEManager {
    this.router.addRoute('GET', path, (req: any, res: any) => {
      const clientId = Math.random().toString(36).substring(7);
      this.sseManager.addClient(clientId, res);
    });
    
    return this.sseManager;
  }

  async start(port: number = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.router.handle(req, res);
      });

      this.server.listen(port, () => {
        console.log(`Web server running at http://localhost:${port}`);
        
        this.heartbeatInterval = this.sseManager.startHeartbeat();
        
        resolve();
      });

      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`Port ${port} is already in use`);
        } else {
          console.error('Server error:', error);
        }
        reject(error);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private async handleHealth(req: any, res: any): Promise<void> {
    res.json({ status: 'ok', timestamp: Date.now() });
  }

  private async handleScan(req: any, res: any): Promise<void> {
    const { scanner } = await import('../core/scanner');
    const targetPath = req.query.path || process.cwd();
    
    try {
      this.sseManager.broadcast('scan:start', { path: targetPath });
      
      const results = await scanner.scan(targetPath, {
        maxDepth: parseInt(req.query.depth) || 10,
        includeHidden: req.query.hidden === 'true'
      });
      
      this.sseManager.broadcast('scan:complete', { count: results.length });
      
      res.json({ success: true, results });
    } catch (error: any) {
      this.sseManager.broadcast('scan:error', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  private async handleAnalyze(req: any, res: any): Promise<void> {
    const { scanner } = await import('../core/scanner');
    const { analyzer } = await import('../core/analyzer');
    
    const targetPath = req.body.path || process.cwd();
    
    try {
      this.sseManager.broadcast('analyze:start', { path: targetPath });
      
      const scanResults = await scanner.scan(targetPath);
      
      this.sseManager.broadcast('analyze:scanning', { count: scanResults.length });
      
      const analysis = await analyzer.analyze(scanResults, {
        sizeThreshold: req.body.sizeThreshold,
        ageThreshold: req.body.ageThreshold,
        findDuplicates: req.body.findDuplicates !== false
      });
      
      this.sseManager.broadcast('analyze:complete', { 
        totalSize: analysis.statistics.totalSize,
        duplicates: analysis.duplicates?.totalDuplicates || 0
      });
      
      res.json({ success: true, analysis });
    } catch (error: any) {
      this.sseManager.broadcast('analyze:error', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  private async handleClean(req: any, res: any): Promise<void> {
    const { cleaner } = await import('../core/cleaner');
    
    const targets = req.body.targets || [];
    const options = {
      dryRun: req.body.dryRun || false,
      backup: req.body.backup || false,
      force: req.body.force || false
    };
    
    try {
      this.sseManager.broadcast('clean:start', { count: targets.length });
      
      const result = await cleaner.clean(targets, options);
      
      this.sseManager.broadcast('clean:complete', result);
      
      res.json({ success: true, result });
    } catch (error: any) {
      this.sseManager.broadcast('clean:error', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  private async handleProjects(req: any, res: any): Promise<void> {
    const { scanner } = await import('../core/scanner');
    const targetPath = req.query.path || process.cwd();
    
    try {
      const projects = await scanner.findAllProjects(targetPath);
      res.json({ success: true, projects });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  private async handleSSE(req: any, res: any): Promise<void> {
    const clientId = Math.random().toString(36).substring(7);
    this.sseManager.addClient(clientId, res);
    
    this.sseManager.send(clientId, 'connected', { clientId });
  }
}

export const webServer = new WebServer();