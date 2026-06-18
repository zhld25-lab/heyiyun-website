/* ============================================================
   通用页面引擎：按 schema 渲染 列表 / 详情 / 表单 / 统计 / 特殊页
   ============================================================ */
import { Store, fmt } from "./store.js";
import { $, $$, table, badge, riskBadge, bar, modal, confirmBox, toast, options, esc } from "./ui.js";
import { barChart, donutChart, legendHTML, PALETTE } from "./charts.js";
import { openProject360 } from "./project360.js";
import { currentUser, canApprove, isSuper } from "./auth.js";
import { startFlow, currentStep, canActOn, approveStep, rejectStep, resubmitFlow, timelineHTML, stageLabel } from "./flow.js";

const projName = id => { const p=Store.get("projects",id); return p?p.name:(id||"—"); };

/* 点击任意"项目"词 → 项目360°视图 */
const projectDetail = openProject360;

/* 字段值渲染（重要词均可点击下钻） */
function show(field, rec){
    let v = rec[field.key];
    if(v==null || v==="") return '<span class="muted">—</span>';
    if(field.key==="project") return `<a class="cell-lnk cell-proj" data-pid="${esc(v)}" title="查看项目详情">${esc(projName(v))}</a>`;
    if(field.money) return `<span class="num">${fmt.money(+v||0)}</span>`;
    if(field.riskBadge) return field.filter ? `<a class="cell-lnk" data-fk="${field.key}" data-fv="${esc(v)}" title="按此筛选">${riskBadge(v)}</a>` : riskBadge(v);
    if(field.badge) return field.filter ? `<a class="cell-lnk" data-fk="${field.key}" data-fv="${esc(v)}" title="按此筛选">${badge(v)}</a>` : badge(v);
    if(field.bar) return bar(+v||0);
    if(field.filter) return `<a class="cell-lnk" data-fk="${field.key}" data-fv="${esc(v)}" title="按此筛选">${esc(v)}</a>`;
    if(field.key==="name"||field.key==="title"||field.key==="code") return `<a class="cell-lnk" data-detail="${esc(rec.id)}" title="查看详情">${esc(v)}</a>`;
    return `<a class="cell-lnk" data-q="${esc(v)}" title="搜索相关记录">${esc(v)}</a>`;
}

