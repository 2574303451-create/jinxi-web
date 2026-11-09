export type Member = { id: string; displayName: string };
export type Snapshot = { phase: string; member: Member | null; revision: number; message: string };
export type Input = Record<string, unknown>;
export type RecoveryReceipt = { key: string; id: string; actor: string; module: string; op: string; createdAt: number; expired: boolean; serverState: 'committed' | 'unresolved' };
export interface SessionClient {
  getSnapshot(): Snapshot;
  subscribe(fn: () => void): () => void;
  restore(): Promise<void>;
  authenticate(op: string, fields?: Input): Promise<unknown>;
  request<T = Record<string, any>>(module: string, body?: Input | null, query?: Record<string, string>, privateView?: boolean): Promise<T>;
  mutate<T = Record<string, any>>(module: string, body: Input): Promise<T>;
  observeEpoch(): void;
  unverify(): void;
  invalidate(): void;
  recover(offset?: number): Promise<RecoveryReceipt[]>;
  forgetReceipt(row: RecoveryReceipt): Promise<void>;
  cleanupReceipts(): Promise<number>;
}
export type Item = {
  id: string; version: number; status: string; content: string; title?: string;
  name?: string; author?: string; ownership?: string; category: string; color?: string;
  difficulty?: number; tags?: string[]; mediaFiles?: unknown[]; imageUrl?: string;
  isPinned?: boolean;
};
