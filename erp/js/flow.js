/* ============================================================
   审批流程引擎
   单据按流程定义逐级流转：提交 → 第1级 → 第2级 → … → 通过/驳回
   - 流程定义存 sys_flows（系统→流程设置 可改）
   - 单据上挂 rec.flow = { defId, stepIndex, steps:[{roleId,name,status,by,at,opinion}], status }
   - 每级审批后自动流到下一级；当前级的人才能办理
   ============================================================ */
import { Store } from "./store.js";
import { currentUser, isSuper } from "./auth.js";

const now = () => { try{ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }catch(e){ return ""; } };

/** 找到某集合适用的流程定义（精确匹配优先，否则通用 *） */
export function defFor(coll){
    const defs = Store.all("sys_flows");
    return defs.find(d=>(d.colls||[]).includes(coll)) || defs.find(d=>(d.colls||[]).includes("*")) || null;
}

/** 新建单据时实例化流程：按金额裁剪需要的级别；提交人本级自动跳过 */
export function startFlow(coll, rec, submitterUser){
    const def = defFor(coll);
    if(!def || !def.steps || !def.steps.length) return null;
    const amount = +rec.amount || 0;
    let steps = def.steps
        .filter(s=>!s.minAmount || amount>=+s.minAmount)
        .map(s=>({roleId:s.roleId, name:s.name, status:"pending", by:"", at:"", opinion:""}));
    // 提交人所在级自动通过（自己不审自己的单）
    steps = steps.map(s=>{
        if(submitterUser && s.roleId===submitterUser.roleId)
            return Object.assign(s,{status:"skipped", by:submitterUser.name, at:now(), opinion:"提交人本级，自动通过"});
        return s;
    });
    let idx = steps.findIndex(s=>s.status==="pending");
    const flow = { defId:def.id, defName:def.name, stepIndex: idx<0 ? steps.length : idx, steps,
                   status: idx<0 ? "approved" : "running",
                   submitter: submitterUser?submitterUser.name:"", submitterRole: submitterUser?submitterUser.roleId:"", submittedAt: now() };
    return flow;
}

/** 当前待办级；流程结束返回 null */
export function currentStep(rec){
    const f=rec&&rec.flow; if(!f||f.status!=="running") return null;
    return f.steps[f.stepIndex]||null;
}

/** 当前登录人是否可办理这张单（超管可代办任意级） */
export function canActOn(rec){
    const s=currentStep(rec); if(!s) return false;
    if(isSuper()) return true;
    const u=currentUser();
    return !!(u && u.roleId===s.roleId);
}

/** 审批通过当前级 → 自动流向下一级；最后一级通过则整单批准 */
export function approveStep(coll, rec, opinion){
    const f=rec.flow; const s=currentStep(rec); if(!f||!s) return rec;
    const u=currentUser()||{name:"系统"};
    Object.assign(s,{status:"approved", by:u.name, at:now(), opinion:opinion||""});
    let idx=f.stepIndex+1;
    while(idx<f.steps.length && f.steps[idx].status!=="pending") idx++;
    if(idx>=f.steps.length){ f.status="approved"; f.stepIndex=f.steps.length; }
    else f.stepIndex=idx;
    const approval = f.status==="approved" ? "已批准" : "审批中";
    return Store.update(coll, rec.id, { flow:f, approval });
}

/** 驳回：流程终止，整单打回 */
export function rejectStep(coll, rec, opinion){
    const f=rec.flow; const s=currentStep(rec); if(!f||!s) return rec;
    const u=currentUser()||{name:"系统"};
    Object.assign(s,{status:"rejected", by:u.name, at:now(), opinion:opinion||""});
    f.status="rejected";
    return Store.update(coll, rec.id, { flow:f, approval:"已驳回" });
}

/** 驳回后重新提交：流程重置重走 */
export function resubmitFlow(coll, rec){
    const u=currentUser();
    const flow=startFlow(coll, rec, u);
    return Store.update(coll, rec.id, { flow, approval: flow&&flow.status==="approved"?"已批准":"待审批" });
}

