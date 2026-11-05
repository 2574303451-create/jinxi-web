import type { Metadata } from "next";
import { GuideCenter } from "../../components/guides/guide-center";
import "../../styles/guides.css";
export const metadata: Metadata = {
  title: "攻略中心 · 今夕公会",
  description: "弹弹堂玩家的实战笔记、组队经验与攻略交流。",
};
export default function GuidesPage() {
  return (
    <div className="jinxi-site guide-site">
      <a className="skip-link" href="#guide-main">
        跳到攻略内容
      </a>
      <header className="guide-nav guild-shell">
        <a className="guild-brand" href="/">
          <img src="/logo.png" alt="" width={36} height={36} />
          <span>
            今夕公会<small className="brand-caption">弹弹堂 · 并肩作战</small>
          </span>
        </a>
        <nav aria-label="攻略导航">
          <a href="/">返回首页</a>
          <a href="/guides/" aria-current="page">
            攻略中心
          </a>
        </nav>
      </header>
      <main id="guide-main" className="guild-shell">
        <GuideCenter />
      </main>
      <footer className="guide-footer">
        以战会友，一起记录每一次进步。<a href="/">回到今夕首页 ↗</a>
      </footer>
    </div>
  );
}
