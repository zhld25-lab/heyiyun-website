/* 元数据驱动引擎 v2 —— 首页看板 + 全菜单真实数据 + 报表汇总 + 个人工作台，绝不空白 */
import { MENU, LISTFORMS, FORMS, PROCTYPES, BUSITYPES } from "./meta.bundle.js?v=2";
import { DATA } from "./data.bundle.js?v=2";
let LEAF_COLL={}; try{ ({ LEAF_COLL } = await import("../erp/js/realmap.js?v=2")); }catch(e){}

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const keys=Object.keys(DATA);
const tbl=name=>{ if(!name) return null; if(DATA["t_00001_"+name]) return "t_00001_"+name;
  return keys.filter(k=>k.endsWith("_"+name)).sort((a,b)=>DATA[b].length-DATA[a].length)[0]||null; };
const rowsOf=t=>(t&&DATA[t])?DATA[t]:[];
const yuan=v=>{ const n=+v; return isNaN(n)?esc(v):n.toLocaleString("zh-CN",{minimumFractionDigits:2,maximumFractionDigits:2}); };
const wan=v=>{ const n=+v||0; return (n/10000).toLocaleString("zh-CN",{maximumFractionDigits:1})+"万"; };
const sum=(arr,k)=>arr.reduce((a,r)=>a+(+r[k]||0),0);

/* FK 名称解析 */
function mapBy(suffix){ const k=keys.find(k=>k.endsWith(suffix)); const m={}; if(k) DATA[k].forEach(r=>m[r.id]=r.name); return m; }
const M_cust=mapBy("_p_cust"),M_proj=mapBy("_p_project"),M_user=mapBy("_s_user"),M_dept=mapBy("_s_dept"),
      M_supp=mapBy("_p_supplier"),M_subc=mapBy("_p_subcontractor"),M_lessor=mapBy("_p_lessor");
const FKMAP={projectid:M_proj,custid:M_cust,userid:M_user,deptid:M_dept,supplierid:M_supp,subcontractorid:M_subc,lessorid:M_lessor,managerid:M_user};
const ALIAS={cname:["custid",M_cust],pname:["projectid",M_proj],uname:["userid",M_user],dname:["deptid",M_dept],sname:["supplierid",M_supp],subname:["subcontractorid",M_subc],lname:["lessorid",M_lessor]};
function disp(k,r){ let v=r[k];
  if(FKMAP[k]!=null && (typeof v==='number'||/^\d+$/.test(String(v)))) return FKMAP[k][v]||v;
  if((v==null||v==="")&&ALIAS[k]){const[fk,mp]=ALIAS[k];return mp[r[fk]]||"";}
  return v; }

/* 菜单树 */
const byId={}; MENU.forEach(m=>byId[m.id]=m);
const kids={}; MENU.forEach(m=>{(kids[m.parentId]=kids[m.parentId]||[]).push(m);});
Object.values(kids).forEach(a=>a.sort((x,y)=>(x.dispOrder||0)-(y.dispOrder||0)));
const roots=MENU.filter(m=>!m.parentId||!byId[m.parentId]).filter(m=>!m.hidden).sort((a,b)=>(a.dispOrder||0)-(b.dispOrder||0));

function buildTop(){
  $("#topnav").innerHTML=`<div class="m" data-home="1">🏠 首页</div>`+roots.map(r=>`<div class="m" data-id="${esc(r.id)}">${esc(r.name)}</div>`).join("");
  $$("#topnav .m").forEach(el=>el.onclick=()=>{ $$("#topnav .m").forEach(x=>x.classList.remove("on")); el.classList.add("on");
    if(el.dataset.home){ $("#left").innerHTML=""; openTab("__home__","经营看板",0,"home"); } else buildLeft(el.dataset.id); });
}
function buildLeft(rootId){
  const groups=(kids[rootId]||[]).filter(g=>!g.hidden);
  $("#left").innerHTML=groups.map(g=>{ const lv=(kids[g.id]||[]).filter(l=>!l.hidden);
    return lv.length?`<div class="grp"><div class="gh">${esc(g.name)}<span>▾</span></div><div class="gb">${lv.map(leafHTML).join("")}</div></div>`:`<div class="grp">${leafHTML(g)}</div>`;
  }).join("");
  $$("#left .gh").forEach(h=>h.onclick=()=>{const b=h.nextElementSibling;if(b)b.style.display=b.style.display==="none"?"":"none";});
  $$("#left .leaf").forEach(el=>el.onclick=()=>{$$("#left .leaf").forEach(x=>x.classList.remove("on"));el.classList.add("on");
    openTab(el.dataset.id,byId[el.dataset.id].name,+el.dataset.lf||0,el.dataset.url);});
}
const leafHTML=l=>`<div class="leaf" data-id="${esc(l.id)}" data-lf="${l.listFormId||''}" data-url="${esc(l.url||'')}">${esc(l.name)}</div>`;

