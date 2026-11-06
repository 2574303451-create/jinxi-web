const path = require('node:path');

const variants = {
  pr13: { port: 3050, build: 'E:/Recovery/.jinxi-research/b2-a-4/source' },
  prep: { port: 3051, build: 'E:/Recovery/.jinxi-research/b2-a-5-prep/build' },
  runtime: { port: 3052, build: 'E:/Recovery/.jinxi-research/b2-a-5-runtime/worktree' },
};
for (const variant of Object.values(variants)) {
  variant.origin = 'http://127.0.0.1:' + variant.port;
  variant.site = path.join(variant.build, 'out');
}
module.exports = variants;
