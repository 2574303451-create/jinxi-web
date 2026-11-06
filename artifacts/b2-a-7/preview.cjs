// Run the reviewed loopback harness with this independent build and the
// previously authorized synthetic fixtures. This leaves A6 evidence intact.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const source = path.resolve(__dirname, '../b2-a-6/preview.cjs');
const build = path.resolve(__dirname, '../..');
const resolve = createRequire(source);
const variants = {
  a7: { port: 3065, build, site: path.join(build, 'out'), origin: 'http://127.0.0.1:3065' },
};
const read = name => name === './variants.cjs' ? variants : resolve(name);
const localProcess = Object.create(process, { argv: { value: [process.execPath, source, 'a7'] } });
new Function('require', 'process', fs.readFileSync(source, 'utf8'))(read, localProcess);
