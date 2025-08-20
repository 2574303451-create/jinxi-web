#!/usr/bin/env node

/**
 * 安全保护测试脚本
 * 验证代码保护措施是否正确实施
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 开始安全保护测试...\n');

// 检查必要的安全文件
function checkSecurityFiles() {
    console.log('📋 检查安全文件...');
    
    const requiredFiles = [
        'components/security/anti-debug.tsx',
        'components/security/code-protection.tsx',
        'components/security/security-provider.tsx',
        'next.config.mjs',
        'netlify.toml'
    ];
    
    let allExist = true;
    for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
            console.error(`❌ 缺少安全文件: ${file}`);
            allExist = false;
        } else {
            console.log(`✅ ${file}`);
        }
    }
    
    return allExist;
}

// 检查webpack混淆配置
function checkWebpackConfig() {
    console.log('\n🔧 检查Webpack混淆配置...');
    
    const nextConfigPath = 'next.config.mjs';
    const content = fs.readFileSync(nextConfigPath, 'utf-8');
    
    const checks = [
        { pattern: /JavaScriptObfuscator/, name: '混淆器插件' },
        { pattern: /selfDefending.*true/, name: '自防护' },
        { pattern: /debugProtection.*true/, name: '调试保护' },
        { pattern: /stringArray.*true/, name: '字符串数组' },
        { pattern: /controlFlowFlattening.*true/, name: '控制流扁平化' },
        { pattern: /deadCodeInjection.*true/, name: '死代码注入' }
    ];
    
    let allConfigured = true;
    for (const check of checks) {
        if (check.pattern.test(content)) {
            console.log(`✅ ${check.name} 已配置`);
        } else {
            console.log(`⚠️  ${check.name} 未找到配置`);
            allConfigured = false;
        }
    }
    
    return allConfigured;
}

// 检查安全头部配置
function checkSecurityHeaders() {
    console.log('\n🛡️  检查安全头部配置...');
    
    const netlifyConfigPath = 'netlify.toml';
    const content = fs.readFileSync(netlifyConfigPath, 'utf-8');
    
    const headers = [
        'X-Frame-Options',
        'X-XSS-Protection',
        'X-Content-Type-Options',
        'Content-Security-Policy',
        'Strict-Transport-Security',
        'Permissions-Policy'
    ];
    
    let allConfigured = true;
    for (const header of headers) {
        if (content.includes(header)) {
            console.log(`✅ ${header} 已配置`);
        } else {
            console.log(`❌ ${header} 未配置`);
            allConfigured = false;
        }
    }
    
    return allConfigured;
}

// 检查package.json依赖
function checkDependencies() {
    console.log('\n📦 检查安全依赖...');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const devDeps = packageJson.devDependencies || {};
    
    const requiredDeps = [
        'webpack-obfuscator',
        'javascript-obfuscator'
    ];
    
    let allInstalled = true;
    for (const dep of requiredDeps) {
        if (devDeps[dep]) {
            console.log(`✅ ${dep} v${devDeps[dep]}`);
        } else {
            console.log(`❌ ${dep} 未安装`);
            allInstalled = false;
        }
    }
    
    return allInstalled;
}

// 检查构建输出
function checkBuildOutput() {
    console.log('\n🏗️  检查构建输出...');
    
    if (!fs.existsSync('out')) {
        console.log('⚠️  构建目录不存在，请先运行 npm run build');
        return false;
    }
    
    // 检查是否有混淆的JavaScript文件
    const jsFiles = [];
    function findJSFiles(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                findJSFiles(filePath);
            } else if (file.endsWith('.js')) {
                jsFiles.push(filePath);
            }
        }
    }
    
    findJSFiles('out');
    
    let obfuscatedCount = 0;
    for (const jsFile of jsFiles.slice(0, 5)) { // 只检查前5个文件
        const content = fs.readFileSync(jsFile, 'utf-8');
        // 检查混淆特征
        if (content.includes('0x') && content.length > 1000 && content.includes('function') && !content.includes('console.log')) {
            obfuscatedCount++;
        }
    }
    
    console.log(`📊 检查了 ${jsFiles.length} 个JS文件`);
    console.log(`🔒 发现 ${obfuscatedCount} 个可能被混淆的文件`);
    
    return obfuscatedCount > 0;
}

// 生成安全报告
function generateSecurityReport(results) {
    console.log('\n📋 安全保护报告');
    console.log('='.repeat(50));
    
    const scores = {
        files: results.files ? 20 : 0,
        webpack: results.webpack ? 25 : 0,
        headers: results.headers ? 25 : 0,
        dependencies: results.dependencies ? 15 : 0,
        build: results.build ? 15 : 0
    };
    
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    
    console.log(`安全文件检查: ${results.files ? '✅' : '❌'} (${scores.files}/20)`);
    console.log(`Webpack配置: ${results.webpack ? '✅' : '❌'} (${scores.webpack}/25)`);
    console.log(`安全头部: ${results.headers ? '✅' : '❌'} (${scores.headers}/25)`);
    console.log(`依赖检查: ${results.dependencies ? '✅' : '❌'} (${scores.dependencies}/15)`);
    console.log(`构建输出: ${results.build ? '✅' : '❌'} (${scores.build}/15)`);
    
    console.log(`\n总分: ${totalScore}/100`);
    
    if (totalScore >= 90) {
        console.log('🛡️  安全等级: 优秀');
    } else if (totalScore >= 70) {
        console.log('🔒 安全等级: 良好');
    } else if (totalScore >= 50) {
        console.log('⚠️  安全等级: 一般');
    } else {
        console.log('❌ 安全等级: 需要改进');
    }
    
    return totalScore;
}

// 主函数
function main() {
    const results = {
        files: checkSecurityFiles(),
        webpack: checkWebpackConfig(),
        headers: checkSecurityHeaders(),
        dependencies: checkDependencies(),
        build: checkBuildOutput()
    };
    
    const score = generateSecurityReport(results);
    
    console.log('\n💡 提示:');
    console.log('- 开发环境中，某些保护措施可能不会激活');
    console.log('- 生产环境部署后，保护措施会自动启用');
    console.log('- 定期检查和更新安全配置');
    
    process.exit(score >= 70 ? 0 : 1);
}

// 运行测试
if (require.main === module) {
    main();
}

module.exports = { checkSecurityFiles, checkWebpackConfig, checkSecurityHeaders };