/* ---------- 列表页 ---------- */
function listPage(leaf, schema){
    const fields = schema.fields;
    const state = { q:"", filters:{}, dateFrom:"", dateTo:"" };
    const dateField = fields.find(f=>f.date);
    const filterFields = fields.filter(f=>f.filter);
    const searchKeys = fields.filter(f=>["text"].includes(f.type||"text") && !f.filter).map(f=>f.key);

    const html = `
    <div class="page-head">
        <div><h1>${esc(leaf.name)}</h1><p>${esc(leaf.module)} · ${esc(leaf.group)}</p></div>
        <div class="actions"><button class="btn btn-light" id="impBtn"><span class="ic">⬆</span>导入</button>
            <button class="btn btn-primary" id="addBtn"><span class="ic">＋</span>新建</button></div>
    </div>
    <div class="toolbar">
        <div class="search-box"><span class="ic">🔍</span><input id="q" placeholder="搜索${leaf.name}…"></div>
        ${filterFields.map(f=>{
            const opts = f.options || distinct(leaf.coll,f.key);
            return `<select class="select" data-f="${f.key}"><option value="">${f.label}</option>${options(opts,"")}</select>`;
        }).join("")}
        ${dateField?`<input type="date" class="input" id="dFrom" title="起始${dateField.label}"><span style="color:#8b93a7">~</span><input type="date" class="input" id="dTo" title="截止${dateField.label}">`:""}
        <div class="grow"></div>
        <div id="summary" style="font-size:13px;color:#5b6478"></div>
    </div>
    <div id="viewArea"></div>`;

    function distinct(coll,key){
        return [...new Set(Store.all(coll).map(r=>r[key]).filter(Boolean))];
    }
    // 项目结束(已完工/已完成/已结束)后自动隐藏，仅总经理与超级管理员可见
    const PROJ_DONE=["已完工","已完成","已结束","已关闭","竣工","完工"];
    const canSeeDoneProj=()=>{ try{ return isSuper() || (currentUser()||{}).roleId==="R-gm"; }catch(e){ return false; } };
    function rows(){
        const hideDone = leaf.coll==="projects" && !canSeeDoneProj();
        return Store.all(leaf.coll).filter(r=>{
            if(hideDone && PROJ_DONE.includes(r.status)) return false;
            for(const k in state.filters){ if(state.filters[k] && r[k]!==state.filters[k]) return false; }
            if(dateField && (state.dateFrom||state.dateTo)){
                const d=r[dateField.key]||""; if(state.dateFrom && d<state.dateFrom) return false; if(state.dateTo && d>state.dateTo) return false;
            }
            if(state.q){ return searchKeys.concat(["name","code","title"]).some(k=>String(r[k]||"").includes(state.q)); }
            return true;
        });
    }

    function render(){
        const data = rows();
        const cols = fields.filter(f=>f.col).map(f=>({title:f.label, align:f.align, render:r=>show(f,r)}));
        cols.push({title:"操作",align:"center",render:r=>`<div class="row-act">
            <button data-act="view" data-id="${r.id}">详情</button>
            <button data-act="edit" data-id="${r.id}">编辑</button>
            <button data-act="del" data-id="${r.id}">删除</button></div>`});
        $("#viewArea").innerHTML = table(cols, data);
        const amtF = fields.find(f=>f.money);
        $("#summary").innerHTML = `共 <b>${data.length}</b> 条`+(amtF?` · 金额合计 <b style="color:#1b5fe3">${fmt.money(data.reduce((a,r)=>a+(+r[amtF.key]||0),0))}</b>`:"");
        wire();
    }
    // 项目集合 → 详情即"项目360°视图"
    const openDetail = id => leaf.coll==="projects" ? projectDetail(id) : detail(id);
    function wire(){
        $$("#viewArea [data-act='view']").forEach(b=>b.onclick=e=>{e.stopPropagation();openDetail(b.dataset.id);});
        $$("#viewArea [data-act='edit']").forEach(b=>b.onclick=e=>{e.stopPropagation();form(b.dataset.id);});
        $$("#viewArea [data-act='del']").forEach(b=>b.onclick=e=>{e.stopPropagation();confirmBox(`确认删除该${leaf.name}记录？`,()=>{Store.remove(leaf.coll,b.dataset.id);toast("已删除");render();});});
        // 单元格内"重要词"点击下钻
        $$("#viewArea .cell-lnk").forEach(a=>a.onclick=e=>{
            e.stopPropagation(); const d=a.dataset;
            if(d.pid) projectDetail(d.pid);
            else if(d.fk!=null){ state.filters[d.fk]=d.fv; const sel=document.querySelector(`[data-f="${d.fk}"]`); if(sel) sel.value=d.fv; render(); toast(`已按「${d.fv}」筛选`); }
            else if(d.detail!=null) openDetail(d.detail);
            else if(d.q!=null){ state.q=d.q; const qi=$("#q"); if(qi) qi.value=d.q; render(); }
        });
        // 整行点击查看详情
        $$("#viewArea .tbl tbody tr").forEach(tr=>{ if(tr.dataset.id){ tr.style.cursor="pointer"; tr.onclick=()=>openDetail(tr.dataset.id); } });
    }

    function detail(id){
        const r = Store.get(leaf.coll,id); if(!r) return;
        const items = fields.map(f=>({label:f.label, value:f.full&&f.type==="textarea"?esc(r[f.key]||"—"):show(f,r), full:f.full}));
        const hasApproval = fields.some(f=>f.key==="approval");
        // 流程化单据：按"当前级是否轮到我"决定能否办理
        const flowable = hasApproval && r.flow;
        const actable = flowable ? canActOn(r) : (hasApproval && canApprove() && ["待审批","审批中","草稿"].includes(r.approval));
        const step = flowable ? currentStep(r) : null;
        const mine = (()=>{ const u=currentUser(); return u && r.flow && r.flow.submitter===u.name; })();
        const rejected = flowable && r.flow.status==="rejected";
        modal({ title:`${leaf.name}详情`, large:true,
            body:`<div class="detail-grid">${items.map(it=>`<div class="di ${it.full?'full':''}"><span>${it.label}</span><b>${it.value}</b></div>`).join("")}
                <div class="di full"><span>单据编号</span><b>${r.id}</b></div></div>
                ${flowable?`<div style="margin-top:14px"><div style="font-size:13px;font-weight:700;color:#0a1733;margin-bottom:8px">审批流程 · ${esc(r.flow.defName||"")}</div>${timelineHTML(r)}</div>`:""}
                ${flowable&&step&&!actable?`<p class="okr-tip" style="margin-top:10px">⏳ 当前等待「${esc(step.name)}」办理</p>`:""}
                ${actable?'<div class="field" style="margin-top:12px"><label>审批意见（选填）</label><textarea id="flowOpinion" placeholder="同意/驳回原因…"></textarea></div>':""}`,
            footer:`<button class="btn btn-light" data-close>关闭</button>
                ${actable?'<button class="btn btn-danger" data-reject>驳回</button><button class="btn btn-primary" data-approve>批准</button>':''}
                ${rejected&&mine?'<button class="btn btn-primary" data-resubmit>修改后重新提交</button>':''}
                ${!actable&&!rejected?'<button class="btn btn-primary" data-edit>编辑</button>':''}`,
            onMount:(el,close)=>{
                const op=()=>{ const t=el.querySelector("#flowOpinion"); return t?t.value.trim():""; };
                const ed=el.querySelector("[data-edit]"); if(ed) ed.onclick=()=>{close();form(id);};
                const ap=el.querySelector("[data-approve]"); if(ap) ap.onclick=()=>{
                    if(r.flow) approveStep(leaf.coll, r, op());
                    else Store.update(leaf.coll,id,{approval:"已批准"});
                    const nxt=currentStep(Store.get(leaf.coll,id));
                    toast(nxt?`本级已通过，流转至「${nxt.name}」`:"全部审批通过 ✔"); close(); render(); };
                const rj=el.querySelector("[data-reject]"); if(rj) rj.onclick=()=>{
                    if(r.flow) rejectStep(leaf.coll, r, op());
                    else Store.update(leaf.coll,id,{approval:"已驳回"});
                    toast("已驳回，单据打回提交人","err"); close(); render(); };
                const rs=el.querySelector("[data-resubmit]"); if(rs) rs.onclick=()=>{ close(); form(id); };
            }
        });
    }

    function form(id){
        const r = id?Store.get(leaf.coll,id):{};
        const body = `<div class="form-grid">${fields.map(f=>{
            const v = r[f.key]!=null?r[f.key]:(f.default!=null?f.default:"");
            const cls = f.full?"field full":"field";
            // 锁定字段（如审批状态）：只显示，不可改 —— 审批须走"详情/待办"中的批准/驳回
            if(f.noEdit) return `<div class="${cls}"><label>${f.label}</label><div style="padding:9px 2px">${f.badge?badge(v||f.default):esc(v||f.default)} <small style="color:#8b93a7">（新建自动"待审批"，由总经理审批）</small></div></div>`;
            if(f.type==="select") return `<div class="${cls}"><label>${f.label}${f.required?' <span class="req">*</span>':''}</label><select class="select" data-k="${f.key}">${options(f.options||[],v)}</select></div>`;
            if(f.type==="textarea") return `<div class="${cls}"><label>${f.label}</label><textarea data-k="${f.key}" placeholder="${f.placeholder||''}">${esc(v)}</textarea></div>`;
            return `<div class="${cls}"><label>${f.label}${f.required?' <span class="req">*</span>':''}</label><input class="input" type="${f.type||'text'}" data-k="${f.key}" value="${esc(v)}" placeholder="${f.placeholder||''}"></div>`;
        }).join("")}</div>`;
        modal({ title:id?`编辑${leaf.name}`:`新建${leaf.name}`, large:true, body,
            footer:`<button class="btn btn-light" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>`,
            onMount:(el,close)=>{ el.querySelector("[data-save]").onclick=()=>{
                const data={};
                for(const f of fields){
                    if(f.noEdit){ data[f.key] = id ? (r[f.key]!=null?r[f.key]:f.default) : f.default; continue; }
                    const node=el.querySelector(`[data-k="${f.key}"]`); let val=node.value;
                    if(f.type==="number") val=+val||0;
                    if(f.required && !String(val).trim()){ toast(`请填写${f.label}`,"err"); return; }
                    data[f.key]=val; }
                // 业务约束：单据未获批准前，不允许标记"已付款"
                if(fields.some(f=>f.key==="approval") && data.status==="已付款" && data.approval!=="已批准"){
                    toast("该单据尚未批准，不能标记为已付款","err"); return;
                }
                const u=currentUser(); if(u && !id) data.submitter=u.name;
                const hasAp = fields.some(f=>f.key==="approval");
                if(id){
                    Store.update(leaf.coll,id,data);
                    // 被驳回的单据修改保存 → 流程重置重新提交
                    const cur=Store.get(leaf.coll,id);
                    if(hasAp && cur.flow && cur.flow.status==="rejected"){ resubmitFlow(leaf.coll, cur); toast("已重新提交，流程重新流转"); }
                    else toast("已更新");
                } else {
                    const rec=Store.add(leaf.coll,data);
                    if(hasAp){
                        const flow=startFlow(leaf.coll, rec, u);
                        if(flow){ Store.update(leaf.coll, rec.id, { flow, approval: flow.status==="approved"?"已批准":"待审批" });
                            const s=flow.status==="running"?flow.steps[flow.stepIndex]:null;
                            toast(s?`已创建，流转至「${s.name}」审批`:"已创建并自动通过"); }
                        else toast("已创建");
                    } else toast("已创建");
                }
                close(); render();
            }; }
        });
    }

    function mount(){
        // 来自看板/其他页的预设筛选
        try{ const ps=JSON.parse(sessionStorage.getItem("erp_preset")||"null");
            if(ps && ps.coll===leaf.coll && ps.filters){ Object.assign(state.filters, ps.filters); }
            sessionStorage.removeItem("erp_preset");
        }catch(e){}
        $("#addBtn").onclick=()=>form();
        $("#impBtn").onclick=()=>toast("演示：导入功能将解析 Excel 批量入库","ok");
        $("#q").oninput=e=>{state.q=e.target.value;render();};
        $$("[data-f]").forEach(s=>{ if(state.filters[s.dataset.f]) s.value=state.filters[s.dataset.f];
            s.onchange=e=>{state.filters[s.dataset.f]=e.target.value;render();}; });
        const df=$("#dFrom"), dt=$("#dTo");
        if(df) df.onchange=e=>{state.dateFrom=e.target.value;render();};
        if(dt) dt.onchange=e=>{state.dateTo=e.target.value;render();};
        render();
    }
    return { html, mount };
}

