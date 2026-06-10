/* ============================================================
   OKR 考核系统 —— 贴合电力工程岗位的目标与关键结果管理
   总览 / 我的OKR / 目标制定 / 自评 / 上级评分 / 考核结果 / 模板 / 规则
   ============================================================ */
import { Store, fmt } from "../store.js";
import { $, $$, modal, table, badge, bar, toast, options, confirmBox, esc } from "../ui.js";
import { donutChart, barChart, legendHTML, PALETTE } from "../charts.js";

const me = (()=>{ try{ return JSON.parse(localStorage.getItem("heyiyun_erp_user"))?.name || "管理员"; }catch(e){ return "管理员"; } })();
const projName = id => { const p=Store.get("projects",id); return p?p.name:id; };
const rule = () => Store.all("okr_rules")[0] || {selfWeight:30,mgrWeight:70,gradeS:90,gradeA:80,gradeB:70,gradeC:60};

const objProgress = o => { const w=(o.krs||[]).reduce((a,k)=>a+(+k.weight||0),0)||1; return Math.round((o.krs||[]).reduce((a,k)=>a+(+k.progress||0)*(+k.weight||0),0)/w); };
function finalScore(o){ const r=rule(); if(o.selfScore==null && o.mgrScore==null) return null; return Math.round((+o.selfScore||0)*r.selfWeight/100 + (+o.mgrScore||0)*r.mgrWeight/100); }
function gradeOf(s){ const r=rule(); if(s==null) return {label:"未评分",cls:"bg-gray"};
    if(s>=r.gradeS) return {label:"优秀",cls:"bg-green"}; if(s>=r.gradeA) return {label:"良好",cls:"bg-blue"};
    if(s>=r.gradeB) return {label:"合格",cls:"bg-teal"}; if(s>=r.gradeC) return {label:"待改进",cls:"bg-orange"}; return {label:"不合格",cls:"bg-red"}; }
const healthCls = p => p>=80?"g":p>=50?"":p>=30?"o":"r";

function periods(){ return Store.all("okr_periods").map(p=>p.name); }
function curPeriod(){ const p=Store.all("okr_periods").find(x=>x.status==="进行中"); return p?p.name:(periods()[0]||""); }
function objsOf(period){ return Store.all("okr_objectives").filter(o=>!period||o.period===period); }

function persons(period){
    const map={};
    objsOf(period).forEach(o=>{ (map[o.owner]=map[o.owner]||{owner:o.owner,role:o.role,dept:o.dept,projectType:o.projectType,objs:[]}).objs.push(o); });
    return Object.values(map).map(p=>{
        const w=p.objs.reduce((a,o)=>a+o.weight,0)||1;
        const progress=Math.round(p.objs.reduce((a,o)=>a+objProgress(o)*o.weight,0)/w);
        const scored=p.objs.filter(o=>finalScore(o)!=null);
        const sw=scored.reduce((a,o)=>a+o.weight,0)||1;
        const score=scored.length?Math.round(scored.reduce((a,o)=>a+finalScore(o)*o.weight,0)/sw):null;
        return {...p, progress, score};
    });
}

/* 目标卡片（只读展示） */
function objectiveCard(o){
    const prog=objProgress(o), fin=finalScore(o), g=gradeOf(fin);
    return `<div class="okr-obj">
        <div class="okr-obj-head">
            <div><span class="tag">${o.type||"业绩目标"}</span> <b>${esc(o.title)}</b>
                <div class="muted" style="font-size:12px;margin-top:4px">${esc(o.owner)} · ${esc(o.role)} · ${esc(o.projectType)}${o.project?` · ${esc(projName(o.project))}`:""} · 权重 ${o.weight}%</div></div>
            <div style="text-align:right;white-space:nowrap">${badge(o.status)} ${fin!=null?`<span class="badge ${g.cls}">${g.label} ${fin}</span>`:""}</div>
        </div>
        <div class="bar-wrap" style="margin:12px 0 14px"><div class="bar ${healthCls(prog)}"><i style="width:${prog}%"></i></div><b>${prog}%</b></div>
        <div class="okr-krs">${(o.krs||[]).map((k,i)=>`
            <div class="okr-kr"><div class="kr-num">KR${i+1}</div>
                <div style="flex:1"><div class="kr-t">${esc(k.title)}</div>
                    <div class="kr-meta">目标 <b>${esc(k.target)}</b> · 当前 <b style="color:#1b5fe3">${esc(k.current)}</b> · 权重 ${k.weight}%</div>
                    <div style="margin-top:6px">${bar(+k.progress||0)}</div></div></div>`).join("")}</div>
        ${(o.checkins&&o.checkins.length)?`<div class="okr-checkin">📝 <b>${o.checkins[o.checkins.length-1].date}</b> ${esc(o.checkins[o.checkins.length-1].note)}</div>`:""}
    </div>`;
}

