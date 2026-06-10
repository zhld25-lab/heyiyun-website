/* 经营看板 / 仪表盘 */
import { Store, Calc, fmt } from "../store.js";
import { badge, riskBadge, bar } from "../ui.js";
import { lineChart, barChart, donutChart, legendHTML, PALETTE } from "../charts.js";

export default function dashboard(){
    const projects = Store.all("projects");
    const active = projects.filter(p=>p.status==="进行中");
    const totalContract = projects.reduce((a,p)=>a+p.contractAmount,0);
    const totalCost = projects.reduce((a,p)=>a+p.actualCost,0);
    const totalProfit = totalContract - totalCost;
    const totalReceived = projects.reduce((a,p)=>a+p.received,0);
    const collectRate = totalContract? totalReceived/totalContract*100 : 0;
    const profitRate = totalContract? totalProfit/totalContract*100 : 0;

    const cost = Store.all("cost");
    const costByType = ["人工","材料","机械","分包","间接费","其他"].map((t,i)=>({
        label:t, value:cost.filter(c=>c.subject===t).reduce((a,c)=>a+c.amount,0), color:PALETTE[i]
    })).filter(d=>d.value>0);

    // 项目盈亏排行（前6）
    const ranked = projects.slice().sort((a,b)=>Calc.grossProfit(b)-Calc.grossProfit(a)).slice(0,6);

    const html = `
    <div class="kpi-grid">
        <div class="kpi b-blue">
            <div class="kpi-top"><div class="kpi-ic">📁</div><div><div class="kpi-label">在建项目</div></div></div>
            <div class="kpi-val">${active.length}<span class="u"> / ${projects.length} 个</span></div>
            <div class="kpi-trend up">▲ 本季新增 2 个项目</div>
        </div>
        <div class="kpi b-green">
            <div class="kpi-top"><div class="kpi-ic">💴</div><div><div class="kpi-label">合同总额</div></div></div>
            <div class="kpi-val">${fmt.money(totalContract)}</div>
            <div class="kpi-trend up">▲ 累计签约金额</div>
        </div>
        <div class="kpi b-purple">
            <div class="kpi-top"><div class="kpi-ic">📈</div><div><div class="kpi-label">综合毛利</div></div></div>
            <div class="kpi-val">${fmt.money(totalProfit)}</div>
            <div class="kpi-trend ${profitRate>=0?'up':'down'}">${profitRate>=0?'▲':'▼'} 毛利率 ${fmt.pct(profitRate)}</div>
        </div>
        <div class="kpi b-orange">
            <div class="kpi-top"><div class="kpi-ic">💰</div><div><div class="kpi-label">累计回款</div></div></div>
            <div class="kpi-val">${fmt.money(totalReceived)}</div>
            <div class="kpi-trend up">▲ 回款进度 ${fmt.pct(collectRate)}</div>
        </div>
    </div>

    <div class="grid-2-1 mb">
        <div class="card">
            <div class="card-head"><h3>营收与成本趋势</h3><span class="sub">2026年 · 单位：万元</span></div>
            <div class="card-body"><div id="trendChart"></div>
                ${legendHTML([{label:"合同收入",color:"#1b5fe3"},{label:"实际成本",color:"#e8890c"}])}</div>
        </div>
        <div class="card">
            <div class="card-head"><h3>成本结构</h3><span class="sub">按类型占比</span></div>
            <div class="card-body"><div id="costDonut"></div>${legendHTML(costByType)}</div>
        </div>
    </div>

    <div class="grid-2-1">
        <div class="card">
            <div class="card-head"><h3>项目盈亏排行</h3><a class="btn btn-ghost btn-sm" href="#projects">查看全部 ›</a></div>
            <div class="card-body" style="padding-top:8px">
                <div id="rankBars" style="margin-bottom:6px"></div>
                <table class="tbl" style="margin-top:4px"><thead><tr>
                    <th>项目</th><th class="right">合同额</th><th class="right">毛利</th><th class="right">毛利率</th><th>风险</th>
                </tr></thead><tbody>
                ${ranked.map(p=>{
                    const gp=Calc.grossProfit(p), pr=Calc.profitRate(p);
                    return `<tr><td class="strong">${p.name}</td>
                        <td class="right num">${fmt.money(p.contractAmount)}</td>
                        <td class="right num" style="color:${gp>=0?'#16a34a':'#dc2626'}">${fmt.money(gp)}</td>
                        <td class="right num">${fmt.pct(pr)}</td>
                        <td>${riskBadge(p.risk)}</td></tr>`;
                }).join("")}
                </tbody></table>
            </div>
        </div>
        <div class="card">
            <div class="card-head"><h3>待办与动态</h3><span class="sub">实时</span></div>
            <div class="card-body">
                <div class="feed">
                    ${feedItem("🔴","#fdeaea","500kV变电站扩建工程 风险升级","严重风险 · 成本超支预警", "10分钟前")}
                    ${feedItem("📑","#e7efff","配电EPC总承包合同 待审批","金额 ¥12,600万 · 等待财务审批", "1小时前")}
                    ${feedItem("🛒","#fff3e3","GIS组合电器采购 待财务同步","平高电气 · ¥224万", "3小时前")}
                    ${feedItem("📐","#e7f7ec","城南电缆敷设二期 进度更新","已完成 68% · 李志强填报", "今天 09:24")}
                    ${feedItem("💴","#e7f7ec","220kV输变电A标段 收到进度款","第三期 ¥2,400万 已到账", "昨天")}
                </div>
            </div>
        </div>
    </div>`;

    function feedItem(ic,bg,t,d,tm){
        return `<div class="feed-item"><div class="feed-dot" style="background:${bg}">${ic}</div>
            <div class="ct"><div class="t">${t}</div><div class="d">${d}</div></div><div class="tm">${tm}</div></div>`;
    }

    function mount(){
        lineChart(document.getElementById("trendChart"),{
            labels:["1月","2月","3月","4月","5月","6月"],
            series:[
                {data:[3200,3850,4100,5200,6400,7200],color:"#1b5fe3"},
                {data:[2400,2900,3100,3950,4600,5100],color:"#e8890c"},
            ], height:260, money:true
        });
        donutChart(document.getElementById("costDonut"),{
            data:costByType, height:220,
            centerValue:fmt.money(costByType.reduce((a,d)=>a+d.value,0)).replace("¥","").replace("万",""),
            centerLabel:"成本合计(万)"
        });
        barChart(document.getElementById("rankBars"),{
            labels:ranked.map(p=>p.name.slice(0,6)),
            series:[{data:ranked.map(p=>Calc.grossProfit(p)),color:"#1b5fe3"}],
            height:180
        });
    }

    return { html, mount };
}
