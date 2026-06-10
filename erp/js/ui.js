/* ============================================================
   UI 组件库：Toast / 弹窗 / 徽章 / 分页 / 表格 / 工具
   ============================================================ */

export const $ = (sel,root=document)=>root.querySelector(sel);
export const $$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
export const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------- Toast ---------- */
let toastWrap;
export function toast(msg, type="ok"){
    if(!toastWrap){ toastWrap=document.createElement("div"); toastWrap.className="toast-wrap"; document.body.appendChild(toastWrap); }
    const icon = type==="ok"?"✔":type==="err"?"✕":"ℹ";
    const t=document.createElement("div"); t.className=`toast ${type}`;
    t.innerHTML=`<span class="ic">${icon}</span><span>${esc(msg)}</span>`;
    toastWrap.appendChild(t);
    requestAnimationFrame(()=>t.classList.add("show"));
    setTimeout(()=>{ t.classList.remove("show"); setTimeout(()=>t.remove(),300); }, 2600);
}

/* ---------- 弹窗 ---------- */
export function modal({title, body, footer, large=false, onMount}){
    const mask=document.createElement("div"); mask.className="modal-mask";
    mask.innerHTML=`<div class="modal ${large?"lg":""}">
        <div class="modal-head"><h3>${esc(title)}</h3><button class="x" data-close>×</button></div>
        <div class="modal-body">${body}</div>
        ${footer?`<div class="modal-foot">${footer}</div>`:""}
    </div>`;
    document.body.appendChild(mask);
    requestAnimationFrame(()=>mask.classList.add("show"));
    const close=()=>{ mask.classList.remove("show"); setTimeout(()=>mask.remove(),220); };
    mask.addEventListener("click",e=>{ if(e.target===mask||e.target.hasAttribute("data-close")) close(); });
    if(onMount) onMount(mask, close);
    return {el:mask, close};
}

export function confirmBox(message, onYes){
    modal({
        title:"确认操作", body:`<p style="font-size:14.5px;color:#5b6478">${esc(message)}</p>`,
        footer:`<button class="btn btn-light" data-close>取消</button><button class="btn btn-danger" data-yes>确认删除</button>`,
        onMount:(el,close)=>{ el.querySelector("[data-yes]").onclick=()=>{ onYes(); close(); }; }
    });
}

/* ---------- 徽章映射 ---------- */
const BADGE = {
    "进行中":"bg-blue","已完工":"bg-green","筹备":"bg-gray","暂停":"bg-orange","已完成":"bg-green",
    "正常":"bg-blue","延期":"bg-orange","受阻":"bg-red",
    "履约中":"bg-blue","执行中":"bg-blue","已签订":"bg-teal","草稿":"bg-gray","已作废":"bg-gray","已关闭":"bg-gray","未开始":"bg-gray",
    "已批准":"bg-green","审批中":"bg-orange","待审批":"bg-orange","已驳回":"bg-red","已提交":"bg-teal","已归档":"bg-teal",
    "已到货":"bg-green","已下单":"bg-blue",
    "已同步":"bg-green","待同步":"bg-orange","未同步":"bg-gray",
    "已付款":"bg-green","部分付款":"bg-orange","未付款":"bg-red","待付款":"bg-orange",
    "已到账":"bg-green","待到账":"bg-orange",
    "已入库":"bg-green","待入库":"bg-orange","已出库":"bg-blue","待出库":"bg-orange","已调拨":"bg-green","待调拨":"bg-orange",
    "待开票":"bg-orange","已开票":"bg-blue","已认证":"bg-green",
    "待确认":"bg-orange","已确认":"bg-green","已支付":"bg-green",
    "待结算":"bg-orange","结算中":"bg-blue","已结算":"bg-green",
    "已缴纳":"bg-blue","已退还":"bg-green","已没收":"bg-red",
    "待还":"bg-orange","部分归还":"bg-orange","已结清":"bg-green",
    "待执行":"bg-gray","待处理":"bg-orange","处理中":"bg-blue",
    "在职":"bg-green","离场":"bg-gray","黑名单":"bg-red","合作中":"bg-green","启用":"bg-green","停用":"bg-gray",
    "迟到":"bg-orange","早退":"bg-orange","缺勤":"bg-red","请假":"bg-purple",
    "盘点中":"bg-orange","待审":"bg-orange","已生效":"bg-green",
    "收入":"bg-green","支出":"bg-red","甲方":"bg-blue","分包":"bg-purple",
    "甲方合同":"bg-blue","分包合同":"bg-purple","采购合同":"bg-teal","租赁合同":"bg-orange",
    "low":"bg-green","mid":"bg-blue","high":"bg-orange","critical":"bg-red",
};
const RISK_TEXT={low:"低风险",mid:"中风险",high:"高风险",critical:"严重"};
export function badge(text){ return `<span class="badge ${BADGE[text]||"bg-gray"}">${esc(text)}</span>`; }
export function riskBadge(r){ return `<span class="badge ${BADGE[r]||"bg-gray"}">${RISK_TEXT[r]||r}</span>`; }

/* ---------- 进度条 ---------- */
export function bar(pct,cls){
    const c = cls || (pct>=80?"g":pct>=50?"":pct>=30?"o":"r");
    return `<div class="bar-wrap"><div class="bar ${c}"><i style="width:${Math.min(pct,100)}%"></i></div><b>${pct.toFixed(0)}%</b></div>`;
}

/* ---------- 表格构建 ---------- */
export function table(columns, rows){
    const head = columns.map(c=>`<th class="${c.align==='right'?'right':c.align==='center'?'center':''}">${esc(c.title)}</th>`).join("");
    const body = rows.length ? rows.map(r=>{
        const tds = columns.map(c=>{
            const cls = c.align==='right'?'right':c.align==='center'?'center':'';
            const val = c.render ? c.render(r) : esc(r[c.key]);
            return `<td class="${cls} ${c.cls||''}">${val}</td>`;
        }).join("");
        return `<tr data-id="${esc(r.id)}">${tds}</tr>`;
    }).join("") : `<tr><td colspan="${columns.length}"><div class="empty"><div class="ic">📭</div>暂无数据</div></td></tr>`;
    return `<div class="table-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/* ---------- 分页器 ---------- */
export function paginate(arr, page, size){
    const total=arr.length, pages=Math.max(1,Math.ceil(total/size));
    page=Math.min(page,pages);
    return {items:arr.slice((page-1)*size,page*size), total, pages, page};
}
export function pagerHTML(page, pages, total){
    let btns="";
    for(let i=1;i<=pages;i++){ if(pages>7 && i>2 && i<pages-1 && Math.abs(i-page)>1){ if(i===3||i===pages-2) btns+=`<button disabled>…</button>`; continue; }
        btns+=`<button class="${i===page?'on':''}" data-pg="${i}">${i}</button>`; }
    return `<div class="pager"><span>共 ${total} 条记录</span><div class="pages">
        <button data-pg="${page-1}" ${page<=1?'disabled':''}>‹</button>${btns}
        <button data-pg="${page+1}" ${page>=pages?'disabled':''}>›</button></div></div>`;
}

/* ---------- 选择项 ---------- */
export function options(list, selected){
    return list.map(o=>{ const v=typeof o==="object"?o.value:o, l=typeof o==="object"?o.label:o;
        return `<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(l)}</option>`; }).join("");
}