function personModal(owner, period){
    const objs = objsOf(period).filter(o=>o.owner===owner);
    const p = persons(period).find(x=>x.owner===owner)||{};
    const g=gradeOf(p.score);
    modal({ title:`${owner} 的 OKR · ${period}`, large:true,
        body:`<div class="okr-person-head">
            <div class="detail-grid" style="flex:1">
                <div class="di"><span>岗位角色</span><b>${esc(p.role||"")}</b></div>
                <div class="di"><span>所属部门</span><b>${esc(p.dept||"")}</b></div>
                <div class="di"><span>项目类型</span><b>${esc(p.projectType||"")}</b></div>
                <div class="di"><span>目标完成度</span><b>${p.progress||0}%</b></div>
                <div class="di"><span>综合得分</span><b>${p.score!=null?p.score:"—"}</b></div>
                <div class="di"><span>考核等级</span><b><span class="badge ${g.cls}">${g.label}</span></b></div>
            </div></div>
            <div style="margin-top:8px">${objs.map(objectiveCard).join("")}</div>`,
        footer:`<button class="btn btn-light" data-close>关闭</button>`
    });
}

/* ===== 1. OKR 总览 ===== */
function overview(){
    const period = curPeriod();
    const objs = objsOf(period);
    const ps = persons(period);
    const krCount = objs.reduce((a,o)=>a+(o.krs?o.krs.length:0),0);
    const avgProg = ps.length?Math.round(ps.reduce((a,p)=>a+p.progress,0)/ps.length):0;
    const scored = ps.filter(p=>p.score!=null);
    const avgScore = scored.length?Math.round(scored.reduce((a,p)=>a+p.score,0)/scored.length):0;
    const gradeDist = {};
    ps.forEach(p=>{ const g=gradeOf(p.score).label; gradeDist[g]=(gradeDist[g]||0)+1; });
    const gradeData = Object.entries(gradeDist).map(([label,value],i)=>({label,value,color:PALETTE[i%PALETTE.length]}));
    const ranked = ps.slice().sort((a,b)=>(b.score||b.progress)-(a.score||a.progress));

    const html = `
    <div class="page-head"><div><h1>OKR 总览</h1><p>考核 · 全员目标达成与考核健康度 · ${period}</p></div>
        <div class="actions"><select class="select" id="period">${options(periods(),period)}</select>
        <button class="btn btn-primary" id="goObj">目标制定 ›</button></div></div>
    <div class="kpi-grid">
        <div class="kpi b-blue"><div class="kpi-top"><div class="kpi-ic">👥</div><div class="kpi-label">参与考核</div></div><div class="kpi-val">${ps.length}<span class="u"> 人</span></div></div>
        <div class="kpi b-purple"><div class="kpi-top"><div class="kpi-ic">🎯</div><div class="kpi-label">目标 / 关键结果</div></div><div class="kpi-val">${objs.length}<span class="u"> O · ${krCount} KR</span></div></div>
        <div class="kpi b-orange"><div class="kpi-top"><div class="kpi-ic">📊</div><div class="kpi-label">平均完成度</div></div><div class="kpi-val">${avgProg}<span class="u"> %</span></div></div>
        <div class="kpi b-green"><div class="kpi-top"><div class="kpi-ic">⭐</div><div class="kpi-label">平均得分</div></div><div class="kpi-val">${avgScore}<span class="u"> 分</span></div></div>
    </div>
    <div class="grid-2 mb">
        <div class="card"><div class="card-head"><h3>各岗位目标完成度</h3><span class="sub">%</span></div><div class="card-body"><div id="byRole"></div></div></div>
        <div class="card"><div class="card-head"><h3>考核等级分布</h3><span class="sub">人数</span></div><div class="card-body"><div id="byGrade"></div>${legendHTML(gradeData)}</div></div>
    </div>
    <div class="card"><div class="card-head"><h3>OKR 排行榜</h3><span class="sub">点击查看个人 OKR</span></div>
        <div class="card-body" style="padding-top:6px"><div id="board"></div></div></div>`;

    function mount(){
        $("#period").onchange=e=>{ const p=Store.all("okr_periods").find(x=>x.name===e.target.value); /*切换演示：仅当前季度有数据*/ toast("已切换周期"); };
        $("#goObj").onclick=()=>location.hash="okr_0_2";
        barChart($("#byRole"),{ labels:ps.map(p=>p.role), series:[{data:ps.map(p=>p.progress),color:"#1b5fe3"}], height:260 });
        donutChart($("#byGrade"),{ data:gradeData, height:240, centerValue:ps.length, centerLabel:"考核人数" });
        $("#board").innerHTML = table([
            {title:"排名",align:"center",render:r=>`<b>${r._rk}</b>`},
            {title:"姓名",render:r=>`<span class="strong">${esc(r.owner)}</span>`},
            {title:"岗位",render:r=>esc(r.role)},
            {title:"项目类型",render:r=>`<span class="tag">${esc(r.projectType)}</span>`},
            {title:"完成度",render:r=>bar(r.progress)},
            {title:"得分",align:"center",render:r=>r.score!=null?`<b>${r.score}</b>`:'<span class="muted">—</span>'},
            {title:"等级",align:"center",render:r=>{const g=gradeOf(r.score);return `<span class="badge ${g.cls}">${g.label}</span>`;}},
        ], ranked.map((r,i)=>({...r,id:r.owner,_rk:i+1})));
        $$("#board .tbl tbody tr").forEach(tr=>{ if(tr.dataset.id){ tr.style.cursor="pointer"; tr.onclick=()=>personModal(tr.dataset.id, period); } });
    }
    return { html, mount };
}

