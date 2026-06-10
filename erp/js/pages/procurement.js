/* 采购物资台账 */
import { Store, fmt } from "../store.js";
import { badge, esc } from "../ui.js";
import { crudPage } from "./_crud.js";

const projName = id => { const p=Store.get("projects",id); return p?p.name:id; };

export default function procurement(){
    const projOpts = Store.all("projects").map(p=>({value:p.id,label:p.name}));
    const amt = r => r.qty*r.unitPrice;
    return crudPage({
        title:"采购物资", subtitle:"材料采购台账 · 采购到货与财务同步全流程",
        coll:"procurement", recordName:"采购单", addLabel:"新建采购单", idPrefix:"CG",
        searchPlaceholder:"搜索材料 / 供应商", searchFields:["material","vendor"],
        filters:[
            {key:"project", label:"全部项目", options:projOpts},
            {key:"status", label:"全部状态", options:["草稿","已提交","已批准","已下单","已到货"]},
            {key:"sync", label:"全部同步", options:["未同步","待同步","已同步"]},
        ],
        kanban:{ groupBy:"status", groups:["草稿","已提交","已批准","已下单","已到货"],
            card:r=>`<div class="kb-card" data-id="${r.id}"><div class="t">${esc(r.material)}</div>
                <div class="meta">🚚 ${esc(r.vendor)}</div>
                <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-top:6px">
                <span class="muted">${fmt.num(r.qty)} ${r.unit}</span><b style="color:#1b5fe3">${fmt.money(r.qty*r.unitPrice)}</b></div>
                <div class="ftr"><span class="muted">${esc(projName(r.project))}</span>${badge(r.sync)}</div></div>` },
        summary:list=>`采购总额 <b style="color:#1b5fe3">${fmt.money(list.reduce((a,r)=>a+r.qty*r.unitPrice,0))}</b>`,
        columns:[
            {title:"材料名称",render:r=>`<div class="strong">${esc(r.material)}</div><div class="muted" style="font-size:12px">${esc(projName(r.project))}</div>`},
            {title:"供应商",render:r=>esc(r.vendor)},
            {title:"数量",align:"right",render:r=>`<span class="num">${fmt.num(r.qty)}</span> ${r.unit}`},
            {title:"单价(万)",align:"right",render:r=>`<span class="num">${r.unitPrice}</span>`},
            {title:"金额(万)",align:"right",render:r=>`<span class="num strong">${fmt.num(amt(r))}</span>`},
            {title:"采购状态",align:"center",render:r=>badge(r.status)},
            {title:"财务同步",align:"center",render:r=>badge(r.sync)},
            {title:"申请日期",key:"date",align:"center"},
        ],
        detailTitle:r=>r.material,
        detail:r=>[
            {label:"所属项目",value:esc(projName(r.project))},{label:"供应商",value:esc(r.vendor)},
            {label:"采购数量",value:fmt.num(r.qty)+" "+r.unit},{label:"采购单价",value:r.unitPrice+" 万"},
            {label:"采购金额",value:fmt.money(amt(r))},{label:"采购状态",value:badge(r.status)},
            {label:"财务同步",value:badge(r.sync)},{label:"申请日期",value:r.date},
        ],
        formFields:[
            {key:"material",label:"材料名称",required:true,full:true},
            {key:"project",label:"所属项目",type:"select",options:projOpts},
            {key:"vendor",label:"供应商"},
            {key:"qty",label:"数量",type:"number"},
            {key:"unit",label:"单位"},
            {key:"unitPrice",label:"单价(万元)",type:"number"},
            {key:"status",label:"采购状态",type:"select",options:["草稿","已提交","已批准","已下单","已到货"]},
            {key:"sync",label:"财务同步",type:"select",options:["未同步","待同步","已同步"]},
            {key:"date",label:"申请日期",type:"date"},
        ],
    })();
}
