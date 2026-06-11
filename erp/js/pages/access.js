/* ============================================================
   权限控制（仅超级管理员）
   用户管理：账号增删改 / 重置密码 / 启停
   角色权限：按模块→分组→功能 勾选，保存到角色，登录后即按权限显示
   ============================================================ */
import { Store } from "../store.js";
import { MENU } from "../menu.js";
import { $, $$, table, modal, confirmBox, toast, options, badge, esc } from "../ui.js";
import { isSuper } from "../auth.js";

export default function access(leaf){
    const initTab = leaf.name.includes("角色") ? "roles" : "users";
    const state = { roleId:null, showPwd:false };
    const roleName = id => { const r=Store.get("sys_roles",id); return r?r.name:id; };

    const html = `
    <div class="page-head"><div><h1>权限控制</h1><p>系统 · 用户与角色功能权限管理</p></div></div>
    <div class="view-tabs" id="accTabs" style="margin-bottom:18px">
        <button data-t="users">👤 用户管理</button>
        <button data-t="roles">🔐 角色权限</button>
    </div>
    <div id="accBody"></div>`;

    /* ---------- 用户管理 ---------- */
    function renderUsers(){
        const users=Store.all("sys_users");
        $("#accBody").innerHTML=`
        <div class="card"><div class="card-head"><h3>系统账号</h3>
            <div style="display:flex;gap:8px;align-items:center">
                <button class="btn btn-light btn-sm" id="togglePwd">${state.showPwd?"🙈 隐藏密码":"👁 显示密码"}</button>
                <button class="btn btn-primary btn-sm" id="addUser"><span class="ic">＋</span>新建用户</button></div></div>
            <div class="card-body" style="padding-top:6px"><div id="uTbl"></div></div></div>`;
        const cols=[
            {title:"登录账号",render:u=>`<span class="strong">${esc(u.username)}</span>`},
            {title:"姓名",render:u=>esc(u.name)},
            {title:"密码",render:u=>`<span class="pwd-cell" data-id="${u.id}" title="点击切换显示/隐藏" style="font-family:monospace;cursor:pointer">${state.showPwd?esc(u.password||""):"••••••"}</span>`},
            {title:"角色",align:"center",render:u=>badge(roleName(u.roleId))},
            {title:"状态",align:"center",render:u=>badge(u.status||"启用")},
            {title:"操作",align:"center",render:u=>`<div class="row-act">
                <button data-act="edit" data-id="${u.id}">编辑</button>
                <button data-act="pwd" data-id="${u.id}">重置密码</button>
                <button data-act="toggle" data-id="${u.id}">${u.status==="停用"?"启用":"停用"}</button>
                <button data-act="del" data-id="${u.id}">删除</button></div>`},
        ];
        $("#uTbl").innerHTML=table(cols, users);
        $("#togglePwd").onclick=()=>{ state.showPwd=!state.showPwd; renderUsers(); };
        // 单格点击：临时显示/隐藏该账号密码（不影响全局开关）
        $$('#uTbl .pwd-cell').forEach(c=>c.onclick=()=>{ const u=Store.get("sys_users",c.dataset.id);
            c.textContent = (c.textContent==="••••••") ? (u.password||"") : "••••••"; });
        $("#addUser").onclick=()=>userForm();
        $$('#uTbl [data-act="edit"]').forEach(b=>b.onclick=()=>userForm(b.dataset.id));
        $$('#uTbl [data-act="pwd"]').forEach(b=>b.onclick=()=>resetPwd(b.dataset.id));
        $$('#uTbl [data-act="toggle"]').forEach(b=>b.onclick=()=>{
            const u=Store.get("sys_users",b.dataset.id);
            if(u.username==="admin"){ toast("超级管理员账号不可停用","err"); return; }
            Store.update("sys_users",u.id,{status:u.status==="停用"?"启用":"停用"}); toast("已更新"); renderUsers(); });
        $$('#uTbl [data-act="del"]').forEach(b=>b.onclick=()=>{
            const u=Store.get("sys_users",b.dataset.id);
            if(u.username==="admin"){ toast("超级管理员账号不可删除","err"); return; }
            confirmBox(`确认删除账号「${u.username}」？`,()=>{ Store.remove("sys_users",u.id); toast("已删除"); renderUsers(); }); });
    }

    function userForm(id){
        const u=id?Store.get("sys_users",id):{status:"启用"};
        const roleOpts=Store.all("sys_roles").map(r=>({value:r.id,label:r.name}));
        const body=`<div class="form-grid">
            <div class="field"><label>登录账号 <span class="req">*</span></label><input class="input" data-k="username" value="${esc(u.username||"")}" ${id?'disabled':''}></div>
            <div class="field"><label>姓名 <span class="req">*</span></label><input class="input" data-k="name" value="${esc(u.name||"")}"></div>
            <div class="field"><label>角色 <span class="req">*</span></label><select class="select" data-k="roleId">${options(roleOpts,u.roleId||"")}</select></div>
            <div class="field"><label>状态</label><select class="select" data-k="status">${options(["启用","停用"],u.status||"启用")}</select></div>
            ${id?'':'<div class="field full"><label>初始密码 <span class="req">*</span></label><input class="input" data-k="password" value="123456"></div>'}
        </div>`;
        modal({ title:id?"编辑用户":"新建用户", large:true, body,
            footer:`<button class="btn btn-light" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>`,
            onMount:(el,close)=>{ el.querySelector("[data-save]").onclick=()=>{
                const g=k=>{ const n=el.querySelector(`[data-k="${k}"]`); return n?n.value.trim():""; };
                const username=g("username"), name=g("name"), roleId=g("roleId");
                if(!username||!name||!roleId){ toast("请填写账号、姓名、角色","err"); return; }
                if(!id){
                    if(Store.all("sys_users").some(x=>x.username===username)){ toast("该登录账号已存在","err"); return; }
                    Store.add("sys_users",{username,name,roleId,status:g("status")||"启用",password:g("password")||"123456"}); toast("已创建");
                } else { Store.update("sys_users",id,{name,roleId,status:g("status")}); toast("已更新"); }
                close(); renderUsers();
            }; }
        });
    }

    function resetPwd(id){
        const u=Store.get("sys_users",id);
        modal({ title:`重置密码 · ${u.username}`,
            body:`<div class="field"><label>新密码</label><input class="input" id="np" value="123456"></div>`,
            footer:`<button class="btn btn-light" data-close>取消</button><button class="btn btn-primary" data-save>保存</button>`,
            onMount:(el,close)=>{ el.querySelector("[data-save]").onclick=()=>{
                const v=el.querySelector("#np").value.trim(); if(!v){ toast("请输入新密码","err"); return; }
                Store.update("sys_users",id,{password:v}); toast("密码已重置"); close();
            }; }
        });
    }

    /* ---------- 角色权限 ---------- */
    function renderRoles(){
        const roles=Store.all("sys_roles");
        state.roleId = (state.roleId && roles.some(r=>r.id===state.roleId)) ? state.roleId : roles[0].id;
        $("#accBody").innerHTML=`
        <div class="card"><div class="card-head"><h3>角色功能权限</h3>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <select class="select" id="roleSel">${options(roles.map(r=>({value:r.id,label:r.name})), state.roleId)}</select>
                <button class="btn btn-light btn-sm" id="addRole"><span class="ic">＋</span>新建角色</button>
                <button class="btn btn-light btn-sm" id="delRole">删除角色</button>
            </div></div>
            <div class="card-body"><div id="roleInfo"></div>
                <div id="permArea" style="margin-top:12px"></div>
                <div id="permFoot" style="margin-top:16px;display:flex;align-items:center;gap:10px"></div></div></div>`;
        const sel=$("#roleSel");
        sel.onchange=()=>{ state.roleId=sel.value; paintRole(); };
        $("#addRole").onclick=()=>roleForm();
        $("#delRole").onclick=()=>{
            const r=Store.get("sys_roles",state.roleId);
            if(r.isSuper){ toast("超级管理员角色不可删除","err"); return; }
            if(Store.all("sys_users").some(u=>u.roleId===r.id)){ toast("该角色已分配给账号，不能删除","err"); return; }
            confirmBox(`确认删除角色「${r.name}」？`,()=>{ Store.remove("sys_roles",r.id); state.roleId=null; toast("已删除"); renderRoles(); });
        };
        paintRole();
    }

    function permTree(set){
        return `<div class="perm-tree">${MENU.map(m=>{
            const leaves=m.groups.flatMap(g=>g.leaves);
            const allOn=leaves.length && leaves.every(l=>set.has(l.key));
            return `<div class="perm-mod">
                <label class="perm-mod-head"><input type="checkbox" class="pm-all" data-mod="${m.key}" ${allOn?'checked':''}><b>${m.icon} ${esc(m.name)}</b><span class="perm-mod-n">${leaves.length} 项</span></label>
                <div class="perm-groups">${m.groups.map(g=>`
                    <div class="perm-grp"><div class="perm-grp-t">${esc(g.name)}</div>
                    <div class="perm-grp-leaves">${g.leaves.map(l=>`<label class="perm-leaf"><input type="checkbox" class="pl" value="${l.key}" data-mod="${m.key}" ${set.has(l.key)?'checked':''}>${esc(l.name)}</label>`).join("")}</div></div>`).join("")}</div>
            </div>`;
        }).join("")}</div>`;
    }

    function paintRole(){
        const r=Store.get("sys_roles",state.roleId); if(!r) return;
        $("#roleInfo").innerHTML=`<div class="okr-tip">${esc(r.note||"")}</div>`;
        if(r.isSuper){
            $("#permArea").innerHTML='<div class="empty"><div class="ic">👑</div>超级管理员拥有系统全部功能权限，并可配置其他角色</div>';
            $("#permFoot").innerHTML=""; return;
        }
        $("#permArea").innerHTML=permTree(new Set(r.perms||[]));
        $("#permFoot").innerHTML=`<span style="margin-right:auto;color:#5b6478;font-size:13px" id="permCount"></span>
            <button class="btn btn-light" id="permAll">全选</button>
            <button class="btn btn-light" id="permNone">清空</button>
            <button class="btn btn-primary" id="permSave">保存权限</button>`;
        wirePerm();
    }

    function wirePerm(){
        const upd=()=>{ const c=$("#permCount"); if(c) c.textContent=`已选 ${$$("#permArea .pl:checked").length} 项功能`; };
        $$("#permArea .pm-all").forEach(cb=>cb.onchange=()=>{ $$(`#permArea .pl[data-mod="${cb.dataset.mod}"]`).forEach(x=>x.checked=cb.checked); upd(); });
        $$("#permArea .pl").forEach(cb=>cb.onchange=()=>{
            const all=$$(`#permArea .pl[data-mod="${cb.dataset.mod}"]`), head=$(`#permArea .pm-all[data-mod="${cb.dataset.mod}"]`);
            if(head) head.checked=all.every(x=>x.checked); upd();
        });
        $("#permAll").onclick=()=>{ $$("#permArea .pl, #permArea .pm-all").forEach(x=>x.checked=true); upd(); };
        $("#permNone").onclick=()=>{ $$("#permArea .pl, #permArea .pm-all").forEach(x=>x.checked=false); upd(); };
        $("#permSave").onclick=()=>{
            const perms=$$("#permArea .pl:checked").map(x=>x.value);
            Store.update("sys_roles",state.roleId,{perms}); toast("权限已保存，该角色账号登录后即生效","ok");
        };
        upd();
    }

    function roleForm(){
        const body=`<div class="form-grid">
            <div class="field full"><label>角色名称 <span class="req">*</span></label><input class="input" id="rn" placeholder="如：出纳 / 安全员 / 资料员"></div>
            <div class="field full"><label>角色说明</label><input class="input" id="rnote" placeholder="该角色的职责范围"></div></div>`;
        modal({ title:"新建角色", body,
            footer:`<button class="btn btn-light" data-close>取消</button><button class="btn btn-primary" data-save>创建</button>`,
            onMount:(el,close)=>{ el.querySelector("[data-save]").onclick=()=>{
                const name=el.querySelector("#rn").value.trim(); if(!name){ toast("请填写角色名称","err"); return; }
                const r=Store.add("sys_roles",{name,isSuper:false,perms:[],note:el.querySelector("#rnote").value.trim()});
                state.roleId=r.id; toast("已创建，请在下方勾选该角色可用的功能"); close(); renderRoles();
            }; }
        });
    }

    function mount(){
        if(!isSuper()){
            $$("#accTabs button").forEach(b=>b.style.display="none");
            $("#accBody").innerHTML='<div class="empty"><div class="ic">🔒</div>仅超级管理员可访问权限控制</div>';
            return;
        }
        const setTab=t=>{ $$("#accTabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===t)); t==="roles"?renderRoles():renderUsers(); };
        $$("#accTabs button").forEach(b=>b.onclick=()=>setTab(b.dataset.t));
        setTab(initTab);
    }

    return { html, mount };
}
