// Reuse reviewed browser assertions with fresh result paths. Pin the variant
// and preserve the original suite files and output evidence.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const variants = require('./variants.cjs');
const [stage, suite] = process.argv.slice(2);
const a4 = path.resolve(__dirname, '../b2-a-4');
const protectedSuites = ['browser-checks', 'avatar-frames', 'protected-components', 'lifecycle-checks', 'regression-checks', 'reader-checks', 'arrow-checks'];
const priorSuites = ['html-browser', 'compatibility-browser', 'session-browser', 'nonce-expiry-browser'];
if (!Object.hasOwn(variants, stage)) throw Error('Unknown variant');
const variant = variants[stage];
const result = path.resolve(__dirname, 'browser', stage, suite);
fs.mkdirSync(result, { recursive:true });
let file, code, dirname, evidenceOut;
if (protectedSuites.includes(suite)) {
  // The A4 wrapper already redirected each B1 screenshot and report.
  file = path.join(a4, 'run-protected.cjs');
  code = fs.readFileSync(file, 'utf8')
    .replace('const name=process.argv[2]', 'const name=' + JSON.stringify(suite))
    .replace("out=path.join(__dirname,'protected',name)", 'out=' + JSON.stringify(result))
    .replaceAll('http://127.0.0.1:3050', variant.origin);
  dirname = a4;
} else if (priorSuites.includes(suite)) {
  file = path.join(a4, suite + '.cjs');
  code = fs.readFileSync(file, 'utf8')
    .replaceAll('http://127.0.0.1:3050', variant.origin)
    .replaceAll('E:/Recovery/.jinxi-research/b2-a-4/source/out/_next/static/chunks', path.join(variant.site, '_next/static/chunks').replaceAll('\\','/'));
  if (stage !== 'pr13') {
    code = code.replace('任务进度仅保存在此浏览器。正式奖励领取暂停；本机历史记录不作为服务器积分余额。',
      '任务进度仅保存在此浏览器。奖励栏显示规则参考值，当前不可领取。本机历史积分不计入服务器余额。');
  }
  const meta = path.join(a4, 'emailjs-public-metadata.json');
  if (suite === 'compatibility-browser') fs.copyFileSync(meta, path.join(result, path.basename(meta)));
  dirname = result;
} else throw Error('Unknown suite');
const run = new Function('require', '__dirname', 'evidenceOut', code);
run(createRequire(file), dirname, evidenceOut);
