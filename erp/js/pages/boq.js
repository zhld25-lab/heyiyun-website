/* 清单双价档案 — 甲方/分包双价管理 */
import { Store, fmt } from "../store.js";
import { esc } from "../ui.js";
import { crudPage } from "./_crud.js";

const projName = id => { const p=Store.get("projects",id); return p?p.name:id; };
const money2 = v => "¥"+(v||0).toFixed(2)+"万";

export default function boq(){
    const projOpts = Store.all("projects").map(p=>({value:p.id,label:p.name}));
    return crudPage({
        title:"清单双价档案", subtitle:"工程量清单 · 甲方综合单价与分包综合单价双价管控",
        coll:"boq", recordName:"清单项", addLabel:"新增清单项", idPrefix:"BQ",
        searchPlaceholder:"搜索清单编码 / 名称", searchFields:["code","name"],
        filters:[
            {key:"project", label:"全部项目", options:projOpts},
            {key:"category", label:"全部类别", options:["土建","安装","其他"]},
        ],
        summary:list=>{
            const a=list.reduce((s,r)=>s+r.partyAPrice*r.ctrlQty,0), b=list.reduce((s,r)=>s+r.subPrice*r.ctrlQty,0);
            return `控制总价(甲方) <b style="color:#1b5fe3">${fmt.money(a)}</b> · 分包 <b style="color:#7c3aed">${fmt.money(b)}</b> · 预估价差 <b style="color:#16a34a">${fmt.money(a-b)}</b>`;
        },
        columns:[
            {title:"清单编码",render:r=>`<span class="strong">${esc(r.code)}</span>`},
            {title:"清单名称",render:r=>`<div class="strong">${esc(r.name)}</div><div class="muted" style="font-size:12px">${esc(projName(r.project))}</div>`},
            {title:"类别",align:"center",render:r=>`<span class="tag">${r.category}</span>`},
            {title:"单位",align:"center",key:"unit"},
            {title:"控制量",align:"right",render:r=>`<span class="num">${fmt.num(r.ctrlQty)}</span>`},
            {title:"实际量",align:"right",render:r=>`<span class="num" style="color:#0d9488">${fmt.num(r.actualQty)}</span>`},
            {title:"甲方单价",align:"right",render:r=>`<span class="num" style="color:#1b5fe3">${money2(r.partyAPrice)}</span>`},
            {title:"分包单价",align:"right",render:r=>`<span class="num" style="color:#7c3aed">${money2(r.subPrice)}</span>`},
            {title:"单位价差",align:"right",render:r=>`<span class="num" style="color:#16a34a">${money2(r.partyAPrice-r.subPrice)}</span>`},
        ],
        detailTitle:r=>r.name+"（"+r.code+"）",
        detail:r=>[
            {label:"所属项目",value:esc(projName(r.project))},{label:"清单类别",value:r.category},
            {label:"计量单位",value:r.unit},{label:"控制总量",value:fmt.num(r.ctrlQty)},
            {label:"实际完成量",value:fmt.num(r.actualQty)},{label:"完成率",value:fmt.pct(r.ctrlQty?r.actualQty/r.ctrlQty*100:0)},
            {label:"甲方综合单价",value:money2(r.partyAPrice)},{label:"分包综合单价",value:money2(r.subPrice)},
            {label:"甲方控制总价",value:fmt.money(r.partyAPrice*r.ctrlQty)},{label:"分包控制总价",value:fmt.money(r.subPrice*r.ctrlQty)},
            {label:"已完成产值(甲方)",value:fmt.money(r.partyAPrice*r.actualQty)},{label:"单位价差",value:money2(r.partyAPrice-r.subPrice)},
        ],
        formFields:[
            {key:"code",label:"清单编码",required:true},
            {key:"name",label:"清单名称",required:true},
            {key:"project",label:"所属项目",type:"select",options:projOpts},
            {key:"category",label:"类别",type:"select",options:["土建","安装","其他"]},
            {key:"unit",label:"计量单位"},
            {key:"ctrlQty",label:"控制总量",type:"number"},
            {key:"actualQty",label:"实际完成量",type:"number"},
            {key:"partyAPrice",label:"甲方综合单价(万/单位)",type:"number"},
            {key:"subPrice",label:"分包综合单价(万/单位)",type:"number"},
        ],
    })();
}
