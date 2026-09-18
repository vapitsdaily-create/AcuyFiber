/** Local development server. No dependencies, uploads, API endpoints, or backend. */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const publicFiles = new Set(['index.html', 'styles.css', 'app.js', 'catalog-data.js', 'store-config.js']);
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function sendText(response, status, text) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(text);
}

/** Return a server without listening, so tests can use ephemeral ports. */
export function createStaticServer(root = projectRoot) {
  const rootPath = path.resolve(root);
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Frame-Options', 'DENY');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      sendText(response, 405, 'Method not allowed. This is a static website.');
      return;
    }
    try {
      const rawPath = (request.url || '/').split('?')[0];
      let pathname;
      try { pathname = decodeURIComponent(rawPath); }
      catch { sendText(response, 400, 'Invalid URL encoding.'); return; }
      if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').some(part => part.startsWith('.'))) {
        sendText(response, 403, 'Forbidden path.');
        return;
      }
      const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      if (!publicFiles.has(relative) && !relative.startsWith('assets/')) {
        sendText(response, 404, 'Not found.');
        return;
      }
      const absolute = path.resolve(rootPath, relative);
      const safeRoot = await realpath(rootPath);
      const resolved = await realpath(absolute);
      if (!resolved.startsWith(safeRoot + path.sep)) {
        sendText(response, 403, 'Forbidden path.');
        return;
      }
      const fileStat = await stat(resolved);
      if (!fileStat.isFile()) { sendText(response, 404, 'Not found.'); return; }
      const contentType = contentTypes[path.extname(resolved).toLowerCase()];
      if (!contentType) { sendText(response, 404, 'Unsupported asset.'); return; }
      response.writeHead(200, { 'Content-Type': contentType, 'Content-Length': fileStat.size });
      if (request.method === 'HEAD') { response.end(); return; }
      const stream = createReadStream(resolved);
      stream.on('error', () => response.destroy());
      response.on('close', () => stream.destroy());
      stream.pipe(response);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') sendText(response, 404, 'Not found.');
      else {
        console.error('Static file error:', error.message);
        if (!response.headersSent) sendText(response, 500, 'Unable to read the requested file.');
        else response.destroy();
      }
    }
  });
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (entry === import.meta.url) {
  const args = process.argv.slice(2);
  const valueAfter = flag => {
    const index = args.indexOf(flag);
    if (index < 0) return undefined;
    if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing value after ${flag}`);
    return args[index + 1];
  };
  try {
    const port = Number(valueAfter('--port') || process.env.PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be between 1 and 65535.');
    const directory = valueAfter('--dir') || '.';
    if (!['.', 'dist'].includes(directory)) throw new Error('The public directory must be . or dist.');
    const root = path.resolve(projectRoot, directory);
    const server = createStaticServer(root);
    server.on('error', error => {
      console.error(error.code === 'EADDRINUSE'
        ? `Port ${port} is busy. Try: npm run dev -- --port ${port === 65535 ? 3001 : port + 1}`
        : error.message);
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
      console.log(`\n  AcuyFiber is ready\n  http://localhost:${port}\n  Folder: ${root}\n\n  Press Ctrl+C to stop.\n`);
    });
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.on(signal, () => server.close(() => process.exit(0)));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
