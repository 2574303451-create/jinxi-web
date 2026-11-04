"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Megaphone, MessageCircle, RefreshCw } from "lucide-react";
import {
  fetchAnnouncements,
  type Announcement,
} from "../../services/announcement-service";

export function CommunityUpdates({
  onAnnouncement,
  onMessages,
  onStrategy,
}: {
  onAnnouncement: () => void;
  onMessages: () => void;
  onStrategy: () => void;
}) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    fetchAnnouncements()
      .then((data) => {
        if (active) setItems(data.slice(0, 3));
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  return (
    <div className="community-layout">
      <article className="guild-panel announcement-preview">
        <div className="panel-title">
          <Megaphone size={22} />
          <h3>公会动态</h3>
        </div>
        <p className="muted">活动时间与公会安排，以实际发布的公告为准。</p>
        {loading ? (
          <p role="status" className="feed-state">
            正在加载公会公告…
          </p>
        ) : error ? (
          <div role="alert" className="feed-state error">
            <p>公告暂时加载失败，请重试。</p>
            <button
              className="text-action"
              onClick={() => setReload(reload + 1)}
            >
              <RefreshCw size={15} />
              重新加载
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="feed-state">暂无公告。新的集结通知将在这里出现。</p>
        ) : (
          <ul className="announcement-list">
            {items.map((item) => (
              <li key={item.id}>
                <button onClick={onAnnouncement}>
                  {item.title}
                  <ArrowRight size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className="guild-button compact" onClick={onAnnouncement}>
          查看公告 <ArrowRight size={16} />
        </button>
      </article>
      <div className="community-doors">
        <button className="guild-panel community-door" onClick={onMessages}>
          <MessageCircle size={28} />
          <span>
            <b>留下你的声音</b>
            <small>留言、提问，和公会伙伴聊一聊。</small>
          </span>
          <ArrowRight size={20} />
        </button>
        <button
          className="guild-panel community-door yellow"
          onClick={onStrategy}
        >
          <span className="door-symbol" aria-hidden="true">
            ↗
          </span>
          <span>
            <b>分享经验，一起变强</b>
            <small>打开攻略墙，交流打法与心得。</small>
          </span>
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