/* ===== 2. 我的 OKR ===== */
function myOkr(){
    const period = curPeriod();
    const objs = objsOf(period).filter(o=>o.owner===me);
    const p = persons(period).find(x=>x.owner===me);
    const g = gradeOf(p?p.score:null);
    const html = `
    <div class="page-head"><div><h1>我的 OKR</h1><p>考核 · ${esc(me)} · ${period}</p></div>
        <div class="actions"><button class="btn btn-primary" id="add">＋ 新建目标</button></div></div>
    ${p?`<div class="kpi-grid">
        <div class="kpi b-blue"><div class="kpi-top"><div class="kpi-ic">🎯</div><div class="kpi-label">我的目标</div></div><div class="kpi-val">${objs.length}<span class="u"> 个</span></div></div>
        <div class="kpi b-orange"><div class="kpi-top"><div class="kpi-ic">📊</div><div class="kpi-label">完成度</div></div><div class="kpi-val">${p.progress}<span class="u"> %</span></div></div>
        <div class="kpi b-green"><div class="kpi-top"><div class="kpi-ic">⭐</div><div class="kpi-label">综合得分</div></div><div class="kpi-val">${p.score!=null?p.score:"—"}</div></div>
        <div class="kpi b-purple"><div class="kpi-top"><div class="kpi-ic">🏅</div><div class="kpi-label">考核等级</div></div><div class="kpi-val" style="font-size:22px"><span class="badge ${g.cls}" style="font-size:14px">${g.label}</span></div></div>
    </div>`:""}
    <div id="list">${objs.length?objs.map(objectiveCard).join(""):'<div class="empty"><div class="ic">🎯</div>本周期暂无目标，点击右上角「新建目标」开始制定</div>'}</div>`;
    function mount(){ $("#add").onclick=()=>objForm(null,{owner:me, period}); }
    return { html, mount };
}

