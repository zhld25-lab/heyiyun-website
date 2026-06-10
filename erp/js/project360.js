/* ============================================================
   项目 360° 视图：点击项目 → 标签页查看其名下全部关联业务
   合同 / 分包 / 清单 / 进度 / 成本 / 收款 / 资金流水
   ============================================================ */
import { Store, Calc, fmt } from "./store.js";
import { $, $$, modal, table, badge, riskBadge, bar, esc } from "./ui.js";

const contractName = id => { const c=Store.get("contracts",id)||Store.get("subcontracts",id); return c?c.name:id; };

/* 各关联板块定义 */
function sections(p){
    const id = p.id;
    const F = coll => Store.all(coll).filter(r=>r.project===id);
    return [
        { key:"overview", label:"概览", icon:"📋" },
        { key:"contracts", label:"承包合同", icon:"📑", leaf:"project_1_0", coll:"contracts", data:F("contracts"),
          cols:[
            {title:"合同编号",render:r=>`<span class="strong">${r.id}</span>`},
            {title:"合同名称",render:r=>esc(r.name)},
            {title:"相对方",render:r=>esc(r.partyA)},
            {title:"合同额",align:"right",render:r=>`<span class="num">${fmt.money(r.amount)}</span>`},
            {title:"已收",align:"right",render:r=>`<span class="num">${fmt.money(r.received)}</span>`},
            {title:"状态",align:"center",render:r=>badge(r.status)},
          ]},
        { key:"sub", label:"分包合同", icon:"🤝", leaf:"sub_0_1", coll:"subcontracts", data:F("subcontracts"),
          cols:[
            {title:"合同编号",render:r=>`<span class="strong">${r.id}</span>`},
            {title:"分包内容",render:r=>esc(r.name)},
            {title:"分包商",render:r=>esc(r.partyA)},
            {title:"金额",align:"right",render:r=>`<span class="num">${fmt.money(r.amount)}</span>`},
            {title:"已付",align:"right",render:r=>`<span class="num">${fmt.money(r.received)}</span>`},
            {title:"状态",align:"center",render:r=>badge(r.status)},
          ]},
        { key:"boq", label:"工程量清单", icon:"📐", leaf:"project_0_2", coll:"boq", data:F("boq"),
          cols:[
            {title:"编码",render:r=>`<span class="strong">${esc(r.code)}</span>`},
            {title:"清单名称",render:r=>esc(r.name)},
            {title:"类别",align:"center",render:r=>`<span class="tag">${esc(r.category)}</span>`},
            {title:"单位",align:"center",render:r=>esc(r.unit)},
            {title:"控制量",align:"right",render:r=>fmt.num(r.ctrlQty)},
            {title:"实际量",align:"right",render:r=>`<span style="color:#0d9488">${fmt.num(r.actualQty)}</span>`},
            {title:"甲方单价",align:"right",render:r=>"¥"+r.partyAPrice+"万"},
          ]},
        { key:"progress", label:"施工进度", icon:"📈", leaf:"project_2_1", coll:"progress", data:F("progress"),
          cols:[
            {title:"填报日期",render:r=>r.date},
            {title:"分部分项",render:r=>esc(r.wbs)},
            {title:"填报人",render:r=>esc(r.reporter)},
            {title:"完成进度",render:r=>bar(+r.percent||0)},
            {title:"状态",align:"center",render:r=>badge(r.status)},
          ]},
        { key:"cost", label:"成本台账", icon:"💸", leaf:"project_3_1", coll:"cost", data:F("cost"),
          cols:[
            {title:"成本科目",align:"center",render:r=>`<span class="tag">${esc(r.subject)}</span>`},
            {title:"供应商/对象",render:r=>esc(r.party)},
            {title:"金额",align:"right",render:r=>`<span class="num" style="color:#dc2626">${fmt.money(r.amount)}</span>`},
            {title:"发生日期",render:r=>r.date},
            {title:"付款状态",align:"center",render:r=>badge(r.status)},
          ]},
        { key:"income", label:"合同收款", icon:"💴", leaf:"finance_0_0", coll:"fin_income", data:F("fin_income"),
          cols:[
            {title:"关联合同",render:r=>esc(contractName(r.contract))},
            {title:"付款单位",render:r=>esc(r.party)},
            {title:"收款金额",align:"right",render:r=>`<span class="num" style="color:#16a34a">${fmt.money(r.amount)}</span>`},
            {title:"收款日期",render:r=>r.date},
            {title:"到账状态",align:"center",render:r=>badge(r.status)},
          ]},
        { key:"cash", label:"资金流水", icon:"🔄", coll:"fin_cash", data:F("fin_cash"),
          cols:[
            {title:"方向",align:"center",render:r=>badge(r.direction)},
            {title:"摘要",render:r=>esc(r.summary)},
            {title:"账户",render:r=>esc(r.account)},
            {title:"金额",align:"right",render:r=>`<span class="num" style="color:${r.direction==='收入'?'#16a34a':'#dc2626'}">${r.direction==='收入'?'+':'-'}${fmt.money(r.amount)}</span>`},
            {title:"日期",render:r=>r.date},
          ]},
    ];
}

