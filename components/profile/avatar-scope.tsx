"use client";
import { createContext, useContext } from "react";
/** Exists only inside the explicitly isolated prototype. No nickname-based matching. */
export const AvatarScope = createContext<Readonly<Record<string, string>>>({});
export function useScopedAvatar(subject?: string) {
  const avatars = useContext(AvatarScope);
  return subject ? avatars[subject] : undefined;
}
