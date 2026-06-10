/* 成本资金 — 成本台账归集管控 */
import { Store, fmt } from "../store.js";
import { badge, esc } from "../ui.js";
import { crudPage } from "./_crud.js";

const projName = id => { const p=Store.get("projects",id); return p?p.name:id; };

export default function cost(){
    const projOpts = Store.all("projects").map(p=>({value:p.id,label:p.name}));
    return crudPage({
        title:"成本资金", subtitle:"成本台账 · 按类型归集，审批与付款多维管控",
        coll:"cost", recordName:"成本单", addLabel:"新增成本", idPrefix:"CB",
        searchPlaceholder:"搜索供应商 / 项目", searchFields:["supplier"],
        filters:[
            {key:"project", label:"全部项目", options:projOpts},
            {key:"type", label:"全部类型", options:["人工","材料","机械","分包","其他"]},
            {key:"payment", label:"全部付款", options:["未付款","部分付款","已付款"]},
        ],
        summary:list=>`成本合计 <b style="color:#dc2626">${fmt.money(list.reduce((a,r)=>a+r.amount,0))}</b>`,
        columns:[
            {title:"成本编号",render:r=>`<span class="strong">${r.id}</span>`},
            {title:"所属项目",render:r=>`<div class="strong">${esc(projName(r.project))}</div>`},
            {title:"成本类型",align:"center",render:r=>`<span class="tag">${r.type}</span>`},
            {title:"供应商/对象",render:r=>esc(r.supplier)},
            {title:"金额(万)",align:"right",render:r=>`<span class="num strong" style="color:#dc2626">${fmt.num(r.amount)}</span>`},
            {title:"审批",align:"center",render:r=>badge(r.approval)},
            {title:"付款",align:"center",render:r=>badge(r.payment)},
            {title:"发生日期",key:"date",align:"center"},
        ],
        detailTitle:r=>r.id+" · "+r.type+"成本",
        detail:r=>[
            {label:"所属项目",value:esc(projName(r.project))},{label:"成本类型",value:r.type},
            {label:"供应商/对象",value:esc(r.supplier)},{label:"成本金额",value:fmt.money(r.amount)},
            {label:"审批状态",value:badge(r.approval)},{label:"付款状态",value:badge(r.payment)},
            {label:"发生日期",value:r.date},
        ],
        formFields:[
            {key:"project",label:"所属项目",type:"select",options:projOpts},
            {key:"type",label:"成本类型",type:"select",options:["人工","材料","机械","分包","其他"]},
            {key:"supplier",label:"供应商/对象",full:true},
            {key:"amount",label:"成本金额(万元)",type:"number"},
            {key:"approval",label:"审批状态",type:"select",options:["审批中","已批准"]},
            {key:"payment",label:"付款状态",type:"select",options:["未付款","部分付款","已付款"]},
            {key:"date",label:"发生日期",type:"date"},
        ],
    })();
}
