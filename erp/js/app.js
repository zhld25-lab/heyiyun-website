/* ============================================================
   应用入口：登录校验 + 模块图标轨 + 分组手风琴 + 路由
   ============================================================ */
import { $, $$, esc, toast, modal } from "./ui.js";
import { Store } from "./store.js";
import { MENU, buildIndex } from "./menu.js";
import { schemaFor } from "./schema.js";
import { renderLeaf } from "./engine.js?v=att2";
import { currentUser, currentRole, isSuper, canLeaf, logout } from "./auth.js";
import dashboard from "./pages/dashboard.js";
import okr from "./pages/okr.js";
import access from "./pages/access.js";
import certalarm, { certStats, daysHtml } from "./pages/certalarm.js";

/* 登录校验：未登录或角色失效 → 回登录页 */
const user = currentUser();
if(!user || (!user.isSuper && !currentRole())){ location.href = "login.html"; }
else {
    $("#userName").textContent=user.name;
    $("#userRole").textContent=user.roleName||user.role||"系统用户";
    $("#userAvatar").textContent=(user.name||"用")[0];
}

const INDEX = buildIndex();
let activeModuleKey = null;

/* 权限工具 */
const moduleVisible = m => isSuper() || m.groups.some(g=>g.leaves.some(l=>canLeaf(l.key)));
function firstAllowed(){
    for(const m of MENU) for(const g of m.groups) for(const l of g.leaves) if(canLeaf(l.key)) return l.key;
    return MENU[1].groups[0].leaves[0].key;
}

/* ---------- 模块图标轨 ---------- */
function buildRail(){
    let html = `<div class="rail-logo">恒</div>`;
    html += MENU.filter(moduleVisible).map(m=>`<div class="rail-item" data-mod="${m.key}" title="${esc(m.name)}"><div>${m.icon}</div><span>${esc(m.name)}</span></div>`).join("");
    $("#modRail").innerHTML = html;
    $$("#modRail .rail-item").forEach(it=>it.onclick=()=>{
        const m = MENU.find(x=>x.key===it.dataset.mod);
        const firstLeaf = m.groups.flatMap(g=>g.leaves).find(l=>canLeaf(l.key));
        const first = (firstLeaf||m.groups[0].leaves[0]).key;
        if(window.innerWidth<=768){
            // 移动端：点顶部模块 → 展开该模块的二级菜单抽屉，由用户再选具体功能
            activeModuleKey = m.key;
            $$("#modRail .rail-item").forEach(x=>x.classList.toggle("active", x===it));
            buildSidebar(m.key, null);
            document.querySelector(".app").classList.add("navopen");
        } else {
            location.hash = first;
        }
    });
}

/* ---------- 移动端底部Tab导航 ---------- */
const TAB_PREF = ["decision","project","finance","okr","me"];   // 优先展示的模块
function buildTabbar(){
    const bar = $("#tabbar"); if(!bar) return;
    const visible = MENU.filter(moduleVisible);
    const picks = TAB_PREF.map(k=>visible.find(m=>m.key===k)).filter(Boolean).slice(0,4);
    // 不足 4 个时按可见顺序补齐
    for(const m of visible){ if(picks.length>=4) break; if(!picks.includes(m)) picks.push(m); }
    bar.innerHTML = picks.map(m=>`<a class="tab-item" data-mod="${m.key}"><div>${m.icon}</div><span>${esc(m.name)}</span></a>`).join("")
        + `<a class="tab-item" data-more><div>☰</div><span>全部</span></a>`;
    $$("#tabbar .tab-item[data-mod]").forEach(t=>t.onclick=()=>{
        const m = MENU.find(x=>x.key===t.dataset.mod);
        const firstLeaf = m.groups.flatMap(g=>g.leaves).find(l=>canLeaf(l.key));
        if(firstLeaf) location.hash = firstLeaf.key;
    });
    const more = bar.querySelector("[data-more]");
    if(more) more.onclick=()=>{
        buildSidebar(activeModuleKey || MENU[0].key, location.hash.slice(1));
        document.querySelector(".app").classList.add("navopen");
    };
}
function highlightTab(moduleKey){
    $$("#tabbar .tab-item[data-mod]").forEach(t=>t.classList.toggle("on", t.dataset.mod===moduleKey));
}

