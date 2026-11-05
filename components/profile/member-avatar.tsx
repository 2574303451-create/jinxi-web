"use client";
import { useState } from "react";
export function MemberAvatar({
  name,
  src,
  size = 32,
}: {
  name: string;
  src?: string;
  size?: 32 | 48 | 64;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span
      className="member-avatar"
      data-size={size}
      data-image={Boolean(src && failed !== src)}
      aria-hidden="true"
    >
      {src && failed !== src ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          decoding="async"
          onError={() => setFailed(src)}
        />
      ) : (
        Array.from(name.trim() || "匿名").slice(-1)
      )}
    </span>
  );
}
