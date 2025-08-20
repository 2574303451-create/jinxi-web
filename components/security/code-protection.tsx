'use client';

import { useEffect } from 'react';

/**
 * 高级代码保护组件
 * 实施动态保护和运行时检查
 */
export default function CodeProtection() {
  useEffect(() => {
    // 1. 动态函数名混淆
    const obfuscateNames = () => {
      const originalNames = ['fetch', 'XMLHttpRequest', 'addEventListener'];
      originalNames.forEach(name => {
        if (typeof (window as any)[name] !== 'undefined') {
          const original = (window as any)[name];
          const obfuscatedName = '_' + Math.random().toString(36).substring(7);
          (window as any)[obfuscatedName] = original;
          // 不完全替换原函数，保持功能性
        }
      });
    };

    // 2. 代码完整性检查
    const integrityCheck = () => {
      const scripts = document.querySelectorAll('script');
      const expectedCount = scripts.length;
      
      return setInterval(() => {
        const currentScripts = document.querySelectorAll('script');
        if (currentScripts.length !== expectedCount) {
          console.warn('Script injection detected!');
          // 可以在这里添加更多保护措施
        }
      }, 5000);
    };

    // 3. 环境检测
    const environmentCheck = () => {
      // 检查是否在开发环境
      const isDev = process.env.NODE_ENV === 'development';
      
      // 检查常见的调试工具
      const debugTools = [
        'firebug', 'chrome-devtools', 'webkit-inspector'
      ];
      
      debugTools.forEach(tool => {
        if ((window as any)[tool]) {
          console.warn(`Debug tool detected: ${tool}`);
        }
      });
      
      // 检查控制台状态
      let devtools = false;
      const threshold = 160;
      
      if (window.outerHeight - window.innerHeight > threshold ||
          window.outerWidth - window.innerWidth > threshold) {
        devtools = true;
      }
      
      return { isDev, devtools };
    };

    // 4. 动态混淆字符串
    const obfuscateStrings = () => {
      const sensitiveStrings = ['api', 'key', 'token', 'secret', 'password'];
      const obfuscatedMap = new Map();
      
      sensitiveStrings.forEach(str => {
        const obfuscated = btoa(str).split('').reverse().join('');
        obfuscatedMap.set(str, obfuscated);
      });
      
      return obfuscatedMap;
    };

    // 5. 反爬虫保护
    const antiScraping = () => {
      // 检测自动化工具
      const automationIndicators = [
        'webdriver', 'selenium', 'phantomjs', 'headless'
      ];
      
      automationIndicators.forEach(indicator => {
        if (navigator.userAgent.toLowerCase().includes(indicator)) {
          console.warn('Automation tool detected');
        }
      });
      
      // 检测异常鼠标行为
      let mouseEvents = 0;
      const trackMouse = () => {
        mouseEvents++;
        if (mouseEvents < 5) {
          setTimeout(() => {
            if (mouseEvents < 5) {
              console.warn('Suspicious mouse behavior detected');
            }
          }, 10000);
        }
      };
      
      document.addEventListener('mousemove', trackMouse, { once: true });
    };

    // 6. DOM保护
    const protectDOM = () => {
      // 监控DOM变化
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                // 检查是否有可疑的脚本注入
                if (element.tagName === 'SCRIPT' && 
                    !element.hasAttribute('data-expected')) {
                  console.warn('Unexpected script detected');
                  // element.remove(); // 可选：移除可疑脚本
                }
              }
            });
          }
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      return observer;
    };

    // 7. 轻量级网络监控（仅记录，不阻止）
    const lightNetworkMonitoring = () => {
      if (process.env.NODE_ENV === 'production') {
        const originalFetch = window.fetch;
        
        // 仅在生产环境记录网络活动
        window.fetch = async (...args) => {
          const url = args[0] as string;
          if (typeof url === 'string') {
            // 只记录，不阻止
            console.debug(`🌐 Network request: ${url.substring(0, 50)}...`);
          }
          return originalFetch.apply(window, args);
        };
      }
    };

    // 8. 性能混淆
    const performanceObfuscation = () => {
      // 添加随机延迟和噪音
      const addRandomDelay = () => {
        const delay = Math.random() * 100;
        return new Promise(resolve => setTimeout(resolve, delay));
      };
      
      // 创建假的性能标记
      if (performance.mark) {
        for (let i = 0; i < 10; i++) {
          performance.mark(`fake_mark_${i}_${Math.random()}`);
        }
      }
      
      return addRandomDelay;
    };

    // 执行友好的保护措施
    if (process.env.NODE_ENV === 'production') {
      obfuscateNames();
      environmentCheck();
      obfuscateStrings();
      antiScraping();
      lightNetworkMonitoring();
      performanceObfuscation();
    }
    
    // 轻量级监控（开发和生产都启用）
    const integrityInterval = integrityCheck();
    const domObserver = protectDOM();

    // 清理函数
    return () => {
      clearInterval(integrityInterval);
      domObserver?.disconnect();
    };
  }, []);

  return null;
}

// 导出混淆的工具函数
export const SecurityUtils = {
  // 安全的字符串编码
  encode: (str: string): string => {
    return btoa(encodeURIComponent(str))
      .split('')
      .reverse()
      .join('')
      .replace(/[=]/g, '_');
  },
  
  // 安全的字符串解码
  decode: (encoded: string): string => {
    try {
      return decodeURIComponent(atob(
        encoded.replace(/_/g, '=')
          .split('')
          .reverse()
          .join('')
      ));
    } catch {
      return '';
    }
  },
  
  // 检查环境安全性
  isSecureEnvironment: (): boolean => {
    const checks = [
      () => !window.location.href.includes('localhost'),
      () => window.location.protocol === 'https:',
      () => !('webdriver' in navigator),
      () => navigator.userAgent.length > 50
    ];
    
    return checks.every(check => {
      try {
        return check();
      } catch {
        return false;
      }
    });
  }
};