/* 标签 */
const tabs={};let active=null;
function openTab(id,name,lf,url){ tabs[id]={name,lf,url}; renderTabs(); activate(id); }
function renderTabs(){ $("#tabs").innerHTML=Object.keys(tabs).map(id=>`<div class="tab ${id===active?'on':''}" data-id="${esc(id)}">${esc(tabs[id].name)}<span class="x" data-x="${esc(id)}">×</span></div>`).join("");
  $$("#tabs .tab").forEach(t=>t.onclick=e=>{ if(e.target.dataset.x){const x=e.target.dataset.x;delete tabs[x];if(active===x)active=Object.keys(tabs)[0]||null;renderTabs();if(active)activate(active);else $("#page").innerHTML="";return;} activate(t.dataset.id);});}

/* 路由：保证永远有真实内容 */
function activate(id){ active=id; renderTabs(); const t=tabs[id];
  try{
    if(t.url==="home"||id==="__home__") return renderHome();
    const name=t.name;
    if(t.lf && LISTFORMS[t.lf]) return renderList(t.lf);
    // 个人工作台
    if(["待办事项","已办事项","知会事项"].includes(name)) return renderTodo(name);
    if(name==="我的薪资") return renderTable(tbl("p_salarypay"),"我的薪资",["salarymonth","salarytype","amount","userid","remark"]);
    if(name==="我的考勤") return renderTable(tbl("a_attend"),"我的考勤",["userId","attendTime","address","status"]);
    if(name==="修改密码") return renderPwd();
    if(name==="逻辑图") return renderDiagram();
    // 用 realmap 把菜单挂到真实表
    const t2=tbl(LEAF_COLL[name]);
    const isRep=/统计|分析|报表|汇总/.test(name)||/Rep\.html/i.test(t.url||"");
    if(t2 && rowsOf(t2).length){ return isRep?renderReport(t2,name):renderTable(t2,name); }
    if(t2) return renderTable(t2,name); // 空表也展示结构
    // 报表页但没映射到表：按业务类型给汇总
    if(isRep) return renderRepByName(name);
    return renderModuleOverview(t);
  }catch(e){ $("#page").innerHTML=`<div class="pghead"><h2>${esc(t.name)}</h2></div><div class="card"><div class="empty">渲染出错：${esc(e.message)}</div></div>`; }
}

/* 首页经营看板 */
function renderHome(){
  const proj=rowsOf(tbl("p_project")), con=rowsOf(tbl("p_contract")), sub=rowsOf(tbl("p_subcontract")),
        pur=rowsOf(tbl("p_purcontract")), cost=rowsOf(tbl("p_indirectcost"));
  const amt=sum(con,"amount"),recv=sum(con,"recv"),recvbl=sum(con,"receivables");
  const kpi=(ic,lb,val,sub2,c)=>`<div class="kpi"><div class="ki">${ic}</div><div><div class="kl">${lb}</div><div class="kv" style="color:${c||'#0a1733'}">${val}</div>${sub2?`<div class="ks">${sub2}</div>`:''}</div></div>`;
  const topcon=con.slice().sort((a,b)=>(+b.amount||0)-(+a.amount||0)).slice(0,8);
  $("#page").innerHTML=`
   <div class="pghead"><div><h2>经营看板</h2><div class="sub">恒达云ERP · 来自原系统真实数据（合众电气）</div></div></div>
   <div class="kgrid">
     ${kpi("🏗️","项目数",proj.length,"在建/历史项目")}
     ${kpi("📄","承包合同额",wan(amt),con.length+" 份合同","#1b5fe3")}
     ${kpi("💰","累计收款",wan(recv),"回款率 "+(amt?(recv/amt*100).toFixed(1):0)+"%","#16a34a")}
     ${kpi("⏳","应收款",wan(recvbl),"待回款","#e8890c")}
     ${kpi("🤝","分包合同",sub.length+" 份",wan(sum(sub,"amount")))}
     ${kpi("📦","采购合同",pur.length+" 份",wan(sum(pur,"amount")))}
     ${kpi("🧾","间接成本",wan(sum(cost,"amount")),cost.length+" 笔")}
     ${kpi("👤","客户/供应商",Object.keys(M_cust).length+"/"+Object.keys(M_supp).length,"往来单位")}
   </div>
   <div class="hgrid">
     <div class="card"><div class="ch">大额承包合同 Top 8</div><div style="overflow:auto"><table>
       <thead><tr><th>合同名称</th><th>项目</th><th class="num">合同额(元)</th><th class="num">已收</th><th class="num">应收</th></tr></thead>
       <tbody>${topcon.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(M_proj[c.projectid]||"—")}</td><td class="num">${yuan(c.amount)}</td><td class="num" style="color:#16a34a">${yuan(c.recv)}</td><td class="num" style="color:#e8890c">${yuan(c.receivables)}</td></tr>`).join("")}</tbody>
     </table></div></div>
     <div class="card"><div class="ch">项目一览</div><div style="overflow:auto;max-height:340px"><table>
       <thead><tr><th>项目名称</th><th>负责人</th><th class="num">预算成本</th><th class="num">完成率</th></tr></thead>
       <tbody>${proj.slice(0,20).map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(M_user[p.managerid]||"—")}</td><td class="num">${yuan(p.ctbudget)}</td><td class="num">${p.comprate!=null?(+p.comprate).toFixed(1)+"%":"—"}</td></tr>`).join("")}</tbody>
     </table></div></div>
   </div>`;
}