/* ---------- 统计页 ---------- */
function statPage(leaf, schema){
    const src = schema.stat.src;
    const data = Store.all(src);
    const isAmount = schema.stat.isAmount;
    const amtKey = (Store.all(src)[0]&&("amount"in Store.all(src)[0]))?"amount":(src==="projects"?"contractAmount":null);

    // 按项目聚合
    const groups = {};
    data.forEach(r=>{ const k=projName(r.project||r.id); (groups[k]=groups[k]||{count:0,amount:0}); groups[k].count++; groups[k].amount+=(+r[amtKey]||0); });
    const gkeys = Object.keys(groups).slice(0,8);
    const totalCount = data.length;
    const totalAmount = data.reduce((a,r)=>a+(+r[amtKey]||0),0);

    // 状态分布
    const statusKey = (schema.fields.find(f=>f.key==="status")||{}).key || "status";
    const sd = {};
    data.forEach(r=>{ const s=r[statusKey]||r.approval||"未分类"; sd[s]=(sd[s]||0)+1; });
    const statusData = Object.entries(sd).map(([label,value],i)=>({label,value,color:PALETTE[i%PALETTE.length]}));

    const html = `
    <div class="page-head"><div><h1>${esc(leaf.name)}</h1><p>${esc(leaf.module)} · ${esc(leaf.group)} · 统计分析</p></div>
        <div class="actions"><button class="btn btn-light" id="expBtn"><span class="ic">⬇</span>导出</button></div></div>
    <div class="kpi-grid">
        <div class="kpi b-blue"><div class="kpi-top"><div class="kpi-ic">📄</div><div class="kpi-label">记录总数</div></div><div class="kpi-val">${totalCount}<span class="u"> 条</span></div></div>
        ${isAmount?`<div class="kpi b-green"><div class="kpi-top"><div class="kpi-ic">💰</div><div class="kpi-label">金额合计</div></div><div class="kpi-val">${fmt.money(totalAmount)}</div></div>`:""}
        <div class="kpi b-orange"><div class="kpi-top"><div class="kpi-ic">🏗️</div><div class="kpi-label">涉及项目</div></div><div class="kpi-val">${Object.keys(groups).length}<span class="u"> 个</span></div></div>
        <div class="kpi b-purple"><div class="kpi-top"><div class="kpi-ic">📊</div><div class="kpi-label">状态种类</div></div><div class="kpi-val">${statusData.length}<span class="u"> 类</span></div></div>
    </div>
    <div class="grid-2 mb">
        <div class="card"><div class="card-head"><h3>按项目${isAmount?'金额':'数量'}分布</h3><span class="sub">Top ${gkeys.length}</span></div>
            <div class="card-body"><div id="byProj"></div></div></div>
        <div class="card"><div class="card-head"><h3>状态分布</h3><span class="sub">占比</span></div>
            <div class="card-body"><div id="byStatus"></div>${legendHTML(statusData)}</div></div>
    </div>
    <div class="card"><div class="card-head"><h3>明细汇总（按项目）</h3><span class="sub">共 ${Object.keys(groups).length} 个项目</span></div>
        <div class="card-body" style="padding-top:6px"><div id="aggTbl"></div></div></div>`;

    function mount(){
        if(!data.length){ $("#byProj").innerHTML=$("#byStatus").innerHTML='<div class="empty"><div class="ic">📭</div>暂无数据，可在对应业务页面新建后查看统计</div>'; $("#aggTbl").innerHTML=table([{title:"项目"},{title:"数量"}],[]); return; }
        barChart($("#byProj"),{ labels:gkeys.map(k=>k.slice(0,5)),
            series:[{data:gkeys.map(k=>isAmount?groups[k].amount:groups[k].count),color:"#1b5fe3"}], height:260 });
        donutChart($("#byStatus"),{ data:statusData, height:240, centerValue:totalCount, centerLabel:"记录数" });
        $("#aggTbl").innerHTML = table(
            [{title:"项目",render:r=>`<span class="strong">${esc(r.k)}</span>`},
             {title:"记录数",align:"right",render:r=>`<span class="num">${r.v.count}</span>`},
             isAmount?{title:"金额合计(万)",align:"right",render:r=>`<span class="num strong" style="color:#1b5fe3">${fmt.num(r.v.amount)}</span>`}:{title:"占比",align:"right",render:r=>fmt.pct(r.v.count/totalCount*100)}],
            Object.entries(groups).map(([k,v])=>({id:k,k,v})));
        // 统计明细按项目可点击下钻
        const nameToId={}; Store.all("projects").forEach(p=>nameToId[p.name]=p.id);
        $$("#aggTbl .tbl tbody tr").forEach(tr=>{ const pid=nameToId[tr.dataset.id]; if(pid){ tr.style.cursor="pointer"; tr.onclick=()=>projectDetail(pid); } });
        $("#expBtn").onclick=()=>toast("演示：统计结果可导出 Excel","ok");
    }
    return { html, mount };
}

