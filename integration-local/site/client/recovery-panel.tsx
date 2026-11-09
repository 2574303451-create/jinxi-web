"use client";
import { useEffect, useState } from 'react';
import { useSession } from './session-context';
import type { RecoveryReceipt } from './model';
export function RecoveryPanel() {
 const { client, state, ready } = useSession();
 const [rows,setRows]=useState<RecoveryReceipt[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 const [offset,setOffset]=useState(0);
 useEffect(()=>{let live=true;setRows([]);setError('');if(!ready)return;setBusy(true);client.recover(offset).then(v=>{if(live)setRows(v);}).catch(()=>{if(live)setError('暂时无法核对服务端回执；保留原编号，不能据此重开未知操作。');}).finally(()=>{if(live)setBusy(false);});return()=>{live=false;};},[client,ready,state.member?.id,state.revision,revision,offset]);
 if(!ready)return <p role="status">请重新登录原成员后核对；不会显示其他账号的请求。</p>;
 return <section className="integration-panel"><p>每页核对本人16条操作元数据，可翻页而不删除未知记录，不保存正文或密码。未知结果须原样重试；服务端未找到回执仍属于未确认。超过7天的未知操作停止自动重试，须先核对。</p>
 <button className="paper-button" disabled={busy} onClick={()=>setRevision(v=>v+1)}>核对服务端回执</button>
 <button className="paper-button" disabled={busy} onClick={()=>{setBusy(true);void client.cleanupReceipts().then(()=>setRevision(v=>v+1)).catch(()=>{setError('未能安全清理；没有通过服务端核验的标识不会删除。');setBusy(false);});}}>清理30天前已确认标识</button>
 <button className="paper-button" disabled={busy||offset===0} onClick={()=>setOffset(v=>Math.max(0,v-16))}>上一页回执</button>
 <button className="paper-button" disabled={busy||rows.length<16||offset>=496} onClick={()=>setOffset(v=>v+16)}>下一页回执</button>
 {error&&<p role="alert">{error}</p>}{busy&&<p role="status">正在核对原交易，不会重新执行。</p>}
 <ul data-testid="recovery-receipts">{rows.map(row=><li key={row.key} data-request-id={row.id}>{row.module} / {row.op} · {row.serverState==='committed'?'服务端确认已提交':'结果未确认'}{row.expired?' · 保留过期标识':''}
 {row.serverState==='committed'&&<button className="paper-button" disabled={busy} onClick={()=>{setBusy(true);void client.forgetReceipt(row).then(()=>setRevision(v=>v+1)).catch(()=>{setError('确认失败，原回执仍保留。');setBusy(false);});}}>确认已完成，允许新操作</button>}</li>)}</ul>
 <p>只有明确需要另一次相同内容的操作时，才清除已核实的回执；清除会允许新的请求编号。已确认元数据30天后可清理，未确认标识不会自动删除。清除浏览器网站数据会丢失本机标识，届时须先人工核对服务端，不能盲目重做。</p></section>;
}