/* 通用真实数据列表 */
function renderTable(t,title,prefCols){
  const rows=rowsOf(t); const st={q:""};
  let cols=prefCols&&rows.length?prefCols.filter(c=>c in rows[0]):null;
  if(!cols||!cols.length){ cols=Object.keys(rows[0]||{}).filter(k=>!["processId","processStatus","attach","baseId","corpId"].includes(k)).slice(0,9); }
  const label=k=>({name:"名称",code:"编号",amount:"金额",projectid:"项目",custid:"客户/甲方",supplierid:"供应商",subcontractorid:"分包商",userid:"经办人",managerid:"负责人",appdate:"日期",status:"状态",remark:"备注",startdate:"开始",enddate:"结束",salarymonth:"月份",salarytype:"类型",attendTime:"打卡时间",address:"地点"}[k]||k);
  const numCol=k=>/amount|amt|price|sum|recv|pay|balance|cost|budget|fee|money/i.test(k);
  function draw(){ const data=rows.filter(r=>!st.q||cols.some(c=>String(disp(c,r)==null?"":disp(c,r)).includes(st.q)));
    $("#page").innerHTML=`<div class="pghead"><div><h2>${esc(title)}</h2><div class="sub">真实数据 · 表 ${esc(t||"?")} · 共 ${rows.length} 条</div></div></div>
     <div class="bar"><input class="inp" id="tq" placeholder="搜索…" value="${esc(st.q)}" style="width:220px"><span style="flex:1"></span><span class="sub">${data.length} 条</span></div>
     <div class="card" style="overflow:auto;max-height:calc(100vh - 190px)"><table><thead><tr>${cols.map(c=>`<th class="${numCol(c)?'num':''}">${esc(label(c))}</th>`).join("")}</tr></thead>
     <tbody>${data.length?data.map(r=>`<tr>${cols.map(c=>{const v=disp(c,r);return `<td class="${numCol(c)?'num':''}">${v==null||v===""?'<span style=color:#c7d0e0>—</span>':(numCol(c)&&!isNaN(+r[c])?yuan(r[c]):esc(v))}</td>`;}).join("")}</tr>`).join(""):`<tr><td colspan="${cols.length}"><div class="empty">该表暂无数据</div></td></tr>`}</tbody></table></div>`;
    const q=$("#tq"); if(q) q.oninput=e=>{st.q=e.target.value;draw();}; }
  draw();
}