/* ---------- 特殊页 ---------- */
/* 待办 / 已办 / 知会：可点击办理的工作台 */
const TODO_COLLS = [
    {c:"contracts", label:"承包合同"}, {c:"subcontracts", label:"分包合同"},
    {c:"cost", label:"成本登记"}, {c:"fin_income", label:"合同收款"},
    {c:"fin_salary", label:"薪资付款"},
];
const PENDING = ["待审批","审批中","草稿"];
const DONE_AP = ["已批准","已驳回"];
function normDoc(c, label, r){
    return { coll:c, label, id:r.id, name:r.name||(c==="fin_salary"?`${r.party||""} ${r.period||""}薪资`.trim():null)||r.code||r.id, project:r.project,
        party:r.partyA||r.party||"", amount:r.amount, date:r.date||r.signedDate||"",
        approval:r.approval||"待审批", status:r.status||"", submitter:r.submitter||r.manager||r.reporter||r.applicant||"系统" };
}
function todoPage(leaf){
    const mode = /已办/.test(leaf.name) ? "done" : /知会/.test(leaf.name) ? "notify" : "todo";
    const u = currentUser()||{name:"",roleId:""};
    const meta = {
        todo:{ desc:"轮到我办理的单据（按审批流程动态流转）", dot:"📋", go:"去办理 ›", empty:"暂无待办事项，所有单据均已处理 🎉" },
        done:{ desc:"我已审批处理过的单据", dot:"✅", go:"查看 ›", empty:"暂无已办事项" },
        notify:{ desc:"我提交的单据进展 + 资金动态", dot:"🔔", go:"查看 ›", empty:"暂无知会事项" },
    }[mode];

    function pick(d, r){
        if(mode==="todo"){
            if(r.flow) return canActOn(r);                                  // 流程单：当前级轮到我（超管可代办）
            return canApprove() && PENDING.includes(d.approval);            // 旧单据兼容
        }
        if(mode==="done"){
            if(r.flow) return r.flow.steps.some(s=>s.by===u.name && (s.status==="approved"||s.status==="rejected"));
            return canApprove() && DONE_AP.includes(d.approval);
        }
        // notify：我提交的在途/办结单据 + 已到账/已付款动态
        if(r.flow && r.flow.submitter===u.name) return true;
        return ["已到账","已付款","已完成"].includes(d.status);
    }
    function collect(){
        const out=[];
        TODO_COLLS.forEach(({c,label})=>Store.all(c).forEach(r=>{ const d=normDoc(c,label,r); if(pick(d,r)){ d.rec=r; out.push(d); } }));
        return out;
    }

    function openDoc(d){
        // 高级字段：横向排列
        const top = [
            {label:"单据类型", value:badge(d.label)},
            {label:"单据编号", value:esc(d.id)},
            {label:"金额(万元)", value:d.amount!=null&&d.amount!==""?fmt.money(d.amount):"—"},
            {label:"当前状态", value:badge(d.approval||d.status)},
        ];
        // 明细字段：纵向排列
        const rows = [
            {label:"单据名称", value:esc(d.name)},
            {label:"所属项目", value:esc(projName(d.project))},
            {label:"相对方 / 对象", value:esc(d.party||"—")},
            {label:"提交人", value:esc(d.submitter)},
            {label:"单据日期", value:esc(d.date||"—")},
        ];
        const rec = d.rec || Store.get(d.coll, d.id);
        const actionable = mode==="todo" && (rec&&rec.flow ? canActOn(rec) : canApprove());
        const body = `<div class="todo-form">
            <div class="todo-top">${top.map(t=>`<div class="cell"><span>${t.label}</span><b>${t.value}</b></div>`).join("")}</div>
            ${rec&&rec.flow?`<div style="margin:4px 0 14px"><div style="font-size:13px;font-weight:700;color:#0a1733;margin-bottom:8px">审批流程 · ${esc(rec.flow.defName||"")}</div>${timelineHTML(rec)}</div>`:""}
            <div class="todo-rows">${rows.map(r=>`<div class="r"><span>${r.label}</span><div class="v">${r.value}</div></div>`).join("")}
            ${actionable?`<div class="r full"><span>审批意见</span><div class="v"><textarea id="apOpinion" placeholder="请填写审批 / 办理意见（选填）"></textarea></div></div>`:""}
            </div></div>`;
        const footer = actionable
            ? `<button class="btn btn-light" data-close>取消</button>
               <button class="btn btn-danger" data-reject>退回驳回</button>
               <button class="btn btn-primary" data-approve>同意通过</button>`
            : `<button class="btn btn-light" data-close>关闭</button>`;
        modal({ title:`办理 · ${d.name}`, large:true, body, footer,
            onMount:(el,close)=>{
                const op=()=>{ const t=el.querySelector("#apOpinion"); return t?t.value.trim():""; };
                const ap=el.querySelector("[data-approve]"), rj=el.querySelector("[data-reject]");
                if(ap) ap.onclick=()=>{
                    if(rec&&rec.flow){ approveStep(d.coll, rec, op());
                        const nxt=currentStep(Store.get(d.coll,d.id));
                        toast(nxt?`本级已通过，流转至「${nxt.name}」`:"全部审批通过 ✔"); }
                    else { Store.update(d.coll,d.id,{approval:"已批准"}); toast("已同意通过"); }
                    close(); render(); };
                if(rj) rj.onclick=()=>{
                    if(rec&&rec.flow) rejectStep(d.coll, rec, op());
                    else Store.update(d.coll,d.id,{approval:"已驳回"});
                    toast("已退回驳回","err"); close(); render(); };
            }
        });
    }

    function render(){
        const list = collect();
        const feed = $("#todoFeed");
        feed.innerHTML = list.length ? list.map((d,i)=>`
            <div class="feed-item todo-item" data-i="${i}">
                <div class="feed-dot" style="background:#e7efff">${meta.dot}</div>
                <div class="ct"><div class="t">${esc(d.name)}</div>
                    <div class="d">${badge(d.label)} · ${esc(projName(d.project))} · <span class="badge ${d.rec&&d.rec.flow&&d.rec.flow.status==='rejected'?'bg-red':d.rec&&d.rec.flow&&d.rec.flow.status==='approved'?'bg-green':'bg-orange'}">${esc(stageLabel(d.rec)||d.approval||d.status)}</span>${d.amount!=null&&d.amount!==""?` · <b style="color:#1b5fe3">${fmt.money(d.amount)}</b>`:""}</div></div>
                <div class="tm">${esc(d.date||"")}<br><span class="todo-go">${meta.go}</span></div>
            </div>`).join("") : `<div class="empty"><div class="ic">✅</div>${meta.empty}</div>`;
        const cnt=$("#todoCount"); if(cnt) cnt.textContent=list.length;
        $$("#todoFeed .todo-item").forEach(it=>it.onclick=()=>openDoc(list[+it.dataset.i]));
    }

    const html=`<div class="page-head"><div><h1>${esc(leaf.name)}</h1><p>个人 · 我的工作台 · ${meta.desc}</p></div></div>
    <div class="card"><div class="card-head"><h3>${esc(leaf.name)}列表</h3><span class="sub">共 <b id="todoCount">0</b> 项</span></div>
    <div class="card-body"><div class="feed" id="todoFeed"></div></div></div>`;
    return { html, mount(){ render(); } };
}