/** 流程进度条 HTML（详情/办理窗显示） */
export function timelineHTML(rec){
    const f=rec&&rec.flow;
    if(!f) return "";
    const submit = `<div class="fstep done"><div class="fdot">✓</div><div class="finfo"><b>提交</b><span>${f.submitter||"—"}</span><small>${f.submittedAt||""}</small></div></div>`;
    const steps = f.steps.map((s,i)=>{
        const cls = s.status==="approved"||s.status==="skipped" ? "done" : s.status==="rejected" ? "fail" : (f.status==="running"&&i===f.stepIndex) ? "cur" : "wait";
        const icon = s.status==="approved" ? "✓" : s.status==="skipped" ? "⤼" : s.status==="rejected" ? "✕" : (i+1);
        return `<div class="fstep ${cls}"><div class="fdot">${icon}</div>
            <div class="finfo"><b>${s.name}</b><span>${s.by||(cls==="cur"?"待办理":"等待")}</span>
            ${s.at?`<small>${s.at}</small>`:""}${s.opinion?`<small class="fop">"${s.opinion}"</small>`:""}</div></div>`;
    }).join('<div class="fline"></div>');
    const tail = f.status==="approved" ? '<div class="fline"></div><div class="fstep done"><div class="fdot">🏁</div><div class="finfo"><b>通过</b></div></div>'
               : f.status==="rejected" ? '<div class="fline"></div><div class="fstep fail"><div class="fdot">⛔</div><div class="finfo"><b>已驳回</b></div></div>' : "";
    return `<div class="flow-timeline">${submit}<div class="fline"></div>${steps}${tail}</div>`;
}

/** 当前级名称（列表里显示"待XX审批"） */
export function stageLabel(rec){
    const f=rec&&rec.flow;
    if(!f) return rec&&rec.approval||"";
    if(f.status==="approved") return "已批准";
    if(f.status==="rejected") return "已驳回";
    const s=currentStep(rec);
    return s ? `待${s.name}审批` : "审批中";
}

/* ---------- 当前审批人（具体的人，办理窗显示"提交给谁"） ---------- */
function repName(roleId){ const u=Store.all("sys_users").find(x=>x.roleId===roleId); return u?u.name:roleId; }
/** 当前轮到办理这张单的具体人名；流程结束返回 "" */
export function currentApproverName(rec){ const s=currentStep(rec); return s?repName(s.roleId):""; }

/* ---------- 历史种子单据补挂审批流（一次性、幂等） ----------
   让旧单据也有真实"提交人"和"提交给谁"的流向，不再显示"系统" */
const SEED_SUBMITTERS = { contracts:"U-pm", subcontracts:"U-pm", cost:"U-mat", fin_income:"U-pm", fin_salary:"U-fin" };
function phaseOf(coll, r){
    if(r.approval==="已驳回") return "rejected";
    if(r.approval==="已批准") return "approved";
    if(coll==="cost")       return r.status==="已付款" ? "approved" : "pending";
    if(coll==="fin_income") return r.status==="已到账" ? "approved" : "pending";
    if(coll==="fin_salary") return (r.status==="已发放"||r.status==="已付款") ? "approved" : "pending";
    return "pending";   // 含 审批中 / 无审批字段
}
function buildClosedFlow(coll, rec, submitter, rejected){
    const def=defFor(coll); if(!def||!def.steps) return null;
    const amount=+rec.amount||0; const at=rec.signedDate||rec.date||"";
    let steps=def.steps.filter(s=>!s.minAmount||amount>=+s.minAmount)
        .map(s=>({roleId:s.roleId,name:s.name,status:"approved",by:repName(s.roleId),at,opinion:"同意"}));
    if(submitter) steps=steps.map(s=> s.roleId===submitter.roleId
        ? Object.assign(s,{status:"skipped",by:submitter.name,opinion:"提交人本级，自动通过"}) : s);
    if(rejected && steps.length) Object.assign(steps[steps.length-1],{status:"rejected",opinion:"退回修改"});
    return { defId:def.id, defName:def.name, stepIndex:steps.length, steps,
        status: rejected?"rejected":"approved",
        submitter:submitter?submitter.name:"", submitterRole:submitter?submitter.roleId:"", submittedAt:at };
}
export function ensureSeedFlows(){
    Object.keys(SEED_SUBMITTERS).forEach(coll=>{
        const submitter = Store.get("sys_users", SEED_SUBMITTERS[coll]);
        Store.all(coll).forEach(r=>{
            if(r.flow) return;                       // 已有流程的（含新建/已迁移）跳过
            const phase=phaseOf(coll,r);
            if(phase==="pending"){
                const flow=startFlow(coll, r, submitter);
                if(flow) Store.update(coll, r.id, { flow, approval: flow.status==="approved"?"已批准":"审批中" });
            } else {
                const flow=buildClosedFlow(coll, r, submitter, phase==="rejected");
                if(flow) Store.update(coll, r.id, { flow });
            }
        });
    });
}
