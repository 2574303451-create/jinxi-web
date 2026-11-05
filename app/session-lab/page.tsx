"use client";
import {useEffect,useRef,useState} from "react";
import {PublicAvatar} from "../../components/ui/paper";
import "./session-lab.css";
type Auth={member:{id:string;displayName:string};csrfToken:string;needsPasswordChange:boolean};
export default function SessionLab(){
 const pendingRedemption=useRef<string|null>(null);
 const [auth,setAuth]=useState<Auth|null>(null),[account,setAccount]=useState("b2-lab-a"),[password,setPassword]=useState(""),[current,setCurrent]=useState(""),[next,setNext]=useState("");
 const [message,setMessage]=useState("正在核验本机会话…"),[busy,setBusy]=useState(false),[balance,setBalance]=useState<number|null>(null),[draft,setDraft]=useState(""),[ready,setReady]=useState(false);
 function forgetIdentity(){setAuth(null);setBalance(null);setPassword("");setCurrent("");setNext("");pendingRedemption.current=null;}
 async function request(op:string,body?:Record<string,string>,state=auth){
  const response=await fetch("/.netlify/functions/session-lab"+(body?"":"?op="+encodeURIComponent(op)),{method:body?"POST":"GET",cache:"no-store",credentials:"same-origin",headers:body?{"Content-Type":"application/json",...(state?{"X-CSRF-Token":state.csrfToken}:{})}:undefined,body:body?JSON.stringify({op,...body}):undefined});
  const result=await response.json();
  if(response.status===401)forgetIdentity();
  if(!response.ok)throw Error(response.status===401?"尚无有效服务器会话，请使用合成账号登录。":response.status===429?"请求较频繁，请稍后重试。":result.code==="PASSWORD_RESET_REQUIRED"?"首次登录需要先修改密码。":result.error||"请求未完成，请稍后重试。");
  return result;
 }
 function accept(value:{member?:{id?:unknown;displayName?:unknown};csrfToken?:unknown;needsPasswordChange?:unknown}):Auth{
  if(typeof value.member?.id!=="string"||typeof value.member.displayName!=="string"||typeof value.csrfToken!=="string"||typeof value.needsPasswordChange!=="boolean")throw Error("会话响应暂不可用。");
  return{member:{id:value.member.id,displayName:value.member.displayName},csrfToken:value.csrfToken,needsPasswordChange:value.needsPasswordChange};
 }
 async function restore(){try{const state=accept(await request("me"));setAuth(state);setMessage(state.needsPasswordChange?"首次登录：请先修改测试密码。":"服务器会话已恢复。");if(!state.needsPasswordChange){const wallet=await request("points",undefined,state);setBalance(typeof wallet.balance==="number"?wallet.balance:null);}}catch(error){setMessage(error instanceof TypeError?"网络连接中断，身份暂未核验；草稿保留。":error instanceof Error?error.message:"网络连接中断，身份暂未核验。");}}
 useEffect(()=>{try{setDraft(localStorage.getItem("jinxi-session-lab-draft-v1")||"")}catch{}setReady(true);void restore();const reconnect=()=>{if(document.visibilityState==="visible")void restore()};window.addEventListener("online",reconnect);window.addEventListener("focus",reconnect);return()=>{window.removeEventListener("online",reconnect);window.removeEventListener("focus",reconnect);};},[]);
 useEffect(()=>{if(ready)try{localStorage.setItem("jinxi-session-lab-draft-v1",draft)}catch{}},[draft,ready]);
 async function perform(work:()=>Promise<void>){setBusy(true);try{await work()}catch(error){setMessage(error instanceof TypeError?"网络连接中断，请恢复连接后重新核验；草稿保留。":error instanceof Error?error.message:"连接中断，请稍后重试。")}finally{setBusy(false)}}
 return <main className="jinxi-site session-lab">
  <header className="sl-heading"><span className="paper-tag yellow">B2-A · 仅本机合成演示</span><h1>可信身份，先在隔离环境验证。</h1><p>这里使用合成伙伴和专用测试库。没有真实成员登录、头像上传或在线心跳。</p></header>
  <p role="status" className="paper-notice" aria-live="polite">{message}</p>
  <div className="sl-grid">
   <section className="sl-panel" aria-labelledby="session-title"><h2 id="session-title">服务器登录会话</h2>
    {auth?<><div className="sl-member"><PublicAvatar name={auth.member.displayName}/><strong>{auth.member.displayName}</strong><span className="paper-tag">合成身份</span></div><p>{auth.needsPasswordChange?"首次改密期间，只能查看会话、改密或退出。":"身份来自服务器 Cookie 核验，旧页面展示账号不能代替它。"}</p>
     <div className="sl-actions"><button className="paper-button" disabled={busy} onClick={()=>void perform(async()=>{await restore()})}>重新核验</button><button className="paper-button dark" disabled={busy} onClick={()=>void perform(async()=>{await request("logout",{});forgetIdentity();setMessage("本设备会话已撤销，草稿保留。");})}>退出此设备</button></div>
     <form onSubmit={event=>{event.preventDefault();void perform(async()=>{await request("change-password",{currentPassword:current,newPassword:next});forgetIdentity();setMessage("密码已修改，所有旧会话已撤销，请重新登录。");})}}><h3>修改测试密码</h3><label className="paper-label" htmlFor="lab-current">当前密码</label><input className="paper-input" id="lab-current" type="password" autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)} required maxLength={128}/><label className="paper-label" htmlFor="lab-next">新密码</label><input className="paper-input" id="lab-next" type="password" autoComplete="new-password" value={next} onChange={e=>setNext(e.target.value)} required minLength={12} maxLength={128}/><small>12–128个字符，包含字母、数字与其他字符。</small><button className="paper-button yellow" disabled={busy}>修改并撤销旧会话</button></form>
    </>:<form onSubmit={event=>{event.preventDefault();void perform(async()=>{const state=accept(await request("login",{account,password}));setPassword("");setAuth(state);setMessage(state.needsPasswordChange?"首次登录：请先修改测试密码。":"合成会话已建立。");if(!state.needsPasswordChange){const wallet=await request("points",undefined,state);setBalance(typeof wallet.balance==="number"?wallet.balance:null);}})}}><label className="paper-label" htmlFor="lab-account">合成账号</label><select className="paper-input" id="lab-account" value={account} onChange={e=>setAccount(e.target.value)}><option value="b2-lab-a">b2-lab-a · 首次改密</option><option value="b2-lab-b">b2-lab-b · 普通会话</option></select><label className="paper-label" htmlFor="lab-password">本机测试密码</label><input className="paper-input" id="lab-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required maxLength={128}/><p className="paper-muted">测试程序单独生成口令。请勿输入真实公会账号或密码。</p><button className="paper-button yellow" disabled={busy}>登录合成账号</button></form>}
   </section>
   <section className="sl-panel" aria-labelledby="points-title"><h2 id="points-title">服务器规则与草稿</h2><p>测试余额：<strong data-lab-balance>{balance===null?"—":balance}</strong></p><p>合成签到奖励10分；测试商品7分。数值由服务器规则表读取。</p><div className="sl-actions"><button className="paper-button yellow" disabled={busy||!auth||auth.needsPasswordChange} onClick={()=>void perform(async()=>{const r=await request("claim-checkin",{});setBalance(r.balance);setMessage(r.alreadyProcessed?"今天已领取，不重复记账。":"合成签到已按服务器规则记账。");})}>领取合成签到</button><button className="paper-button" disabled={busy||!auth||auth.needsPasswordChange} onClick={()=>void perform(async()=>{const requestId=pendingRedemption.current||(pendingRedemption.current=crypto.randomUUID());const r=await request("redeem",{itemCode:"lab-paper-token",requestId});pendingRedemption.current=null;setBalance(r.balance);setMessage("测试兑换已完成。");})}>兑换测试纸片</button></div>
    <label className="paper-label" htmlFor="lab-draft">本机草稿</label><textarea id="lab-draft" className="paper-input" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={2000} rows={6}/><small>只在本机保存这段草稿，退出或会话过期时保留。Cookie、密码与CSRF不写入本机草稿存储。</small>
   </section>
  </div>
  <footer className="paper-notice">正式头像、在线人数和成员名单仍未启用。现有首页及在线“—”占位保持。</footer>
 </main>;
}
