'use client'

/**
 * 隐藏彩蛋系统 - 加密版本
 * 使用混淆和加密技术隐藏彩蛋逻辑
 */

import { useEffect, useState } from 'react'

// Base64编码的彩蛋配置（混淆）
const _0x4e2a = 'ZWFzdGVyRWdn'
const _0x3b1c = 'Y29uZmlnRGF0YQ=='

// 简单的XOR加密/解密
const _x = (s: string, k: number): string => {
  return s.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ k)).join('')
}

// 解码函数
const _d = (s: string): string => {
  try {
    return atob(s)
  } catch {
    return ''
  }
}

// 彩蛋配置（加密存储）
const _cfg = {
  // 彩蛋1: 连续点击logo 5次
  e1: {
    t: 'click',
    c: 5,
    s: '#logo',
    m: '🎉 你发现了隐藏彩蛋！今夕公会欢迎你！',
    r: '🎁 获得神秘礼包',
  },
  // 彩蛋2: 按下特定按键序列 (上上下下左右左右BA)
  e2: {
    t: 'keys',
    k: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'],
    m: '🎮 科乐美秘籍！你是真正的游戏玩家！',
    r: '⭐ 获得传说级称号：游戏大师',
  },
  // 彩蛋3: 在页面停留超过5分钟
  e3: {
    t: 'time',
    d: 300000, // 5分钟
    m: '⏰ 感谢你的陪伴！你已经在今夕待了5分钟！',
    r: '💎 获得忠实粉丝徽章',
  },
  // 彩蛋4: 鼠标画圈（顺时针转3圈）
  e4: {
    t: 'circle',
    c: 3,
    m: '🌀 你画了一个魔法阵！',
    r: '✨ 获得魔法师称号',
  },
  // 彩蛋5: 快速滚动到底部再回到顶部
  e5: {
    t: 'scroll',
    m: '🚀 光速浏览者！你的速度真快！',
    r: '⚡ 获得闪电侠徽章',
  },
}

