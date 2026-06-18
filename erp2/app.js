/* 元数据驱动引擎 —— 菜单(s_menu)/列表(f_listform)/表单(f_field) 全部按老系统真实定义渲染 */
import { MENU, LISTFORMS, FORMS, PROCTYPES, BUSITYPES } from "./meta.bundle.js?v=1";
import { DATA } from "./data.bundle.js?v=1";

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---- dbName -> 真实表名 ---- */
const dbToTable={};
{ const keys=Object.keys(DATA);
  function find(db){ if(!db) return null; let best=null;
    for(const k of keys){ if(k.endsWith("_"+db)){ if(!best || (DATA[k].length>DATA[best].length)) best=k; } }
    return best; }
  Object.values(LISTFORMS).forEach(l=>{ if(l.dbName) dbToTable[l.dbName]=find(l.dbName); });
}
/* ---- FK 解析 ---- */
function mapBy(suffix){ const k=Object.keys(DATA).find(k=>k.endsWith(suffix)); const m={}; if(k) DATA[k].forEach(r=>m[r.id]=r.name); return m; }
const M_cust=mapBy("_p_cust"), M_proj=mapBy("_p_project"), M_user=mapBy("_s_user"), M_dept=mapBy("_s_dept"),
      M_supp=mapBy("_p_supplier"), M_subc=mapBy("_p_subcontractor"), M_lessor=mapBy("_p_lessor");
const ALIAS={ cname:["custid",M_cust], pname:["projectid",M_proj], uname:["userid",M_user],
  dname:["deptid",M_dept], sname:["supplierid",M_supp], subname:["subcontractorid",M_subc], lname:["lessorid",M_lessor],
  custname:["custid",M_cust], projectname:["projectid",M_proj], username:["userid",M_user] };

const fmtNum=(v,fmt)=>{ const n=+v; if(isNaN(n)) return esc(v);
  if(fmt&&fmt.includes(".00")) return n.toLocaleString("zh-CN",{minimumFractionDigits:2,maximumFractionDigits:2});
  return n.toLocaleString("zh-CN"); };

/* ---- 菜单树 ---- */
const byId={}, kids={}; MENU.forEach(m=>{byId[m.id]=m;});
MENU.forEach(m=>{ const p=m.parentId; (kids[p]=kids[p]||[]).push(m); });
Object.values(kids).forEach(a=>a.sort((x,y)=>(x.dispOrder||0)-(y.dispOrder||0)));
const roots=MENU.filter(m=>!m.parentId || !byId[m.parentId]).sort((a,b)=>(a.dispOrder||0)-(b.dispOrder||0));

function buildTop(){
  $("#topnav").innerHTML=roots.filter(r=>!r.hidden).map(r=>`<div class="m" data-id="${esc(r.id)}">${esc(r.name)}</div>`).join("");
  $$("#topnav .m").forEach(el=>el.onclick=()=>{ $$("#topnav .m").forEach(x=>x.classList.remove("on")); el.classList.add("on"); buildLeft(el.dataset.id); });
  const first=$("#topnav .m"); if(first) first.click();
}
function buildLeft(rootId){
  const groups=(kids[rootId]||[]).filter(g=>!g.hidden);
  $("#left").innerHTML=groups.map(g=>{
    const leaves=(kids[g.id]||[]).filter(l=>!l.hidden);
    if(leaves.length) return `<div class="grp"><div class="gh" data-g="${esc(g.id)}">${esc(g.name)}<span>▾</span></div><div class="gb">${leaves.map(leafHTML).join("")}</div></div>`;
    return `<div class="grp">${leafHTML(g)}</div>`;
  }).join("");
  $$("#left .gh").forEach(h=>h.onclick=()=>{ const b=h.nextElementSibling; if(b) b.style.display=b.style.display==="none"?"":"none"; });
  bindLeaves();
}
const leafHTML=l=>`<div class="leaf" data-id="${esc(l.id)}" data-lf="${l.listFormId||''}" data-url="${esc(l.url||'')}">${esc(l.name)}</div>`;
function bindLeaves(){ $$("#left .leaf").forEach(el=>el.onclick=()=>{ $$("#left .leaf").forEach(x=>x.classList.remove("on")); el.classList.add("on");
  openTab(el.dataset.id, byId[el.dataset.id].name, +el.dataset.lf||0, el.dataset.url); }); }

