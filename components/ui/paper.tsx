"use client";

import { useScopedAvatar } from "../profile/avatar-scope";
import { useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";

export function PaperState({
  kind,
  title,
  children,
  action,
}: {
  kind: "loading" | "empty" | "error";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const Icon =
    kind === "loading" ? LoaderCircle : kind === "error" ? AlertCircle : Inbox;
  return (
    <div
      className={`paper-state ${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <Icon
        size={26}
        aria-hidden="true"
        className={kind === "loading" ? "paper-spinner" : undefined}
      />
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function PublicAvatar({
  name,
  color,
  subject,
}: {
  name: string;
  color?: string;
  subject?: string;
}) {
  const scoped = useScopedAvatar(subject);
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className="paper-avatar" aria-hidden="true">
      {scoped && failed !== scoped ? (
        <span className="paper-avatar-image">
          <img
            src={scoped}
            alt=""
            decoding="async"
            onError={() => setFailed(scoped)}
          />
        </span>
      ) : (
        Array.from(name.trim() || "匿名").slice(-1)
      )}
      {color && /^#[\da-f]{6}$/i.test(color) && (
        <i style={{ backgroundColor: color }} />
      )}
    </span>
  );
}

export function messageDate(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "时间暂不可用"
    : new Intl.DateTimeFormat("zh-CN", {
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
}
