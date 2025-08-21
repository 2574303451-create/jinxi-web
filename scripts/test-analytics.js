// 网站统计功能测试脚本
// 在浏览器控制台中运行以测试统计功能

console.log('🔍 开始测试网站统计功能...')

// 测试 1: 检查百度统计是否正确加载
function testBaiduAnalytics() {
  console.log('\n📊 测试百度统计加载状态...')
  
  if (typeof window._hmt !== 'undefined') {
    console.log('✅ 百度统计队列已初始化')
    console.log('📈 统计队列长度:', window._hmt.length)
  } else {
    console.log('❌ 百度统计队列未找到')
  }
  
  // 检查统计脚本是否加载
  const baiduScript = document.querySelector('script[src*="hm.baidu.com"]')
  if (baiduScript) {
    console.log('✅ 百度统计脚本已加载')
    console.log('📝 脚本 URL:', baiduScript.src)
  } else {
    console.log('❌ 百度统计脚本未找到')
  }
}

// 测试 2: 测试事件追踪
function testEventTracking() {
  console.log('\n🎯 测试事件追踪功能...')
  
  // 模拟按钮点击事件
  if (typeof window._hmt !== 'undefined') {
    const initialLength = window._hmt.length
    
    // 发送测试事件
    window._hmt.push(['_trackEvent', 'test', 'click', 'analytics_test'])
    
    if (window._hmt.length > initialLength) {
      console.log('✅ 事件追踪功能正常')
      console.log('📊 事件已添加到队列')
    } else {
      console.log('❌ 事件追踪失败')
    }
  } else {
    console.log('❌ 无法测试事件追踪，百度统计未初始化')
  }
}

// 测试 3: 检查访问量组件
function testVisitCounter() {
  console.log('\n📈 测试访问量组件...')
  
  // 检查本地存储
  const visitStats = localStorage.getItem('jinxi-visit-stats')
  if (visitStats) {
    const stats = JSON.parse(visitStats)
    console.log('✅ 访问统计数据已存储')
    console.log('📊 统计数据:', stats)
  } else {
    console.log('❌ 未找到访问统计数据')
  }
  
  // 检查访问量组件是否渲染
  const visitCounterElements = document.querySelectorAll('[class*="visit"]')
  if (visitCounterElements.length > 0) {
    console.log('✅ 访问量组件已渲染')
    console.log('🎨 组件数量:', visitCounterElements.length)
  } else {
    console.log('❌ 访问量组件未找到')
  }
}

// 测试 4: 检查环境配置
function testEnvironmentConfig() {
  console.log('\n⚙️ 测试环境配置...')
  
  console.log('🌍 当前环境:', process.env.NODE_ENV || '未知')
  
  // 在生产环境中，统计应该启用
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ 生产环境，统计功能应该启用')
  } else {
    console.log('⚠️ 开发环境，统计功能可能被禁用')
  }
}

// 运行所有测试
function runAllTests() {
  testBaiduAnalytics()
  testEventTracking()
  testVisitCounter()
  testEnvironmentConfig()
  
  console.log('\n🎉 统计功能测试完成！')
  console.log('💡 提示：在生产环境中运行此测试获得最准确的结果')
}

// 如果在浏览器环境中，自动运行测试
if (typeof window !== 'undefined') {
  // 延迟运行测试，确保页面完全加载
  setTimeout(runAllTests, 2000)
} else {
  console.log('请在浏览器控制台中运行此脚本')
}

// 导出测试函数供手动调用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testBaiduAnalytics,
    testEventTracking,
    testVisitCounter,
    testEnvironmentConfig,
    runAllTests
  }
}
