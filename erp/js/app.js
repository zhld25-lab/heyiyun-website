/* ============================================================
   应用入口：登录校验 + 侧边栏 + 哈希路由
   ============================================================ */
import { $, $$ } from "./ui.js";
import { Store } from "./store.js";

import dashboard   from "./pages/dashboard.js";
import projects    from "./pages/projects.js";
import contracts   from "./pages/contracts.js";
import boq         from "./pages/boq.js";
import procurement from "./pages/procurement.js";
import progress    from "./pages/progress.js";
import cost        from "./pages/cost.js";
import finance     from "./pages/finance.js";
import reports     from "./pages/reports.js";

/* ---------- 登录校验 ---------- */
const user = (()=>{ try{ return JSON.parse(localStorage.getItem("heyiyun_erp_user")); }catch(e){ return null; } })();
if(!user){ location.href = "login.html"; }
else {
    $("#userName").textContent = user.name;
    $("#userRole").textContent = user.role || "系统用户";
    $("#userAvatar").textContent = (user.name||"用")[0];
}

/* ---------- 路由表 ---------- */
const ROUTES = {
    dashboard:   {title:"经营看板", sub:"数据总览",     icon:"📊", group:"决策中心", page:dashboard},
    reports:     {title:"决策报表", sub:"动态盈亏分析", icon:"📈", group:"决策中心", page:reports},
    projects:    {title:"项目管理", sub:"工程项目台账", icon:"🏗️", group:"业务管理", page:projects},
    contracts:   {title:"合同管理", sub:"甲方/分包合同", icon:"📑", group:"业务管理", page:contracts},
    boq:         {title:"清单双价", sub:"工程量清单档案", icon:"📋", group:"业务管理", page:boq},
    procurement: {title:"采购物资", sub:"材料采购台账", icon:"🛒", group:"业务管理", page:procurement},
    progress:    {title:"施工进度", sub:"现场进度填报", icon:"📐", group:"业务管理", page:progress},
    cost:        {title:"成本资金", sub:"成本归集管控", icon:"💰", group:"财务中心", page:cost},
    finance:     {title:"财务对接", sub:"收支资金流水", icon:"🔗", group:"财务中心", page:finance},
};

/* ---------- 渲染侧边栏 ---------- */
function buildNav(){
    const groups = {};
    Object.entries(ROUTES).forEach(([key,r])=>{ (groups[r.group]=groups[r.group]||[]).push([key,r]); });
    let html="";
    for(const g in groups){
        html += `<div class="sb-group">${g}</div>`;
        html += groups[g].map(([key,r])=>
            `<a class="sb-item" href="#${key}" data-key="${key}"><span class="ic">${r.icon}</span>${r.title}</a>`).join("");
    }
    $("#sbNav").innerHTML = html;
}

/* ---------- 路由切换 ---------- */
function navigate(){
    const key = (location.hash.slice(1) || "dashboard");
    const route = ROUTES[key] || ROUTES.dashboard;
    $$(".sb-item").forEach(a=>a.classList.toggle("active", a.dataset.key===key));
    $("#crumbTitle").textContent = route.title;
    $("#crumbSub").textContent = route.sub;
    document.title = `${route.title} · 和易云电力工程ERP`;

    const root = $("#page");
    root.innerHTML = "";
    const view = route.page();             // {html, mount}
    root.innerHTML = view.html;
    if(view.mount) view.mount(root);
    root.scrollTop = 0;
    $("#sidebar").classList.remove("open");
}

/* ---------- 事件 ---------- */
window.addEventListener("hashchange", navigate);
$("#tbToggle").addEventListener("click", ()=>$("#sidebar").classList.toggle("open"));
$("#resetBtn").addEventListener("click", ()=>{
    if(confirm("确定要重置所有演示数据吗？这将恢复到初始示例数据。")){ Store.reset(); navigate(); }
});
$("#globalSearch").addEventListener("keydown", e=>{
    if(e.key==="Enter"){
        const q = e.target.value.trim();
        if(q){ sessionStorage.setItem("erp_q", q); location.hash = "projects"; }
    }
});

/* ---------- 启动 ---------- */
buildNav();
navigate();
