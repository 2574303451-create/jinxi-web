"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { PaperState } from '../../../components/ui/paper';
import { useCommand, useResource, useSession } from './session-context';
import { PageControls } from './page-controls';
type AdminOrder = { id: string; itemName: string; ownerLabel: string; quantity: number; cost: string; status: string; canClose: boolean };
type AdminQueue = { adminOrders: AdminOrder[]; nextPendingAfter: string | null; nextProcessingAfter: string | null };
type Queue = 'pending' | 'processing';
type OrderAction = 'processing' | 'fulfilled' | 'failed';
const queueLimit = '5';
type History = {
  orders: { id: string; status: string; cost: string }[];
  ledger: { id: string; entryNo: string; kind: string; direction: number; pointDelta: string; balanceAfter: string }[];
  nextOrdersBefore: string | null;
  nextLedgerBefore: string | null;
};
type Board = { entries: { publicId: string; position: number; label: string; score: string }[]; nextCursor: string | null };
const orderLabels: Record<string,string> = { pending: '待处理', processing: '处理中', fulfilled: '已完成', failed: '未履约 · 已退款', cancelled: '已取消 · 已退款' };

function AdminOrderRows({ orders, busy, onProcess }: {
  orders: AdminOrder[]; busy: boolean; onProcess: (id: string, action: OrderAction) => void;
}) {
  return <ul>{orders.map(order => <li className="integration-record" key={order.id} data-admin-order-id={order.id}>
    <strong id={'order-summary-' + order.id}>{order.itemName} · {order.quantity} 件 · {order.id}</strong>
    <p>{order.ownerLabel} · 扣减 {order.cost} 分 · {orderLabels[order.status] ?? order.status}</p>
    <div className="integration-actions">
      {order.status === 'pending' && <button className="paper-button yellow" aria-describedby={'order-summary-' + order.id} disabled={busy} onClick={() => onProcess(order.id, 'processing')}>认领订单</button>}
      {order.status === 'processing' && !order.canClose && <p>已由其他管理员认领。</p>}
      {order.canClose && <>
        <p>已由你认领。核实奖励尚未开通时，可登记无法履约并退款。</p>
        <button className="paper-button yellow" aria-describedby={'order-summary-' + order.id} disabled={busy} onClick={() => onProcess(order.id, 'fulfilled')}>确认已人工开通</button>
        <button className="paper-button" aria-describedby={'order-summary-' + order.id} disabled={busy} onClick={() => onProcess(order.id, 'failed')}>确认未开通，退回积分</button>
      </>}
    </div>
  </li>)}</ul>;
}

function AdminQueuePage({ queue, first, refreshing, busy, onProcess }: {
  queue: Queue; first: AdminQueue; refreshing: boolean; busy: boolean; onProcess: (id: string, action: OrderAction) => void;
}) {
  const { client, ready } = useSession();
  const [after, setAfter] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const load = useCallback(async () => {
    if (!ready || !after || refreshing) return null;
    const page = await client.request<AdminQueue>('points', null, { view: 'admin', queue, after, limit: queueLimit });
    return { after, page };
  }, [client, ready, queue, after, refreshing]);
  const later = useResource(load);
  const loading = refreshing || Boolean(after && later.loading);
  const matchingPage = later.data?.after === after ? later.data?.page : null;
  const page = loading ? null : after ? matchingPage : first;
  const rows = page ? page.adminOrders.filter(order => order.status === queue) : null;
  const next = queue === 'pending' ? page?.nextPendingAfter : page?.nextProcessingAfter;
  const title = queue === 'pending' ? '待认领订单' : '本人处理中订单';
  const empty = queue === 'pending' ? '暂无待处理订单。' : '暂无本人处理中订单。';
  return <section aria-labelledby={'points-queue-' + queue}>
    <h4 id={'points-queue-' + queue} tabIndex={-1} ref={heading}>{title}</h4>
    {loading && <p role="status">正在读取{title}…</p>}
    {after && later.error && !loading && <p role="alert">此页暂时无法读取，请刷新或返回第一页。</p>}
    {rows?.length === 0 && <p role="status">{empty}</p>}
    {rows && <AdminOrderRows orders={rows} busy={busy} onProcess={onProcess} />}
    <PageControls label={title + '分页'} olderLabel="查看下一页" atStart={!after}
      next={next}
      loading={loading || busy} heading={heading} onChange={setAfter} />
  </section>;
}

export function PointsPanel() {
  const { state } = useSession();
  return <MemberPointsPanel key={state.member?.id ?? 'anonymous'} />;
}