export function HiddenEasterEggs() {
  const [_s, _ss] = useState<Set<string>>(new Set())
  const [_a, _sa] = useState(false)
  const [_m, _sm] = useState('')
  const [_r, _sr] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return

    let _t: NodeJS.Timeout
    let _kh: string[] = []
    let _cc = 0
    let _mx = 0
    let _my = 0
    let _cr = 0
    let _st = Date.now()
    let _sb = false
    let _st2 = false

    // 彩蛋1: Logo点击
    const _h1 = () => {
      const _l = document.querySelector('a[href="#top"]')
      if (!_l) return

      let _cnt = 0
      const _clk = () => {
        _cnt++
        if (_cnt >= _cfg.e1.c) {
          _trg('e1')
          _cnt = 0
        }
        setTimeout(() => { _cnt = 0 }, 2000)
      }
      _l.addEventListener('click', _clk)
      return () => _l.removeEventListener('click', _clk)
    }

    // 彩蛋2: 按键序列
    const _h2 = () => {
      const _kd = (e: KeyboardEvent) => {
        _kh.push(e.key)
        if (_kh.length > _cfg.e2.k.length) {
          _kh.shift()
        }
        if (_kh.length === _cfg.e2.k.length) {
          const _m = _kh.every((k, i) => k === _cfg.e2.k[i])
          if (_m) {
            _trg('e2')
            _kh = []
          }
        }
      }
      window.addEventListener('keydown', _kd)
      return () => window.removeEventListener('keydown', _kd)
    }

    // 彩蛋3: 时间触发
    const _h3 = () => {
      _t = setTimeout(() => {
        _trg('e3')
      }, _cfg.e3.d)
      return () => clearTimeout(_t)
    }

    // 彩蛋4: 画圈检测
    const _h4 = () => {
      let _pts: { x: number; y: number; t: number }[] = []

      const _mm = (e: MouseEvent) => {
        const _now = Date.now()
        _pts.push({ x: e.clientX, y: e.clientY, t: _now })

        // 只保留最近2秒的点
        _pts = _pts.filter(p => _now - p.t < 2000)

        if (_pts.length > 50) {
          // 检测是否画圈
          const _chk = _isCircle(_pts)
          if (_chk) {
            _cr++
            if (_cr >= _cfg.e4.c) {
              _trg('e4')
              _cr = 0
            }
            _pts = []
          }
        }
      }

      window.addEventListener('mousemove', _mm)
      return () => window.removeEventListener('mousemove', _mm)
    }

    // 彩蛋5: 快速滚动
    const _h5 = () => {
      const _sc = () => {
        const _y = window.scrollY
        const _h = document.documentElement.scrollHeight - window.innerHeight

        if (_y > _h * 0.9 && !_sb) {
          _sb = true
        }

        if (_sb && _y < 100 && !_st2) {
          _st2 = true
          _trg('e5')
        }
      }

      window.addEventListener('scroll', _sc)
      return () => window.removeEventListener('scroll', _sc)
    }

    // 触发彩蛋
    const _trg = (id: string) => {
      if (_s.has(id)) return

      const _e = _cfg[id as keyof typeof _cfg]
      if (!_e) return

      _ss(prev => new Set([...prev, id]))
      _sm(_e.m)
      _sr(_e.r)
      _sa(true)

      // 保存到localStorage（加密）
      const _sv = Array.from(_s)
      _sv.push(id)
      try {
        localStorage.setItem(_x(_d(_0x4e2a), 42), _x(JSON.stringify(_sv), 42))
      } catch {}

      setTimeout(() => {
        _sa(false)
      }, 5000)
    }

    // 检测是否画圈
    const _isCircle = (pts: { x: number; y: number }[]): boolean => {
      if (pts.length < 50) return false

      const _cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
      const _cy = pts.reduce((s, p) => s + p.y, 0) / pts.length

      let _ang = 0
      for (let i = 1; i < pts.length; i++) {
        const _a1 = Math.atan2(pts[i - 1].y - _cy, pts[i - 1].x - _cx)
        const _a2 = Math.atan2(pts[i].y - _cy, pts[i].x - _cx)
        let _d = _a2 - _a1
        if (_d > Math.PI) _d -= 2 * Math.PI
        if (_d < -Math.PI) _d += 2 * Math.PI
        _ang += _d
      }

      return Math.abs(_ang) > Math.PI * 1.5
    }

    // 加载已触发的彩蛋
    try {
      const _ld = localStorage.getItem(_x(_d(_0x4e2a), 42))
      if (_ld) {
        const _arr = JSON.parse(_x(_ld, 42))
        _ss(new Set(_arr))
      }
    } catch {}

    // 初始化所有监听器
    const _c1 = _h1()
    const _c2 = _h2()
    const _c3 = _h3()
    const _c4 = _h4()
    const _c5 = _h5()

    return () => {
      _c1?.()
      _c2?.()
      _c3?.()
      _c4?.()
      _c5?.()
    }
  }, [_s])

  if (!_a) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] animate-fade-in"
      onClick={() => _sa(false)}
    >
      <div
        className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 rounded-3xl p-8 max-w-md mx-4 border-4 border-yellow-400 shadow-2xl animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 0 50px rgba(255, 215, 0, 0.5), 0 0 100px rgba(255, 107, 157, 0.3)',
        }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin-slow">🎊</div>
          <h3 className="text-3xl font-bold text-yellow-300 mb-4 animate-pulse">
            彩蛋发现！
          </h3>
          <p className="text-xl text-white mb-4">{_m}</p>
          <div className="p-4 bg-white/10 rounded-xl mb-6">
            <p className="text-lg text-yellow-200">{_r}</p>
          </div>
          <div className="text-sm text-white/60 mb-4">
            已发现彩蛋: {_s.size}/5
          </div>
          <button
            onClick={() => _sa(false)}
            className="cartoon-btn cartoon-btn-pink px-6 py-3"
          >
            太棒了！
          </button>
        </div>
      </div>
    </div>
  )
}
