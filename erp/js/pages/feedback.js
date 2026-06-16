/* ============================================================
   意见与需求清单（来自《恒达云ERP 使用意见及问题汇总报告》）
   6 大类 30+ 条，每条带状态：已实现 / 规划中 / 待开发
   超级管理员可调整状态、补充处理说明（存 sys_feedback）
   ============================================================ */
import { Store } from "../store.js";
import { $, $$, table, modal, toast, options, esc } from "../ui.js";
import { isSuper } from "../auth.js";

const CATS = [
    "一、基础操作与通用展示",
    "二、工程量清单数据联动",
    "三、材料物资管理",
    "四、合同 / 收付款 / 结算流程",
    "五、成本分析核算",
    "六、底层系统架构（技术侧）",
];
const STATUS = { done:{label:"已实现",cls:"bg-green"}, plan:{label:"规划中",cls:"bg-orange"}, todo:{label:"待开发",cls:"bg-gray"} };

// 报告原文逐条（ord 控制顺序；status 为初始判定）
const DEFAULTS = [
    {id:"FB-101", cat:CATS[0], ord:101, status:"plan", text:"工程量清单仅支持单条新建，缺少批量新建、批量导入功能，录入效率低", remark:"已有「导入」入口（演示），批量新建/Excel 解析待开发"},
    {id:"FB-102", cat:CATS[0], ord:102, status:"done", text:"系统无可视化业务运行逻辑思维导图，无法直观查看模块数据关联与流转", remark:"已实现：个人 → 逻辑图（业务关系总览）"},
    {id:"FB-103", cat:CATS[0], ord:103, status:"todo", text:"所有金额字段仅展示阿拉伯数字，未同步展示金额大写，不符合工程财务规范"},
    {id:"FB-104", cat:CATS[0], ord:104, status:"todo", text:"项目开竣工时间、项目经理等关键信息，无法在流程流转过程中补填与编辑"},

    {id:"FB-201", cat:CATS[1], ord:201, status:"todo", text:"甲方单价、分包单价两套清单价格，未明确两套价格的数据引用规则"},
    {id:"FB-202", cat:CATS[1], ord:202, status:"todo", text:"两套清单价格与承包/分包合同、进度填报、合同变更、完工结算的衔接逻辑不清晰"},
    {id:"FB-203", cat:CATS[1], ord:203, status:"todo", text:"成本分析模块调取清单数据来源不明确，无法界定取值口径"},

    {id:"FB-301", cat:CATS[2], ord:301, status:"todo", text:"材料库不完善，同种材料需重复建档，无法复用已有材料基础信息"},
    {id:"FB-302", cat:CATS[2], ord:302, status:"todo", text:"材料无法按采购时间段分段填报采购单价，不能留存不同时段价格记录"},
    {id:"FB-303", cat:CATS[2], ord:303, status:"todo", text:"编制材料计划时，无法按采购时间段精准选取对应时段采购单价"},
    {id:"FB-304", cat:CATS[2], ord:304, status:"todo", text:"材料库无价格波动查看功能，无法直观查看同种材料不同时期/项目的价格变化"},
    {id:"FB-305", cat:CATS[2], ord:305, status:"plan", text:"物品出入库模块不完善，现有流程无法满足现场实际物资管理需求"},

    {id:"FB-401", cat:CATS[3], ord:401, status:"todo", text:"新建分包合同选承包合同时无快捷链接，无法一键跳转查看已关联承包合同详情"},
    {id:"FB-402", cat:CATS[3], ord:402, status:"todo", text:"分包付款无法自动统计该项目累计付款，分期付款时无法展示合同总额与往期付款"},
    {id:"FB-403", cat:CATS[3], ord:403, status:"todo", text:"分包付款页面无历史付款单据快捷跳转入口，需手动逐张打开对比，操作繁琐"},
    {id:"FB-404", cat:CATS[3], ord:404, status:"todo", text:"合同收款缺少累计收款自动计算，无法展示合同总额/往期收款，且不能关联最终审定结算金额"},
    {id:"FB-405", cat:CATS[3], ord:405, status:"todo", text:"完工结算无法关联/跳转往期已完成的付款、收款、变更单据，数据核对难度大"},

    {id:"FB-501", cat:CATS[4], ord:501, status:"todo", text:"成本分析无法实现目标成本、预算成本、实际成本三算对比，且数据无法实时动态更新"},
    {id:"FB-502", cat:CATS[4], ord:502, status:"todo", text:"三大成本核算口径未统一费用科目体系，无法横向精准对比分析"},
    {id:"FB-503", cat:CATS[4], ord:503, status:"todo", text:"缺少标准化动态利润核算逻辑，未固化公式：动态利润 = 已完产值(甲方清单完成量) − 实际成本(分包清单完成量) − 税金及费用"},

    {id:"FB-601", cat:CATS[5], ord:601, status:"todo", text:"无标准化精简版 CBS 三级成本科目底层架构，成本数据归集混乱"},
    {id:"FB-602", cat:CATS[5], ord:602, status:"todo", text:"缺少规范的双单价清单底层数据表，清单字段不统一"},
    {id:"FB-603", cat:CATS[5], ord:603, status:"todo", text:"未固化双价清单自动取价规则，产值、结算模块取值逻辑混乱"},
    {id:"FB-604", cat:CATS[5], ord:604, status:"todo", text:"无全局统一计算引擎，各项成本、产值计算公式不统一"},
    {id:"FB-605", cat:CATS[5], ord:605, status:"plan", text:"项目权限体系繁杂，需简化为「管理员 / 普通员工」双极简权限", remark:"现已实现可配置 RBAC（超管+多角色）；如需进一步精简为双极，可在此基础上裁剪"},
    {id:"FB-606", cat:CATS[5], ord:606, status:"plan", text:"缺少标准化前端核心页面规划，页面功能冗余、布局混乱", remark:"已优化：顶部横向模块栏、手机端卡片化、统一弹窗，核心页面持续规范中"},
];