/* ---------- 侧栏分组手风琴 ---------- */
function buildSidebar(moduleKey, activeLeafKey){
    const m = MENU.find(x=>x.key===moduleKey);
    $("#modName").textContent = m.name;
    $("#sbNav").innerHTML = m.groups.map((g,gi)=>{
        const allowed = g.leaves.filter(lf=>canLeaf(lf.key));
        if(!allowed.length) return "";
        const leaves = allowed.map(lf=>`<a class="sb-leaf" data-key="${lf.key}" href="#${lf.key}">${esc(lf.name)}</a>`).join("");
        const title = g.name || m.name;
        return `<div class="acc-group" data-g="${gi}">
            <div class="acc-head">${esc(title)}<span class="arr">▼</span></div>
            <div class="acc-body">${leaves}</div></div>`;
    }).join("");
    // 手风琴展开/收起
    $$("#sbNav .acc-head").forEach(h=>h.onclick=()=>{
        const grp=h.parentElement; const body=grp.querySelector(".acc-body");
        if(grp.classList.contains("collapsed")){ grp.classList.remove("collapsed"); body.style.maxHeight=body.scrollHeight+"px"; }
        else { body.style.maxHeight=body.scrollHeight+"px"; requestAnimationFrame(()=>{ grp.classList.add("collapsed"); body.style.maxHeight="0"; }); }
    });
    // 默认展开，并定位激活叶子
    $$("#sbNav .acc-body").forEach(b=>b.style.maxHeight=b.scrollHeight+"px");
    highlightLeaf(activeLeafKey);
}
function highlightLeaf(key){
    $$("#sbNav .sb-leaf").forEach(a=>a.classList.toggle("active", a.dataset.key===key));
}

/* ---------- 路由 ---------- */
function navigate(){
    let key = location.hash.slice(1) || firstAllowed();
    let leaf = INDEX.leaves[key];
    if(!leaf){ key=firstAllowed(); leaf=INDEX.leaves[key]; }
    // 无权限：重定向到该用户第一个可访问功能
    if(!canLeaf(key)){
        const fk=firstAllowed();
        toast("无权限访问该功能","err");
        if(fk && fk!==key){ location.hash=fk; return; }
        key=fk; leaf=INDEX.leaves[key];
    }

    // 切换模块
    if(leaf.moduleKey!==activeModuleKey){
        activeModuleKey = leaf.moduleKey;
        $$("#modRail .rail-item").forEach(it=>it.classList.toggle("active", it.dataset.mod===activeModuleKey));
        buildSidebar(activeModuleKey, key);
    } else {
        highlightLeaf(key);
    }

    $("#crumbTitle").textContent = leaf.name;
    $("#crumbSub").textContent = `${leaf.module} · ${leaf.group||leaf.module}`;
    document.title = `${leaf.name} · 恒达云电力工程ERP`;

    const root = $("#page"); root.innerHTML="";
    try{
        const schema = schemaFor(leaf);
        const view = schema.kind==="access" ? access(leaf, schema)
                   : schema.kind==="certalarm" ? certalarm(leaf, schema)
                   : (schema.kind && schema.kind.indexOf("okr_")===0) ? okr(leaf, schema)
                   : renderLeaf(leaf, schema, dashboard);
        root.innerHTML = view.html;
        if(view.mount) view.mount(root);
    }catch(err){
        root.innerHTML = `<div class="empty"><div class="ic">⚠️</div>页面加载出错：${esc(err.message)}</div>`;
        console.error(err);
    }
    root.scrollTop=0;
    document.querySelector(".app").classList.remove("navopen");
    highlightTab(activeModuleKey);
    certBell();
}

