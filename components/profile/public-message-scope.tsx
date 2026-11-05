"use client";
import { createContext } from "react";
import type { Message } from "../../types/message-wall";
export const PublicMessageScope = createContext<{
  read: () => Promise<Message[]>;
  readOnly: true;
} | null>(null);