export function openProject360(id){
    const p = Store.get("projects",id);
    if(!p){ return; }
    const secs = sections(p);
    const g = Calc.grossProfit(p);

    function overviewHTML(){
        const chips = secs.filter(s=>s.key!=="overview").map(s=>
            `<button class="p360-chip" data-tab="${s.key}">${s.icon} ${s.label} <b>${s.data.length}</b></button>`).join("");
        return `<div class="detail-grid" style="margin-bottom:14px">
            <div class="di"><span>项目编号</span><b>${p.id}</b></div>
            <div class="di"><span>项目类型</span><b>${esc(p.type||"—")}</b></div>
            <div class="di"><span>项目负责人</span><b>${esc(p.manager||"—")}</b></div>
            <div class="di"><span>当前状态</span><b>${badge(p.status)}</b></div>
            <div class="di"><span>项目毛利</span><b style="color:${g>=0?'#16a34a':'#dc2626'}">${fmt.money(g)}（${fmt.pct(Calc.profitRate(p))}）</b></div>
            <div class="di"><span>风险等级</span><b>${riskBadge(p.risk)}</b></div>
            <div class="di full"><span>回款进度</span>${bar(Calc.collectionRate(p))}</div>
        </div>
        <div class="p360-chips">${chips}</div>`;
    }
    function sectionHTML(key){
        if(key==="overview") return overviewHTML();
        const s = secs.find(x=>x.key===key);
        const navBtn = s.leaf ? `<div style="text-align:right;margin-top:12px"><button class="btn btn-light btn-sm" data-nav="${s.leaf}" data-coll="${s.coll}">在台账中查看全部 ›</button></div>` : "";
        if(!s.data.length) return `<div class="empty"><div class="ic">📭</div>本项目暂无${s.label}记录</div>${navBtn}`;
        return table(s.cols, s.data) + navBtn;
    }

    const kpis = `<div class="p360-kpis">
        <div><span>合同金额</span><b>${fmt.money(p.contractAmount)}</b></div>
        <div><span>实际成本</span><b>${fmt.money(p.actualCost)}</b></div>
        <div><span>项目毛利</span><b style="color:${g>=0?'#16a34a':'#dc2626'}">${fmt.money(g)}</b></div>
        <div><span>已收款</span><b>${fmt.money(p.received)}</b></div>
    </div>`;
    const tabs = `<div class="view-tabs p360-tabs">${secs.map((s,i)=>
        `<button data-tab="${s.key}" class="${i===0?'on':''}">${s.icon} ${s.label}</button>`).join("")}</div>`;

    modal({ title:`${p.name} · 项目360°视图`, large:true,
        body:`${kpis}${tabs}<div id="p360body">${overviewHTML()}</div>`,
        footer:`<button class="btn btn-light" data-close>关闭</button>`,
        onMount:(el,close)=>{
            const body = el.querySelector("#p360body");
            function showTab(key){
                el.querySelectorAll(".p360-tabs button").forEach(b=>b.classList.toggle("on", b.dataset.tab===key));
                body.innerHTML = sectionHTML(key);
                // 概览里的统计 chip → 切换标签
                body.querySelectorAll(".p360-chip").forEach(c=>c.onclick=()=>showTab(c.dataset.tab));
                // 跳转到对应台账（带项目筛选）
                const nav = body.querySelector("[data-nav]");
                if(nav) nav.onclick=()=>{ sessionStorage.setItem("erp_preset", JSON.stringify({coll:nav.dataset.coll, filters:{project:id}})); close(); location.hash=nav.dataset.nav; };
            }
            el.querySelectorAll(".p360-tabs button").forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
            // 初始化概览交互
            showTab("overview");
        }
    });
}