/* ---------- 证书到期报警（全局铃铛，所有角色可见） ---------- */
const certLeaf = Object.values(INDEX.leaves).find(l=>l.kind==="certalarm");
function certBell(){
    const btn=$("#bellBtn"), dot=$("#bellDot"); if(!btn) return;
    const s=certStats();
    if(s.alarm>0){ dot.style.display="grid"; dot.textContent=s.alarm>99?"99+":s.alarm; dot.classList.add("badge-num"); btn.classList.add("bell-alarm"); }
    else { dot.style.display="none"; dot.classList.remove("badge-num"); btn.classList.remove("bell-alarm"); }
    btn.onclick=openCertPanel;
}
function openCertPanel(){
    const s=certStats();
    const items=s.list.filter(c=>["expired","urgent","warn"].includes(c.lv.key));
    const body = items.length ? `<div class="notif-list">${items.map(c=>`
        <div class="notif-item"><div class="ni-ic">${c.lv.key==="expired"?"⛔":c.lv.key==="urgent"?"⏰":"🔔"}</div>
            <div class="ni-main"><div class="ni-t">${esc(c.name)}</div><div class="ni-d">${esc(c.category||"")} · ${esc(c.holder||"")} · 到期 ${esc(c.expiry||"—")}</div></div>
            <div class="ni-r"><span class="badge ${c.lv.cls}">${c.lv.label}</span><div style="margin-top:4px">${daysHtml(c.lv)}</div></div>
        </div>`).join("")}</div>`
        : '<div class="empty"><div class="ic">✅</div>暂无即将到期或已过期的证书</div>';
    const canView = certLeaf && canLeaf(certLeaf.key);
    modal({ title:`证书到期预警 · ${s.expired}过期 / ${s.urgent}紧急 / ${s.warn}预警`, large:true, body,
        footer:`${canView?'<button class="btn btn-primary" data-go>查看证书台账</button>':''}<button class="btn btn-light" data-close>关闭</button>`,
        onMount:(el,close)=>{ const g=el.querySelector("[data-go]"); if(g) g.onclick=()=>{ close(); location.hash=certLeaf.key; }; }
    });
}

/* ---------- 全局功能搜索 ---------- */
function setupSearch(){
    const input=$("#globalSearch"), panel=$("#searchPanel");
    const all = Object.values(INDEX.leaves).filter(l=>canLeaf(l.key));
    input.addEventListener("input",()=>{
        const q=input.value.trim();
        if(!q){ panel.classList.remove("show"); return; }
        const hits = all.filter(l=>l.name.includes(q)||l.module.includes(q)||(l.group||"").includes(q)).slice(0,12);
        panel.innerHTML = hits.length ? hits.map(l=>`<a href="#${l.key}" data-key="${l.key}">${l.icon} ${esc(l.name)}<small>${esc(l.module)} / ${esc(l.group||"")}</small></a>`).join("")
            : `<div class="sp-empty">未找到匹配的功能菜单</div>`;
        panel.classList.add("show");
        $$("#searchPanel a").forEach(a=>a.onclick=()=>{ panel.classList.remove("show"); input.value=""; });
    });
    document.addEventListener("click",e=>{ if(!panel.contains(e.target)&&e.target!==input) panel.classList.remove("show"); });
}

/* ---------- 事件 ---------- */
window.addEventListener("hashchange", navigate);
$("#tbToggle").addEventListener("click",()=>document.querySelector(".app").classList.toggle("navopen"));
$("#resetBtn").addEventListener("click",()=>{ if(confirm("确定重置所有演示数据吗？将恢复初始示例数据。")){ Store.reset(); navigate(); } });
const logoutBtn=$("#logoutBtn"); if(logoutBtn) logoutBtn.addEventListener("click",()=>{ if(confirm("确定退出登录吗？")){ logout(); location.href="login.html"; } });

const navMask=$("#navMask"); if(navMask) navMask.addEventListener("click",()=>document.querySelector(".app").classList.remove("navopen"));

/* ---------- 启动 ---------- */
buildRail();
buildTabbar();
setupSearch();
navigate();
certBell();
// 登录后证书到期提醒
(()=>{ const s=certStats(); if(s.expired||s.urgent){ setTimeout(()=>toast(`⚠ ${s.expired} 张证书已过期、${s.urgent} 张30天内到期，请及时处理`,"err"),600); } })();
