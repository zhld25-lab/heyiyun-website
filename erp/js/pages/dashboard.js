/* 经营看板 / 仪表盘 —— 全要素可点击下钻 */
import { Store, Calc, fmt } from "../store.js";
import { $, $$, modal, table, badge, riskBadge, bar, esc } from "../ui.js";
import { lineChart, donutChart, legendHTML, PALETTE } from "../charts.js";
import { openProject360 } from "../project360.js";

/* 叶子菜单 key（用于"查看完整列表"跳转） */
const LEAF = { projects:"project_0_0", contracts:"project_1_0", cost:"project_3_1", income:"finance_0_0" };
const projName = id => { const p=Store.get("projects",id); return p?p.name:id; };

/* 跳转到模块列表（可带预设筛选） */
function go(leafKey, coll, filters){
    if(coll && filters) sessionStorage.setItem("erp_preset", JSON.stringify({coll, filters}));
    location.hash = leafKey;
}

/* 项目详情 → 项目360°视图 */
const projectDetail = openProject360;
function contractDetail(id){
    const c = Store.get("contracts",id); if(!c) return;
    modal({ title:c.name, body:`
        <div class="detail-grid">
            <div class="di"><span>合同编号</span><b>${c.id}</b></div>
            <div class="di"><span>所属项目</span><b>${esc(projName(c.project))}</b></div>
            <div class="di"><span>相对方</span><b>${esc(c.partyA)}</b></div>
            <div class="di"><span>合同类型</span><b>${badge(c.type)}</b></div>
            <div class="di"><span>合同金额</span><b>${fmt.money(c.amount)}</b></div>
            <div class="di"><span>已收款</span><b>${fmt.money(c.received)}</b></div>
            <div class="di"><span>审批状态</span><b>${badge(c.approval)}</b></div>
            <div class="di"><span>合同状态</span><b>${badge(c.status)}</b></div>
            <div class="di full"><span>回款进度</span>${bar(c.amount?c.received/c.amount*100:0)}</div>
        </div>`,
        footer:`<button class="btn btn-light" data-close>关闭</button><button class="btn btn-primary" data-go>查看承包合同 ›</button>`,
        onMount:(el,close)=>{ el.querySelector("[data-go]").onclick=()=>{close();go(LEAF.contracts);}; }
    });
}

/* 通用清单弹窗 */
function listModal(title, columns, rows, onRow, footerGo){
    const m = modal({ title, large:true,
        body: table(columns, rows),
        footer:`<button class="btn btn-light" data-close>关闭</button>${footerGo?`<button class="btn btn-primary" data-go>${footerGo.label}</button>`:""}`,
        onMount:(el,close)=>{
            $$(".tbl tbody tr", el).forEach(tr=>{ if(tr.dataset.id){ tr.style.cursor="pointer"; tr.onclick=()=>{ close(); onRow && onRow(tr.dataset.id); }; } });
            if(footerGo){ el.querySelector("[data-go]").onclick=()=>{close();footerGo.fn();}; }
        }
    });
    return m;
}

