// 前端代码混淆和保护脚本
const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

// 混淆配置
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.8,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: true,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: true,
  shuffleStringArray: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['rc4'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.8,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

// 查找并混淆JavaScript文件
function obfuscateFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      obfuscateFiles(filePath);
    } else if (file.endsWith('.js') && !file.includes('.min.') && !file.includes('obfuscated')) {
      console.log(`混淆文件: ${filePath}`);
      
      try {
        const originalCode = fs.readFileSync(filePath, 'utf8');
        const obfuscatedCode = JavaScriptObfuscator.obfuscate(originalCode, obfuscationOptions).getObfuscatedCode();
        
        // 创建混淆版本
        const obfuscatedPath = filePath.replace('.js', '.obfuscated.js');
        fs.writeFileSync(obfuscatedPath, obfuscatedCode);
        
        console.log(`✅ 已创建混淆版本: ${obfuscatedPath}`);
      } catch (error) {
        console.error(`❌ 混淆失败: ${filePath}`, error.message);
      }
    }
  });
}

// 添加反调试保护
const antiDebugCode = `
// 反调试保护
(function() {
  'use strict';
  
  // 检测开发者工具
  let devtools = {
    open: false,
    orientation: null
  };
  
  const threshold = 160;
  setInterval(function() {
    if (window.outerHeight - window.innerHeight > threshold || 
        window.outerWidth - window.innerWidth > threshold) {
      if (!devtools.open) {
        devtools.open = true;
        console.clear();
        console.log('%c⚠️ 警告', 'color: red; font-size: 20px; font-weight: bold;');
        console.log('%c检测到开发者工具已打开！', 'color: red; font-size: 16px;');
        console.log('%c为了网站安全，请关闭开发者工具。', 'color: orange; font-size: 14px;');
        
        // 可选：重定向或禁用功能
        // window.location.href = 'about:blank';
      }
    } else {
      devtools.open = false;
    }
  }, 500);
  
  // 禁用右键菜单
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  });
  
  // 禁用常用快捷键
  document.addEventListener('keydown', function(e) {
    // F12
    if (e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I
    if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
      e.preventDefault();
      return false;
    }
    // Ctrl+U
    if (e.ctrlKey && e.keyCode === 85) {
      e.preventDefault();
      return false;
    }
  });
  
  // 控制台警告信息
  console.log('%c🔒 网站受到保护', 'color: blue; font-size: 18px; font-weight: bold;');
  console.log('%c如果您是开发者，请通过正当渠道联系我们。', 'color: gray; font-size: 12px;');
  
})();
`;

// 创建反调试文件
fs.writeFileSync('public/anti-debug.js', antiDebugCode);
console.log('✅ 已创建反调试文件: public/anti-debug.js');

// 开始混淆
console.log('🔒 开始混淆JavaScript文件...');
// obfuscateFiles('./out'); // 在构建后运行

console.log('🔐 代码保护完成！');
