import { IncomingMessage, ServerResponse } from 'http';
import { RouteHandler } from '../types/index.js';

interface Route {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
  params?: string[];
}

export class Router {
  private routes: Route[] = [];
  private staticRoutes = new Map<string, string>();

  addRoute(method: string, path: string, handler: RouteHandler): void {
    const params: string[] = [];
    const pattern = path
      .replace(/\//g, '\\/')
      .replace(/:(\w+)/g, (_, param) => {
        params.push(param);
        return '([^/]+)';
      })
      .replace(/\*/g, '.*');

    this.routes.push({
      method: method.toUpperCase(),
      pattern: new RegExp(`^${pattern}$`),
      handler,
      params
    });
  }

  addStaticRoute(prefix: string, directory: string): void {
    this.staticRoutes.set(prefix, directory);
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Check API routes first
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const match = pathname.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        
        if (route.params) {
          route.params.forEach((param, index) => {
            params[param] = match[index + 1];
          });
        }

        const request = Object.assign(req, {
          params,
          query: Object.fromEntries(url.searchParams),
          body: await this.parseBody(req)
        });

        const response = this.enhanceResponse(res);

        try {
          await route.handler(request, response);
        } catch (error) {
          console.error('Route handler error:', error);
          response.status(500).json({ error: 'Internal server error' });
        }
        return;
      }
    }

    // Check static routes after API routes
    for (const [prefix, directory] of this.staticRoutes) {
      if (pathname === '/' || pathname.startsWith(prefix)) {
        const filePath = pathname === '/' ? 'index.html' : pathname.slice(prefix.length);
        await this.serveStatic(filePath, directory, res);
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private async serveStatic(filePath: string, directory: string, res: ServerResponse): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const fullPath = path.join(directory, filePath);
    
    try {
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        const indexPath = path.join(fullPath, 'index.html');
        await this.serveFile(indexPath, res);
      } else {
        await this.serveFile(fullPath, res);
      }
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  }

  private async serveFile(filePath: string, res: ServerResponse): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
      const content = await fs.readFile(filePath);
      const ext = path.extname(filePath);
      const contentType = this.getContentType(ext);
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  }

  private getContentType(ext: string): string {
    const types: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    
    return types[ext] || 'application/octet-stream';
  }

  private async parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        if (!body) {
          resolve(null);
          return;
        }
        
        const contentType = req.headers['content-type'] || '';
        
        if (contentType.includes('application/json')) {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            resolve(null);
          }
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(body);
          resolve(Object.fromEntries(params));
        } else {
          resolve(body);
        }
      });
      
      req.on('error', reject);
    });
  }

  private enhanceResponse(res: ServerResponse): any {
    const enhanced = res as any;
    
    enhanced.status = (code: number) => {
      res.statusCode = code;
      return enhanced;
    };
    
    enhanced.json = (data: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return enhanced;
    };
    
    enhanced.send = (data: string) => {
      res.setHeader('Content-Type', 'text/html');
      res.end(data);
      return enhanced;
    };
    
    enhanced.redirect = (url: string) => {
      res.writeHead(302, { Location: url });
      res.end();
      return enhanced;
    };
    
    enhanced.setCookie = (name: string, value: string, options?: any) => {
      const opts = { path: '/', ...options };
      let cookie = `${name}=${value}`;
      
      if (opts.maxAge) cookie += `; Max-Age=${opts.maxAge}`;
      if (opts.path) cookie += `; Path=${opts.path}`;
      if (opts.domain) cookie += `; Domain=${opts.domain}`;
      if (opts.secure) cookie += '; Secure';
      if (opts.httpOnly) cookie += '; HttpOnly';
      if (opts.sameSite) cookie += `; SameSite=${opts.sameSite}`;
      
      res.setHeader('Set-Cookie', cookie);
      return enhanced;
    };
    
    return enhanced;
  }
}