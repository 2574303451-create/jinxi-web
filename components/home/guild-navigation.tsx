"use client";

import { GuildImage } from "./guild-image";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";

export interface GuildNavigationProps {
  account: string;
  nickname: string;
  onLogin: () => void;
  onPassword: () => void;
  onLogout: () => void;
  onJoin: () => void;
  onAnnouncement: () => void;
}

export function GuildNavigation(props: GuildNavigationProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        menuRef.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const act = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <header className="guild-header">
      <div className="guild-shell guild-nav">
        <a href="#top" className="guild-brand" aria-label="今夕公会首页">
          <GuildImage src="/logo.png" alt="" width={36} height={36} />
          <span>
            今夕公会<span className="brand-caption">弹弹堂 · 并肩作战</span>
          </span>
        </a>
        <button
          ref={menuRef}
          className="mobile-menu-button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="primary-navigation"
          aria-label={open ? "关闭导航" : "打开导航"}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav
          id="primary-navigation"
          className={`guild-links ${open ? "is-open" : ""}`}
          aria-label="主导航"
        >
          <div className="nav-primary">
            <a href="#about" onClick={() => setOpen(false)}>
              公会介绍
            </a>
            <a href="#members" onClick={() => setOpen(false)}>
              成员
            </a>
            <button onClick={() => act(props.onAnnouncement)}>公告活动</button>
            <a href="#actions" onClick={() => setOpen(false)}>
              签到与任务
            </a>
            <a href="/guides/" onClick={() => setOpen(false)}>攻略交流</a>
          </div>
          <div className="nav-account">
            {props.account ? (
              <details>
                <summary>{props.nickname || props.account}</summary>
                <div className="account-menu">
                  <a href="/profile-lab/">我的资料（隔离原型）</a>
                  <button onClick={() => act(props.onPassword)}>
                    修改密码
                  </button>
                  <button onClick={() => act(props.onLogout)}>退出登录</button>
                </div>
              </details>
            ) : (
              <button onClick={() => act(props.onLogin)}>登录</button>
            )}
            <button
              className="guild-button compact dark"
              onClick={() => act(props.onJoin)}
            >
              加入今夕 <ArrowUpRight size={15} />
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
