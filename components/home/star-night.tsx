"use client"

import { useEffect, useRef, useState } from "react"

type NavigationProps = {
  account: string
  nickname: string
  onLogin: () => void
  onPassword: () => void
  onLogout: () => void
  onJoin: () => void
  onStrategy: () => void
}

export function GuildNavigation(props: NavigationProps) {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggleRef.current?.focus() }
    }
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [open])
  const navigate = (action: () => void) => { setOpen(false); action() }
  return (
    <header className="night-header">
      <div className="night-nav">
        <a href="#top" className="night-brand" aria-label="今夕公会首页"><img src="/logo.png" alt="" width="40" height="40" /><span>今夕<span className="brand-sub">JINXI GUILD</span></span></a>
        <button ref={toggleRef} className="menu-toggle" aria-expanded={open} aria-controls="guild-navigation" onClick={() => setOpen(!open)}>{open ? "关闭菜单 ×" : "菜单 ☰"}</button>
        <nav id="guild-navigation" aria-label="主导航" className={`night-links ${open ? "is-open" : ""}`}>
          {[["top", "首页"], ["info-tabs", "公会介绍"], ["members", "成员"], ["checkin", "签到与任务"], ["message-wall", "留言"]].map(([id, text]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>{text}</a>)}
          <button onClick={() => navigate(() => window.dispatchEvent(new Event("cyber-announcement:open")))}>公告</button>
          <button onClick={() => navigate(props.onStrategy)}>攻略</button>
          <button className="nav-join" onClick={() => navigate(props.onJoin)}>加入今夕 ↗</button>
          {props.account && <div className="mobile-account"><span>{props.nickname || props.account}</span><button onClick={() => navigate(props.onPassword)}>修改密码</button><button onClick={() => navigate(props.onLogout)}>退出</button></div>}
        </nav>
        <div className="night-account">
          {props.account ? <details><summary>{props.nickname || props.account}</summary><div><button onClick={props.onPassword}>修改密码</button><button onClick={props.onLogout}>退出</button></div></details> : <button onClick={props.onLogin}>登录 <span aria-hidden="true">↗</span></button>}
        </div>
      </div>
    </header>
  )
}

export function StarNightHero({ onJoin }: { onJoin: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const play = async () => {
    try { await videoRef.current?.play(); setPlaying(true) }
    catch { setFailed(true); setPlaying(false) }
  }
  return (
    <section id="top" className="night-hero">
      <div className="hero-copy">
        <p className="night-eyebrow"><span aria-hidden="true">✦</span> 弹弹堂 · 今夕公会</p>
        <h1>今晚开黑，<br /><em>星光作陪。</em></h1>
        <p className="hero-description">在今夕，找到并肩作战的伙伴。<br className="desktop-break" />一起组队、交流，记录属于我们的高光时刻。</p>
        <div className="hero-actions"><button className="night-button primary" onClick={onJoin}>加入今夕 <span aria-hidden="true">↗</span></button><a className="night-button" href="#info-tabs">认识公会 <span aria-hidden="true">↓</span></a></div>
        <p className="hero-contact">QQ群 713162467 <span>·</span> 联系人 执手</p>
      </div>
      <div className="hero-art">
        <div className="star-orbit" aria-hidden="true"><span>✦</span></div>
        <div className="hero-film">
          <img src="/bg.png" alt="今夕公会游戏影像封面" className="hero-poster" />
          {!failed && <video ref={videoRef} src="/1.mp4" poster="/bg.png" preload="none" playsInline controls={playing} className={playing ? "is-playing" : ""} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} onEnded={() => setPlaying(false)} onError={() => { setFailed(true); setPlaying(false) }} />}
          {!playing && <div className="film-caption"><span>今夕 · 我们的游戏时光</span>{failed ? <p role="status">视频暂不可用，正在展示公会封面。</p> : <button onClick={play} aria-label="播放公会视频"><span aria-hidden="true">▷</span> 播放影像</button>}</div>}
        </div>
        <div className="art-caption"><span>TONIGHT, WE PLAY TOGETHER.</span><span aria-hidden="true">✧</span></div>
      </div>
    </section>
  )
}

export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="section-heading"><p className="night-eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>
}

export function ActionLinks() {
  return <nav className="action-links" aria-label="成员快捷入口"><span>今日行动 <small>QUICK ACCESS</small></span>{[["checkin", "每日签到"], ["daily-tasks", "任务与积分"], ["team-system", "寻找队伍"], ["game-data", "游戏数据"]].map(([id, label]) => <a href={`#${id}`} key={id}>{label} <span aria-hidden="true">↗</span></a>)}</nav>
}