/* ===== 3. 目标制定（列表 + KR 编辑） ===== */
function objectivesPage(){
    const state={ period:curPeriod(), owner:"", role:"", type:"", status:"" };
    const ownerOpts=()=>[...new Set(Store.all("okr_objectives").map(o=>o.owner))];
    const roleOpts=()=>[...new Set(Store.all("okr_objectives").map(o=>o.role))];
    const html=`
    <div class="page-head"><div><h1>目标制定</h1><p>考核 · 目标与关键结果(O-KR)管理</p></div>
        <div class="actions"><button class="btn btn-light" id="tpl">套用模板</button><button class="btn btn-primary" id="add">＋ 新建目标</button></div></div>
    <div class="toolbar">
        <select class="select" data-f="period">${options(periods(),state.period)}</select>
        <select class="select" data-f="owner"><option value="">全部成员</option>${options(ownerOpts(),"")}</select>
        <select class="select" data-f="role"><option value="">全部岗位</option>${options(roleOpts(),"")}</select>
        <select class="select" data-f="type"><option value="">全部类型</option>${options(["业绩目标","管理目标","成长目标","安全目标","战略目标"],"")}</select>
        <select class="select" data-f="status"><option value="">全部状态</option>${options(["进行中","延期","受阻","已完成"],"")}</select>
        <div class="grow"></div><div id="sum" style="font-size:13px;color:#5b6478"></div>
    </div>
    <div id="area"></div>`;
    function rows(){ return Store.all("okr_objectives").filter(o=>
        (!state.period||o.period===state.period)&&(!state.owner||o.owner===state.owner)&&(!state.role||o.role===state.role)&&(!state.type||o.type===state.type)&&(!state.status||o.status===state.status)); }
    function render(){
        const data=rows();
        $("#area").innerHTML=table([
            {title:"成员",render:r=>`<span class="strong">${esc(r.owner)}</span><div class="muted" style="font-size:12px">${esc(r.role)}</div>`},
            {title:"目标",render:r=>`<div class="strong">${esc(r.title)}</div><div class="muted" style="font-size:12px"><span class="tag">${r.type}</span> ${esc(r.projectType)} · ${r.krs?r.krs.length:0} 个KR · 权重${r.weight}%</div>`},
            {title:"完成度",render:r=>bar(objProgress(r))},
            {title:"状态",align:"center",render:r=>badge(r.status)},
            {title:"得分",align:"center",render:r=>{const f=finalScore(r);const g=gradeOf(f);return f!=null?`<span class="badge ${g.cls}">${g.label} ${f}</span>`:'<span class="muted">未评</span>';}},
            {title:"操作",align:"center",render:r=>`<div class="row-act"><button data-v="${r.id}">详情</button><button data-e="${r.id}">编辑</button><button data-d="${r.id}">删除</button></div>`},
        ], data);
        $("#sum").innerHTML=`共 <b>${data.length}</b> 个目标`;
        $$("#area [data-v]").forEach(b=>b.onclick=()=>objDetail(b.dataset.v));
        $$("#area [data-e]").forEach(b=>b.onclick=()=>objForm(b.dataset.e));
        $$("#area [data-d]").forEach(b=>b.onclick=()=>confirmBox("确认删除该目标？",()=>{Store.remove("okr_objectives",b.dataset.d);toast("已删除");render();}));
    }
    function mount(){
        $$("[data-f]").forEach(s=>s.onchange=e=>{state[s.dataset.f]=e.target.value;render();});
        $("#add").onclick=()=>objForm(null,{period:state.period});
        $("#tpl").onclick=()=>location.hash="okr_2_0";
        render();
    }
    return { html, mount };
}

function objDetail(id){
    const o=Store.get("okr_objectives",id); if(!o) return;
    modal({ title:"目标详情", large:true, body:objectiveCard(o)+
        `<div class="okr-score-box">
            <div><span>员工自评</span><b>${o.selfScore!=null?o.selfScore+" 分":"未自评"}</b></div>
            <div><span>上级评分</span><b>${o.mgrScore!=null?o.mgrScore+" 分":"未评分"}</b></div>
            <div><span>综合得分</span><b style="color:#1b5fe3">${finalScore(o)!=null?finalScore(o)+" 分":"—"}</b></div>
            <div><span>考核等级</span><b><span class="badge ${gradeOf(finalScore(o)).cls}">${gradeOf(finalScore(o)).label}</span></b></div>
        </div>`,
        footer:`<button class="btn btn-light" data-close>关闭</button><button class="btn btn-primary" data-edit>编辑目标</button>`,
        onMount:(el,close)=>{ el.querySelector("[data-edit]").onclick=()=>{close();objForm(id);}; } });
}

