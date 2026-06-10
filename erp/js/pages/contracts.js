/* 合同管理 */
import { Store, fmt } from "../store.js";
import { badge, bar, esc } from "../ui.js";
import { crudPage } from "./_crud.js";

const projName = id => { const p=Store.get("projects",id); return p?p.name:id; };

export default function contracts(){
    const projOpts = Store.all("projects").map(p=>({value:p.id,label:p.name}));
    return crudPage({
        title:"合同管理", subtitle:"甲方合同与分包合同统一台账 · 审批与收付款跟踪",
        coll:"contracts", recordName:"合同", addLabel:"新建合同", idPrefix:"HT",
        searchPlaceholder:"搜索合同名称 / 甲方单位", searchFields:["name","partyA","id"],
        filters:[
            {key:"type", label:"全部类型", options:["甲方","分包"]},
            {key:"status", label:"全部状态", options:["草稿","已签订","履约中","已完成"]},
            {key:"approval", label:"全部审批", options:["草稿","审批中","已批准"]},
        ],
        summary:list=>`合同总额 <b style="color:#1b5fe3">${fmt.money(list.reduce((a,r)=>a+r.amount,0))}</b> · 已收 <b style="color:#16a34a">${fmt.money(list.reduce((a,r)=>a+r.received,0))}</b>`,
        columns:[
            {title:"合同编号",render:r=>`<span class="strong">${r.id}</span>`},
            {title:"合同名称",render:r=>`<div class="strong">${esc(r.name)}</div><div class="muted" style="font-size:12px">${esc(projName(r.project))}</div>`},
            {title:"相对方",render:r=>esc(r.partyA)},
            {title:"类型",align:"center",render:r=>badge(r.type)},
            {title:"合同额(万)",align:"right",render:r=>`<span class="num">${fmt.num(r.amount)}</span>`},
            {title:"回款进度",render:r=>bar(r.amount?r.received/r.amount*100:0)},
            {title:"审批",align:"center",render:r=>badge(r.approval)},
            {title:"状态",align:"center",render:r=>badge(r.status)},
        ],
        detailTitle:r=>r.name,
        detail:r=>[
            {label:"合同编号",value:r.id},{label:"合同类型",value:badge(r.type)},
            {label:"所属项目",value:esc(projName(r.project))},{label:"相对方",value:esc(r.partyA)},
            {label:"合同金额",value:fmt.money(r.amount)},{label:"已收/付款",value:fmt.money(r.received)},
            {label:"审批状态",value:badge(r.approval)},{label:"合同状态",value:badge(r.status)},
            {label:"签订日期",value:r.signedDate},
            {label:"回款进度",full:true,value:bar(r.amount?r.received/r.amount*100:0)},
        ],
        formFields:[
            {key:"name",label:"合同名称",required:true,full:true},
            {key:"project",label:"所属项目",type:"select",options:projOpts},
            {key:"type",label:"合同类型",type:"select",options:["甲方","分包"]},
            {key:"partyA",label:"相对方单位"},
            {key:"amount",label:"合同金额(万元)",type:"number"},
            {key:"received",label:"已收/付款(万元)",type:"number"},
            {key:"approval",label:"审批状态",type:"select",options:["草稿","审批中","已批准"]},
            {key:"status",label:"合同状态",type:"select",options:["草稿","已签订","履约中","已完成"]},
            {key:"signedDate",label:"签订日期",type:"date"},
        ],
    })();
}
