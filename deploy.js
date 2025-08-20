#!/usr/bin/env node

/**
 * Netlify部署脚本
 * 今夕公会项目自动化部署
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始Netlify部署流程...\n');

// 检查必要文件
function checkRequiredFiles() {
    console.log('📋 检查项目文件...');
    
    const requiredFiles = [
        'package.json',
        'netlify.toml',
        'next.config.mjs'
    ];
    
    for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
            console.error(`❌ 缺少必要文件: ${file}`);
            process.exit(1);
        }
    }
    
    console.log('✅ 项目文件检查完成');
}

// 清理构建目录
function cleanBuild() {
    console.log('🧹 清理构建目录...');
    
    try {
        if (fs.existsSync('out')) {
            fs.rmSync('out', { recursive: true, force: true });
        }
        if (fs.existsSync('.next')) {
            fs.rmSync('.next', { recursive: true, force: true });
        }
        console.log('✅ 构建目录清理完成');
    } catch (error) {
        console.warn('⚠️  清理目录时出现警告，继续执行...');
    }
}

// 安装依赖
function installDependencies() {
    console.log('📦 安装项目依赖...');
    
    try {
        execSync('npm install', { stdio: 'inherit' });
        console.log('✅ 依赖安装完成');
    } catch (error) {
        console.error('❌ 依赖安装失败');
        process.exit(1);
    }
}

// 构建项目
function buildProject() {
    console.log('🔨 构建项目...');
    
    try {
        execSync('npm run build', { stdio: 'inherit' });
        console.log('✅ 项目构建完成');
    } catch (error) {
        console.error('❌ 项目构建失败');
        process.exit(1);
    }
}

// 验证构建结果
function validateBuild() {
    console.log('🔍 验证构建结果...');
    
    if (!fs.existsSync('out')) {
        console.error('❌ 构建目录不存在');
        process.exit(1);
    }
    
    if (!fs.existsSync('out/index.html')) {
        console.error('❌ 缺少主页面文件');
        process.exit(1);
    }
    
    // 检查构建文件大小
    const stats = fs.statSync('out');
    console.log('📊 构建结果统计:');
    
    const files = getAllFiles('out');
    console.log(`   - 总文件数: ${files.length}`);
    
    const totalSize = files.reduce((size, file) => {
        return size + fs.statSync(file).size;
    }, 0);
    
    console.log(`   - 总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('✅ 构建验证完成');
}

// 获取所有文件
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    
    files.forEach(file => {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, file));
        }
    });
    
    return arrayOfFiles;
}

// 部署到Netlify
function deployToNetlify() {
    console.log('🌐 部署到Netlify...');
    
    try {
        // 检查是否安装了Netlify CLI
        execSync('netlify --version', { stdio: 'pipe' });
    } catch (error) {
        console.log('📦 安装Netlify CLI...');
        execSync('npm install -g netlify-cli', { stdio: 'inherit' });
    }
    
    try {
        // 登录检查
        console.log('🔑 检查Netlify登录状态...');
        execSync('netlify status', { stdio: 'inherit' });
        
        // 部署
        console.log('🚀 开始部署...');
        execSync('netlify deploy --prod --dir=out', { stdio: 'inherit' });
        
        console.log('✅ 部署完成！');
    } catch (error) {
        console.error('❌ 部署失败，请检查Netlify配置');
        console.log('\n💡 提示：');
        console.log('   1. 确保已登录：netlify login');
        console.log('   2. 确保已链接站点：netlify link');
        process.exit(1);
    }
}

// 主执行流程
function main() {
    try {
        checkRequiredFiles();
        cleanBuild();
        installDependencies();
        buildProject();
        validateBuild();
        deployToNetlify();
        
        console.log('\n🎉 部署成功完成！');
        console.log('📱 你的今夕公会网站已经上线！');
        
    } catch (error) {
        console.error('\n❌ 部署过程中出现错误：', error.message);
        process.exit(1);
    }
}

// 运行主程序
if (require.main === module) {
    main();
}

module.exports = { main, checkRequiredFiles, buildProject, validateBuild };
