/**
 * MCP Client — speaks the Model Context Protocol (JSON-RPC 2.0 over stdio)
 * with the Python MCP server in ../mcp-server.
 *
 *   initialize → notifications/initialized → tools/list → tools/call
 *
 * The Python server is spawned lazily and kept alive; it restarts on exit.
 */
const { spawn } = require('child_process');
const path = require('path');
const { EventEmitter } = require('events');

const MCP_PROTOCOL_VERSION = '2024-11-05';

class MCPClient extends EventEmitter {
  constructor({
    python = process.env.MCP_PYTHON || 'python3',
    scriptPath = process.env.MCP_SERVER_PATH || path.join(__dirname, '..', '..', 'mcp-server', 'mcp_server.py'),
    env = process.env,
  } = {}) {
    super();
    this.python = python;
    this.scriptPath = path.resolve(__dirname, '..', scriptPath);
    this.env = { ...env };
    this.proc = null;
    this.buffer = '';
    this.pending = new Map(); // id -> { resolve, reject }
    this.nextId = 1;
    this.ready = null; // promise
    this.tools = [];
    this.started = false;
  }

  start() {
    if (this.started) return this.ready;
    this.started = true;
    this.ready = new Promise((resolve, reject) => {
      this._readyResolve = resolve;
      this._readyReject = reject;
      this._spawn();
    });
    return this.ready;
  }

  _spawn() {
    this.proc = spawn(this.python, [this.scriptPath], {
      env: this.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.proc.on('spawn', () => {
      this._readyResolved = true;
      if (this._readyResolve) this._readyResolve();
    });
    this.proc.stdout.on('data', (chunk) => this._onData(chunk));
    this.proc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      this.emit('stderr', text);
      if (!this._readyResolved) console.log('[mcp] server:', text.trim());
    });
    this.proc.on('exit', (code) => {
      console.warn(`[mcp] server exited (code ${code}) — restarting on next use`);
      this.proc = null;
      this.tools = [];
      for (const { reject } of this.pending.values()) reject(new Error('MCP server exited'));
      this.pending.clear();
    });
    this.proc.on('error', (err) => {
      console.error('[mcp] spawn error:', err.message);
      if (!this._readyResolved) this._readyReject(err);
    });
  }

  _onData(chunk) {
    this.buffer += chunk.toString();
    let idx;
    while ((idx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        this._handleMessage(msg);
      } catch (err) {
        console.warn('[mcp] bad JSON from server:', line.slice(0, 200));
      }
    }
  }

  _handleMessage(msg) {
    if (msg.id !== undefined && this.pending.has(msg.id)) {
      const { resolve, reject } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || 'MCP error'));
      else resolve(msg.result);
      return;
    }
    if (msg.method === 'notifications/message') {
      this.emit('message', msg.params);
    }
  }

  _send(method, params, { notify = false, timeoutMs = 25000 } = {}) {
    const msg = { jsonrpc: '2.0', method, params };
    if (!notify) {
      msg.id = this.nextId++;
    }
    if (!this.proc || this.proc.killed) {
      return Promise.reject(new Error('MCP server not running'));
    }
    return new Promise((resolve, reject) => {
      if (!notify) this.pending.set(msg.id, { resolve, reject });
      const timer = setTimeout(() => {
        this.pending.delete(msg.id);
        reject(new Error(`MCP request timed out (${method})`));
      }, timeoutMs);
      this.proc.stdin.write(JSON.stringify(msg) + '\n', (err) => {
        if (err) {
          clearTimeout(timer);
          if (!notify) this.pending.delete(msg.id);
          reject(err);
        }
      });
      if (notify) {
        clearTimeout(timer);
        resolve(null);
      }
    });
  }

  async init() {
    await this.start();
    const result = await this._send('initialize', {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: {} },
      clientInfo: { name: 'shopeasy-backend', version: '1.0.0' },
    });
    await this._send('notifications/initialized', {}, { notify: true });
    const list = await this._send('tools/list', {});
    this.tools = list.tools || [];
    this.emit('ready', { serverInfo: result.serverInfo, tools: this.tools });
    console.log(`[mcp] connected: ${result.serverInfo?.name} — ${this.tools.length} tools`);
    return result;
  }

  /** Call an MCP tool. Throws if the tool doesn't exist. */
  async callTool(name, args = {}) {
    await this.start();
    if (!this.tools.length) {
      try {
        await this.init();
      } catch (err) {
        throw new Error(`MCP server unavailable: ${err.message}`);
      }
    }
    const tool = this.tools.find((t) => t.name === name);
    if (!tool) throw new Error(`Unknown MCP tool: ${name}`);
    const result = await this._send('tools/call', { name, arguments: args });
    if (result.isError) {
      const text = extractText(result);
      throw new Error(text || `MCP tool ${name} failed`);
    }
    const text = extractText(result);
    try {
      return JSON.parse(text);
    } catch {
      return { text };
    }
  }

  async close() {
    if (this.proc) {
      try { this.proc.stdin.end(); } catch { /* ignore */ }
      this.proc.kill('SIGTERM');
      this.proc = null;
    }
  }
}

function extractText(result) {
  if (!result || !Array.isArray(result.content)) return '';
  return result.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');
}

/** Singleton used by the whole app. */
let client = null;
function getMCPClient() {
  if (!client) client = new MCPClient();
  return client;
}

module.exports = { MCPClient, getMCPClient, extractText };
