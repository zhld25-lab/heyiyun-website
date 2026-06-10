/* 通用 CRUD 列表页工厂：列表 + 筛选 + 搜索 + 增改删 + 详情（+可选看板） */
import { Store } from "../store.js";
import { $, $$, table, modal, confirmBox, toast, options, esc } from "../ui.js";

export function crudPage(cfg){
    return function(){
        const state = { view:"list", q:"", filters:{} };
        (cfg.filters||[]).forEach(f=>state.filters[f.key]="");

        const html = `
        <div class="page-head">
            <div><h1>${cfg.title}</h1><p>${cfg.subtitle}</p></div>
            <div class="actions">
                ${cfg.kanban?`<div class="view-tabs"><button data-view="list" class="on">📋 列表</button><button data-view="kanban">🗂️ 看板</button></div>`:""}
                ${cfg.canAdd!==false?`<button class="btn btn-primary" id="addBtn"><span class="ic">＋</span>${cfg.addLabel||"新建"}</button>`:""}
            </div>
        </div>
        <div class="toolbar">
            <div class="search-box"><span class="ic">🔍</span><input id="q" placeholder="${cfg.searchPlaceholder||"搜索…"}"></div>
            ${(cfg.filters||[]).map(f=>`<select class="select" data-f="${f.key}"><option value="">${f.label}</option>${options(f.options,"")}</select>`).join("")}
            <div class="grow"></div>
            ${cfg.summary?`<div id="summary" style="font-size:13px;color:#5b6478"></div>`:""}
        </div>
        <div id="viewArea"></div>`;

        function rows(){
            return Store.all(cfg.coll).filter(r=>{
                for(const k in state.filters){ if(state.filters[k] && r[k]!==state.filters[k]) return false; }
                if(state.q){ return (cfg.searchFields||[]).some(f=>String(r[f]||"").includes(state.q)); }
                return true;
            });
        }

        function render(){
            const data = rows();
            const area = $("#viewArea");
            if(state.view==="kanban" && cfg.kanban){
                const k = cfg.kanban;
                area.innerHTML = `<div class="kanban">${k.groups.map(g=>{
                    const list=data.filter(r=>r[k.groupBy]===g);
                    return `<div class="kb-col"><div class="kb-col-head">${g}<span class="cnt">${list.length}</span></div>
                        <div class="kb-list">${list.map(r=>k.card(r)).join("")||'<div class="empty" style="padding:18px;font-size:13px">无</div>'}</div></div>`;
                }).join("")}</div>`;
            } else {
                const cols = cfg.columns.concat([{title:"操作",align:"center",render:r=>{
                    let b=`<button data-act="view" data-id="${r.id}">详情</button>`;
                    if(cfg.formFields) b+=`<button data-act="edit" data-id="${r.id}">编辑</button>`;
                    if(cfg.canDelete!==false) b+=`<button data-act="del" data-id="${r.id}">删除</button>`;
                    return `<div class="row-act">${b}</div>`;
                }}]);
                area.innerHTML = table(cols, data);
            }
            if(cfg.summary){ const s=$("#summary"); if(s) s.innerHTML=cfg.summary(data); }
            wire();
        }

        function wire(){
            $$("#viewArea [data-act='view'], #viewArea .kb-card").forEach(b=>b.onclick=()=>showDetail(b.dataset.id));
            $$("#viewArea [data-act='edit']").forEach(b=>b.onclick=e=>{e.stopPropagation();showForm(b.dataset.id);});
            $$("#viewArea [data-act='del']").forEach(b=>b.onclick=e=>{e.stopPropagation();
                confirmBox(`确认删除此${cfg.recordName||"记录"}？`,()=>{Store.remove(cfg.coll,b.dataset.id);toast("已删除");render();});});
        }

        function showDetail(id){
            const r = Store.get(cfg.coll,id); if(!r) return;
            const fields = cfg.detail ? cfg.detail(r) : (cfg.formFields||[]).map(f=>({label:f.label,value:r[f.key]}));
            modal({ title:cfg.detailTitle?cfg.detailTitle(r):"详情", large:true,
                body:`<div class="detail-grid">${fields.map(f=>`<div class="di ${f.full?'full':''}"><span>${f.label}</span><b>${f.value==null?"—":f.value}</b></div>`).join("")}</div>`,
                footer:`<button class="btn btn-light" data-close>关闭</button>${cfg.formFields?'<button class="btn btn-primary" data-edit>编辑</button>':''}`,
                onMount:(el,close)=>{ const e=el.querySelector("[data-edit]"); if(e)e.onclick=()=>{close();showForm(id);}; }
            });
        }

        function showForm(id){
            const r = id?Store.get(cfg.coll,id):{};
            const body = `<div class="form-grid">${cfg.formFields.map(f=>{
                const v = r[f.key]!=null?r[f.key]:(f.default!=null?f.default:"");
                const cls = f.full?"field full":"field";
                if(f.type==="select") return `<div class="${cls}"><label>${f.label}</label><select class="select" data-k="${f.key}">${options(f.options,v)}</select></div>`;
                if(f.type==="textarea") return `<div class="${cls}"><label>${f.label}</label><textarea data-k="${f.key}">${esc(v)}</textarea></div>`;
                return `<div class="${cls}"><label>${f.label}${f.required?' <span class="req">*</span>':''}</label><input class="input" type="${f.type||'text'}" data-k="${f.key}" value="${esc(v)}"></div>`;
            }).join("")}</div>`;
            modal({ title:id?`编辑${cfg.recordName||""}`:`${cfg.addLabel||"新建"}`, large:true, body,
                footer:`<button class="btn btn-light" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>`,
                onMount:(el,close)=>{
                    el.querySelector("[data-save]").onclick=()=>{
                        const data={};
                        for(const f of cfg.formFields){
                            const node=el.querySelector(`[data-k="${f.key}"]`);
                            let val=node.value;
                            if(f.type==="number") val=+val||0;
                            if(f.required && !String(val).trim()){ toast(`请填写${f.label}`,"err"); return; }
                            data[f.key]=val;
                        }
                        if(cfg.beforeSave) cfg.beforeSave(data, r);
                        if(id){ Store.update(cfg.coll,id,data); toast("已更新"); }
                        else { if(cfg.idPrefix) data.id=cfg.idPrefix+"-"+Store.newId("").slice(1,5); Store.add(cfg.coll,data); toast("已创建"); }
                        close(); render();
                    };
                }
            });
        }

        function mount(){
            const add=$("#addBtn"); if(add) add.onclick=()=>showForm();
            $("#q").oninput=e=>{state.q=e.target.value;render();};
            $$("[data-f]").forEach(s=>s.onchange=e=>{state.filters[s.dataset.f]=e.target.value;render();});
            $$("[data-view]").forEach(b=>b.onclick=()=>{state.view=b.dataset.view;$$("[data-view]").forEach(x=>x.classList.toggle("on",x===b));render();});
            render();
        }

        return { html, mount };
    };
}