/* 银行内部转账：一笔过账，转出 / 转入双账户自动联动 */
function bankTransferPage(leaf){
    const accObj = id => Store.get("bank_accounts",id);
    const accName = id => { const a=accObj(id); return a?a.name:id; };
    const today = () => { try{ return new Date().toISOString().slice(0,10); }catch(e){ return ""; } };

    const html=`
    <div class="page-head"><div><h1>${esc(leaf.name)}</h1><p>财务 · 银行账户 · 内部资金调拨（一笔过账，转出转入双账户自动联动）</p></div>
        <div class="actions"><button class="btn btn-primary" id="tfAdd"><span class="ic">⇄</span>发起转账</button></div></div>
    <div class="kpi-grid" id="tfKpi"></div>
    <div class="card mb"><div class="card-head"><h3>银行账户余额</h3><span class="sub">点击账户查看资金往来</span></div>
        <div class="card-body"><div class="acc-cards" id="accCards"></div></div></div>
    <div class="card"><div class="card-head"><h3>内部转账流水</h3><span class="sub">一笔记录贯通转出 / 转入两个账户</span></div>
        <div class="card-body"><div id="tfList"></div></div></div>`;

    function openLedger(id){
        const a=accObj(id); if(!a) return;
        const moves=[];
        Store.all("bank_transfers").forEach(t=>{
            if(t.from===id) moves.push({date:t.date, dir:"转出", other:accName(t.to), amount:-t.amount, summary:t.summary});
            if(t.to===id)   moves.push({date:t.date, dir:"转入", other:accName(t.from), amount:+t.amount, summary:t.summary});
        });
        moves.sort((x,y)=>x.date<y.date?-1:1);
        const body=`<div class="todo-top">
            <div class="cell"><span>账户名称</span><b>${esc(a.name)}</b></div>
            <div class="cell"><span>开户行</span><b>${esc(a.bank)}</b></div>
            <div class="cell"><span>当前余额</span><b style="color:#1b5fe3">${fmt.money(a.balance)}</b></div></div>
            <h4 style="margin:18px 0 8px;font-size:14px;color:#0a1733">资金往来流水</h4>
            ${moves.length?table([
                {title:"日期",key:"date"},
                {title:"方向",align:"center",render:m=>badge(m.dir)},
                {title:"对方账户",render:m=>esc(m.other)},
                {title:"金额(万)",align:"right",render:m=>`<span class="num strong" style="color:${m.amount>0?'#16a34a':'#dc2626'}">${m.amount>0?'+':''}${fmt.num(m.amount)}</span>`},
                {title:"摘要",render:m=>esc(m.summary||"")},
            ], moves.map((m,i)=>Object.assign({id:i},m))):'<div class="empty"><div class="ic">📭</div>该账户暂无内部资金往来</div>'}`;
        modal({ title:`账户资金流水 · ${a.name}`, large:true, body, footer:`<button class="btn btn-light" data-close>关闭</button>` });
    }

    function openForm(){
        const accounts = Store.all("bank_accounts");
        const opts = accounts.map(a=>({value:a.id,label:`${a.name}（余额 ${fmt.num(a.balance)}万）`}));
        const body=`<div class="form-grid">
            <div class="field"><label>转出账户 <span class="req">*</span></label><select class="select" data-k="from">${options(opts,accounts[0]&&accounts[0].id)}</select></div>
            <div class="field"><label>转入账户 <span class="req">*</span></label><select class="select" data-k="to">${options(opts,accounts[1]&&accounts[1].id)}</select></div>
            <div class="field"><label>转账金额(万元) <span class="req">*</span></label><input class="input" type="number" data-k="amount" placeholder="0.0"></div>
            <div class="field"><label>转账日期</label><input class="input" type="date" data-k="date" value="${today()}"></div>
            <div class="field full"><label>摘要</label><input class="input" type="text" data-k="summary" placeholder="如：拨付项目专户用款"></div>
        </div><div class="tf-hint">💡 <b>一笔过账</b>：保存后系统自动从转出账户扣减、转入账户增加，无需再分别登记两笔流水，两个账户的资金流动全程连通。</div>`;
        modal({ title:"发起内部转账", large:true, body,
            footer:`<button class="btn btn-light" data-close>取消</button><button class="btn btn-primary" data-save>确认转账</button>`,
            onMount:(el,close)=>{
                el.querySelector("[data-save]").onclick=()=>{
                    const g=k=>el.querySelector(`[data-k="${k}"]`).value;
                    const from=g("from"), to=g("to"), amount=+g("amount")||0, date=g("date")||today(), summary=g("summary");
                    if(from===to){ toast("转出与转入账户不能相同","err"); return; }
                    if(amount<=0){ toast("请输入有效转账金额","err"); return; }
                    const fromAcc=accObj(from);
                    if(amount>fromAcc.balance){ toast(`转出账户余额不足（当前 ${fmt.num(fromAcc.balance)}万）`,"err"); return; }
                    const id="ZZ-"+Store.newId("").slice(1,6);
                    Store.add("bank_transfers",{id,from,to,amount,date,summary,status:"已完成"});
                    Store.update("bank_accounts",from,{balance:+(fromAcc.balance-amount).toFixed(2)});
                    const toAcc=accObj(to);
                    Store.update("bank_accounts",to,{balance:+(toAcc.balance+amount).toFixed(2)});
                    toast(`转账完成：${accName(from)} → ${accName(to)} ¥${fmt.num(amount)}万，双方余额已自动更新`,"ok");
                    close(); render();
                };
            }
        });
    }

    function render(){
        const accounts=Store.all("bank_accounts"), transfers=Store.all("bank_transfers");
        const totalBal=accounts.reduce((a,r)=>a+(+r.balance||0),0);
        const tfAmt=transfers.reduce((a,r)=>a+(+r.amount||0),0);
        $("#tfKpi").innerHTML=`
            <div class="kpi b-blue"><div class="kpi-top"><div class="kpi-ic">🏦</div><div class="kpi-label">资金总额</div></div><div class="kpi-val">${fmt.money(totalBal)}</div></div>
            <div class="kpi b-green"><div class="kpi-top"><div class="kpi-ic">💳</div><div class="kpi-label">银行账户</div></div><div class="kpi-val">${accounts.length}<span class="u"> 个</span></div></div>
            <div class="kpi b-orange"><div class="kpi-top"><div class="kpi-ic">⇄</div><div class="kpi-label">内部转账</div></div><div class="kpi-val">${transfers.length}<span class="u"> 笔</span></div></div>
            <div class="kpi b-purple"><div class="kpi-top"><div class="kpi-ic">📊</div><div class="kpi-label">累计调拨</div></div><div class="kpi-val">${fmt.money(tfAmt)}</div></div>`;
        $("#accCards").innerHTML=accounts.map(a=>`
            <div class="acc-card" data-id="${a.id}">
                <div class="ac-top"><span class="ac-name">${esc(a.name)}</span><span class="ac-cur">${esc(a.currency||"人民币")}</span></div>
                <div class="ac-bal">${fmt.money(a.balance)}</div>
                <div class="ac-bank">${esc(a.bank)}</div><div class="ac-no">${esc(a.account)}</div></div>`).join("");
        $$("#accCards .acc-card").forEach(c=>c.onclick=()=>openLedger(c.dataset.id));
        $("#tfList").innerHTML=transfers.length?`<div class="tf-flow">${transfers.map(t=>`
            <div class="tf-row" data-id="${t.id}">
                <div class="tf-end out"><i>转出账户</i><b>${esc(accName(t.from))}</b></div>
                <div class="tf-mid"><span class="tf-amt">¥${fmt.num(t.amount)}万</span><div class="tf-arrow">●───────▶</div><small>${esc(t.date)} · ${esc(t.id)}</small></div>
                <div class="tf-end in"><i>转入账户</i><b>${esc(accName(t.to))}</b></div>
                <div class="tf-sum">${esc(t.summary||"")} <span class="badge bg-green">${esc(t.status||"已完成")}</span></div></div>`).join("")}</div>`
            :'<div class="empty"><div class="ic">📭</div>暂无内部转账记录，点击右上角"发起转账"</div>';
    }

    return { html, mount(){ render(); $("#tfAdd").onclick=openForm; } };
}