/* 标准列表(按 f_listform) */
function renderList(lfId){ const L=LISTFORMS[lfId]; const t=tbl(L.dbName);
  if(!t||!rowsOf(t).length) return renderTable(tbl(LEAF_COLL[L.name])||t,L.name);
  const cols=L.cols.length?L.cols:Object.keys(rowsOf(t)[0]||{}).slice(0,8).map(k=>({name:k,dbName:k}));
  const st={q:""}; const numC=c=>c.fieldType==='Decimal'||c.format;
  function draw(){ const rows=rowsOf(t); const data=rows.filter(r=>!st.q||cols.some(c=>String(disp(c.dbName,r)==null?"":disp(c.dbName,r)).includes(st.q)));
    $("#page").innerHTML=`<div class="pghead"><div><h2>${esc(L.name)}</h2><div class="sub">列表#${lfId} · 表 ${esc(t)} · ${BUSITYPES[L.businessTypeId]||''}${L.processTypeId?' · 含审批流':''} · 共 ${rows.length} 条</div></div></div>
     <div class="bar"><input class="inp" id="lq" placeholder="搜索…" value="${esc(st.q)}" style="width:220px">${L.addFlag?'<button class="btn btn-p" disabled title="写入功能下一阶段">＋ 新建</button>':''}<span style="flex:1"></span><span class="sub">${data.length} 条</span></div>
     <div class="card" style="overflow:auto;max-height:calc(100vh - 190px)"><table><thead><tr>${cols.map(c=>`<th class="${numC(c)?'num':''}">${esc(c.name)}</th>`).join("")}</tr></thead>
     <tbody>${data.length?data.map((r,i)=>`<tr data-i="${rows.indexOf(r)}">${cols.map(c=>{let v=disp(c.dbName,r);return `<td class="${numC(c)?'num':''}">${v==null||v===""?'<span style=color:#c7d0e0>—</span>':(numC(c)?yuan(v):esc(v))}</td>`;}).join("")}</tr>`).join(""):`<tr><td colspan="${cols.length}"><div class="empty">暂无数据</div></td></tr>`}</tbody></table></div>`;
    const q=$("#lq"); if(q) q.oninput=e=>{st.q=e.target.value;draw();};
    $$("#page tbody tr[data-i]").forEach(tr=>tr.onclick=()=>openForm(L,rowsOf(t)[+tr.dataset.i]));
  } draw();
}

/* 报表汇总：按项目分组的计数与金额合计 */
function renderReport(t,title){ const rows=rowsOf(t);
  const amtKey=Object.keys(rows[0]||{}).find(k=>/^amount$|^amt$|sumamt|^recv$/.test(k))||"amount";
  const g={}; rows.forEach(r=>{const p=M_proj[r.projectid]||"未关联项目";(g[p]=g[p]||{n:0,s:0});g[p].n++;g[p].s+=(+r[amtKey]||0);});
  const arr=Object.entries(g).sort((a,b)=>b[1].s-a[1].s);
  $("#page").innerHTML=`<div class="pghead"><div><h2>${esc(title)}</h2><div class="sub">真实数据汇总 · 表 ${esc(t)} · 共 ${rows.length} 条</div></div></div>
   <div class="kgrid"><div class="kpi"><div class="ki">📊</div><div><div class="kl">记录数</div><div class="kv">${rows.length}</div></div></div>
     <div class="kpi"><div class="ki">💰</div><div><div class="kl">金额合计</div><div class="kv" style="color:#1b5fe3">${wan(sum(rows,amtKey))}</div></div></div>
     <div class="kpi"><div class="ki">🏗️</div><div><div class="kl">涉及项目</div><div class="kv">${arr.length}</div></div></div></div>
   <div class="card"><div class="ch">按项目汇总</div><div style="overflow:auto;max-height:calc(100vh - 280px)"><table>
     <thead><tr><th>项目</th><th class="num">记录数</th><th class="num">金额合计(元)</th></tr></thead>
     <tbody>${arr.map(([p,v])=>`<tr><td>${esc(p)}</td><td class="num">${v.n}</td><td class="num">${yuan(v.s)}</td></tr>`).join("")}</tbody></table></div></div>`;
}
function renderRepByName(name){ // 报表无直接表映射时，按关键词找最相关业务表
  const guess=name.includes("分包")?"p_subcontract":name.includes("采购")?"p_purcontract":name.includes("租赁")?"p_leasecontract":name.includes("收入")||name.includes("收款")?"p_contractpay":name.includes("利润")||name.includes("经营")?"p_contract":"p_contract";
  const t=tbl(guess); return t?renderReport(t,name):renderModuleOverview({name});
}

