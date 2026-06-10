/* 施工进度 — 现场进度填报（看板 + 列表） */
import { Store } from "../store.js";
import { badge, bar, esc } from "../ui.js";
import { crudPage } from "./_crud.js";

const projName = id => { const p=Store.get("projects",id); return p?p.name:id; };

export default function progress(){
    const projOpts = Store.all("projects").map(p=>({value:p.id,label:p.name}));
    return crudPage({
        title:"施工进度", subtitle:"现场进度填报 · 延期受阻预警",
        coll:"progress", recordName:"进度记录", addLabel:"填报进度", idPrefix:"JD",
        searchPlaceholder:"搜索项目 / 填报人", searchFields:["reporter"],
        filters:[
            {key:"project", label:"全部项目", options:projOpts},
            {key:"state", label:"全部状态", options:["正常","延期","受阻","已完成"]},
        ],
        kanban:{ groupBy:"state", groups:["正常","延期","受阻","已完成"],
            card:r=>`<div class="kb-card" data-id="${r.id}"><div class="t">${esc(projName(r.project))}</div>
                <div class="meta">👤 ${esc(r.reporter)} · ${r.date}</div>
                <div style="margin-top:8px">${bar(r.percent)}</div>
                <div class="ftr"><span class="muted">进度填报</span>${badge(r.state)}</div></div>` },
        columns:[
            {title:"所属项目",render:r=>`<span class="strong">${esc(projName(r.project))}</span>`},
            {title:"填报人",key:"reporter"},
            {title:"填报日期",key:"date",align:"center"},
            {title:"施工进度",render:r=>bar(r.percent)},
            {title:"状态",align:"center",render:r=>badge(r.state)},
        ],
        detailTitle:r=>projName(r.project)+" · 进度填报",
        detail:r=>[
            {label:"所属项目",value:esc(projName(r.project))},{label:"填报人",value:esc(r.reporter)},
            {label:"填报日期",value:r.date},{label:"进度状态",value:badge(r.state)},
            {label:"完成进度",full:true,value:bar(r.percent)},
        ],
        formFields:[
            {key:"project",label:"所属项目",type:"select",options:projOpts},
            {key:"reporter",label:"填报人"},
            {key:"date",label:"填报日期",type:"date"},
            {key:"percent",label:"完成进度(%)",type:"number"},
            {key:"state",label:"进度状态",type:"select",options:["正常","延期","受阻","已完成"]},
        ],
    })();
}
