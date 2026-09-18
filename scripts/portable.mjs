/** Build a portable HTML preview; no Python or npm dependencies are required. */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFile(path.join(root, file), 'utf8');
const types = { '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };

try {
  let html = await read('index.html');
  const css = await read('styles.css');
  html = html.replace(/<link\b(?=[^>]*href=["']\.\/styles\.css["'])[^>]*>/, `<style>\n${css}\n</style>`);
  for (const script of ['store-config.js', 'catalog-data.js', 'app.js']) {
    const code = (await read(script)).replace(/<\/script/gi, '<\\/script');
    const tag = new RegExp(`<script\\b(?=[^>]*src=["']\\./${script.replace(/\./g, '\\.')}["'])[^>]*>\\s*<\\/script>`, 'g');
    html = html.replace(tag, () => `<script>\n${code}\n</script>`);
  }
  const matches = [...new Set(html.match(/assets\/[A-Za-z0-9_./-]+\.(?:webp|png|svg|jpg)/g) || [])];
  for (const asset of matches) {
    const bytes = await readFile(path.join(root, asset));
    const data = `data:${types[path.extname(asset)]};base64,${bytes.toString('base64')}`;
    html = html.split(asset).join(data);
  }
  const output = path.join(root, 'AcuyFiber.html');
  await writeFile(output, html);
  console.log('Portable website generated: AcuyFiber.html');
  console.log('Images and source are embedded. Optional web fonts use a system fallback offline.');
} catch (error) {
  console.error('Portable build failed:', error.message);
  process.exitCode = 1;
}
