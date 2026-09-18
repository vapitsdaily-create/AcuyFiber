/** Dependency-free integrity checks for the storefront and local catalog assets. */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const context = vm.createContext({ window: {} });
for (const file of ['store-config.js', 'catalog-data.js']) {
  vm.runInContext(await readFile(path.join(root, file), 'utf8'), context, { timeout: 1000, filename: file });
}
const config = context.window.STORE_CONFIG;
const products = context.window.CATALOG;

test('Store identity and quotation configuration are valid', () => {
  assert.equal(config.name, 'AcuyFiber');
  assert.equal(config.currency, 'IDR');
  assert.equal(config.locale, 'id-ID');
  assert.match(config.storageKey, /^acuyfiber/);
  assert.ok(Number.isInteger(config.maxQuantity) && config.maxQuantity > 0);
  const number = String(config.whatsappNumber || '').replace(/[\s()+-]/g, '');
  assert.ok(number === '' || /^[1-9]\d{7,14}$/.test(number), 'WhatsApp must be blank or international digits.');
});

test('Catalog has unique safe identifiers and supported categories', () => {
  assert.ok(products.length > 0);
  const ids = new Set();
  for (const product of products) {
    assert.match(product.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!ids.has(product.id), `Duplicate product: ${product.id}`);
    ids.add(product.id);
    assert.ok(['vas', 'dekorasi', 'taman', 'trofi'].includes(product.category));
    for (const field of ['name', 'alt', 'description', 'note', 'color']) {
      assert.equal(typeof product[field], 'string');
      assert.ok(product[field].length > 0, `${product.id}.${field} must not be empty.`);
    }
    assert.ok(product.price === null || (Number.isFinite(product.price) && product.price >= 0));
    assert.ok(Array.isArray(product.styles));
    assert.ok(product.styles.every(style => ['natural', 'minimalis', 'klasik'].includes(style)));
  }
});

test('Every full-size product image and thumbnail is a nonempty local file', async () => {
  for (const product of products) {
    for (const field of ['image', 'thumbnail']) {
      assert.match(product[field], /^assets\/products\/[a-z0-9-]+\.webp$/);
      const info = await stat(path.join(root, product[field]));
      assert.ok(info.isFile() && info.size > 100, `Missing ${product[field]}`);
    }
  }
});

test('Hero product references exist', () => {
  for (const id of ['vas-lilit-flora', 'vas-cahaya-bambu', 'vas-kelopak-antik']) {
    assert.ok(products.some(product => product.id === id), `Missing hero product: ${id}`);
  }
});

test('HTML local resources are present, and previous branding is removed', async () => {
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<title>AcuyFiber/);
  assert.match(html, /lang="id"/);
  assert.doesNotMatch(html, /Ruang Rimbun|ruangrimbun|ruang<span>rimbun/i);
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const resource = match[1];
    if (/^https?:|^mailto:|^data:/.test(resource)) continue;
    assert.ok((await stat(path.join(root, resource))).isFile(), `Missing ${resource}`);
  }
});
