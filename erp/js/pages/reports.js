/* 决策报表 — 动态盈亏分析 + 导出 */
import { Store, Calc, fmt } from "../store.js";
import { $, table, toast, esc } from "../ui.js";
import { barChart, donutChart, legendHTML, PALETTE } from "../charts.js";

export default function reports(){
    const projects = Store.all("projects");

    const totalContract = projects.reduce((a,p)=>a+p.contractAmount,0);
    const totalCost = projects.reduce((a,p)=>a+p.actualCost,0);
    const totalProfit = totalContract-totalCost;
    const totalRecv = projects.reduce((a,p)=>a+p.received,0);

    const byType = ["输变电","电缆敷设","电力运维","EPC总包"].map((t,i)=>({
        label:t, value:projects.filter(p=>p.type===t).reduce((a,p)=>a+p.contractAmount,0), color:PALETTE[i]
    })).filter(d=>d.value>0);

    const html = `
    <div class="page-head">
        <div><h1>决策报表</h1><p>动态盈亏分析 · 项目经营全景</p></div>
        <div class="actions"><button class="btn btn-light" id="exportBtn"><span class="ic">⬇</span>导出 Excel</button></div>
    </div>

    <div class="kpi-grid">
        <div class="kpi b-blue"><div class="kpi-top"><div class="kpi-ic">💴</div><div class="kpi-label">合同总额</div></div><div class="kpi-val">${fmt.money(totalContract)}</div></div>
        <div class="kpi b-orange"><div class="kpi-top"><div class="kpi-ic">💸</div><div class="kpi-label">成本总额</div></div><div class="kpi-val">${fmt.money(totalCost)}</div></div>
        <div class="kpi b-green"><div class="kpi-top"><div class="kpi-ic">📈</div><div class="kpi-label">综合毛利</div></div><div class="kpi-val">${fmt.money(totalProfit)}</div></div>
        <div class="kpi b-purple"><div class="kpi-top"><div class="kpi-ic">💰</div><div class="kpi-label">累计回款</div></div><div class="kpi-val">${fmt.money(totalRecv)}</div></div>
    </div>

    <div class="grid-2 mb">
        <div class="card"><div class="card-head"><h3>各项目合同额 vs 成本</h3><span class="sub">单位：万元</span></div>
            <div class="card-body"><div id="cmpChart"></div>${legendHTML([{label:"合同额",color:"#1b5fe3"},{label:"实际成本",color:"#e8890c"}])}</div></div>
        <div class="card"><div class="card-head"><h3>合同额按业务类型</h3><span class="sub">占比</span></div>
            <div class="card-body"><div id="typeDonut"></div>${legendHTML(byType)}</div></div>
    </div>

    <div class="card">
        <div class="card-head"><h3>项目动态盈亏明细表</h3><span class="sub">共 ${projects.length} 个项目</span></div>
        <div class="card-body" style="padding-top:6px"><div id="tbl"></div></div>
    </div>`;

    function mount(){
        barChart($("#cmpChart"),{
            labels:projects.map(p=>p.name.slice(0,5)),
            series:[
                {data:projects.map(p=>p.contractAmount),color:"#1b5fe3"},
                {data:projects.map(p=>p.actualCost),color:"#e8890c"},
            ], height:280
        });
        donutChart($("#typeDonut"),{ data:byType, height:260,
            centerValue:byType.length, centerLabel:"业务类型" });

        $("#tbl").innerHTML = table([
            {title:"项目编号",key:"id",render:r=>`<span class="strong">${r.id}</span>`},
            {title:"项目名称",key:"name",render:r=>esc(r.name)},
            {title:"合同额(万)",align:"right",render:r=>`<span class="num">${fmt.num(r.contractAmount)}</span>`},
            {title:"实际成本(万)",align:"right",render:r=>`<span class="num">${fmt.num(r.actualCost)}</span>`},
            {title:"项目毛利(万)",align:"right",render:r=>{const g=Calc.grossProfit(r);return `<span class="num strong" style="color:${g>=0?'#16a34a':'#dc2626'}">${fmt.num(g)}</span>`;}},
            {title:"毛利率",align:"right",render:r=>`<span class="num">${fmt.pct(Calc.profitRate(r))}</span>`},
            {title:"已收款(万)",align:"right",render:r=>`<span class="num">${fmt.num(r.received)}</span>`},
            {title:"应收款(万)",align:"right",render:r=>`<span class="num" style="color:#e8890c">${fmt.num(Calc.receivable(r))}</span>`},
            {title:"回款率",align:"right",render:r=>`<span class="num">${fmt.pct(Calc.collectionRate(r))}</span>`},
        ], projects);

        $("#exportBtn").onclick=exportExcel;
    }

    function exportExcel(){
        const headers=["项目编号","项目名称","业务类型","合同额(万)","实际成本(万)","项目毛利(万)","毛利率%","已收款(万)","应收款(万)","回款率%","状态"];
        const rows=projects.map(p=>[p.id,p.name,p.type,p.contractAmount,p.actualCost,Calc.grossProfit(p),
            Calc.profitRate(p).toFixed(1),p.received,Calc.receivable(p),Calc.collectionRate(p).toFixed(1),p.status]);
        rows.push(["合计","","",totalContract,totalCost,totalProfit,(totalProfit/totalContract*100).toFixed(1),totalRecv,totalContract-totalRecv,(totalRecv/totalContract*100).toFixed(1),""]);
        const csv=[headers,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
        const blob=new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"});
        const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
        a.download="项目动态盈亏报表.csv"; a.click(); URL.revokeObjectURL(a.href);
        toast("报表已导出，可用 Excel 打开");
    }

    return { html, mount };
}
