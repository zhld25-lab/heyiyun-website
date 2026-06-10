/* ============================================================
   通用页面引擎：按 schema 渲染 列表 / 详情 / 表单 / 统计 / 特殊页
   ============================================================ */
import { Store, fmt } from "./store.js";
import { $, $$, table, badge, riskBadge, bar, modal, confirmBox, toast, options, esc } from "./ui.js";
import { barChart, donutChart, legendHTML, PALETTE } from "./charts.js";

const projName = id => { const p=Store.get("projects",id); return p?p.name:(id||"—"); };

/* 字段值渲染 */
function show(field, rec){
    let v = rec[field.key];
    if(v==null || v==="") return '<span class="muted">—</span>';
    if(field.key==="project") return esc(projName(v));
    if(field.money) return `<span class="num">${fmt.money(+v||0)}</span>`;
    if(field.riskBadge) return riskBadge(v);
    if(field.badge) return badge(v);
    if(field.bar) return bar(+v||0);
    return esc(v);
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
    function rows(){
        return Store.all(leaf.coll).filter(r=>{
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
    function wire(){
        $$("#viewArea [data-act='view']").forEach(b=>b.onclick=()=>detail(b.dataset.id));
        $$("#viewArea [data-act='edit']").forEach(b=>b.onclick=()=>form(b.dataset.id));
        $$("#viewArea [data-act='del']").forEach(b=>b.onclick=()=>confirmBox(`确认删除该${leaf.name}记录？`,()=>{Store.remove(leaf.coll,b.dataset.id);toast("已删除");render();}));
    }

    function detail(id){
        const r = Store.get(leaf.coll,id); if(!r) return;
        const items = fields.map(f=>({label:f.label, value:f.full&&f.type==="textarea"?esc(r[f.key]||"—"):show(f,r), full:f.full}));
        modal({ title:`${leaf.name}详情`, large:true,
            body:`<div class="detail-grid">${items.map(it=>`<div class="di ${it.full?'full':''}"><span>${it.label}</span><b>${it.value}</b></div>`).join("")}
                <div class="di full"><span>单据编号</span><b>${r.id}</b></div></div>`,
            footer:`<button class="btn btn-light" data-close>关闭</button><button class="btn btn-primary" data-edit>编辑</button>`,
            onMount:(el,close)=>{ el.querySelector("[data-edit]").onclick=()=>{close();form(id);}; }
        });
    }

    function form(id){
        const r = id?Store.get(leaf.coll,id):{};
        const body = `<div class="form-grid">${fields.map(f=>{
            const v = r[f.key]!=null?r[f.key]:(f.default!=null?f.default:"");
            const cls = f.full?"field full":"field";
            if(f.type==="select") return `<div class="${cls}"><label>${f.label}${f.required?' <span class="req">*</span>':''}</label><select class="select" data-k="${f.key}">${options(f.options||[],v)}</select></div>`;
            if(f.type==="textarea") return `<div class="${cls}"><label>${f.label}</label><textarea data-k="${f.key}" placeholder="${f.placeholder||''}">${esc(v)}</textarea></div>`;
            return `<div class="${cls}"><label>${f.label}${f.required?' <span class="req">*</span>':''}</label><input class="input" type="${f.type||'text'}" data-k="${f.key}" value="${esc(v)}" placeholder="${f.placeholder||''}"></div>`;
        }).join("")}</div>`;
        modal({ title:id?`编辑${leaf.name}`:`新建${leaf.name}`, large:true, body,
            footer:`<button class="btn btn-light" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>`,
            onMount:(el,close)=>{ el.querySelector("[data-save]").onclick=()=>{
                const data={};
                for(const f of fields){ const node=el.querySelector(`[data-k="${f.key}"]`); let val=node.value;
                    if(f.type==="number") val=+val||0;
                    if(f.required && !String(val).trim()){ toast(`请填写${f.label}`,"err"); return; }
                    data[f.key]=val; }
                if(id){ Store.update(leaf.coll,id,data); toast("已更新"); }
                else { Store.add(leaf.coll,data); toast("已创建"); }
                close(); render();
            }; }
        });
    }

    function mount(){
        $("#addBtn").onclick=()=>form();
        $("#impBtn").onclick=()=>toast("演示：导入功能将解析 Excel 批量入库","ok");
        $("#q").oninput=e=>{state.q=e.target.value;render();};
        $$("[data-f]").forEach(s=>s.onchange=e=>{state.filters[s.dataset.f]=e.target.value;render();});
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
        $("#expBtn").onclick=()=>toast("演示：统计结果可导出 Excel","ok");
    }
    return { html, mount };
}

/* ---------- 特殊页 ---------- */
function todoPage(leaf){
    // 汇总各业务集合中待审批单据
    const colls=["contracts","subcontracts","cost","fin_income"];
    const pend=[];
    colls.forEach(c=>Store.all(c).forEach(r=>{ if(["待审批","审批中","草稿"].includes(r.approval)) pend.push({c,r}); }));
    const html=`<div class="page-head"><div><h1>${esc(leaf.name)}</h1><p>个人 · 我的工作台</p></div></div>
    <div class="card"><div class="card-head"><h3>${leaf.name}列表</h3><span class="sub">共 ${pend.length} 项</span></div>
    <div class="card-body"><div class="feed">${pend.length?pend.map(({c,r})=>`
        <div class="feed-item"><div class="feed-dot" style="background:#e7efff">📋</div>
        <div class="ct"><div class="t">${esc(r.name||r.code||r.id)}</div><div class="d">${esc(projName(r.project))} · ${badge(r.approval||"待审批")}</div></div>
        <div class="tm">${r.date||r.signedDate||""}</div></div>`).join(""):'<div class="empty"><div class="ic">✅</div>暂无待办事项</div>'}</div></div></div>`;
    return { html, mount(){} };
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

function flowPage(leaf){
    const fields=[
        {key:"docType",label:"单据类型",col:true,required:true,filter:true,type:"select",options:["承包合同","分包合同","付款单","收款单","报销单","采购合同"]},
        {key:"level1",label:"一级审批人",col:true},{key:"level2",label:"二级审批人",col:true},
        {key:"level3",label:"三级审批人",col:true},{key:"status",label:"启用状态",type:"select",options:["启用","停用"],badge:true,col:true,filter:true,default:"启用"},
        {key:"remark",label:"说明",type:"textarea",full:true}];
    return listPage(leaf, {kind:"list", fields});
}

/* ---------- 入口 ---------- */
export function renderLeaf(leaf, schema, dashboard){
    switch(schema.kind){
        case "dashboard": return dashboard();
        case "stat": return statPage(leaf, schema);
        case "todo": return todoPage(leaf);
        case "password": return passwordPage(leaf);
        case "diagram": return diagramPage(leaf);
        case "attendance": return attendancePage(leaf);
        case "flow": return flowPage(leaf);
        default: return listPage(leaf, schema);
    }
}
