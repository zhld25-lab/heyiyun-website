/* 财务对接 — 收支资金流水 */
import { Store, fmt } from "../store.js";
import { badge, esc } from "../ui.js";
import { crudPage } from "./_crud.js";

const projName = id => { const p=Store.get("projects",id); return p?p.name:id; };

export default function finance(){
    const projOpts = Store.all("projects").map(p=>({value:p.id,label:p.name}));
    return crudPage({
        title:"财务对接", subtitle:"收支资金流水 · 业务单据与财务一体化",
        coll:"finance", recordName:"流水", addLabel:"新增流水", idPrefix:"CW",
        searchPlaceholder:"搜索摘要", searchFields:["item"],
        filters:[
            {key:"project", label:"全部项目", options:projOpts},
            {key:"type", label:"收支类型", options:["收入","支出"]},
            {key:"status", label:"全部状态", options:["待到账","已到账","已付款"]},
        ],
        summary:list=>{
            const inc=list.filter(r=>r.type==="收入").reduce((a,r)=>a+r.amount,0);
            const exp=list.filter(r=>r.type==="支出").reduce((a,r)=>a+r.amount,0);
            return `收入 <b style="color:#16a34a">${fmt.money(inc)}</b> · 支出 <b style="color:#dc2626">${fmt.money(exp)}</b> · 净额 <b style="color:#1b5fe3">${fmt.money(inc-exp)}</b>`;
        },
        columns:[
            {title:"流水号",render:r=>`<span class="strong">${r.id}</span>`},
            {title:"摘要",render:r=>`<div class="strong">${esc(r.item)}</div><div class="muted" style="font-size:12px">${esc(projName(r.project))}</div>`},
            {title:"类型",align:"center",render:r=>badge(r.type)},
            {title:"金额(万)",align:"right",render:r=>`<span class="num strong" style="color:${r.type==='收入'?'#16a34a':'#dc2626'}">${r.type==='收入'?'+':'-'}${fmt.num(r.amount)}</span>`},
            {title:"状态",align:"center",render:r=>badge(r.status)},
            {title:"日期",key:"date",align:"center"},
        ],
        detailTitle:r=>r.item,
        detail:r=>[
            {label:"流水号",value:r.id},{label:"收支类型",value:badge(r.type)},
            {label:"所属项目",value:esc(projName(r.project))},{label:"金额",value:fmt.money(r.amount)},
            {label:"状态",value:badge(r.status)},{label:"日期",value:r.date},
        ],
        formFields:[
            {key:"item",label:"摘要",required:true,full:true},
            {key:"project",label:"所属项目",type:"select",options:projOpts},
            {key:"type",label:"收支类型",type:"select",options:["收入","支出"]},
            {key:"amount",label:"金额(万元)",type:"number"},
            {key:"status",label:"状态",type:"select",options:["待到账","已到账","已付款"]},
            {key:"date",label:"日期",type:"date"},
        ],
    })();
}
