/* 项目管理 — 表格/看板 + 筛选 + CRUD + 详情 */
import { Store, Calc, fmt } from "../store.js";
import { $, $$, table, badge, riskBadge, bar, modal, confirmBox, toast, options, esc } from "../ui.js";

const STATUS = ["进行中","筹备","暂停","已完工"];
const TYPES = ["输变电","电缆敷设","电力运维","EPC总包"];
const RISKS = [{value:"low",label:"低风险"},{value:"mid",label:"中风险"},{value:"high",label:"高风险"},{value:"critical",label:"严重"}];

let view = "list", fStatus = "", fType = "", q = "";

export default function projects(){
    // 全局搜索带入
    const carried = sessionStorage.getItem("erp_q"); if(carried){ q = carried; sessionStorage.removeItem("erp_q"); }

    const html = `
    <div class="page-head">
        <div><h1>项目管理</h1><p>工程项目全周期台账 · 经营指标实时汇总</p></div>
        <div class="actions">
            <div class="view-tabs"><button data-view="list" class="${view==='list'?'on':''}">📋 列表</button><button data-view="kanban" class="${view==='kanban'?'on':''}">🗂️ 看板</button></div>
            <button class="btn btn-primary" id="addBtn"><span class="ic">＋</span>新建项目</button>
        </div>
    </div>
    <div class="toolbar">
        <div class="search-box"><span class="ic">🔍</span><input id="q" placeholder="搜索项目名称 / 负责人" value="${esc(q)}"></div>
        <select class="select" id="fStatus"><option value="">全部状态</option>${options(STATUS,fStatus)}</select>
        <select class="select" id="fType"><option value="">全部类型</option>${options(TYPES,fType)}</select>
        <div class="grow"></div>
    </div>
    <div id="viewArea"></div>`;

    function getRows(){
        return Store.all("projects").filter(p=>
            (!fStatus||p.status===fStatus) && (!fType||p.type===fType) &&
            (!q || p.name.includes(q) || p.manager.includes(q) || p.id.includes(q)));
    }

    function renderView(){
        const rows = getRows();
        const area = $("#viewArea");
        if(view==="list"){
            area.innerHTML = table([
                {title:"项目编号",key:"id",render:r=>`<span class="strong">${r.id}</span>`},
                {title:"项目名称",key:"name",render:r=>`<div class="strong">${esc(r.name)}</div><div class="muted" style="font-size:12px">${r.type} · ${r.manager}</div>`},
                {title:"合同额(万)",align:"right",render:r=>`<span class="num">${fmt.num(r.contractAmount)}</span>`},
                {title:"实际成本(万)",align:"right",render:r=>`<span class="num">${fmt.num(r.actualCost)}</span>`},
                {title:"毛利(万)",align:"right",render:r=>{const g=Calc.grossProfit(r);return `<span class="num" style="color:${g>=0?'#16a34a':'#dc2626'}">${fmt.num(g)}</span>`;}},
                {title:"回款进度",render:r=>bar(Calc.collectionRate(r))},
                {title:"风险",align:"center",render:r=>riskBadge(r.risk)},
                {title:"状态",align:"center",render:r=>badge(r.status)},
                {title:"操作",align:"center",render:r=>`<div class="row-act"><button data-act="view" data-id="${r.id}">详情</button><button data-act="edit" data-id="${r.id}">编辑</button><button data-act="del" data-id="${r.id}">删除</button></div>`},
            ], rows);
        } else {
            const cols = STATUS.map(s=>{
                const list = rows.filter(p=>p.status===s);
                return `<div class="kb-col"><div class="kb-col-head">${s}<span class="cnt">${list.length}</span></div>
                    <div class="kb-list">${list.map(card).join("")||'<div class="empty" style="padding:20px;font-size:13px">无</div>'}</div></div>`;
            }).join("");
            area.innerHTML = `<div class="kanban">${cols}</div>`;
        }
        wire();
    }

    function card(p){
        const g=Calc.grossProfit(p), pr=Calc.profitRate(p);
        return `<div class="kb-card" data-act="view" data-id="${p.id}">
            <div class="t">${esc(p.name)}</div>
            <div class="meta"><span class="tag">${p.type}</span> ${riskBadge(p.risk)}</div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;margin:8px 0 6px">
                <span class="muted">合同 <b>${fmt.money(p.contractAmount)}</b></span>
                <span style="color:${g>=0?'#16a34a':'#dc2626'}">毛利 ${fmt.pct(pr)}</span></div>
            ${bar(Calc.collectionRate(p))}
            <div class="ftr"><span class="muted">👤 ${p.manager}</span><span class="muted">${p.endDate}</span></div>
        </div>`;
    }

    function wire(){
        $$("#viewArea [data-act='view']").forEach(b=>b.onclick=()=>showDetail(b.dataset.id));
        $$("#viewArea [data-act='edit']").forEach(b=>b.onclick=e=>{e.stopPropagation();showForm(b.dataset.id);});
        $$("#viewArea [data-act='del']").forEach(b=>b.onclick=e=>{e.stopPropagation();
            confirmBox(`确认删除项目「${Store.get("projects",b.dataset.id).name}」？`,()=>{Store.remove("projects",b.dataset.id);toast("项目已删除");renderView();});});
    }

    function showDetail(id){
        const p = Store.get("projects",id); if(!p) return;
        const g=Calc.grossProfit(p);
        modal({ title:p.name, large:true, body:`
            <div class="detail-grid">
                <div class="di"><span>项目编号</span><b>${p.id}</b></div>
                <div class="di"><span>项目类型</span><b>${p.type}</b></div>
                <div class="di"><span>项目负责人</span><b>${p.manager}</b></div>
                <div class="di"><span>当前状态</span><b>${badge(p.status)}</b></div>
                <div class="di"><span>合同金额</span><b>${fmt.money(p.contractAmount)}</b></div>
                <div class="di"><span>实际成本</span><b>${fmt.money(p.actualCost)}</b></div>
                <div class="di"><span>项目毛利</span><b style="color:${g>=0?'#16a34a':'#dc2626'}">${fmt.money(g)}（${fmt.pct(Calc.profitRate(p))}）</b></div>
                <div class="di"><span>风险等级</span><b>${riskBadge(p.risk)}</b></div>
                <div class="di"><span>已收款</span><b>${fmt.money(p.received)}</b></div>
                <div class="di"><span>应收款</span><b style="color:#e8890c">${fmt.money(Calc.receivable(p))}</b></div>
                <div class="di full"><span>回款进度</span>${bar(Calc.collectionRate(p))}</div>
                <div class="di"><span>开工日期</span><b>${p.startDate}</b></div>
                <div class="di"><span>计划竣工</span><b>${p.endDate}</b></div>
            </div>`,
            footer:`<button class="btn btn-light" data-close>关闭</button><button class="btn btn-primary" data-edit>编辑项目</button>`,
            onMount:(el,close)=>{ el.querySelector("[data-edit]").onclick=()=>{close();showForm(id);}; }
        });
    }

    function showForm(id){
        const p = id?Store.get("projects",id):{};
        modal({ title:id?"编辑项目":"新建项目", large:true, body:`
            <div class="form-grid">
                <div class="field full"><label>项目名称 <span class="req">*</span></label><input class="input" id="f_name" value="${esc(p.name||"")}" placeholder="如：220kV输变电工程"></div>
                <div class="field"><label>项目类型</label><select class="select" id="f_type">${options(TYPES,p.type)}</select></div>
                <div class="field"><label>项目负责人</label><input class="input" id="f_manager" value="${esc(p.manager||"")}"></div>
                <div class="field"><label>合同金额(万元)</label><input class="input" type="number" id="f_amount" value="${p.contractAmount||""}"></div>
                <div class="field"><label>实际成本(万元)</label><input class="input" type="number" id="f_cost" value="${p.actualCost||""}"></div>
                <div class="field"><label>已收款(万元)</label><input class="input" type="number" id="f_recv" value="${p.received||""}"></div>
                <div class="field"><label>风险等级</label><select class="select" id="f_risk">${options(RISKS,p.risk||"low")}</select></div>
                <div class="field"><label>项目状态</label><select class="select" id="f_status">${options(STATUS,p.status||"筹备")}</select></div>
                <div class="field"><label>开工日期</label><input class="input" type="date" id="f_start" value="${p.startDate||""}"></div>
                <div class="field"><label>计划竣工</label><input class="input" type="date" id="f_end" value="${p.endDate||""}"></div>
            </div>`,
            footer:`<button class="btn btn-light" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>`,
            onMount:(el,close)=>{
                el.querySelector("[data-save]").onclick=()=>{
                    const name=el.querySelector("#f_name").value.trim();
                    if(!name){ toast("请填写项目名称","err"); return; }
                    const data={ name, type:el.querySelector("#f_type").value, manager:el.querySelector("#f_manager").value.trim()||"未指定",
                        contractAmount:+el.querySelector("#f_amount").value||0, actualCost:+el.querySelector("#f_cost").value||0,
                        received:+el.querySelector("#f_recv").value||0, risk:el.querySelector("#f_risk").value,
                        status:el.querySelector("#f_status").value, startDate:el.querySelector("#f_start").value, endDate:el.querySelector("#f_end").value };
                    if(id){ Store.update("projects",id,data); toast("项目已更新"); }
                    else { data.id="P-"+Store.newId("").slice(1,5); Store.add("projects",data); toast("项目已创建"); }
                    close(); renderView();
                };
            }
        });
    }

    function mount(root){
        $("#addBtn").onclick=()=>showForm();
        $("#q").oninput=e=>{q=e.target.value;renderView();};
        $("#fStatus").onchange=e=>{fStatus=e.target.value;renderView();};
        $("#fType").onchange=e=>{fType=e.target.value;renderView();};
        $$("[data-view]").forEach(b=>b.onclick=()=>{view=b.dataset.view;$$("[data-view]").forEach(x=>x.classList.toggle("on",x===b));renderView();});
        renderView();
    }

    return { html, mount };
}
