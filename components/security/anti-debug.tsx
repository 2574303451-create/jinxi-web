'use client';

import { useEffect } from 'react';

/**
 * 反调试和代码保护组件
 * 实施多层安全措施保护源代码
 */
export default function AntiDebugProtection() {
  useEffect(() => {
    // 1. 温和的用户体验提示（不阻止）
    const showSecurityNotice = () => {
      if (process.env.NODE_ENV === 'production') {
        console.log('%c🔒 代码受版权保护', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
        console.log('%c今夕公会官网 - 版权所有', 'color: #2196F3; font-size: 14px;');
      }
    };

    // 2. 温和的开发者工具检测（仅记录）
    const detectDevTools = () => {
      const threshold = 160;
      let devtoolsDetected = false;
      
      const check = () => {
        const isOpen = window.outerHeight - window.innerHeight > threshold || 
                      window.outerWidth - window.innerWidth > threshold;
        
        if (isOpen && !devtoolsDetected) {
          devtoolsDetected = true;
          if (process.env.NODE_ENV === 'production') {
            console.log('%c👀 检测到开发者工具已打开', 'color: #FF9800; font-size: 12px;');
            console.log('%c请尊重知识产权，感谢配合！', 'color: #607D8B; font-size: 12px;');
          }
        } else if (!isOpen) {
          devtoolsDetected = false;
        }
      };
      
      setInterval(check, 2000); // 降低检测频率
    };

    // 3. 友好的版权提醒（不干扰控制台）
    const copyrightReminder = () => {
      if (process.env.NODE_ENV === 'production') {
        const styles = [
          'color: #2196F3; font-size: 14px; font-weight: bold;',
          'color: #4CAF50; font-size: 12px;',
          'color: #FF9800; font-size: 10px;'
        ];
        
        console.log('%c📝 版权声明', styles[0]);
        console.log('%c本网站源代码受知识产权保护', styles[1]);
        console.log('%c如需技术合作请联系开发团队', styles[2]);
      }
    };

    // 4. 轻量级内容保护（不影响开发）
    const lightContentProtection = () => {
      // 仅在生产环境添加水印
      if (process.env.NODE_ENV === 'production') {
        const watermark = document.createElement('div');
        watermark.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
          background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" opacity="0.01"><text x="50%" y="50%" text-anchor="middle" dy=".3em" transform="rotate(-45 100 100)" font-size="16" fill="gray">今夕公会</text></svg>') repeat;
        `;
        document.body.appendChild(watermark);
      }
    };

    // 10. 虚假代码注入（误导逆向工程）
    const injectDecoyCode = () => {
      // 注入假的API密钥和配置
      (window as any)._FAKE_API_CONFIG = {
        apiKey: 'fake_key_12345_not_real',
        endpoint: 'https://fake-api.example.com',
        secretToken: 'decoy_token_ignore_this'
      };
      
      // 假的函数
      (window as any).authenticateUser = () => {
        console.log('This is a decoy function');
        return 'fake_result';
      };
    };

    // 启用温和的保护措施
    showSecurityNotice();
    detectDevTools();
    copyrightReminder();
    lightContentProtection();
    injectDecoyCode();
    
    // 定期版权提醒（频率较低）
    const intervalId = setInterval(() => {
      if (process.env.NODE_ENV === 'production') {
        console.log('%c💡 提示：本站点源代码受保护', 'color: #607D8B; font-size: 10px;');
      }
    }, 30000); // 30秒一次

    // 清理定时器
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return null; // 这个组件不渲染任何内容
}

// 额外的混淆代码（迷惑性）
export const DecoyFunctions = {
  // 假的数据库连接
  connectDatabase: () => {
    return Promise.resolve({
      status: 'connected',
      host: 'fake-db.example.com',
      port: 5432
    });
  },
  
  // 假的加密函数
  encryptData: (data: string) => {
    return btoa(data + '_fake_salt_123');
  },
  
  // 假的API调用
  callAPI: async (endpoint: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { data: 'fake_response', status: 200 };
  }
};