function ensureSeed(){ if(!Store.all("sys_feedback").length) DEFAULTS.slice().reverse().forEach(it=>Store.add("sys_feedback", {...it})); }

export default function feedback(leaf){
    ensureSeed();
    const sup = isSuper();

    const html = `
    <div class="page-head"><div><h1>意见与需求清单</h1><p>资料 · 来自《恒达云ERP 使用意见及问题汇总报告》</p></div>
        <div class="actions">${sup?'<button class="btn btn-light" id="fbAdd"><span class="ic">＋</span>新增意见</button>':''}</div></div>
    <div class="kpi-grid" id="fbKpi"></div>
    <div class="okr-tip" style="margin-bottom:16px">💡 本清单已纳入系统跟踪。<b style="color:#16a34a">已实现</b> 表示当前版本已支持；<b style="color:#e8890c">规划中</b> 表示部分支持/已排期；<b style="color:#8b93a7">待开发</b> 表示后续迭代。${sup?'你是超级管理员，可直接调整每条状态与处理说明。':''}</div>
    <div id="fbBody"></div>`;

    function items(){ return Store.all("sys_feedback").sort((a,b)=>(a.ord||0)-(b.ord||0)); }

    function renderKpi(){
        const all=items();
        const c=k=>all.filter(x=>x.status===k).length;
        $("#fbKpi").innerHTML=`
        <div class="kpi b-blue"><div class="kpi-top"><div class="kpi-ic">📋</div><div class="kpi-label">意见总数</div></div><div class="kpi-val">${all.length}<span class="u"> 条</span></div></div>
        <div class="kpi b-green"><div class="kpi-top"><div class="kpi-ic">✅</div><div class="kpi-label">已实现</div></div><div class="kpi-val" style="color:#16a34a">${c("done")}<span class="u"> 条</span></div></div>
        <div class="kpi b-orange"><div class="kpi-top"><div class="kpi-ic">🛠️</div><div class="kpi-label">规划中</div></div><div class="kpi-val" style="color:#e8890c">${c("plan")}<span class="u"> 条</span></div></div>
        <div class="kpi b-purple"><div class="kpi-top"><div class="kpi-ic">🕓</div><div class="kpi-label">待开发</div></div><div class="kpi-val">${c("todo")}<span class="u"> 条</span></div></div>`;
    }

    function render(){
        renderKpi();
        const all=items();
        $("#fbBody").innerHTML = CATS.map(cat=>{
            const list=all.filter(x=>x.cat===cat); if(!list.length) return "";
            return `<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>${esc(cat)}</h3><span class="sub">${list.length} 条</span></div>
                <div class="card-body" style="padding-top:8px">${list.map(it=>`
                    <div class="fb-item">
                        <div class="fb-no">${esc(it.id.replace("FB-",""))}</div>
                        <div class="fb-main">
                            <div class="fb-text">${esc(it.text)}</div>
                            ${it.remark?`<div class="fb-remark">↳ ${esc(it.remark)}</div>`:""}
                        </div>
                        <div class="fb-right">
                            ${sup?`<select class="select fb-st" data-id="${it.id}">${Object.keys(STATUS).map(k=>`<option value="${k}" ${it.status===k?'selected':''}>${STATUS[k].label}</option>`).join("")}</select>`
                                 :`<span class="badge ${STATUS[it.status].cls}">${STATUS[it.status].label}</span>`}
                            ${sup?`<button class="fb-edit" data-id="${it.id}" title="编辑说明">✎</button>`:""}
                        </div>
                    </div>`).join("")}</div></div>`;
        }).join("");
        if(sup){
            $$("#fbBody .fb-st").forEach(s=>s.onchange=()=>{ Store.update("sys_feedback", s.dataset.id, {status:s.value}); toast("状态已更新"); renderKpi(); });
            $$("#fbBody .fb-edit").forEach(b=>b.onclick=()=>editRemark(b.dataset.id));
        }
    }

    function editRemark(id){
        const it=Store.get("sys_feedback",id);
        modal({ title:"处理说明", body:`<div class="field"><label>说明 / 进展</label><textarea id="fbR" placeholder="填写该条意见的处理进展、方案或备注">${esc(it.remark||"")}</textarea></div>`,
            footer:`<button class="btn btn-light" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>`,
            onMount:(el,close)=>{ el.querySelector("[data-save]").onclick=()=>{ Store.update("sys_feedback",id,{remark:el.querySelector("#fbR").value.trim()}); toast("已保存"); close(); render(); }; } });
    }

    function addItem(){
        const body=`<div class="form-grid">
            <div class="field"><label>所属分类</label><select class="select" data-k="cat">${options(CATS,CATS[0])}</select></div>
            <div class="field"><label>状态</label><select class="select" data-k="status">${Object.keys(STATUS).map(k=>`<option value="${k}">${STATUS[k].label}</option>`).join("")}</select></div>
            <div class="field full"><label>意见 / 需求内容 <span class="req">*</span></label><textarea data-k="text"></textarea></div>
            <div class="field full"><label>处理说明</label><input class="input" data-k="remark"></div></div>`;
        modal({ title:"新增意见", large:true, body, footer:`<button class="btn btn-light" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>`,
            onMount:(el,close)=>{ el.querySelector("[data-save]").onclick=()=>{
                const g=k=>{const n=el.querySelector(`[data-k="${k}"]`);return n?n.value.trim():"";};
                if(!g("text")){ toast("请填写意见内容","err"); return; }
                Store.add("sys_feedback",{cat:g("cat"),status:g("status")||"todo",text:g("text"),remark:g("remark"),ord:9999});
                toast("已新增"); close(); render();
            }; } });
    }

    function mount(){ const a=$("#fbAdd"); if(a) a.onclick=addItem; render(); }
    return { html, mount };
}
