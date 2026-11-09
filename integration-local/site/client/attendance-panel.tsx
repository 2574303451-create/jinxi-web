"use client";
import { useCallback } from 'react';
import { PaperState } from '../../../components/ui/paper';
import { useCommand, useResource, useSession } from './session-context';
export function AttendancePanel() {
  const { client, ready } = useSession(), cmd = useCommand();
  const load = useCallback(() => ready ? client.request('attendance') : Promise.resolve(null), [client, ready]);
  const resource = useResource(load), data = resource.data;
  if (!ready) return <PaperState kind="empty" title="请先登录并完成首次改密" />;
  return <section className="integration-panel" aria-label="统一签到">
    <h2>每日签到</h2><p>业务日期由服务端 Asia/Shanghai 生成；奖励事件与结算回执分别记录。</p>
    <button className="paper-button" onClick={resource.reload} disabled={resource.loading}>刷新签到状态</button>
    {resource.loading && <PaperState kind="loading" title="读取本人签到事实…" />}
    {resource.error && <p role="alert">{resource.error}</p>}
    {data && <>
      <p data-testid="attendance-state">{data.today} · {data.hasCheckedToday ? '今日已签到' : '今日未签到'}</p>
      <button className="paper-button yellow" disabled={cmd.busy || data.hasCheckedToday} onClick={() => void cmd.run(() => client.mutate('attendance', { op: 'checkin' }))}>{cmd.busy ? '签到中…' : '立即签到'}</button>
      <dl><dt>累计签到</dt><dd>{data.stats.totalDays}</dd><dt>当前连续</dt><dd>{data.stats.currentStreak}</dd><dt>最长连续</dt><dd>{data.stats.longestStreak}</dd><dt>本月</dt><dd>{data.stats.monthDays}</dd></dl>
      <p className="paper-notice">签到事实本身不表示积分到账。请到积分面板核对唯一结算回执与流水。</p>
      <ul>{data.history.map((r: any) => <li key={r.id} data-record-id={r.id}>{r.businessDate} · 连续 {r.continuousDays} 天 · 已生成可信事件</li>)}</ul>
      {data.nextBefore && <p>此页最多显示30条事实。更早的合成记录可通过受限历史接口分页读取。</p>}
    </>}
    {cmd.notice && <p role="status" className="paper-notice">{cmd.notice}</p>}
  </section>;
}