/* ---- 标签页 ---- */
const tabs={}; let active=null;
function openTab(id,name,lf,url){
  if(!tabs[id]){ tabs[id]={name,lf,url}; }
  renderTabs(); activate(id);
}
function renderTabs(){
  $("#tabs").innerHTML=Object.keys(tabs).map(id=>`<div class="tab ${id===active?'on':''}" data-id="${esc(id)}">${esc(tabs[id].name)}<span class="x" data-x="${esc(id)}">×</span></div>`).join("");
  $$("#tabs .tab").forEach(t=>t.onclick=e=>{ if(e.target.dataset.x){ delete tabs[e.target.dataset.x]; if(active===e.target.dataset.x) active=Object.keys(tabs)[0]||null; renderTabs(); if(active) activate(active); else $("#page").innerHTML=""; return; } activate(t.dataset.id); });
}
function activate(id){ active=id; renderTabs(); const t=tabs[id];
  if(t.lf && LISTFORMS[t.lf]) renderList(t.lf);
  else $("#page").innerHTML=`<div class="pghead"><div><h2>${esc(t.name)}</h2><div class="sub">${esc(t.url||'')}</div></div></div><div class="card"><div class="empty">该菜单为老系统自定义页（非标准列表）。当前引擎已覆盖标准单据列表/表单；此类特殊页将按其专属逻辑单独实现。</div></div>`;
}