function MemberPointsPanel() {
  const { client, ready, state } = useSession(), cmd = useCommand();
  const [metric, setMetric] = useState('earned');
  const [boardCursor, setBoardCursor] = useState<string | null>(null);
  const [beforeOrders, setBeforeOrders] = useState<string | null>(null);
  const [beforeLedger, setBeforeLedger] = useState<string | null>(null);
  const orderHeading = useRef<HTMLHeadingElement>(null);
  const ledgerHeading = useRef<HTMLHeadingElement>(null);
  const boardHeading = useRef<HTMLHeadingElement>(null);
  const [orderInput, setOrderInput] = useState('');
  const [orderLookup, setOrderLookup] = useState('');
  const [orderInputError, setOrderInputError] = useState(false);
  const load = useCallback(async () => {
    if (!ready) return null;
    // Serial reads avoid burst limits and use the same client identity generation.
    const self = await client.request('points');
    const orders = self.permissions.admin
      ? await client.request<AdminQueue>('points', null, { view: 'admin', queue: 'all', limit: queueLimit })
      : null;
    return { self, orders };
  }, [client, ready]);
  const resource = useResource(load);
  const data = resource.data?.self.memberId === state.member?.id ? resource.data?.self : null;
  const orderQueues = data?.permissions.admin ? resource.data?.orders : null;
  const hasAccount = Boolean(data);
  const loadHistory = useCallback(async () => {
    if (!ready || (!beforeOrders && !beforeLedger)) return null;
    const page = await client.request<History>('points', null, {
      ...(beforeOrders ? { beforeOrders } : {}), ...(beforeLedger ? { beforeLedger } : {}),
    });
    return { beforeOrders, beforeLedger, page };
  }, [client, ready, beforeOrders, beforeLedger]);
  const history = useResource(loadHistory);
  const olderOrders = history.data?.beforeOrders === beforeOrders ? history.data?.page : null;
  const olderLedger = history.data?.beforeLedger === beforeLedger ? history.data?.page : null;
  const orderPage = beforeOrders ? olderOrders : data as History | undefined;
  const ledgerPage = beforeLedger ? olderLedger : data as History | undefined;
  const loadBoard = useCallback(async () => {
    if (!ready || !hasAccount) return null;
    const page = await client.request<Board>('points', null, {
      view: 'board', metric, ...(boardCursor ? { cursor: boardCursor } : {}),
    });
    return { metric, boardCursor, page };
  }, [client, ready, hasAccount, metric, boardCursor]);
  const ranking = useResource(loadBoard);
  const board = ranking.data?.metric === metric && ranking.data.boardCursor === boardCursor ? ranking.data.page : null;
  const loadOrder = useCallback(async () => {
    if (!ready || !data?.permissions.admin || !orderLookup) return null;
    const { adminOrders } = await client.request<{ adminOrders: AdminOrder[] }>('points', null, { view: 'admin', orderId: orderLookup });
    return { orderLookup, orders: adminOrders };
  }, [client, ready, data?.permissions.admin, orderLookup]);
  const orderSearch = useResource(loadOrder);
  const canViewAdminOrders = Boolean(data?.permissions.admin);
  useEffect(() => {
    if (!canViewAdminOrders) return;
    const reload = orderLookup ? orderSearch.reload : resource.reload;
    window.addEventListener('integration:remote-data', reload);
    return () => window.removeEventListener('integration:remote-data', reload);
  }, [canViewAdminOrders, orderLookup, orderSearch.reload, resource.reload]);
  const normalizedOrderInput = orderInput.trim().toLowerCase();
  const showingLookup = Boolean(orderLookup) && normalizedOrderInput === orderLookup;
  const foundOrders = showingLookup && !orderSearch.loading && orderSearch.data?.orderLookup === orderLookup ? orderSearch.data.orders : null;
  const refreshPoints = () => { resource.reload(); orderSearch.reload(); history.reload(); ranking.reload(); };
  const processOrder = (orderId: string, status: OrderAction) => void cmd.run(async () => {
    try { await client.mutate('points', { op: 'order.process', orderId, status }); }
    finally { refreshPoints(); }
  });
  if (!ready) return <PaperState kind="empty" title="请先登录并完成首次改密" />;
  return <section className="integration-panel" aria-label="统一积分与兑换">
    <h2>积分、流水与兑换</h2><p className="paper-notice">完全合成的规则和虚构商品，无真实积分或奖品。待结算事件不计入余额。</p>
    <button className="paper-button" onClick={refreshPoints} disabled={resource.loading || orderSearch.loading}>刷新积分记录</button>
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
      <h3 ref={orderHeading} tabIndex={-1}>本人订单</h3>
      {beforeOrders && history.error && <p role="alert">历史订单暂时无法读取。请刷新或返回第一页。</p>}
      {beforeOrders && !orderPage && !history.error && <p role="status">正在读取历史订单…</p>}
      <ul>{orderPage?.orders.map(o => <li className="integration-record" key={o.id} data-order-id={o.id}>
        <p>订单 {o.id} · {orderLabels[o.status] ?? o.status} · 扣减 {o.cost} 分</p>
        {o.status === 'pending' && <p>积分已扣减。请凭订单号联系公会管理员，由管理员核验并人工开通奖励。</p>}
        {o.status === 'processing' && <p>管理员正在核验和处理此订单。如有疑问，请凭订单号联系管理员。</p>}
        <button className="paper-button" disabled={cmd.busy || o.status !== 'pending'} onClick={() => void cmd.run(() => client.mutate('points', { op: 'order.cancel', orderId: o.id }))}>取消并按原流水退款</button>
      </li>)}</ul>
      <PageControls label="订单分页" olderLabel="查看更早订单" atStart={!beforeOrders} next={orderPage?.nextOrdersBefore}
        loading={resource.loading || (Boolean(beforeOrders) && history.loading) || cmd.busy} heading={orderHeading} onChange={setBeforeOrders} />
      {orderQueues && <section aria-labelledby="points-queue-title">
        <h3 id="points-queue-title">待处理兑换</h3>
        <p>先核对订单号并认领，再模拟人工开通。两组订单分别按提交顺序分页。</p>
        <form className="integration-actions" onSubmit={event => {
          event.preventDefault();
          const id = normalizedOrderInput;
          if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)) {
            setOrderInputError(true);
            return;
          }
          setOrderInputError(false);
          if (id === orderLookup) orderSearch.reload();
          else setOrderLookup(id);
        }}>
          <label className="paper-label">完整订单号<input className="paper-input" type="search" required maxLength={128} aria-invalid={orderInputError} value={orderInput} onChange={event => { setOrderInput(event.target.value); setOrderInputError(false); }} /></label>
          <button className="paper-button" disabled={orderSearch.loading || cmd.busy}>查询订单</button>
          {orderLookup && <button className="paper-button" type="button" disabled={cmd.busy} onClick={() => { setOrderInput(''); setOrderInputError(false); setOrderLookup(''); resource.reload(); }}>返回待处理列表</button>}
        </form>
        {orderInputError && <p role="alert">请输入成员提供的完整订单号。</p>}
        {showingLookup && orderSearch.loading && <p role="status">正在核对订单…</p>}
        {showingLookup && orderSearch.error && <p role="alert">订单暂时无法查询。请重试或返回列表。</p>}
        {foundOrders && (foundOrders.length === 0 ? <p role="status">未找到该订单。</p> :
          <AdminOrderRows orders={foundOrders} busy={cmd.busy} onProcess={processOrder} />)}
        {!orderLookup && (['pending', 'processing'] as const).map(queue =>
          <AdminQueuePage key={queue} queue={queue} first={orderQueues} refreshing={resource.loading}
            busy={cmd.busy} onProcess={processOrder} />)}
      </section>}
      <h3 ref={ledgerHeading} tabIndex={-1}>本人积分流水</h3>
      {beforeLedger && history.error && <p role="alert">历史流水暂时无法读取。请刷新或返回第一页。</p>}
      {beforeLedger && !ledgerPage && !history.error && <p role="status">正在读取历史流水…</p>}
      <ul>{ledgerPage?.ledger.map(l => <li key={l.id} data-ledger-id={l.id}>#{l.entryNo} · {l.kind} · {l.direction === 1 ? '+' : '-'}{l.pointDelta} · 余额 {l.balanceAfter}</li>)}</ul>
      <PageControls label="流水分页" olderLabel="查看更早流水" atStart={!beforeLedger} next={ledgerPage?.nextLedgerBefore}
        loading={resource.loading || (Boolean(beforeLedger) && history.loading)} heading={ledgerHeading} onChange={setBeforeLedger} />
      <h3 ref={boardHeading} tabIndex={-1}>合成排行榜</h3><p>只展示主动公开、且会话身份条件合格的合成账户。并列按服务端公开标识稳定排序。</p>
      <label className="paper-label">排行指标<select className="paper-input" value={metric} onChange={e => { setBoardCursor(null); setMetric(e.target.value); }}><option value="earned">净累计获得</option><option value="balance">余额</option></select></label>
      <button className="paper-button" disabled={cmd.busy} onClick={() => void cmd.run(() => client.mutate('points', { op: 'visibility', listed: !data.account.listed }))}>{data.account.listed ? '停止公开排行' : '公开本人合成排行'}</button>
      {ranking.error && <p role="alert">{ranking.error === 'RANK_CHANGED' ? '排行已更新，请返回第一页。' : '排行暂时无法读取。'}</p>}
      {!board && !ranking.error && <p role="status">正在读取排行榜…</p>}
      {board?.entries.length === 0 && <p>当前指标暂无公开排行。</p>}
      <ol data-testid="points-board">{board?.entries.map(r => <li key={r.publicId}>#{r.position} · {r.label} · {r.score}</li>)}</ol>
      <PageControls label="排行分页" olderLabel="查看后续排名" atStart={!boardCursor} next={board?.nextCursor}
        loading={ranking.loading} heading={boardHeading} onChange={setBoardCursor} />
    </>}
    {cmd.notice && <p className="paper-notice" role="status">{cmd.notice}</p>}
  </section>;
}
