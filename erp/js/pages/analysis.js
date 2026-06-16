/* ============================================================
   经营分析（真实数据）—— 来自老ERP的 64 个真实项目
   三算对比：目标成本 / 预算成本 / 实际成本(已发生)
   动态利润 = 已完产值(结算/产值) − 实际成本 − 税金及费用
   累计收付：合同额 / 完工结算 / 已收 / 应收 / 开票
   ============================================================ */
import { REAL } from "../realdata.js";
import { $, $$, table, modal, toast, options, esc } from "../ui.js";

const wan = v => "¥"+(((+v||0)/10000)).toLocaleString("zh-CN",{maximumFractionDigits:1})+"万";
const pct = v => (+v||0).toFixed(1)+"%";
const profitColor = v => (+v||0)>=0 ? "#16a34a" : "#dc2626";

export default function analysis(){
    const state={ q:"", status:"" };
    const all = REAL.projects.slice();
    const areas=[...new Set(all.map(p=>p.area).filter(Boolean))];

    const html = `
    <div class="page-head"><div><h1>经营分析</h1><p>决策 · 项目三算对比与动态利润（真实数据 · ${all.length} 个项目）</p></div>
        <div class="actions"><button class="btn btn-light" id="anaExp"><span class="ic">⬇</span>导出</button></div></div>
    <div class="okr-tip" style="margin-bottom:14px">📐 <b>动态利润 = 已完产值（甲方清单完成量）− 实际成本（分包清单完成量）− 税金及费用</b>；三算对比 = 目标成本 / 预算成本 / 实际成本（已发生）。数据来自老系统真实项目台账。</div>
    <div class="kpi-grid" id="anaKpi"></div>
    <div class="toolbar">
        <div class="search-box"><span class="ic">🔍</span><input id="anaQ" placeholder="搜索项目名称/编号…"></div>
        <select class="select" id="anaSt"><option value="">全部状态</option>${options(["进行中","筹备","已完工"],"")}</select>
        <div class="grow"></div><div id="anaSum" style="font-size:13px;color:#5b6478"></div>
    </div>
    <div id="anaTbl"></div>`;

    function listRows(){
        return all.filter(p=>{
            if(state.status && p.status!==state.status) return false;
            if(state.q){ return (p.name+p.code).includes(state.q); }
            return true;
        });
    }
    function renderKpi(){
        const d=listRows();
        const sum=k=>d.reduce((a,p)=>a+(+p[k]||0),0);
        $("#anaKpi").innerHTML=`
        <div class="kpi b-blue"><div class="kpi-top"><div class="kpi-ic">🏗️</div><div class="kpi-label">项目数</div></div><div class="kpi-val">${d.length}<span class="u"> 个</span></div></div>
        <div class="kpi b-green"><div class="kpi-top"><div class="kpi-ic">📄</div><div class="kpi-label">合同总额</div></div><div class="kpi-val" style="font-size:22px">${wan(sum("amount"))}</div></div>
        <div class="kpi b-orange"><div class="kpi-top"><div class="kpi-ic">🧱</div><div class="kpi-label">已完产值</div></div><div class="kpi-val" style="font-size:22px">${wan(sum("output"))}</div></div>
        <div class="kpi b-purple"><div class="kpi-top"><div class="kpi-ic">💰</div><div class="kpi-label">动态利润合计</div></div><div class="kpi-val" style="font-size:22px;color:${profitColor(sum("dynProfit"))}">${wan(sum("dynProfit"))}</div></div>`;
    }
    function render(){
        renderKpi();
        const d=listRows();
        const barCell=p=>{ const r=Math.min(+p.compRate||0,100); const c=r>=80?"#16a34a":r>=50?"#1b5fe3":r>=30?"#e8890c":"#dc2626";
            return `<div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:7px;background:#eef2f9;border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${r}%;background:${c}"></i></div><b style="font-size:12px">${pct(p.compRate)}</b></div>`; };
        const cols=[
            {title:"项目名称",render:p=>`<a class="cell-lnk" data-id="${p.id}"><b>${esc(p.name)}</b></a><div class="muted" style="font-size:12px">${esc(p.code||"")} · ${esc(p.manager||"—")} · ${esc(p.area||"")}</div>`},
            {title:"合同额",align:"right",render:p=>`<span class="num">${wan(p.amount)}</span>`},
            {title:"已完产值",align:"right",render:p=>`<span class="num">${wan(p.output)}</span>`},
            {title:"实际成本",align:"right",render:p=>`<span class="num">${wan(p.compBudget)}</span>`},
            {title:"成本完成率",render:barCell},
            {title:"动态利润",align:"right",render:p=>`<span class="num" style="color:${profitColor(p.dynProfit)};font-weight:700">${wan(p.dynProfit)}</span>`},
            {title:"已收/应收",align:"right",render:p=>`<span class="num" style="color:#16a34a">${wan(p.recv)}</span><div class="muted" style="font-size:12px">应收 ${wan(p.receivables)}</div>`},
        ];
        $("#anaTbl").innerHTML=table(cols, d);
        const sum=k=>d.reduce((a,p)=>a+(+p[k]||0),0);
        $("#anaSum").innerHTML=`共 <b>${d.length}</b> 个项目 · 动态利润合计 <b style="color:${profitColor(sum("dynProfit"))}">${wan(sum("dynProfit"))}</b>`;
        $$("#anaTbl .cell-lnk[data-id]").forEach(a=>a.onclick=()=>detail(a.dataset.id));
        $$("#anaTbl tbody tr").forEach(tr=>{ if(tr.dataset.id){ tr.style.cursor="pointer"; tr.onclick=()=>detail(tr.dataset.id); } });
    }
    function threeRow(label,val,base,color){
        const r=base?Math.min(Math.abs(val)/base*100,100):0;
        return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${label}</span><b class="num">${wan(val)}</b></div>
            <div style="height:8px;background:#eef2f9;border-radius:5px;overflow:hidden;margin-top:3px"><i style="display:block;height:100%;width:${r}%;background:${color}"></i></div></div>`;
    }
    function detail(id){
        const p=all.find(x=>x.id===id); if(!p) return;
        const base=Math.max(p.target,p.budget,p.compBudget,p.amount,1);
        const items=[
            ["项目编号",esc(p.code||"—")],["项目经理",esc(p.manager||"—")],["建设单位",esc(p.owner||"—")],
            ["所在地区",esc(p.area||"—")],["质量等级",esc(p.grade||"—")],["开工日期",esc(p.startdate||"—")],
            ["合同额",wan(p.amount)],["完工结算",wan(p.settlement)],["已完产值",wan(p.output)],
            ["已收款",wan(p.recv)],["应收款",wan(p.receivables)],["已开票",wan(p.invoice)],
        ];
        modal({ title:p.name, large:true,
            body:`<div class="detail-grid">${items.map(([l,v])=>`<div class="di"><span>${l}</span><b>${v}</b></div>`).join("")}</div>
                <div style="margin-top:18px"><div style="font-size:13px;font-weight:700;color:#0a1733;margin-bottom:10px">三算对比（目标 / 预算 / 实际）</div>
                    ${threeRow("目标成本",p.target,base,"#7c3aed")}
                    ${threeRow("预算成本",p.budget,base,"#1b5fe3")}
                    ${threeRow("实际成本（已发生）",p.compBudget,base,"#e8890c")}
                </div>
                <div class="okr-tip" style="margin-top:14px">已完产值 <b>${wan(p.output)}</b> − 实际成本 <b>${wan(p.compBudget)}</b> − 税金及费用 <b>${wan(p.tax)}</b> = 动态利润 <b style="color:${profitColor(p.dynProfit)}">${wan(p.dynProfit)}</b>（毛利率 ${p.output?pct(p.dynProfit/p.output*100):"—"}）</div>`,
            footer:`<button class="btn btn-light" data-close>关闭</button>` });
    }
    function mount(){
        $("#anaQ").oninput=e=>{state.q=e.target.value;render();};
        $("#anaSt").onchange=e=>{state.status=e.target.value;render();};
        $("#anaExp").onclick=()=>toast("演示：经营分析可导出 Excel","ok");
        render();
    }
    return { html, mount };
}