function passwordPage(leaf){
    const html=`<div class="page-head"><div><h1>修改密码</h1><p>个人 · 账户安全</p></div></div>
    <div class="card" style="max-width:520px"><div class="card-body">
        <div class="field" style="margin-bottom:14px"><label>原密码</label><input class="input" type="password" id="p0"></div>
        <div class="field" style="margin-bottom:14px"><label>新密码</label><input class="input" type="password" id="p1"></div>
        <div class="field" style="margin-bottom:18px"><label>确认新密码</label><input class="input" type="password" id="p2"></div>
        <button class="btn btn-primary" id="save">保存修改</button>
    </div></div>`;
    return { html, mount(){ $("#save").onclick=()=>{
        if(!$("#p1").value){ toast("请输入新密码","err"); return; }
        if($("#p1").value!==$("#p2").value){ toast("两次密码不一致","err"); return; }
        toast("密码修改成功（演示）","ok");
    }; } };
}

function diagramPage(leaf){
    const node=(t,c)=>`<div style="background:${c};color:#fff;border-radius:10px;padding:10px 16px;font-weight:700;text-align:center;box-shadow:0 6px 16px rgba(16,40,90,.18)">${t}</div>`;
    const sub=arr=>`<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:10px">${arr.map(x=>`<span class="tag">${x}</span>`).join("")}</div>`;
    const html=`<div class="page-head"><div><h1>业务逻辑图</h1><p>个人 · 系统数据关系总览</p></div></div>
    <div class="card"><div class="card-body" style="text-align:center">
        ${node("项目（主线）","#0a1733")}
        <div style="font-size:22px;color:#c7d0e0;margin:8px">▼</div>
        <div class="grid-3">
            <div class="card" style="box-shadow:none"><div class="card-body">${node("合同","#1b5fe3")}${sub(["收款","付款","发票","结算","变更","索赔/扣款/罚款"])}</div></div>
            <div class="card" style="box-shadow:none"><div class="card-body">${node("工程量清单","#14b8d4")}${sub(["甲方报量","分包收方","材料消耗反算"])}</div></div>
            <div class="card" style="box-shadow:none"><div class="card-body">${node("进度填报","#16a34a")}${sub(["分部分项","形象进度","进度分析"])}</div></div>
            <div class="card" style="box-shadow:none"><div class="card-body">${node("成本台账","#e8890c")}${sub(["人工","材料","机械","分包","间接费"])}</div></div>
            <div class="card" style="box-shadow:none"><div class="card-body">${node("资金计划","#7c3aed")}${sub(["收入计划","支出计划","现金流"])}</div></div>
            <div class="card" style="box-shadow:none"><div class="card-body">${node("采购/库存","#0d9488")}${sub(["采购合同","入库","库存","付款","收票"])}</div></div>
        </div>
        <p style="color:#5b6478;margin-top:18px;font-size:13.5px">项目 1→N 合同 / 清单 / 进度 / 成本 / 资金 / 收付款 / 发票；合同 N→1 项目；清单 N→1 项目；采购·入库·库存·付款·收票互相关联。</p>
    </div></div>`;
    return { html, mount(){} };
}

