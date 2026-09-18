/** Produce a dependency-free static deployment. Never copy development tools or secrets. */
import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const files = ['index.html', 'styles.css', 'app.js', 'catalog-data.js', 'store-config.js', 'assets'];
try {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const file of files) await cp(path.join(root, file), path.join(output, file), { recursive: true });
  console.log('AcuyFiber static build complete: dist/');
  console.log('Upload the CONTENTS of dist/ to a static web host, or run npm run preview.');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exitCode = 1;
}
