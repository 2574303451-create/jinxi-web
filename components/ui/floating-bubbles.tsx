'use client'

/**
 * 浮动气泡装饰组件
 * 轻量级纯CSS实现，增加卡通氛围
 */

export function FloatingBubbles() {
  const colors = [
    '#FF6B9D', // 粉红
    '#FFD93D', // 明黄
    '#6BCFFF', // 青蓝
    '#C77DFF', // 紫色
    '#4ADE80', // 绿色
    '#FF9F43', // 橙色
    '#5B8DEF', // 蓝色
    '#FF5757', // 红色
  ]

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(12)].map((_, i) => {
        const size = 20 + Math.random() * 60
        const left = Math.random() * 100
        const delay = Math.random() * 5
        const duration = 5 + Math.random() * 10
        const color = colors[i % colors.length]

        return (
          <div
            key={i}
            className="absolute rounded-full opacity-20 blur-sm"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${left}%`,
              bottom: '-100px',
              background: `radial-gradient(circle, ${color}, transparent)`,
              animation: `floatUp ${duration}s ease-in-out infinite`,
              animationDelay: `${delay}s`,
            }}
          />
        )
      })}

      <style jsx>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.2;
          }
          90% {
            opacity: 0.2;
          }
          100% {
            transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px) scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
