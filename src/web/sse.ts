import { ServerResponse } from 'http';
import { SSEClient } from '../types/index.js';

export class SSEManager {
  private clients = new Map<string, SSEClient>();
  private messageId = 0;

  addClient(clientId: string, res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    res.write(':ok\n\n');

    this.clients.set(clientId, {
      id: clientId,
      response: res
    });

    res.on('close', () => {
      this.removeClient(clientId);
    });
  }

  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  send(clientId: string, event: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.sendToClient(client, event, data);
  }

  broadcast(event: string, data: any): void {
    for (const client of this.clients.values()) {
      this.sendToClient(client, event, data);
    }
  }

  private sendToClient(client: SSEClient, event: string, data: any): void {
    const message = this.formatMessage(event, data);
    
    try {
      client.response.write(message);
    } catch (error) {
      console.error(`Failed to send SSE to client ${client.id}:`, error);
      this.removeClient(client.id);
    }
  }

  private formatMessage(event: string, data: any): string {
    const id = ++this.messageId;
    const jsonData = JSON.stringify(data);
    
    let message = `id: ${id}\n`;
    if (event) {
      message += `event: ${event}\n`;
    }
    message += `data: ${jsonData}\n\n`;
    
    return message;
  }

  getClientCount(): number {
    return this.clients.size;
  }

  hasClient(clientId: string): boolean {
    return this.clients.has(clientId);
  }

  sendHeartbeat(): void {
    this.broadcast('heartbeat', { timestamp: Date.now() });
  }

  startHeartbeat(interval: number = 30000): NodeJS.Timeout {
    return setInterval(() => {
      this.sendHeartbeat();
    }, interval);
  }
}