function attendancePage(leaf){
    // 使用专用集合做考勤列表
    const fields=[
        {key:"name",label:"姓名",col:true,required:true},{key:"project",label:"所属项目",type:"select",options:Store.all("projects").map(p=>({value:p.id,label:p.name})),col:true,filter:true},
        {key:"date",label:"日期",type:"date",col:true,date:true},{key:"checkin",label:"上班打卡",type:"time",col:true},
        {key:"checkout",label:"下班打卡",type:"time",col:true},{key:"status",label:"考勤状态",type:"select",options:["正常","迟到","早退","缺勤","请假"],badge:true,col:true,filter:true,default:"正常"},
        {key:"remark",label:"备注",type:"textarea",full:true}];
    return listPage(leaf, {kind:"list", fields});
}

/* 流程设置：配置每类单据的逐级审批链（驱动整个审批流引擎） */
function flowPage(leaf){
    const COLL_NAMES = {fin_salary:"薪资付款", cost:"成本/报销", contracts:"承包合同", subcontracts:"分包合同", fin_income:"合同收款", "*":"其它全部单据"};
    const roleOpts = () => Store.all("sys_roles").filter(r=>!r.isSuper).map(r=>({value:r.id,label:r.name}));
    function render(){
        const defs = Store.all("sys_flows");
        $("#flowList").innerHTML = defs.map(d=>`
        <div class="card mb"><div class="card-head"><h3>${esc(d.name)}</h3>
            <span class="sub">适用：${(d.colls||[]).map(c=>COLL_NAMES[c]||c).join("、")}</span></div>
        <div class="card-body">
            <div class="flow-timeline" style="margin-bottom:14px">
                <div class="fstep done"><div class="fdot">✎</div><div class="finfo"><b>提交</b><span>经办人</span></div></div>
                <div class="fline"></div>
                ${(d.steps||[]).map((s,i)=>`<div class="fstep cur" style="--i:${i}"><div class="fdot">${i+1}</div>
                    <div class="finfo"><b>${esc(s.name)}</b>${s.minAmount?`<small>≥${s.minAmount}万才需此级</small>`:"<span>逐级审批</span>"}</div></div>`).join('<div class="fline"></div>')}
                <div class="fline"></div>
                <div class="fstep done"><div class="fdot">🏁</div><div class="finfo"><b>通过</b></div></div>
            </div>
            <button class="btn btn-light btn-sm" data-edit="${d.id}">⚙ 编辑流程</button>
        </div></div>`).join("");
        $$("#flowList [data-edit]").forEach(b=>b.onclick=()=>editDef(b.dataset.edit));
    }
    function editDef(id){
        const d = Store.get("sys_flows", id);
        const steps = JSON.parse(JSON.stringify(d.steps||[]));
        const row = (s={},i)=>`<div class="kr-edit" data-i="${i}" style="grid-template-columns:1.4fr 1fr 32px">
            <select class="select" data-k="roleId">${options(roleOpts(), s.roleId||"R-gm")}</select>
            <input class="input" type="number" data-k="minAmount" placeholder="金额门槛(万,可空)" value="${s.minAmount||""}">
            <button class="kr-del" data-del>✕</button></div>`;
        modal({ title:`编辑流程 · ${d.name}`, large:true,
            body:`<p class="okr-tip" style="margin-bottom:14px">单据将按以下顺序逐级流转，上一级批准后自动到达下一级；填了金额门槛的级别，仅当单据金额达到门槛时才参与审批。</p>
                <div class="kr-editor"><div class="kr-editor-head"><b>审批级别（自上而下）</b><button class="btn btn-light btn-sm" id="addStep">＋ 加一级</button></div>
                <div id="stepRows">${steps.map((s,i)=>row(s,i)).join("")}</div></div>`,
            footer:`<button class="btn btn-light" data-close>取消</button><button class="btn btn-primary" data-save>保存流程</button>`,
            onMount:(el,close)=>{
                const rowsEl=el.querySelector("#stepRows"); let idx=steps.length;
                const bindDel=()=>el.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>b.closest(".kr-edit").remove());
                el.querySelector("#addStep").onclick=()=>{ rowsEl.insertAdjacentHTML("beforeend", row({},idx++)); bindDel(); };
                bindDel();
                el.querySelector("[data-save]").onclick=()=>{
                    const roles = Store.all("sys_roles");
                    const newSteps = Array.from(rowsEl.querySelectorAll(".kr-edit")).map(r=>{
                        const roleId=r.querySelector('[data-k="roleId"]').value;
                        const role=roles.find(x=>x.id===roleId);
                        const mv=r.querySelector('[data-k="minAmount"]').value;
                        const st={roleId, name:role?role.name:roleId};
                        if(mv) st.minAmount=+mv;
                        return st;
                    });
                    if(!newSteps.length){ toast("至少保留一级审批","err"); return; }
                    Store.update("sys_flows", id, {steps:newSteps});
                    toast("流程已保存，新建单据即按新流程流转"); close(); render();
                };
            }
        });
    }
    const html=`<div class="page-head"><div><h1>流程设置</h1><p>系统 · 配置各类单据的逐级审批链（员工→经理→总经理…）</p></div></div>
        <p class="okr-tip" style="margin-bottom:16px">💡 审批流引擎说明：新建单据自动进入流程第一级 → 该级角色的「待办事项」出现此单 → 批准后自动流向下一级 → 全部通过即「已批准」；任一级驳回则打回提交人，修改后可重新提交。</p>
        <div id="flowList"></div>`;
    return { html, mount(){ render(); } };
}