export default function dashboard(){
    const projects = Store.all("projects");
    const active = projects.filter(p=>p.status==="进行中");
    const totalContract = projects.reduce((a,p)=>a+p.contractAmount,0);
    const totalCost = projects.reduce((a,p)=>a+p.actualCost,0);
    const totalProfit = totalContract-totalCost;
    const totalReceived = projects.reduce((a,p)=>a+p.received,0);
    const collectRate = totalContract? totalReceived/totalContract*100 : 0;
    const profitRate = totalContract? totalProfit/totalContract*100 : 0;

    const cost = Store.all("cost");
    const SUBJECTS = ["人工","材料","机械","分包","间接费","其他"];
    const costByType = SUBJECTS.map((t,i)=>({label:t, value:cost.filter(c=>c.subject===t).reduce((a,c)=>a+c.amount,0), color:PALETTE[i]})).filter(d=>d.value>0);
    const ranked = projects.slice().sort((a,b)=>Calc.grossProfit(b)-Calc.grossProfit(a));

    const html = `
    <div class="kpi-grid">
        <div class="kpi b-blue link" data-kpi="active"><div class="kpi-top"><div class="kpi-ic">📁</div><div class="kpi-label">在建项目</div></div>
            <div class="kpi-val">${active.length}<span class="u"> / ${projects.length} 个</span></div><div class="kpi-trend up">▲ 点击查看在建明细 ›</div></div>
        <div class="kpi b-green link" data-kpi="contract"><div class="kpi-top"><div class="kpi-ic">💴</div><div class="kpi-label">合同总额</div></div>
            <div class="kpi-val">${fmt.money(totalContract)}</div><div class="kpi-trend up">▲ 点击查看合同清单 ›</div></div>
        <div class="kpi b-purple link" data-kpi="profit"><div class="kpi-top"><div class="kpi-ic">📈</div><div class="kpi-label">综合毛利</div></div>
            <div class="kpi-val">${fmt.money(totalProfit)}</div><div class="kpi-trend ${profitRate>=0?'up':'down'}">${profitRate>=0?'▲':'▼'} 毛利率 ${fmt.pct(profitRate)} ›</div></div>
        <div class="kpi b-orange link" data-kpi="recv"><div class="kpi-top"><div class="kpi-ic">💰</div><div class="kpi-label">累计回款</div></div>
            <div class="kpi-val">${fmt.money(totalReceived)}</div><div class="kpi-trend up">▲ 回款进度 ${fmt.pct(collectRate)} ›</div></div>
    </div>

    <div class="grid-2-1 mb">
        <div class="card"><div class="card-head"><h3>营收与成本趋势</h3><span class="sub">2026年 · 单位：万元</span></div>
            <div class="card-body"><div id="trendChart"></div>${legendHTML([{label:"合同收入",color:"#1b5fe3"},{label:"实际成本",color:"#e8890c"}])}</div></div>
        <div class="card"><div class="card-head"><h3>成本结构</h3><span class="sub">点击查看明细</span></div>
            <div class="card-body"><div id="costDonut"></div><div id="costLegend" class="legend"></div></div></div>
    </div>

    <div class="grid-2-1">
        <div class="card"><div class="card-head"><h3>项目盈亏排行</h3><a class="btn btn-ghost btn-sm" id="allProj">查看全部 ›</a></div>
            <div class="card-body" style="padding-top:8px"><div id="rankTbl"></div></div></div>
        <div class="card"><div class="card-head"><h3>待办与动态</h3><span class="sub">实时</span></div>
            <div class="card-body"><div class="feed" id="feed"></div></div></div>
    </div>`;

    function mount(){
        lineChart($("#trendChart"),{ labels:["1月","2月","3月","4月","5月","6月"],
            series:[{data:[3200,3850,4100,5200,6400,7200],color:"#1b5fe3"},{data:[2400,2900,3100,3950,4600,5100],color:"#e8890c"}], height:260, money:true });
        donutChart($("#costDonut"),{ data:costByType, height:220,
            centerValue:fmt.num(costByType.reduce((a,d)=>a+d.value,0)), centerLabel:"成本合计(万)" });

        // 成本结构可点击图例
        $("#costLegend").innerHTML = costByType.map(d=>`<span class="cl" data-s="${d.label}" style="cursor:pointer"><i style="background:${d.color}"></i>${d.label} <b style="color:${d.color}">${fmt.money(d.value)}</b></span>`).join("");
        $$("#costLegend .cl").forEach(s=>s.onclick=()=>showCost(s.dataset.s));

        // 盈亏排行表（行可点击）
        $("#rankTbl").innerHTML = table([
            {title:"项目",render:r=>`<span class="strong">${esc(r.name)}</span>`},
            {title:"合同额",align:"right",render:r=>`<span class="num">${fmt.money(r.contractAmount)}</span>`},
            {title:"毛利",align:"right",render:r=>{const g=Calc.grossProfit(r);return `<span class="num" style="color:${g>=0?'#16a34a':'#dc2626'}">${fmt.money(g)}</span>`;}},
            {title:"毛利率",align:"right",render:r=>`<span class="num">${fmt.pct(Calc.profitRate(r))}</span>`},
            {title:"风险",align:"center",render:r=>riskBadge(r.risk)},
        ], ranked.slice(0,6));
        $$("#rankTbl .tbl tbody tr").forEach(tr=>{ if(tr.dataset.id){ tr.style.cursor="pointer"; tr.onclick=()=>projectDetail(tr.dataset.id); } });

        // 待办动态（可点击）
        renderFeed();

        // KPI 卡片点击
        $$(".kpi.link").forEach(k=>k.onclick=()=>{
            const t=k.dataset.kpi;
            if(t==="active") showProjects(active, "在建项目明细", {label:"查看项目台账 ›", fn:()=>go(LEAF.projects,"projects",{status:"进行中"})});
            else if(t==="contract") showContracts();
            else if(t==="profit") showProjects(ranked, "项目毛利排行（全部）", {label:"查看项目台账 ›", fn:()=>go(LEAF.projects)});
            else if(t==="recv") showReceivables();
        });
        $("#allProj").onclick=()=>showProjects(ranked, "项目盈亏排行（全部）", {label:"查看项目台账 ›", fn:()=>go(LEAF.projects)});
    }

    function showProjects(list, title, footerGo){
        listModal(title, [
            {title:"项目名称",render:r=>`<div class="strong">${esc(r.name)}</div><div class="muted" style="font-size:12px">${r.type} · ${esc(r.manager)}</div>`},
            {title:"合同额",align:"right",render:r=>`<span class="num">${fmt.money(r.contractAmount)}</span>`},
            {title:"成本",align:"right",render:r=>`<span class="num">${fmt.money(r.actualCost)}</span>`},
            {title:"毛利",align:"right",render:r=>{const g=Calc.grossProfit(r);return `<span class="num" style="color:${g>=0?'#16a34a':'#dc2626'}">${fmt.money(g)}</span>`;}},
            {title:"回款",render:r=>bar(Calc.collectionRate(r))},
            {title:"状态",align:"center",render:r=>badge(r.status)},
        ], list, projectDetail, footerGo);
    }
    function showContracts(){
        listModal("合同清单", [
            {title:"合同编号",render:r=>`<span class="strong">${r.id}</span>`},
            {title:"合同名称",render:r=>`<div class="strong">${esc(r.name)}</div><div class="muted" style="font-size:12px">${esc(projName(r.project))}</div>`},
            {title:"相对方",render:r=>esc(r.partyA)},
            {title:"合同额",align:"right",render:r=>`<span class="num">${fmt.money(r.amount)}</span>`},
            {title:"回款",render:r=>bar(r.amount?r.received/r.amount*100:0)},
            {title:"状态",align:"center",render:r=>badge(r.status)},
        ], Store.all("contracts"), contractDetail, {label:"查看承包合同 ›", fn:()=>go(LEAF.contracts)});
    }
    function showReceivables(){
        const list = projects.filter(p=>Calc.receivable(p)>0).sort((a,b)=>Calc.receivable(b)-Calc.receivable(a));
        listModal("应收/回款明细", [
            {title:"项目名称",render:r=>`<span class="strong">${esc(r.name)}</span>`},
            {title:"合同额",align:"right",render:r=>`<span class="num">${fmt.money(r.contractAmount)}</span>`},
            {title:"已收款",align:"right",render:r=>`<span class="num" style="color:#16a34a">${fmt.money(r.received)}</span>`},
            {title:"应收款",align:"right",render:r=>`<span class="num" style="color:#e8890c">${fmt.money(Calc.receivable(r))}</span>`},
            {title:"回款进度",render:r=>bar(Calc.collectionRate(r))},
        ], list, projectDetail, {label:"查看合同收款 ›", fn:()=>go(LEAF.income)});
    }
    function showCost(subject){
        const list = cost.filter(c=>c.subject===subject);
        listModal(`成本明细 · ${subject}`, [
            {title:"项目",render:r=>`<span class="strong">${esc(projName(r.project))}</span>`},
            {title:"供应商/对象",render:r=>esc(r.party)},
            {title:"金额",align:"right",render:r=>`<span class="num" style="color:#dc2626">${fmt.money(r.amount)}</span>`},
            {title:"发生日期",align:"center",render:r=>r.date},
            {title:"付款状态",align:"center",render:r=>badge(r.status)},
        ], list, null, {label:"查看成本台账 ›", fn:()=>go(LEAF.cost)});
    }

    function renderFeed(){
        const items=[
            {ic:"🔴",bg:"#fdeaea",t:"500kV变电站扩建工程 风险升级",d:"严重风险 · 成本超支预警",tm:"10分钟前",act:()=>{const p=projects.find(x=>x.id==="P-2407");if(p)projectDetail(p.id);}},
            {ic:"📑",bg:"#e7efff",t:"配电EPC总承包合同 待审批",d:"金额 ¥12,600万 · 等待财务审批",tm:"1小时前",act:()=>{const c=Store.all("contracts").find(x=>x.id==="HT-006");if(c)contractDetail(c.id);else go(LEAF.contracts);}},
            {ic:"🛒",bg:"#fff3e3",t:"GIS组合电器采购 待财务同步",d:"平高电气 · ¥224万",tm:"3小时前",act:()=>go("material_1_7")},
            {ic:"📐",bg:"#e7f7ec",t:"城南电缆敷设二期 进度更新",d:"已完成 68% · 李志强填报",tm:"今天 09:24",act:()=>go("project_2_1")},
            {ic:"💴",bg:"#e7f7ec",t:"220kV输变电A标段 收到进度款",d:"第三期 ¥2,400万 已到账",tm:"昨天",act:()=>go(LEAF.income)},
        ];
        $("#feed").innerHTML = items.map((it,i)=>`<div class="feed-item" data-i="${i}" style="cursor:pointer">
            <div class="feed-dot" style="background:${it.bg}">${it.ic}</div>
            <div class="ct"><div class="t">${it.t}</div><div class="d">${it.d}</div></div><div class="tm">${it.tm}</div></div>`).join("");
        $$("#feed .feed-item").forEach(el=>el.onclick=()=>items[+el.dataset.i].act());
    }

    return { html, mount };
}