/* 目标表单（含动态 KR 编辑） */
function objForm(id, prefill){
    const o = id?Object.assign({},Store.get("okr_objectives",id)):(Object.assign({krs:[]},prefill));
    const krList = JSON.parse(JSON.stringify(o.krs||[]));
    const projOpts=[{value:"",label:"（不关联）"}].concat(Store.all("projects").map(p=>({value:p.id,label:p.name})));
    const krRow = (k={},i)=>`<div class="kr-edit" data-i="${i}">
        <input class="input" data-k="title" placeholder="关键结果描述" value="${esc(k.title||"")}">
        <input class="input" data-k="target" placeholder="目标值" value="${esc(k.target||"")}">
        <input class="input" data-k="current" placeholder="当前值" value="${esc(k.current||"")}">
        <input class="input" type="number" data-k="weight" placeholder="权重%" value="${k.weight||""}">
        <input class="input" type="number" data-k="progress" placeholder="进度%" value="${k.progress||""}">
        <button class="kr-del" data-del="${i}">✕</button></div>`;
    const body=`<div class="form-grid">
        <div class="field"><label>考核周期</label><select class="select" data-f="period">${options(periods(),o.period||curPeriod())}</select></div>
        <div class="field"><label>负责人 <span class="req">*</span></label><input class="input" data-f="owner" value="${esc(o.owner||"")}"></div>
        <div class="field"><label>岗位角色</label><input class="input" data-f="role" value="${esc(o.role||"")}" placeholder="如 项目经理"></div>
        <div class="field"><label>所属部门</label><input class="input" data-f="dept" value="${esc(o.dept||"")}"></div>
        <div class="field"><label>项目类型</label><input class="input" data-f="projectType" value="${esc(o.projectType||"")}" placeholder="如 输变电"></div>
        <div class="field"><label>关联项目</label><select class="select" data-f="project">${options(projOpts,o.project||"")}</select></div>
        <div class="field"><label>目标类型</label><select class="select" data-f="type">${options(["业绩目标","管理目标","成长目标","安全目标","战略目标"],o.type||"业绩目标")}</select></div>
        <div class="field"><label>权重(%)</label><input class="input" type="number" data-f="weight" value="${o.weight||""}"></div>
        <div class="field"><label>状态</label><select class="select" data-f="status">${options(["进行中","延期","受阻","已完成"],o.status||"进行中")}</select></div>
        <div class="field full"><label>目标(Objective) <span class="req">*</span></label><input class="input" data-f="title" value="${esc(o.title||"")}" placeholder="一句话描述要达成的目标"></div>
    </div>
    <div class="kr-editor"><div class="kr-editor-head"><b>关键结果 (Key Results)</b><button class="btn btn-light btn-sm" id="addKr">＋ 添加 KR</button></div>
        <div class="kr-edit head"><span>关键结果</span><span>目标值</span><span>当前值</span><span>权重%</span><span>进度%</span><span></span></div>
        <div id="krRows">${krList.map((k,i)=>krRow(k,i)).join("")}</div></div>
    <div class="form-grid" style="margin-top:14px">
        <div class="field"><label>员工自评(0-100)</label><input class="input" type="number" data-f="selfScore" value="${o.selfScore!=null?o.selfScore:""}"></div>
        <div class="field"><label>上级评分(0-100)</label><input class="input" type="number" data-f="mgrScore" value="${o.mgrScore!=null?o.mgrScore:""}"></div>
        <div class="field full"><label>本期检查/沟通记录</label><textarea data-f="checkin" placeholder="填写过程进展、问题与下一步（可选）"></textarea></div>
    </div>`;
    modal({ title:id?"编辑目标":"新建目标", large:true, body,
        footer:`<button class="btn btn-light" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>`,
        onMount:(el,close)=>{
            const krRowsEl=el.querySelector("#krRows");
            let idx=krList.length;
            el.querySelector("#addKr").onclick=()=>{ krRowsEl.insertAdjacentHTML("beforeend", krRow({},idx)); idx++; bindDel(); };
            function bindDel(){ el.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>b.closest(".kr-edit").remove()); }
            bindDel();
            el.querySelector("[data-save]").onclick=()=>{
                const g=k=>el.querySelector(`[data-f="${k}"]`).value;
                const owner=g("owner").trim(), title=g("title").trim();
                if(!owner){ toast("请填写负责人","err"); return; }
                if(!title){ toast("请填写目标","err"); return; }
                const krs=Array.from(krRowsEl.querySelectorAll(".kr-edit")).map(row=>{
                    const gv=k=>row.querySelector(`[data-k="${k}"]`).value;
                    return { title:gv("title"), target:gv("target"), current:gv("current"), weight:+gv("weight")||0, progress:+gv("progress")||0 };
                }).filter(k=>k.title.trim());
                const data={ period:g("period"), owner, role:g("role"), dept:g("dept"), projectType:g("projectType"), project:g("project"),
                    type:g("type"), weight:+g("weight")||0, status:g("status"), title, krs,
                    selfScore:g("selfScore")===""?null:+g("selfScore"), mgrScore:g("mgrScore")===""?null:+g("mgrScore") };
                const checkin=g("checkin").trim();
                const prev = id?Store.get("okr_objectives",id):null;
                data.checkins = prev?(prev.checkins||[]).slice():[];
                if(checkin){ const d=new Date(); data.checkins.push({date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`, note:checkin}); }
                if(id){ Store.update("okr_objectives",id,data); toast("目标已更新"); }
                else { data.id="O-"+Store.newId("").slice(1,5); Store.add("okr_objectives",data); toast("目标已创建"); }
                close(); location.hash===""?location.reload():(window.dispatchEvent(new HashChangeEvent("hashchange")));
            };
        } });
}

/* ===== 4/5. 评分（自评 / 上级评分） ===== */
function scoring(mode){
    const period=curPeriod();
    const isSelf = mode==="self";
    const html=`
    <div class="page-head"><div><h1>${isSelf?"员工自评":"上级评分"}</h1><p>考核 · ${isSelf?"对本周期目标完成情况进行自我评价":"上级对成员目标完成情况评分"} · ${period}</p></div></div>
    <div class="card"><div class="card-body" style="padding-top:8px">
        <p class="okr-tip">💡 评分以激励与沟通为导向：综合得分 = 自评×${rule().selfWeight}% + 上级×${rule().mgrWeight}%。建议结合过程检查与实际贡献，双向沟通后确认。</p>
        <div id="tbl"></div>
    </div></div>`;
    function render(){
        const data=objsOf(period);
        $("#tbl").innerHTML=table([
            {title:"成员",render:r=>`<span class="strong">${esc(r.owner)}</span> <span class="muted">${esc(r.role)}</span>`},
            {title:"目标",render:r=>`${esc(r.title)} <span class="muted">(${r.krs?r.krs.length:0}KR·权重${r.weight}%)</span>`},
            {title:"完成度",render:r=>bar(objProgress(r))},
            {title:"自评",align:"center",render:r=>isSelf?`<input class="score-in" type="number" min="0" max="100" data-s="${r.id}" value="${r.selfScore!=null?r.selfScore:""}">`:(r.selfScore!=null?r.selfScore:'<span class="muted">—</span>')},
            {title:"上级评分",align:"center",render:r=>!isSelf?`<input class="score-in" type="number" min="0" max="100" data-s="${r.id}" value="${r.mgrScore!=null?r.mgrScore:""}">`:(r.mgrScore!=null?r.mgrScore:'<span class="muted">—</span>')},
            {title:"综合",align:"center",render:r=>{const f=finalScore(r);return f!=null?`<b>${f}</b>`:'<span class="muted">—</span>';}},
            {title:"等级",align:"center",render:r=>{const g=gradeOf(finalScore(r));return `<span class="badge ${g.cls}">${g.label}</span>`;}},
        ], data);
        $$("#tbl .score-in").forEach(inp=>inp.onchange=()=>{
            let v=inp.value===""?null:Math.max(0,Math.min(100,+inp.value));
            Store.update("okr_objectives",inp.dataset.s, isSelf?{selfScore:v}:{mgrScore:v});
            toast("评分已保存"); render();
        });
    }
    return { html, mount:render };
}

/* ===== 6. 考核结果 ===== */
function results(){
    const period=curPeriod();
    const ps=persons(period).slice().sort((a,b)=>(b.score||0)-(a.score||0));
    const dist={}; ps.forEach(p=>{const g=gradeOf(p.score).label; dist[g]=(dist[g]||0)+1;});
    const distData=Object.entries(dist).map(([label,value],i)=>({label,value,color:PALETTE[i%PALETTE.length]}));
    const avg=ps.filter(p=>p.score!=null); const avgScore=avg.length?Math.round(avg.reduce((a,p)=>a+p.score,0)/avg.length):0;
    const html=`
    <div class="page-head"><div><h1>考核结果</h1><p>考核 · 综合得分与等级排名 · ${period}</p></div>
        <div class="actions"><button class="btn btn-light" id="exp">⬇ 导出 Excel</button></div></div>
    <div class="kpi-grid">
        <div class="kpi b-blue"><div class="kpi-top"><div class="kpi-ic">👥</div><div class="kpi-label">考核人数</div></div><div class="kpi-val">${ps.length}<span class="u"> 人</span></div></div>
        <div class="kpi b-green"><div class="kpi-top"><div class="kpi-ic">⭐</div><div class="kpi-label">平均得分</div></div><div class="kpi-val">${avgScore}</div></div>
        <div class="kpi b-purple"><div class="kpi-top"><div class="kpi-ic">🏆</div><div class="kpi-label">优秀人数</div></div><div class="kpi-val">${(dist["优秀"]||0)}<span class="u"> 人</span></div></div>
        <div class="kpi b-orange"><div class="kpi-top"><div class="kpi-ic">📈</div><div class="kpi-label">待改进</div></div><div class="kpi-val">${(dist["待改进"]||0)+(dist["不合格"]||0)}<span class="u"> 人</span></div></div>
    </div>
    <div class="grid-2-1">
        <div class="card"><div class="card-head"><h3>考核结果排名</h3><span class="sub">点击查看个人OKR</span></div>
            <div class="card-body" style="padding-top:6px"><div id="tbl"></div></div></div>
        <div class="card"><div class="card-head"><h3>等级分布</h3></div><div class="card-body"><div id="dist"></div>${legendHTML(distData)}</div></div>
    </div>`;
    function mount(){
        $("#tbl").innerHTML=table([
            {title:"排名",align:"center",render:r=>`<b>${r._rk}</b>`},
            {title:"姓名",render:r=>`<span class="strong">${esc(r.owner)}</span>`},
            {title:"岗位/部门",render:r=>`${esc(r.role)}<div class="muted" style="font-size:12px">${esc(r.dept)}</div>`},
            {title:"完成度",render:r=>bar(r.progress)},
            {title:"综合得分",align:"center",render:r=>r.score!=null?`<b style="font-size:15px">${r.score}</b>`:'<span class="muted">—</span>'},
            {title:"等级",align:"center",render:r=>{const g=gradeOf(r.score);return `<span class="badge ${g.cls}">${g.label}</span>`;}},
        ], ps.map((r,i)=>({...r,id:r.owner,_rk:i+1})));
        $$("#tbl .tbl tbody tr").forEach(tr=>{ if(tr.dataset.id){tr.style.cursor="pointer";tr.onclick=()=>personModal(tr.dataset.id,period);} });
        donutChart($("#dist"),{data:distData,height:240,centerValue:ps.length,centerLabel:"考核人数"});
        $("#exp").onclick=()=>{
            const head=["排名","姓名","岗位","部门","项目类型","完成度%","综合得分","等级"];
            const rows=ps.map((p,i)=>[i+1,p.owner,p.role,p.dept,p.projectType,p.progress,p.score!=null?p.score:"",gradeOf(p.score).label]);
            const csv=[head,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
            const blob=new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"});
            const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`OKR考核结果_${period}.csv`;a.click();URL.revokeObjectURL(a.href);
            toast("考核结果已导出");
        };
    }
    return { html, mount };
}

/* ===== 7. 岗位 OKR 模板 ===== */
function templates(){
    const tpls=Store.all("okr_templates");
    const html=`
    <div class="page-head"><div><h1>岗位 OKR 模板</h1><p>考核 · 按电力工程岗位预置目标与关键结果，可一键套用</p></div></div>
    <div class="grid-3">${tpls.map(t=>`
        <div class="card okr-tpl"><div class="card-body">
            <div class="okr-tpl-head"><div class="okr-tpl-ic">${t.icon||"🎯"}</div>
                <div><b>${esc(t.role)}</b><div class="muted" style="font-size:12px">${esc(t.projectType)}</div></div></div>
            ${t.objectives.map(o=>`<div class="okr-tpl-obj"><div class="ot-title"><span class="tag">${o.type||"业绩目标"}</span> ${esc(o.title)}</div>
                <ul class="ot-krs">${o.krs.map(k=>`<li>${esc(k)}</li>`).join("")}</ul></div>`).join("")}
            <button class="btn btn-primary btn-sm" data-use="${t.id}" style="width:100%;margin-top:8px">套用此模板</button>
        </div></div>`).join("")}</div>`;
    function mount(){
        $$("[data-use]").forEach(b=>b.onclick=()=>{
            const t=Store.get("okr_templates",b.dataset.use); const o=t.objectives[0];
            objForm(null,{ role:t.role, projectType:t.projectType, type:o.type, title:o.title, period:curPeriod(),
                krs:o.krs.map((k,i)=>({title:k, target:"", current:"", weight:Math.round(100/o.krs.length), progress:0})) });
        });
    }
    return { html, mount };
}

/* ===== 8. 考核规则 ===== */
function rules(){
    const r=rule();
    const html=`
    <div class="page-head"><div><h1>考核规则</h1><p>考核 · 评分权重与等级标准配置</p></div></div>
    <div class="grid-2">
        <div class="card"><div class="card-head"><h3>评分权重</h3></div><div class="card-body">
            <div class="form-grid">
                <div class="field"><label>员工自评权重(%)</label><input class="input" type="number" id="sw" value="${r.selfWeight}"></div>
                <div class="field"><label>上级评分权重(%)</label><input class="input" type="number" id="mw" value="${r.mgrWeight}"></div>
            </div>
            <p class="okr-tip" style="margin-top:12px">综合得分 = 员工自评 × 自评权重 + 上级评分 × 上级权重（两者之和应为 100%）</p>
            <button class="btn btn-primary" id="saveW" style="margin-top:8px">保存权重</button>
        </div></div>
        <div class="card"><div class="card-head"><h3>等级标准</h3></div><div class="card-body">
            <table class="tbl"><thead><tr><th>等级</th><th>分数线</th></tr></thead><tbody>
                <tr><td><span class="badge bg-green">优秀</span></td><td>≥ <input class="score-in" type="number" id="gS" value="${r.gradeS}"> 分</td></tr>
                <tr><td><span class="badge bg-blue">良好</span></td><td>≥ <input class="score-in" type="number" id="gA" value="${r.gradeA}"> 分</td></tr>
                <tr><td><span class="badge bg-teal">合格</span></td><td>≥ <input class="score-in" type="number" id="gB" value="${r.gradeB}"> 分</td></tr>
                <tr><td><span class="badge bg-orange">待改进</span></td><td>≥ <input class="score-in" type="number" id="gC" value="${r.gradeC}"> 分</td></tr>
                <tr><td><span class="badge bg-red">不合格</span></td><td>低于待改进线</td></tr>
            </tbody></table>
            <button class="btn btn-primary" id="saveG" style="margin-top:12px">保存等级</button>
        </div></div>
    </div>
    <div class="card mb" style="margin-top:18px"><div class="card-head"><h3>考核理念</h3></div>
        <div class="card-body"><p class="okr-tip" style="font-size:14px;line-height:1.9">${esc(r.note)}</p></div></div>`;
    function mount(){
        $("#saveW").onclick=()=>{ const sw=+$("#sw").value||0, mw=+$("#mw").value||0;
            if(sw+mw!==100){ toast("自评与上级权重之和需为100%","err"); return; }
            Store.update("okr_rules",r.id,{selfWeight:sw,mgrWeight:mw}); toast("权重已保存"); };
        $("#saveG").onclick=()=>{ Store.update("okr_rules",r.id,{gradeS:+$("#gS").value,gradeA:+$("#gA").value,gradeB:+$("#gB").value,gradeC:+$("#gC").value}); toast("等级标准已保存"); };
    }
    return { html, mount };
}

/* ===== 入口 ===== */
export default function okr(leaf, schema){
    switch(schema.kind){
        case "okr_overview": return overview();
        case "okr_my": return myOkr();
        case "okr_objectives": return objectivesPage();
        case "okr_self": return scoring("self");
        case "okr_review": return scoring("review");
        case "okr_results": return results();
        case "okr_templates": return templates();
        case "okr_rules": return rules();
        default: return overview();
    }
}