/* ---- 列表渲染（严格按 f_listform + f_listformfield） ---- */
const listState={};
function renderList(lfId){
  const L=LISTFORMS[lfId]; const tbl=dbToTable[L.dbName]; const rows=(tbl&&DATA[tbl])?DATA[tbl]:[];
  const st=listState[lfId]=listState[lfId]||{q:""};
  const cols=L.cols.length?L.cols:Object.keys(rows[0]||{}).slice(0,8).map(k=>({name:k,dbName:k}));
  function cellVal(c,r){
    let v=r[c.dbName];
    if(v==null && ALIAS[c.dbName]){ const[fk,mp]=ALIAS[c.dbName]; v=mp[r[fk]]; }
    if(v==null) return '<span style="color:#c7d0e0">—</span>';
    if(c.fieldType==='Decimal'||c.format) return `<span class="num">${fmtNum(v,c.format)}</span>`;
    return esc(v);
  }
  const data=rows.filter(r=>{ if(!st.q) return true; return cols.some(c=>String(r[c.dbName]==null?'':r[c.dbName]).includes(st.q)); });
  $("#page").innerHTML=`
    <div class="pghead"><div><h2>${esc(L.name)}</h2><div class="sub">列表 #${lfId} · 表 ${esc(tbl||L.dbName||'?')} · ${BUSITYPES[L.businessTypeId]||''}${L.processTypeId?' · 含审批流':''}</div></div></div>
    <div class="bar"><input class="inp" id="lq" placeholder="搜索…" value="${esc(st.q)}" style="width:220px">
      ${L.addFlag?'<button class="btn btn-p" id="addB">＋ 新建</button>':''}${L.impFlag?'<button class="btn btn-l">⬆ 导入</button>':''}
      <span style="flex:1"></span><span class="sub">共 ${data.length} 条（真实数据，每表≤400）</span></div>
    <div class="card" style="overflow:auto;max-height:calc(100vh - 200px)"><table>
      <thead><tr>${cols.map(c=>`<th class="${c.align==='right'||c.fieldType==='Decimal'?'num':''}">${esc(c.name)}</th>`).join("")}</tr></thead>
      <tbody>${data.length?data.map((r,i)=>`<tr data-i="${i}">${cols.map(c=>`<td class="${c.fieldType==='Decimal'||c.format?'num':''}">${cellVal(c,r)}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${cols.length}"><div class="empty">暂无数据</div></td></tr>`}</tbody>
    </table></div>`;
  $("#lq").oninput=e=>{st.q=e.target.value; renderList(lfId);};
  const ab=$("#addB"); if(ab) ab.onclick=()=>openForm(L, null);
  $$("#page tbody tr[data-i]").forEach(tr=>tr.onclick=()=>openForm(L, data[+tr.dataset.i]));
}

/* ---- 表单渲染（严格按 f_field，只读查看；新建留待写入阶段） ---- */
function openForm(L, row){
  const formId=L.viewFormId||L.baseFormId; const F=FORMS[formId];
  if(!F){ alert("无表单定义"); return; }
  const val=f=>{ let v=row?row[f.dbName]:f.defaultValue;
    if((v==null||v==="")&&row&&ALIAS[f.dbName]){const[fk,mp]=ALIAS[f.dbName];v=mp[row[fk]];}
    // FK 字段(sourceType=2)解析
    if(row&&f.sourceType===2){ if(f.dbName==='projectid')v=M_proj[row.projectid]||v; if(f.dbName==='custid')v=M_cust[row.custid]||v; if(f.dbName==='userid')v=M_user[row.userid]||v; if(f.dbName==='subcontractorid')v=M_subc[row.subcontractorid]||v; if(f.dbName==='supplierid')v=M_supp[row.supplierid]||v; }
    if(v==null||v==="") return '<span style="color:#c7d0e0">—</span>';
    if(f.fieldType==='amount') return (+v||0).toLocaleString("zh-CN",{minimumFractionDigits:2,maximumFractionDigits:2});
    return esc(v); };
  const flds=F.fields.filter(f=>!f.hidden && f.fieldType!=='listInput');
  const hasDetail=F.fields.some(f=>f.fieldType==='listInput');
  $("#modal").innerHTML=`<div class="mh"><b>${esc(F.name)}${row?' · 查看':' · 新建'}</b><span class="x" id="cx">×</span></div>
    <div class="mb"><div class="fgrid">
      ${flds.map(f=>`<div class="fld ${(f.colspan&&f.colspan>1)||f.fieldType==='textarea'?'full':''}"><label>${esc(f.name)}${f.required?' <span style="color:#dc2626">*</span>':''}</label><div class="v">${val(f)}</div></div>`).join("")}
      ${hasDetail?`<div class="sec">工程量清单 / 明细子表</div><div class="full" id="detArea"></div>`:''}
    </div>
    ${L.processTypeId?`<div style="margin-top:12px;padding:10px;background:var(--soft);border-radius:8px;font-size:12px;color:var(--gray)">审批流程：${esc((PROCTYPES[L.processTypeId]||{}).name||'')}（processType#${L.processTypeId}）——多级流转将在写入阶段接入</div>`:''}
    </div>`;
  $("#mask").classList.add("show");
  $("#cx").onclick=()=>$("#mask").classList.remove("show");
  if(hasDetail && row){ renderDetail(L,row); }
}
function renderDetail(L,row){
  // 明细表：<dbName>_detail，parentId=row.id
  const dt=Object.keys(DATA).find(k=>k.endsWith("_"+L.dbName+"_detail"));
  const lines=dt?DATA[dt].filter(r=>String(r.parentId)===String(row.id)):[];
  if(!dt){ $("#detArea").innerHTML='<div style="color:#c7d0e0">（明细数据未包含）</div>'; return; }
  const cols=Object.keys(lines[0]||{"code":1,"name":1,"unit":1,"amt":1,"price":1,"sumprice":1}).filter(k=>k!=='id'&&k!=='parentId');
  $("#detArea").innerHTML=`<div class="card" style="overflow:auto"><table><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead>
    <tbody>${lines.length?lines.map(r=>`<tr>${cols.map(c=>`<td class="${typeof r[c]==='number'?'num':''}">${esc(r[c])}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${cols.length}"><div class="empty">无明细</div></td></tr>`}</tbody></table></div>`;
}

$("#mask").onclick=e=>{ if(e.target.id==='mask') $("#mask").classList.remove("show"); };
$("#quit").onclick=()=>alert("恒达云ERP · 元数据引擎版\n菜单/列表/表单均按老系统 f_menu/f_listform/f_field 真实定义渲染；数据来自H盘真实库(每表≤400行,身份证/手机号已打码)。\n本版覆盖：全部标准单据的列表与查看表单。新建/编辑写入、计算公式、多级审批流为下一阶段。");
buildTop();