/* ---------- 入口 ---------- */
/* ---------- 我的薪资：读取财务"薪资付款"(fin_salary)中属于当前用户的记录 ---------- */
function mySalaryPage(leaf){
    const u = currentUser() || {name:""};
    const mine = () => Store.all("fin_salary").filter(r=>{
        const p = String(r.party||"").trim(); if(!p) return false;
        return p===u.name || p===u.username || u.name.includes(p) || p.includes(u.name);
    });
    function render(){
        const list = mine();
        const paid = list.filter(r=>r.status==="已付款");
        const totalPaid = paid.reduce((a,r)=>a+(+r.amount||0),0);
        const pending = list.filter(r=>r.status!=="已付款");
        $("#salKpis").innerHTML = `
        <div class="kpi b-green"><div class="kpi-top"><div class="kpi-ic">💴</div><div class="kpi-label">累计实发</div></div><div class="kpi-val">${fmt.money(totalPaid)}</div></div>
        <div class="kpi b-blue"><div class="kpi-top"><div class="kpi-ic">📄</div><div class="kpi-label">发放笔数</div></div><div class="kpi-val">${paid.length}<span class="u"> 笔</span></div></div>
        <div class="kpi b-orange"><div class="kpi-top"><div class="kpi-ic">⏳</div><div class="kpi-label">待发放</div></div><div class="kpi-val">${pending.length}<span class="u"> 笔</span></div></div>
        <div class="kpi b-purple"><div class="kpi-top"><div class="kpi-ic">🗓️</div><div class="kpi-label">最近发放</div></div><div class="kpi-val" style="font-size:18px">${(paid[0]&&paid[0].date)||"—"}</div></div>`;
        $("#salTbl").innerHTML = table([
            {title:"薪资月份",render:r=>`<span class="strong">${esc(r.period||"—")}</span>`},
            {title:"金额(万元)",align:"right",render:r=>`<span class="num strong" style="color:#16a34a">${fmt.num(r.amount)}</span>`},
            {title:"付款方式",render:r=>esc(r.method||"—")},
            {title:"付款日期",align:"center",render:r=>r.date||"—"},
            {title:"审批状态",align:"center",render:r=>badge(r.approval||"待审批")},
            {title:"发放状态",align:"center",render:r=>badge(r.status||"待付款")},
        ], list);
    }
    const html = `<div class="page-head"><div><h1>我的薪资</h1><p>个人 · ${esc(u.name)} 的薪资发放记录（由财务"薪资付款"自动同步）</p></div></div>
    <div class="kpi-grid" id="salKpis"></div>
    <div class="card"><div class="card-head"><h3>发放明细</h3><span class="sub">仅本人可见</span></div>
        <div class="card-body" style="padding-top:6px"><div id="salTbl"></div></div></div>`;
    return { html, mount(){ render(); } };
}

export function renderLeaf(leaf, schema, dashboard){
    switch(schema.kind){
        case "dashboard": return dashboard();
        case "stat": return statPage(leaf, schema);
        case "todo": return todoPage(leaf);
        case "my_salary": return mySalaryPage(leaf);
        case "transfer": return bankTransferPage(leaf);
        case "password": return passwordPage(leaf);
        case "diagram": return diagramPage(leaf);
        case "attendance": return attendancePage(leaf);
        case "flow": return flowPage(leaf);
        default: return listPage(leaf, schema);
    }
}