/* 待办/已办/知会：跨业务表的真实单据流 */
function renderTodo(kind){
  const SRC=[["p_contract","承包合同"],["p_subcontract","分包合同"],["p_purcontract","采购合同"],["p_indirectcost","间接成本"],["p_salarypay","薪资付款"],["p_contractpay","合同收款"]];
  const want=kind==="待办事项"?1:kind==="已办事项"?2:null;
  let list=[];
  SRC.forEach(([n,lb])=>{ const t=tbl(n); rowsOf(t).forEach(r=>{ const ps=+r.processStatus;
    if(want!=null && ps!==want) return; if(want==null && !(ps>0)) return;
    list.push({lb,name:r.name||r.code||("#"+r.id),proj:M_proj[r.projectid]||"",amt:r.amount||r.amt||r.contractamt||0,ps}); }); });
  list=list.slice(0,200);
  $("#page").innerHTML=`<div class="pghead"><div><h2>${esc(kind)}</h2><div class="sub">跨模块真实单据 · 共 ${list.length} 项</div></div></div>
   <div class="card" style="overflow:auto;max-height:calc(100vh - 170px)"><table><thead><tr><th>单据类型</th><th>单据名称</th><th>项目</th><th class="num">金额(元)</th><th>状态</th></tr></thead>
   <tbody>${list.length?list.map(d=>`<tr><td><span class="tag">${esc(d.lb)}</span></td><td>${esc(d.name)}</td><td>${esc(d.proj)}</td><td class="num">${d.amt?yuan(d.amt):"—"}</td><td>${d.ps===2?'<span style=color:#16a34a>已通过</span>':d.ps===1?'<span style=color:#e8890c>流转中</span>':'—'}</td></tr>`).join(""):`<tr><td colspan="5"><div class="empty">暂无</div></td></tr>`}</tbody></table></div>`;
}
function renderPwd(){ $("#page").innerHTML=`<div class="pghead"><h2>修改密码</h2></div><div class="card" style="max-width:420px"><div style="padding:18px">
  <div class="fld"><label>原密码</label><input class="inp" type="password"></div><div class="fld" style="margin-top:10px"><label>新密码</label><input class="inp" type="password"></div>
  <button class="btn btn-p" style="margin-top:14px" onclick="alert('演示：密码已修改')">保存</button></div></div>`; }
function renderDiagram(){ $("#page").innerHTML=`<div class="pghead"><h2>业务逻辑图</h2></div><div class="card"><div style="padding:24px;text-align:center;line-height:2.2">
  <b style="font-size:16px">项目（主线）</b><br>▼<br>
  合同 · 工程量清单(双价) · 进度填报 · 成本台账 · 资金收付 · 采购/库存 · 分包/劳务<br>
  <span class="sub">项目 1→N 合同/清单/进度/成本/收付款；清单双价驱动产值与成本核算</span></div></div>`; }
function renderModuleOverview(t){ $("#page").innerHTML=`<div class="pghead"><div><h2>${esc(t.name)}</h2><div class="sub">${esc(t.url||"")}</div></div></div>
  <div class="card"><div class="empty">该功能为流程/配置类页面，数据已在相关单据中体现。如需此页的专属交互，请告知，我按老系统逻辑补上。</div></div>`; }

/* 查看表单(f_field) */
function openForm(L,row){ const F=FORMS[L.viewFormId||L.baseFormId]; if(!F){return;}
  const val=f=>{ let v=row?row[f.dbName]:""; if(FKMAP[f.dbName]&&v!=null) v=FKMAP[f.dbName][v]||v;
    if(v==null||v==="") return '<span style="color:#c7d0e0">—</span>'; if(f.fieldType==='amount') return yuan(v); return esc(v); };
  const flds=F.fields.filter(f=>!f.hidden&&f.fieldType!=='listInput');
  $("#modal").innerHTML=`<div class="mh"><b>${esc(F.name)} · 查看</b><span class="x" id="cx">×</span></div>
   <div class="mb"><div class="fgrid">${flds.map(f=>`<div class="fld ${f.fieldType==='textarea'?'full':''}"><label>${esc(f.name)}</label><div class="v">${val(f)}</div></div>`).join("")}</div>
   ${L.processTypeId?`<div style="margin-top:10px;padding:9px;background:#f5f8ff;border-radius:7px;font-size:12px;color:#5b6478">审批流程：${esc((PROCTYPES[L.processTypeId]||{}).name||"")}</div>`:""}</div>`;
  $("#mask").classList.add("show"); $("#cx").onclick=()=>$("#mask").classList.remove("show");
}
$("#mask").onclick=e=>{if(e.target.id==='mask')$("#mask").classList.remove("show");};
$("#quit").onclick=()=>alert("恒达云ERP · 元数据引擎版\n首页看板+全菜单真实数据+报表汇总+个人工作台；数据来自H盘真实库(PII已打码)。");

buildTop();
openTab("__home__","经营看板",0,"home");  // 默认进首页看板
