/* ============================================================
   轻量 SVG 图表库（无外部依赖）
   折线图 / 柱状图 / 分组柱状 / 环形图 / 水平条形
   ============================================================ */

const NS = "http://www.w3.org/2000/svg";
const PALETTE = ["#1b5fe3","#14b8d4","#16a34a","#e8890c","#7c3aed","#dc2626","#0d9488","#3b7af0"];

function el(name, attrs){
    const e = document.createElementNS(NS, name);
    for(const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
}

/* ---------- 折线/面积图 ---------- */
export function lineChart(container, {labels, series, height=240, money=false}){
    const W = container.clientWidth || 600, H = height;
    const pad = {t:16, r:16, b:30, l:48};
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const all = series.flatMap(s=>s.data);
    const max = Math.max(...all)*1.15 || 10, min = 0;
    const x = i => pad.l + iw * (i/(labels.length-1||1));
    const y = v => pad.t + ih * (1 - (v-min)/(max-min||1));

    const svg = el("svg",{viewBox:`0 0 ${W} ${H}`, width:"100%", height:H, class:"chart"});
    // 网格 + Y刻度
    for(let g=0; g<=4; g++){
        const gy = pad.t + ih*g/4, val = max - (max-min)*g/4;
        svg.appendChild(el("line",{x1:pad.l,y1:gy,x2:W-pad.r,y2:gy,stroke:"#eef2f9","stroke-width":1}));
        const t = el("text",{x:pad.l-8,y:gy+4,"text-anchor":"end","font-size":11,fill:"#8b93a7"});
        t.textContent = money ? Math.round(val) : Math.round(val);
        svg.appendChild(t);
    }
    // X标签
    labels.forEach((lb,i)=>{
        const t = el("text",{x:x(i),y:H-10,"text-anchor":"middle","font-size":11,fill:"#8b93a7"});
        t.textContent = lb; svg.appendChild(t);
    });
    // 各系列
    series.forEach((s,si)=>{
        const color = s.color || PALETTE[si%PALETTE.length];
        const pts = s.data.map((v,i)=>[x(i),y(v)]);
        const dLine = pts.map((p,i)=>(i?"L":"M")+p[0]+" "+p[1]).join(" ");
        if(s.area!==false){
            const gid = "g"+si+Math.random().toString(36).slice(2,6);
            const grad = el("linearGradient",{id:gid,x1:0,y1:0,x2:0,y2:1});
            grad.appendChild(el("stop",{offset:"0%","stop-color":color,"stop-opacity":.22}));
            grad.appendChild(el("stop",{offset:"100%","stop-color":color,"stop-opacity":0}));
            svg.appendChild(grad);
            const dArea = dLine + ` L${x(labels.length-1)} ${pad.t+ih} L${x(0)} ${pad.t+ih} Z`;
            svg.appendChild(el("path",{d:dArea, fill:`url(#${gid})`}));
        }
        svg.appendChild(el("path",{d:dLine, fill:"none", stroke:color, "stroke-width":2.5, "stroke-linejoin":"round","stroke-linecap":"round"}));
        pts.forEach(p=>svg.appendChild(el("circle",{cx:p[0],cy:p[1],r:3.5,fill:"#fff",stroke:color,"stroke-width":2})));
    });
    container.innerHTML = ""; container.appendChild(svg);
}

/* ---------- 分组柱状图 ---------- */
export function barChart(container, {labels, series, height=240}){
    const W = container.clientWidth || 600, H = height;
    const pad = {t:16, r:16, b:30, l:48};
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const all = series.flatMap(s=>s.data);
    const max = Math.max(...all)*1.15 || 10;
    const groups = labels.length, gw = iw/groups;
    const bw = Math.min(26, gw/(series.length+1));
    const y = v => pad.t + ih*(1 - v/max);

    const svg = el("svg",{viewBox:`0 0 ${W} ${H}`, width:"100%", height:H, class:"chart"});
    for(let g=0; g<=4; g++){
        const gy = pad.t + ih*g/4, val = max - max*g/4;
        svg.appendChild(el("line",{x1:pad.l,y1:gy,x2:W-pad.r,y2:gy,stroke:"#eef2f9","stroke-width":1}));
        const t = el("text",{x:pad.l-8,y:gy+4,"text-anchor":"end","font-size":11,fill:"#8b93a7"});
        t.textContent = Math.round(val); svg.appendChild(t);
    }
    labels.forEach((lb,i)=>{
        const cx = pad.l + gw*i + gw/2;
        series.forEach((s,si)=>{
            const color = s.color || PALETTE[si%PALETTE.length];
            const v = s.data[i], bh = ih*v/max;
            const bx = cx - (series.length*bw)/2 + si*bw;
            const gid="bg"+i+si+Math.random().toString(36).slice(2,5);
            const grad=el("linearGradient",{id:gid,x1:0,y1:0,x2:0,y2:1});
            grad.appendChild(el("stop",{offset:"0%","stop-color":color}));
            grad.appendChild(el("stop",{offset:"100%","stop-color":color,"stop-opacity":.55}));
            svg.appendChild(grad);
            svg.appendChild(el("rect",{x:bx,y:y(v),width:bw-3,height:Math.max(bh,1),rx:4,fill:`url(#${gid})`}));
        });
        const t = el("text",{x:cx,y:H-10,"text-anchor":"middle","font-size":11,fill:"#8b93a7"});
        t.textContent = lb; svg.appendChild(t);
    });
    container.innerHTML=""; container.appendChild(svg);
}

/* ---------- 环形图 ---------- */
export function donutChart(container, {data, height=220, centerLabel, centerValue}){
    const W = container.clientWidth || 320, H = height;
    const cx=W/2, cy=H/2, r=Math.min(W,H)/2-12, rin=r*0.62;
    const total = data.reduce((a,b)=>a+b.value,0)||1;
    const svg = el("svg",{viewBox:`0 0 ${W} ${H}`, width:"100%", height:H, class:"chart"});
    let ang = -Math.PI/2;
    data.forEach((d,i)=>{
        const color = d.color || PALETTE[i%PALETTE.length];
        const a2 = ang + (d.value/total)*Math.PI*2;
        const large = (a2-ang)>Math.PI?1:0;
        const x1=cx+r*Math.cos(ang), y1=cy+r*Math.sin(ang);
        const x2=cx+r*Math.cos(a2),  y2=cy+r*Math.sin(a2);
        const xi1=cx+rin*Math.cos(a2), yi1=cy+rin*Math.sin(a2);
        const xi2=cx+rin*Math.cos(ang),yi2=cy+rin*Math.sin(ang);
        const path = `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${xi1} ${yi1} A${rin} ${rin} 0 ${large} 0 ${xi2} ${yi2} Z`;
        svg.appendChild(el("path",{d:path, fill:color}));
        ang = a2;
    });
    if(centerValue!==undefined){
        const t1=el("text",{x:cx,y:cy-2,"text-anchor":"middle","font-size":22,"font-weight":800,fill:"#0a1733"});
        t1.textContent=centerValue; svg.appendChild(t1);
        const t2=el("text",{x:cx,y:cy+18,"text-anchor":"middle","font-size":12,fill:"#8b93a7"});
        t2.textContent=centerLabel||""; svg.appendChild(t2);
    }
    container.innerHTML=""; container.appendChild(svg);
}

export function legendHTML(data){
    return `<div class="legend">${data.map((d,i)=>
        `<span><i style="background:${d.color||PALETTE[i%PALETTE.length]}"></i>${d.label}</span>`).join("")}</div>`;
}
export {PALETTE};
