"use client";
import { useCallback, useState } from 'react';
import { PaperState } from '../../../components/ui/paper';
import { useCommand, useResource, useSession } from './session-context';
type PendingOrder = { id: string; itemName: string; ownerLabel: string; quantity: number; cost: string };
const orderLabels: Record<string,string> = { pending: '待处理', fulfilled: '已完成', failed: '未履约 · 已退款', cancelled: '已取消 · 已退款' };

export function PointsPanel() {
  const { client, ready } = useSession(), cmd = useCommand();
  const [metric, setMetric] = useState('earned');
  const load = useCallback(async () => {
    if (!ready) return null;
    // Serial reads avoid burst limits; both are checked against the same client identity generation.
    const self = await client.request('points');
    const board = await client.request('points', null, { view: 'board', metric });
    const orders = self.permissions.admin
      ? (await client.request<{ adminOrders: PendingOrder[] }>('points', null, { view: 'admin' })).adminOrders
      : null;
    return { self, board, orders };
  }, [client, ready, metric]);
  const resource = useResource(load), data = resource.data?.self;
  if (!ready) return <PaperState kind="empty" title="请先登录并完成首次改密" />;
  return <section className="integration-panel" aria-label="统一积分与兑换">
    <h2>积分、流水与兑换</h2><p className="paper-notice">完全合成的规则和虚构商品，无真实积分或奖品。待结算事件不计入余额。</p>
    <button className="paper-button" onClick={resource.reload} disabled={resource.loading}>刷新积分记录</button>
    {resource.error && <p role="alert">{resource.error}</p>}
    {resource.loading && <PaperState kind="loading" title="核对账户、流水和结算记录…" />}
    {data && <>
      <dl data-testid="point-account"><dt>本人余额</dt><dd data-testid="balance">{data.account.balance}</dd><dt>累计获得</dt><dd>{data.account.totalEarned}</dd><dt>净消费</dt><dd>{data.account.totalSpent}</dd><dt>已退款</dt><dd>{data.account.refunds}</dd></dl>
      <h3>签到事件</h3><ul>{data.events.map((e: any) => <li className="integration-record" key={e.eventId} data-event-id={e.eventId}>
        {e.businessDate} · {e.status} · {e.amount === null ? '尚未结算' : '合成奖励 ' + e.amount}
        <div><button className="paper-button" disabled={cmd.busy || e.status !== 'unsettled'} onClick={() => void cmd.run(() => client.mutate('points', { op: 'settle', eventId: e.eventId }))}>结算此签到事件</button></div>
      </li>)}</ul>
      <h3>虚构商品</h3><ul>{data.catalogue.filter((i: any) => i.status === 'enabled').map((i: any) => <li className="integration-record" key={i.id} data-catalogue-id={i.id}>
        <strong>{i.name}</strong><p>单价 {i.unitCost} · 可用库存 {i.available}</p>
        <button className="paper-button yellow" disabled={cmd.busy} onClick={() => void cmd.run(() => client.mutate('points', { op: 'redeem', itemId: i.id, quantity: 1 }))}>兑换虚构商品</button>
      </li>)}</ul>
      <h3>本人订单</h3><ul>{data.orders.map((o: any) => <li className="integration-record" key={o.id} data-order-id={o.id}>
        <p>订单 {o.id} · {orderLabels[o.status] ?? o.status} · 扣减 {o.cost} 分</p>
        {o.status === 'pending' && <p>积分已扣减。请凭订单号联系公会管理员，由管理员核验并人工开通奖励。</p>}
        <button className="paper-button" disabled={cmd.busy || o.status !== 'pending'} onClick={() => void cmd.run(() => client.mutate('points', { op: 'order.cancel', orderId: o.id }))}>取消并按原流水退款</button>
      </li>)}</ul>
      {!resource.loading && resource.data?.orders && <section aria-labelledby="points-queue-title">
        <h3 id="points-queue-title">待处理兑换</h3>
        <p>核对会员提供的订单号，模拟人工开通后再确认。无法履约时退回本单扣减的积分。</p>
        {resource.data.orders.length === 0 && <p role="status">暂无待处理订单。</p>}
        <ul>{resource.data.orders.map(order => <li className="integration-record" key={order.id} data-admin-order-id={order.id}>
          <strong>{order.itemName} · {order.quantity} 件</strong>
          <p>订单 {order.id}</p><p>{order.ownerLabel} · 扣减 {order.cost} 分</p>
          <div className="integration-actions">
            <button className="paper-button yellow" disabled={cmd.busy} onClick={() => void cmd.run(() => client.mutate('points', { op: 'order.process', orderId: order.id, status: 'fulfilled' }))}>确认已人工开通</button>
            <button className="paper-button" disabled={cmd.busy} onClick={() => void cmd.run(() => client.mutate('points', { op: 'order.process', orderId: order.id, status: 'failed' }))}>无法履约，退回积分</button>
          </div>
        </li>)}</ul>
      </section>}
      <h3>本人积分流水</h3><ul>{data.ledger.map((l: any) => <li key={l.id} data-ledger-id={l.id}>#{l.entryNo} · {l.kind} · {l.direction === 1 ? '+' : '-'}{l.pointDelta} · 余额 {l.balanceAfter}</li>)}</ul>
      <h3>合成排行榜</h3><p>只展示主动公开、且会话身份条件合格的合成账户。并列按服务端公开标识稳定排序。</p>
      <label className="paper-label">排行指标<select className="paper-input" value={metric} onChange={e => setMetric(e.target.value)}><option value="earned">净累计获得</option><option value="balance">余额</option></select></label>
      <button className="paper-button" disabled={cmd.busy} onClick={() => void cmd.run(() => client.mutate('points', { op: 'visibility', listed: !data.account.listed }))}>{data.account.listed ? '停止公开排行' : '公开本人合成排行'}</button>
      <ol data-testid="points-board">{resource.data?.board.entries.map((r: any) => <li key={r.publicId}>#{r.position} · {r.label} · {r.score}</li>)}</ol>
    </>}
    {cmd.notice && <p className="paper-notice" role="status">{cmd.notice}</p>}
  </section>;
}
