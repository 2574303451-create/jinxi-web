"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { getMessages } from "../services/message-wall-backend";
import type { Message } from "../types/message-wall";

import { PublicMessageScope } from "../components/profile/public-message-scope";

export const PUBLIC_MESSAGES_CHANGED = "jinxi:public-messages-changed";

export function usePublicMessages() {
  const source = useContext(PublicMessageScope);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef(0);
  const reload = useCallback(async () => {
    const version = ++request.current;
    setLoading(true);
    setError("");
    try {
      const data = await (source?.read || getMessages)();
      if (version === request.current) setMessages(data);
    } catch {
      if (version === request.current) setError("留言暂时加载失败，请重试。");
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, [source]);
  useEffect(() => {
    void reload();
    return () => {
      request.current++;
    };
  }, [reload]);
  return {
    messages,
    loading,
    error,
    reload,
    readOnly: Boolean(source?.readOnly),
  };
}
