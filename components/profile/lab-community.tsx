"use client";
import { useMemo, useState } from "react";
import type { Message } from "../../types/message-wall";
import { PublicMessageScope } from "./public-message-scope";
import { AvatarScope } from "./avatar-scope";
import { MemberAvatar } from "./member-avatar";
import { MessageWall } from "../message-wall";
import { MessageShowcase } from "../home/message-showcase";
import { Modal } from "../ui/modal";
const records: Message[] = Array.from({ length: 8 }, (_, i) => ({
  id: `avatar-lab-${i}`,
  name: i < 2 ? "合成成员·星星" : `合成伙伴${i}`,
  content: `【隔离头像测试】${i === 0 ? "这条留言明确绑定测试成员A，头像会随保存更新。" : i === 1 ? "这是同名游客，不能凭昵称自动认领成员头像。" : "这条公开留言仅用于观察头像、排版和双行展播。"} ${i + 1}`,
  color: "#3b82f6",
  timestamp: new Date("2026-11-05T00:00:00Z"),
  category: "闲聊",
  isPinned: false,
  reactions: [],
  replies:
    i === 0
      ? [
          {
            id: "avatar-lab-reply",
            name: "合成成员·星星",
            content: "这条合成回复也明确绑定测试成员A。",
            timestamp: new Date("2026-11-05T00:00:00Z"),
            color: "#3b82f6",
          },
        ]
      : [],
}));
const source = { read: async () => records, readOnly: true as const };
export function LabCommunity({ src }: { src?: string }) {
  const [open, setOpen] = useState(false),
    [target, setTarget] = useState<string | null>(null);
  const avatars = useMemo(() => {
    const result: Record<string, string> = {};
    if (src) {
      result["message:avatar-lab-0"] = src;
      result["reply:avatar-lab-reply"] = src;
    }
    return result;
  }, [src]);
  return (
    <PublicMessageScope.Provider value={source}>
      <AvatarScope.Provider value={avatars}>
        <section className="lab-community">
          <div className="profile-example">
            <MemberAvatar name="合成成员·星星" src={src} size={48} />
            <div>
              <h2>攻略作者预览 · 合成成员A</h2>
              <p>
                明确绑定测试成员，不依据昵称匹配。历史与同名游客仍用文字头像。
              </p>
            </div>
          </div>
          <MessageShowcase
            onOpen={(id) => {
              setTarget(id || null);
              setOpen(true);
            }}
          />
          <button
            className="paper-button"
            onClick={() => {
              setTarget(null);
              setOpen(true);
            }}
          >
            检查实际留言墙与回复区
          </button>
          <Modal
            isOpen={open}
            onClose={() => setOpen(false)}
            title="隔离头像联动 · 实际留言墙"
            size="2xl"
            legacy={false}
          >
            <MessageWall initialMessageId={target} />
          </Modal>
        </section>
      </AvatarScope.Provider>
    </PublicMessageScope.Provider>
  );
}
