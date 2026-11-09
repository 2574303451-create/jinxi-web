"use client";

import { createContext, useContext, type ReactNode } from "react";
import type * as messages from "../services/message-wall-backend";
import type { Strategy, StrategySubmission } from "../types/strategy-wall";
import type { MemberAction } from "./home/guild-sections";
import type { HomeGuide, HomeGuideFeed } from "../services/home-guides";

// No local endpoints, credentials or enabling flags belong in the public app.
// Only the separate, loopback-only development application supplies a provider.
export type MessageActions = Pick<typeof messages,
  "addMessage" | "addReply" | "toggleReaction" | "togglePin" | "deleteMessage">;
export interface SiteRuntime {
  accountLabel: string;
  displayName: string;
  onLogin: () => void;
  onPassword: () => void;
  onLogout: () => void;
  onAnnouncement: () => void;
  onJoin: () => void;
  onProfile: () => void;
  banner: ReactNode;
  dialogs: ReactNode;
  announcement: ReactNode;
  sponsorship: ReactNode;
  panels: Partial<Record<MemberAction, ReactNode>>;
  messageActions: MessageActions;
  messageManagement: ReactNode;
  canWrite: boolean;
  dataVersion: number;
  readGuide: (id: string, signal?: AbortSignal) => Promise<Strategy>;
  readHomeGuides: (feed: HomeGuideFeed, force?: boolean) => Promise<HomeGuide[]>;
  saveGuide: (draft: StrategySubmission) => Promise<void>;
  guideManagement: ReactNode;
  guideDiscussion: (guide: Strategy) => ReactNode;
}
export const SiteRuntimeContext = createContext<SiteRuntime | null>(null);
export const useSiteRuntime = () => useContext(SiteRuntimeContext);
