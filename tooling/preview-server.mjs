import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const root = resolve('dist/fitnessclub-site/browser');
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2']
]);

const server = createServer(async (request, response) => {
  try {
    const urlPath = decodeURIComponent((request.url || '/').split('?')[0]);
    let filePath = join(root, urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, ''));

    if (!extname(filePath)) {
      filePath = join(root, 'index.html');
    }

    let body;

    try {
      body = await readFile(filePath);
    } catch {
      filePath = join(root, 'index.html');
      body = await readFile(filePath);
    }

    response.writeHead(200, {
      'Content-Type': mimeTypes.get(extname(filePath)) || 'application/octet-stream'
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(String(error));
  }
});

server.listen(port, host, () => {
  console.log(`Preview server running at http://${host}:${port}`);
});
