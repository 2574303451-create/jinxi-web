// Browser-only prototype. This is NOT authentication, and it never calls a backend.
export type LabMember = "lab-member-a" | "lab-member-b";
export type LabSession = { member: LabMember; expiresAt: number } | null;
export function authorizeLab(session: LabSession, subject: LabMember) {
  if (!session || session.expiresAt <= Date.now())
    throw new Error("测试会话已失效，请重新进入合成账号。");
  if (session.member !== subject) throw new Error("测试存储拒绝跨账号操作。");
  return session.member;
}
const database = "jinxi-avatar-lab-v1";
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("avatars");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("隔离测试存储不可用。"));
    request.onblocked = () =>
      reject(new Error("请关闭其他头像原型页面后重试。"));
  });
}
export async function avatarLabRead(
  session: LabSession,
  subject: LabMember,
): Promise<Blob | undefined> {
  authorizeLab(session, subject);
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("avatars", "readonly"),
      request = tx.objectStore("avatars").get(subject);
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onerror = () => {
      db.close();
      reject(new Error("读取测试头像失败。"));
    };
  });
}
export async function avatarLabSave(
  session: LabSession,
  subject: LabMember,
  blob: Blob | null,
  fail = false,
) {
  authorizeLab(session, subject);
  if (fail) throw new Error("模拟保存失败，旧头像仍然保留。");
  if (blob && (blob.type !== "image/webp" || blob.size > 40 * 1024))
    throw new Error("测试头像必须是40KB以内的WebP。");
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("avatars", "readwrite");
    const store = tx.objectStore("avatars");
    if (blob) store.put(blob, subject);
    else store.delete(subject);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(new Error("保存测试头像失败，旧记录未替换。"));
    };
  });
}
export async function clearAvatarLab() {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("avatars", "readwrite");
    tx.objectStore("avatars").clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(
        new Error("清理失败，请从浏览器站点设置删除jinxi-avatar-lab-v1。"),
      );
    };
  });
}
