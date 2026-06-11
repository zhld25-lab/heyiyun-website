/* ============================================================
   证书预警 —— 资质证书到期报警台账
   按到期日自动计算剩余天数与预警等级：已过期/紧急(≤30天)/预警(≤90天)/正常
   ============================================================ */
import { Store } from "../store.js";
import { $, $$, table, modal, confirmBox, toast, options, esc } from "../ui.js";

const CATS = ["公司资质","个人执业","特种作业","体系认证","其他"];
const WARN_DAYS = 90, URGENT_DAYS = 30;

function today0(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
export function daysLeft(expiry){
    if(!expiry) return null;
    const e=new Date(expiry+"T00:00:00"); if(isNaN(e.getTime())) return null;
    return Math.round((e - today0())/86400000);
}
export function levelOf(cert){
    const d=daysLeft(cert.expiry);
    if(d===null) return { key:"none", label:"未设到期", cls:"bg-gray", days:null };
    if(d<0)            return { key:"expired", label:"已过期", cls:"bg-red",    days:d };
    if(d<=URGENT_DAYS) return { key:"urgent",  label:"紧急",   cls:"bg-red",    days:d };
    if(d<=WARN_DAYS)   return { key:"warn",    label:"预警",   cls:"bg-orange", days:d };
    return { key:"ok", label:"正常", cls:"bg-green", days:d };
}
/** 全局统计（供顶部铃铛报警调用） */
export function certStats(){
    const list = Store.all("certs").map(c=>({ ...c, lv:levelOf(c) }));
    list.sort((a,b)=>(a.lv.days==null?1e9:a.lv.days)-(b.lv.days==null?1e9:b.lv.days));
    return {
        list,
        total: list.length,
        expired: list.filter(c=>c.lv.key==="expired").length,
        urgent:  list.filter(c=>c.lv.key==="urgent").length,
        warn:    list.filter(c=>c.lv.key==="warn").length,
        alarm:   list.filter(c=>c.lv.key==="expired"||c.lv.key==="urgent").length,
    };
}
/** 剩余天数的着色文案 */
export function daysHtml(lv){
    if(lv.days==null) return '<span class="muted">—</span>';
    if(lv.key==="expired") return `<span style="color:#dc2626;font-weight:700">已过期 ${Math.abs(lv.days)} 天</span>`;
    const color = lv.key==="urgent"?"#dc2626":lv.key==="warn"?"#e8890c":"#16a34a";
    return `<span style="color:${color};font-weight:600">剩 ${lv.days} 天</span>`;
}

export default function certalarm(leaf){
    const state = { cat:"", lvl:"" };

    const html = `
    <div class="page-head"><div><h1>证书预警</h1><p>行政 · 资质证书到期报警台账</p></div>
        <div class="actions">
            <button class="btn btn-light" id="certExp"><span class="ic">⬇</span>导出</button>
            <button class="btn btn-primary" id="addCert"><span class="ic">＋</span>登记证书</button></div></div>
    <div class="kpi-grid" id="certKpi"></div>
    <div class="toolbar">
        <select class="select" id="fCat"><option value="">全部类别</option>${options(CATS,"")}</select>
        <select class="select" id="fLvl"><option value="">全部状态</option>${options(["已过期","紧急","预警","正常"],"")}</select>
        <div class="grow"></div>
        <div id="certSum" style="font-size:13px;color:#5b6478"></div>
    </div>
    <div id="certTbl"></div>`;

    function rows(){
        const s=certStats();
        return s.list.filter(c=>{
            if(state.cat && c.category!==state.cat) return false;
            if(state.lvl && c.lv.label!==state.lvl) return false;
            return true;
        });
    }

    function renderKpi(){
        const s=certStats();
        $("#certKpi").innerHTML = `
        <div class="kpi b-blue"><div class="kpi-top"><div class="kpi-ic">📜</div><div class="kpi-label">证书总数</div></div><div class="kpi-val">${s.total}<span class="u"> 张</span></div></div>
        <div class="kpi b-red link" data-lvl="已过期"><div class="kpi-top"><div class="kpi-ic">⛔</div><div class="kpi-label">已过期</div></div><div class="kpi-val" style="color:#dc2626">${s.expired}<span class="u"> 张</span></div></div>
        <div class="kpi b-orange link" data-lvl="紧急"><div class="kpi-top"><div class="kpi-ic">⏰</div><div class="kpi-label">30天内到期</div></div><div class="kpi-val" style="color:#e8890c">${s.urgent}<span class="u"> 张</span></div></div>
        <div class="kpi b-purple link" data-lvl="预警"><div class="kpi-top"><div class="kpi-ic">🔔</div><div class="kpi-label">90天内预警</div></div><div class="kpi-val">${s.warn}<span class="u"> 张</span></div></div>`;
        $$("#certKpi .kpi.link").forEach(k=>k.onclick=()=>{ state.lvl=k.dataset.lvl; const sel=$("#fLvl"); if(sel) sel.value=state.lvl; render(); });
    }

    function render(){
        renderKpi();
        const data=rows();
        const cols=[
            {title:"证书名称",render:c=>`<div class="strong">${esc(c.name)}</div><div class="muted" style="font-size:12px">${esc(c.certNo||"")}</div>`},
            {title:"类别",align:"center",render:c=>`<span class="badge bg-blue">${esc(c.category||"")}</span>`},
            {title:"持证单位/人",render:c=>esc(c.holder||"")},
            {title:"发证机关",render:c=>esc(c.issuer||"—")},
            {title:"到期日",align:"center",render:c=>esc(c.expiry||"—")},
            {title:"剩余",align:"center",render:c=>daysHtml(c.lv)},
            {title:"预警",align:"center",render:c=>`<span class="badge ${c.lv.cls}">${c.lv.label}</span>`},
            {title:"操作",align:"center",render:c=>`<div class="row-act">
                <button data-act="edit" data-id="${c.id}">编辑</button>
                <button data-act="del" data-id="${c.id}">删除</button></div>`},
        ];
        $("#certTbl").innerHTML=table(cols, data);
        const s=certStats();
        $("#certSum").innerHTML = `共 <b>${data.length}</b> 张 · 其中 <b style="color:#dc2626">${s.expired}</b> 已过期、<b style="color:#e8890c">${s.urgent}</b> 紧急、<b style="color:#7c3aed">${s.warn}</b> 预警`;
        $$('#certTbl [data-act="edit"]').forEach(b=>b.onclick=()=>certForm(b.dataset.id));
        $$('#certTbl [data-act="del"]').forEach(b=>b.onclick=()=>{ const c=Store.get("certs",b.dataset.id);
            confirmBox(`确认删除证书「${c.name}」？`,()=>{ Store.remove("certs",c.id); toast("已删除"); render(); }); });
    }

    function certForm(id){
        const c=id?Store.get("certs",id):{category:"公司资质"};
        const body=`<div class="form-grid">
            <div class="field full"><label>证书名称 <span class="req">*</span></label><input class="input" data-k="name" value="${esc(c.name||"")}"></div>
            <div class="field"><label>类别</label><select class="select" data-k="category">${options(CATS,c.category||"公司资质")}</select></div>
            <div class="field"><label>持证单位/人 <span class="req">*</span></label><input class="input" data-k="holder" value="${esc(c.holder||"")}"></div>
            <div class="field"><label>证书编号</label><input class="input" data-k="certNo" value="${esc(c.certNo||"")}"></div>
            <div class="field"><label>发证机关</label><input class="input" data-k="issuer" value="${esc(c.issuer||"")}"></div>
            <div class="field"><label>发证日期</label><input class="input" type="date" data-k="issueDate" value="${esc(c.issueDate||"")}"></div>
            <div class="field"><label>到期日期 <span class="req">*</span></label><input class="input" type="date" data-k="expiry" value="${esc(c.expiry||"")}"></div>
            <div class="field full"><label>备注</label><input class="input" data-k="remark" value="${esc(c.remark||"")}"></div>
        </div>`;
        modal({ title:id?"编辑证书":"登记证书", large:true, body,
            footer:`<button class="btn btn-light" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>`,
            onMount:(el,close)=>{ el.querySelector("[data-save]").onclick=()=>{
                const g=k=>{ const n=el.querySelector(`[data-k="${k}"]`); return n?n.value.trim():""; };
                const data={ name:g("name"),category:g("category"),holder:g("holder"),certNo:g("certNo"),issuer:g("issuer"),issueDate:g("issueDate"),expiry:g("expiry"),remark:g("remark") };
                if(!data.name||!data.holder||!data.expiry){ toast("请填写证书名称、持证人、到期日期","err"); return; }
                if(id){ Store.update("certs",id,data); toast("已更新"); } else { Store.add("certs",data); toast("已登记"); }
                close(); render();
            }; }
        });
    }

    function mount(){
        $("#addCert").onclick=()=>certForm();
        $("#certExp").onclick=()=>toast("演示：证书台账可导出 Excel","ok");
        $("#fCat").onchange=e=>{ state.cat=e.target.value; render(); };
        $("#fLvl").onchange=e=>{ state.lvl=e.target.value; render(); };
        render();
    }

    return { html, mount };
}
