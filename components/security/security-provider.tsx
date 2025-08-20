'use client';

import AntiDebugProtection from './anti-debug';
import CodeProtection from './code-protection';

/**
 * 安全保护提供者组件
 * 统一管理所有安全措施
 */
export default function SecurityProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AntiDebugProtection />
      <CodeProtection />
      {children}
    </>
  );
}
