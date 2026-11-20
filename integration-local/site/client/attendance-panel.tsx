"use client";
import { useCallback, useRef, useState } from 'react';
import { PaperState } from '../../../components/ui/paper';
import { PageControls } from './page-controls';
import { useCommand, useResource, useSession } from './session-context';

type Attendance = {
  today: string;
  hasCheckedToday: boolean;
  stats: { totalDays: number; currentStreak: number; longestStreak: number; monthDays: number };
  history: { id: string; businessDate: string; continuousDays: number }[];
  nextBefore: string | null;
};

export function AttendancePanel() {
  const { client, ready } = useSession(), cmd = useCommand();
  const [before, setBefore] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const load = useCallback(async () => {
    if (!ready) return null;
    const data = await client.request<Attendance>('attendance', null, before ? { before } : {});
    return { before, data };
  }, [client, ready, before]);
  const resource = useResource(load), data = resource.data?.data;
  const page = resource.data?.before === before ? data : null;
  const loading = resource.loading || (!page && !resource.error);
  if (!ready) return <PaperState kind="empty" title="请先登录并完成首次改密" />;
  return <section className="integration-panel" aria-label="统一签到">
    <h2>每日签到</h2><p>业务日期由服务端 Asia/Shanghai 生成；奖励事件与结算回执分别记录。</p>
    <button className="paper-button" onClick={resource.reload} disabled={loading}>刷新签到状态</button>
    {resource.error && <p role="alert">签到记录暂时无法读取，请刷新签到状态。</p>}
    {data && <>
      <p data-testid="attendance-state">{data.today} · {data.hasCheckedToday ? '今日已签到' : '今日未签到'}</p>
      <button className="paper-button yellow" disabled={cmd.busy || loading || data.hasCheckedToday} onClick={() => void cmd.run(() => client.mutate('attendance', { op: 'checkin' }))}>{cmd.busy ? '签到中…' : '立即签到'}</button>
      <dl><dt>累计签到</dt><dd>{data.stats.totalDays}</dd><dt>当前连续</dt><dd>{data.stats.currentStreak}</dd><dt>最长连续</dt><dd>{data.stats.longestStreak}</dd><dt>本月</dt><dd>{data.stats.monthDays}</dd></dl>
      <p className="paper-notice">签到事实本身不表示积分到账。请到积分面板核对唯一结算回执与流水。</p>
    </>}
    <h3 ref={heading} tabIndex={-1}>本人签到记录</h3>
    {loading && <PaperState kind="loading" title="读取本人签到事实…" />}
    {page && !loading && (page.history.length ? <ul aria-label="签到记录">
      {page.history.map(r => <li key={r.id} data-record-id={r.id}>{r.businessDate} · 连续 {r.continuousDays} 天 · 已生成可信事件</li>)}
    </ul> : <PaperState kind="empty" title="当前页没有签到记录" />)}
    <PageControls label="签到记录分页" olderLabel="查看更早签到记录" atStart={!before} next={page?.nextBefore}
      loading={loading} heading={heading} onChange={setBefore} />
    {cmd.notice && <p role="status" className="paper-notice">{cmd.notice}</p>}
  </section>;
}
