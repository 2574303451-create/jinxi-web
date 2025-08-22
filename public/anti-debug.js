
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
