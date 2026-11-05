"use client";
import { useEffect, useRef, useState } from "react";
import {
  avatarLabRead,
  avatarLabSave,
  clearAvatarLab,
  type LabSession,
  type LabMember,
} from "../../lib/avatar-lab-store";
import { MemberAvatar } from "./member-avatar";
import { AvatarEditor } from "./avatar-editor";
import { LabCommunity } from "./lab-community";
export function ProfileLab() {
  const [session, setSession] = useState<LabSession>(null),
    [blob, setBlob] = useState<Blob>(),
    [url, setUrl] = useState<string>(),
    [notice, setNotice] = useState(""),
    [fail, setFail] = useState(false),
    [broken, setBroken] = useState(false),
    [ready, setReady] = useState(false);
  const revision = useRef(0);
  const currentSession = useRef(session);
  currentSession.current = session;
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  useEffect(() => {
    const version = ++revision.current;
    setReady(false);
    setBlob(undefined);
    if (!session) return;
    avatarLabRead(session, session.member)
      .then((value) => {
        if (version === revision.current) {
          setBlob(value);
          setReady(true);
        }
      })
      .catch((e) => {
        if (version === revision.current) setNotice(e.message);
      });
    return () => {
      revision.current++;
    };
  }, [session]);
  const member = session?.member || "lab-member-a",
    name = member === "lab-member-a" ? "合成成员·星星" : "合成成员·月亮";
  async function save(next: Blob | null) {
    const start = performance.now();
    await avatarLabSave(currentSession.current, member, next, fail);
    setBlob(next || undefined);
    setNotice(
      next
        ? `已保存到本机隔离测试存储（${next.size}字节，${Math.round(performance.now() - start)}ms）。未保存到生产账号。`
        : "已恢复本机测试账号的默认头像，生产账号未改变。",
    );
  }
  return (
    <main className="guild-shell profile-lab">
      <aside className="profile-warning">
        <strong>非生产数据 · 头像与账号交互原型</strong>
        <p>
          这里使用合成账号和本机IndexedDB，不读取真实账号、不连接生产上传服务。测试身份检查只是交互模型，不能作为服务端安全证明。
        </p>
        <a href="/">← 今夕首页</a>
        <a href="/guides/">攻略中心 ↗</a>
      </aside>
      <header className="profile-title">
        <span className="paper-tag yellow">今夕 · 我的资料</span>
        <h1>让伙伴，一眼认出你。</h1>
        <p>先预览，再保存。属于你的头像，出现在每一次交流中。</p>
      </header>
      <section className="profile-session" aria-label="测试会话控制">
        <div className="profile-controls">
          {(["lab-member-a", "lab-member-b"] as LabMember[]).map((m, i) => (
            <button
              key={m}
              className="paper-button"
              onClick={() => {
                setSession({
                  member: m,
                  expiresAt: Date.now() + 5 * 60 * 1000,
                });
                setNotice(`已进入合成账号${i ? "B" : "A"}，测试会话5分钟。`);
              }}
            >
              进入合成账号 {i ? "B" : "A"}
            </button>
          ))}
          <button
            className="paper-button"
            onClick={() => {
              setSession(null);
              setNotice("已退出测试账号。");
            }}
          >
            退出测试账号
          </button>
          <button
            className="paper-button"
            disabled={!session}
            onClick={() => {
              if (session) setSession({ ...session, expiresAt: 0 });
              setNotice("测试会话已失效，保存应被拒绝。");
            }}
          >
            模拟会话失效
          </button>
          <button
            className="paper-button"
            onClick={async () => {
              try {
                await clearAvatarLab();
                setBlob(undefined);
                setNotice("本机头像原型存储已清空。");
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
          >
            清理全部测试头像
          </button>
        </div>
        <p role="status" className="profile-status">
          {notice || "尚未进入合成账号；游客继续显示文字头像。"}
        </p>
      </section>
      {session ? (
        <div className="profile-layout">
          <aside className="profile-card">
            <div className="profile-account">
              <details>
                <summary>
                  <MemberAvatar name={name} src={url} size={32} />
                  <span>{name}</span>
                </summary>
                <button
                  className="paper-text-button"
                  onClick={() =>
                    document.querySelector("#lab-profile")?.scrollIntoView()
                  }
                >
                  我的资料（测试）
                </button>
              </details>
            </div>
            <h2 id="lab-profile">我的资料</h2>
            <dl>
              <dt>昵称</dt>
              <dd>{name}</dd>
              <dt>测试账号</dt>
              <dd>{member}</dd>
              <dt>身份</dt>
              <dd>合成成员，非生产认证</dd>
              <dt>工号档案</dt>
              <dd>不读取、不修改</dd>
            </dl>
            <div className="avatar-sizes">
              {([32, 48, 64] as const).map((size) => (
                <div key={size}>
                  <MemberAvatar
                    name={name}
                    src={broken ? "/__missing_avatar_test__.webp" : url}
                    size={size}
                  />
                  <small>{size}px</small>
                </div>
              ))}
            </div>
            <label>
              <input
                type="checkbox"
                checked={broken}
                onChange={(e) => setBroken(e.target.checked)}
              />{" "}
              模拟图片加载失败
            </label>
          </aside>
          <section className="profile-card">
            <label className="lab-failure">
              <input
                type="checkbox"
                checked={fail}
                onChange={(e) => setFail(e.target.checked)}
              />{" "}
              模拟存储失败（旧头像保留）
            </label>
            {ready ? (
              <AvatarEditor
                onSave={(blob) => save(blob)}
                onReset={() => save(null)}
              />
            ) : (
              <p role="status">
                {session.expiresAt === 0
                  ? "会话已失效，请重新进入合成账号。"
                  : "正在读取隔离测试存储…"}
              </p>
            )}
          </section>
        </div>
      ) : (
        <section className="profile-card">
          <h2>以游客身份浏览</h2>
          <p>
            选择上方合成账号，即可预览个人资料和上传裁剪。真实账号资料不受影响。
          </p>
        </section>
      )}
      <LabCommunity
        src={
          member === "lab-member-a" && session && session.expiresAt > Date.now()
            ? url
            : undefined
        }
      />
      <footer className="profile-footnote">
        退出或刷新后需重新选择合成账号。本机头像保存在jinxi-avatar-lab-v1，清理按钮可删除。这里的成功状态只代表原型存储，不代表生产保存。
      </footer>
    </main>
  );
}
