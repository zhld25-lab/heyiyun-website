/* 通用附件组件：上传/查看/下载/删除（前端本地存储，按单据/项目挂载）
   - 真实历史附件台账见「资料中心」(i_attach)；此处为各单据/项目可上传可查看的附件区 */
import { esc } from "./ui.js";
const PFX="hd_att_";
const now=()=>{ const d=new Date(); const p=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const me=()=>{ try{ return (JSON.parse(localStorage.getItem("heyiyun_erp_user"))||{}).name||"我"; }catch(e){ return "我"; } };
const ext=n=>{ const m=/\.([a-z0-9]+)$/i.exec(n||""); return m?m[1].toLowerCase():"file"; };
const fmtSize=b=> b>1048576?(b/1048576).toFixed(2)+" MB": b>1024?(b/1024).toFixed(1)+" KB": b+" B";
const ICON={pdf:"📕",doc:"📘",docx:"📘",xls:"📗",xlsx:"📗",ppt:"📙",pptx:"📙",jpg:"🖼️",jpeg:"🖼️",png:"🖼️",gif:"🖼️",zip:"🗜️",rar:"🗜️",txt:"📄",dwg:"📐"};
const ic=t=>ICON[t]||"📎";

export function getAtts(key){ try{ return JSON.parse(localStorage.getItem(PFX+key)||"[]"); }catch(e){ return []; } }
function setAtts(key,a){ try{ localStorage.setItem(PFX+key,JSON.stringify(a)); return true; }catch(e){ alert("浏览器本地存储空间不足，附件未能保存（演示版单文件建议<3MB）"); return false; } }

/** 附件区 HTML（嵌入详情/项目页） */
export function attachBlock(key, title){
  const a=getAtts(key);
  return `<div class="att-block" data-akey="${esc(key)}">
    <div class="att-head"><b>${title||"附件"}（<span class="att-n">${a.length}</span>）</b>
      <label class="att-up btn-mini">＋ 上传附件<input type="file" multiple hidden></label></div>
    <div class="att-list">${renderItems(a)}</div></div>`;
}
function renderItems(a){
  if(!a.length) return '<div class="att-empty">暂无附件 · 点右上角「上传附件」添加</div>';
  return a.map((f,i)=>`<div class="att-item">
    <span class="att-ic">${ic(f.type)}</span>
    <div class="att-meta"><div class="att-name">${esc(f.name)}</div><div class="att-sub">${esc(f.size||"")} · ${esc(f.uploader||"")} · ${esc(f.date||"")}${f.tooBig?' · <span style=color:#e8890c>仅登记(超3MB未存内容)</span>':''}</div></div>
    <div class="att-act">${f.data?`<span data-view="${i}">查看</span><span data-dl="${i}">下载</span>`:'<span style=color:#c7d0e0>—</span>'}<span data-del="${i}" class="att-del">删</span></div>
  </div>`).join("");
}

/** 绑定上传/查看/下载/删除事件（在 modal/页面挂载后调用） */
export function wireAttach(scope, onChange){
  scope.querySelectorAll(".att-block").forEach(blk=>{
    const key=blk.dataset.akey;
    const input=blk.querySelector(".att-up input");
    const redraw=()=>{ const a=getAtts(key); blk.querySelector(".att-list").innerHTML=renderItems(a); blk.querySelector(".att-n").textContent=a.length; bindItems(); if(onChange) onChange(a); };
    function bindItems(){
      blk.querySelectorAll("[data-view]").forEach(s=>s.onclick=()=>{ const f=getAtts(key)[+s.dataset.view]; if(f&&f.data) openData(f); });
      blk.querySelectorAll("[data-dl]").forEach(s=>s.onclick=()=>{ const f=getAtts(key)[+s.dataset.dl]; if(f&&f.data){ const a=document.createElement("a"); a.href=f.data; a.download=f.name; a.click(); } });
      blk.querySelectorAll("[data-del]").forEach(s=>s.onclick=()=>{ const a=getAtts(key); a.splice(+s.dataset.del,1); setAtts(key,a); redraw(); });
    }
    input.onchange=e=>{
      const files=[...e.target.files]; if(!files.length) return;
      let a=getAtts(key); let pend=files.length;
      const done=()=>{ if(--pend<=0){ setAtts(key,a); redraw(); } };
      files.forEach(file=>{
        const base={name:file.name,type:ext(file.name),size:fmtSize(file.size),uploader:me(),date:now()};
        if(file.size>3*1048576){ a.push({...base,tooBig:true}); done(); return; }
        const rd=new FileReader(); rd.onload=()=>{ a.push({...base,data:rd.result}); done(); }; rd.onerror=done; rd.readAsDataURL(file);
      });
      e.target.value="";
    };
    bindItems();
  });
}
function openData(f){
  const w=window.open(""); if(!w){ alert("请允许弹窗以查看附件"); return; }
  const isImg=/^image\//.test(f.data)||/jpg|jpeg|png|gif/.test(f.type);
  const isPdf=/pdf/.test(f.type)||/application\/pdf/.test(f.data);
  if(isImg) w.document.write(`<title>${f.name}</title><body style="margin:0;background:#222;display:grid;place-items:center;height:100vh"><img src="${f.data}" style="max-width:100%;max-height:100%"></body>`);
  else if(isPdf) w.document.write(`<title>${f.name}</title><body style="margin:0"><iframe src="${f.data}" style="border:0;width:100%;height:100vh"></iframe></body>`);
  else { const a=w.document.createElement("a"); a.href=f.data; a.download=f.name; a.click(); w.close(); }
}
