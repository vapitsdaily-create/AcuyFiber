/** Exercise the local static server without binding it to a public network interface. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createStaticServer } from '../scripts/serve.mjs';

let server;
let port;
before(async () => {
  server = createStaticServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

function request(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('Serves the homepage and JavaScript with the expected content type', async () => {
  const page = await request('/');
  assert.equal(page.status, 200);
  assert.match(page.body, /AcuyFiber/);
  assert.match(page.headers['content-type'], /^text\/html/);
  const script = await request('/app.js?v=1');
  assert.equal(script.status, 200);
  assert.match(script.headers['content-type'], /javascript/);
});

test('Supports HEAD and serves the catalog image', async () => {
  const response = await request('/assets/products/vas-lilit-flora.webp', 'HEAD');
  assert.equal(response.status, 200);
  assert.equal(response.headers['content-type'], 'image/webp');
  assert.equal(response.body, '');
  assert.ok(Number(response.headers['content-length']) > 0);
});

test('Rejects data submissions because no backend exists', async () => {
  const response = await request('/', 'POST');
  assert.equal(response.status, 405);
  assert.equal(response.headers.allow, 'GET, HEAD');
});

test('Hides development files, unrecognized routes and private configuration', async () => {
  for (const path of ['/scripts/serve.mjs', '/package.json', '/tests/catalog.test.mjs', '/api/orders']) {
    assert.equal((await request(path)).status, 404, path);
  }
  assert.equal((await request('/.env')).status, 403);
});

test('Rejects malformed URLs and attempts to leave the asset directory', async () => {
  for (const path of ['/assets/../package.json', '/assets/%2e%2e/package.json', '/assets/%5c..%5cpackage.json', '/%00']) {
    assert.equal((await request(path)).status, 403, path);
  }
  assert.equal((await request('/%xy')).status, 400);
});
