import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = path.join(frontendDirectory, 'dist');
const port = Number(process.env.PORT || 4174);

const contentType = (filePath) => filePath.endsWith('.html') ? 'text/html; charset=utf-8'
  : filePath.endsWith('.js') ? 'text/javascript; charset=utf-8'
  : filePath.endsWith('.css') ? 'text/css; charset=utf-8'
  : 'application/octet-stream';

const server = http.createServer(async (request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const cleanPath = requestPath.replace(/^\/+/, '');
  const candidates = [
    path.join(distDirectory, cleanPath),
    path.join(distDirectory, cleanPath, 'index.html'),
    path.join(distDirectory, 'index.html'),
  ];
  let filePath = candidates[candidates.length - 1];
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) {
        filePath = candidate;
        break;
      }
    } catch {
      // Try the next static candidate.
    }
  }

  try {
    const body = await fs.readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentType(filePath) });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Static dist server listening on http://127.0.0.1:${port}`);
});
