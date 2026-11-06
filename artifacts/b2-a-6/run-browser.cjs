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
    .replaceAll('http://127.0.0.1:3050', variant.origin)
    .replace("let code=fs.readFileSync(file,'utf8')",
      "let code=fs.readFileSync(file,'utf8').replaceAll('http://127.0.0.1:3041','http://127.0.0.1:3062').replaceAll('A+ /','PR15 /')");
  dirname = a4;
  if (suite === 'regression-checks' && stage === 'a6') {
    // The old assertion certified a localStorage nickname. The A6 security
    // change explicitly rejects that identity presentation. Preserve the
    // failing historical expectation and assert the new editable guest state.
    const edits = [
      ['local identity is only used as existing display nickname', 'legacy auth cache cannot prefill or lock a certified member nickname'],
      ['assert.equal(await input.inputValue(), "界面测试昵称");',
        'assert.equal(await input.inputValue(), ""); assert.equal(await page.getByText("使用当前账号的展示昵称", {exact:true}).count(), 0);'],
      ['assert((await input.getAttribute("readonly")) !== null);',
        'assert.equal(await input.getAttribute("readonly"), null);'],
    ];
    const adjustment = edits.map(([before, after]) =>
      'code=code.replace(' + JSON.stringify(before) + ',' + JSON.stringify(after) + ');').join('\n');
    code = code.replace('const output={exports:{}}', adjustment + '\nconst output={exports:{}}');
  }
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
