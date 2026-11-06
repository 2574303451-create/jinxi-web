const path = require('node:path');
const variants = {
  pr14: { port:3061, build:'E:/Recovery/.jinxi-research/b2-a-5-prep/build' },
  pr15: { port:3062, build:'E:/Recovery/.jinxi-research/b2-a-5-runtime/worktree' },
  a6: { port:3063, build:'E:/Recovery/.jinxi-research/b2-a-6/runtime-worktree' },
};
for (const variant of Object.values(variants)) {
  variant.origin = 'http://127.0.0.1:' + variant.port;
  variant.site = path.join(variant.build, 'out');
}
module.exports = variants;
