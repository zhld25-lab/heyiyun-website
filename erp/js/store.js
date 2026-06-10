/* ============================================================
   数据层：种子数据 + localStorage 持久化 + 订阅
   后续接后端时，只需把 read/write 改成 API 调用即可
   ============================================================ */

const KEY = "heyiyun_erp_db_v1";

function uid(prefix){ return prefix + "-" + Math.random().toString(36).slice(2,7).toUpperCase(); }

/* ---------- 种子数据（电力工程场景） ---------- */
function seed(){
    const projects = [
        {id:"P-2401", name:"220kV输变电工程A标段", manager:"张建国", status:"进行中", type:"输变电", risk:"mid",
         contractAmount:8650, actualCost:6420, received:6900, startDate:"2025-09-12", endDate:"2026-08-30"},
        {id:"P-2402", name:"城南电缆敷设二期工程", manager:"李志强", status:"进行中", type:"电缆敷设", risk:"low",
         contractAmount:4280, actualCost:2980, received:3650, startDate:"2025-11-01", endDate:"2026-07-15"},
        {id:"P-2403", name:"开发区变电站运维项目", manager:"王海涛", status:"进行中", type:"电力运维", risk:"high",
         contractAmount:2160, actualCost:1880, received:1320, startDate:"2025-06-20", endDate:"2026-06-19"},
        {id:"P-2404", name:"110kV架空线路改造工程", manager:"陈明", status:"进行中", type:"输变电", risk:"mid",
         contractAmount:5320, actualCost:3410, received:4100, startDate:"2026-01-08", endDate:"2026-10-30"},
        {id:"P-2405", name:"工业园区配电EPC总包", manager:"赵立军", status:"筹备", type:"EPC总包", risk:"low",
         contractAmount:12600, actualCost:680, received:1200, startDate:"2026-05-15", endDate:"2027-05-14"},
        {id:"P-2406", name:"市政路灯电力配套工程", manager:"刘洋", status:"已完工", type:"电缆敷设", risk:"low",
         contractAmount:1860, actualCost:1490, received:1860, startDate:"2025-03-10", endDate:"2025-12-20"},
        {id:"P-2407", name:"500kV变电站扩建工程", manager:"张建国", status:"进行中", type:"输变电", risk:"critical",
         contractAmount:18900, actualCost:14200, received:11500, startDate:"2025-04-01", endDate:"2026-12-31"},
        {id:"P-2408", name:"光伏并网送出线路工程", manager:"陈明", status:"暂停", type:"输变电", risk:"high",
         contractAmount:3450, actualCost:1980, received:1500, startDate:"2025-10-15", endDate:"2026-09-30"},
    ];

    const contracts = [
        {id:"HT-001", name:"220kV输变电A标段施工合同", project:"P-2401", partyA:"国网某省电力公司", type:"甲方", amount:8650, received:6900, status:"履约中", approval:"已批准", signedDate:"2025-09-10"},
        {id:"HT-002", name:"A标段土建分包合同", project:"P-2401", partyA:"和易云", type:"分包", amount:2300, received:1800, status:"履约中", approval:"已批准", signedDate:"2025-09-25"},
        {id:"HT-003", name:"城南电缆敷设二期主合同", project:"P-2402", partyA:"某市供电局", type:"甲方", amount:4280, received:3650, status:"履约中", approval:"已批准", signedDate:"2025-10-28"},
        {id:"HT-004", name:"变电站运维服务合同", project:"P-2403", partyA:"开发区管委会", type:"甲方", amount:2160, received:1320, status:"履约中", approval:"已批准", signedDate:"2025-06-18"},
        {id:"HT-005", name:"110kV线路改造施工合同", project:"P-2404", partyA:"国网某市供电公司", type:"甲方", amount:5320, received:4100, status:"履约中", approval:"已批准", signedDate:"2026-01-05"},
        {id:"HT-006", name:"配电EPC总承包合同", project:"P-2405", partyA:"某产业园区开发公司", type:"甲方", amount:12600, received:1200, status:"已签订", approval:"审批中", signedDate:"2026-05-12"},
        {id:"HT-007", name:"500kV扩建电气安装分包", project:"P-2407", partyA:"和易云", type:"分包", amount:5600, received:4200, status:"履约中", approval:"已批准", signedDate:"2025-04-15"},
        {id:"HT-008", name:"光伏送出线路施工合同", project:"P-2408", partyA:"某新能源公司", type:"甲方", amount:3450, received:1500, status:"草稿", approval:"草稿", signedDate:"2025-10-12"},
    ];

    const boq = [
        {id:uid("BQ"), project:"P-2401", code:"01-001", name:"基础混凝土浇筑", category:"土建", unit:"m³", ctrlQty:1200, partyAPrice:0.085, subPrice:0.062, actualQty:880},
        {id:uid("BQ"), project:"P-2401", code:"01-002", name:"钢管杆组立", category:"安装", unit:"基", ctrlQty:46, partyAPrice:3.2, subPrice:2.4, actualQty:32},
        {id:uid("BQ"), project:"P-2401", code:"01-003", name:"导线架设", category:"安装", unit:"km", ctrlQty:38, partyAPrice:8.6, subPrice:6.5, actualQty:24},
        {id:uid("BQ"), project:"P-2402", code:"02-001", name:"电缆沟开挖", category:"土建", unit:"m", ctrlQty:8600, partyAPrice:0.018, subPrice:0.012, actualQty:6200},
        {id:uid("BQ"), project:"P-2402", code:"02-002", name:"高压电缆敷设", category:"安装", unit:"m", ctrlQty:8600, partyAPrice:0.32, subPrice:0.25, actualQty:5800},
        {id:uid("BQ"), project:"P-2402", code:"02-003", name:"电缆中间接头", category:"安装", unit:"个", ctrlQty:120, partyAPrice:1.8, subPrice:1.35, actualQty:78},
        {id:uid("BQ"), project:"P-2404", code:"04-001", name:"旧线路拆除", category:"其他", unit:"km", ctrlQty:22, partyAPrice:1.2, subPrice:0.85, actualQty:18},
        {id:uid("BQ"), project:"P-2404", code:"04-002", name:"绝缘子更换", category:"安装", unit:"串", ctrlQty:680, partyAPrice:0.15, subPrice:0.11, actualQty:520},
        {id:uid("BQ"), project:"P-2407", code:"07-001", name:"GIS设备安装", category:"安装", unit:"间隔", ctrlQty:12, partyAPrice:45, subPrice:34, actualQty:7},
        {id:uid("BQ"), project:"P-2407", code:"07-002", name:"主变压器安装", category:"安装", unit:"台", ctrlQty:3, partyAPrice:120, subPrice:92, actualQty:2},
    ];

    const procurement = [
        {id:uid("CG"), material:"YJV22-26/35kV 高压电缆", project:"P-2402", vendor:"远东电缆", qty:6000, unit:"m", unitPrice:0.028, status:"已到货", sync:"已同步", date:"2026-02-10"},
        {id:uid("CG"), material:"热镀锌钢管杆 18m", project:"P-2401", vendor:"振兴电力器材", qty:32, unit:"基", unitPrice:1.8, status:"已到货", sync:"已同步", date:"2025-11-22"},
        {id:uid("CG"), material:"LGJ-240 钢芯铝绞线", project:"P-2401", vendor:"金杯电工", qty:80, unit:"km", unitPrice:4.2, status:"已下单", sync:"待同步", date:"2026-03-05"},
        {id:uid("CG"), material:"GIS组合电器 550kV", project:"P-2407", vendor:"平高电气", qty:7, unit:"间隔", unitPrice:32, status:"已批准", sync:"待同步", date:"2026-04-18"},
        {id:uid("CG"), material:"110kV复合绝缘子", project:"P-2404", vendor:"南方电网器材", qty:520, unit:"串", unitPrice:0.08, status:"已到货", sync:"已同步", date:"2026-02-28"},
        {id:uid("CG"), material:"电缆中间接头附件", project:"P-2402", vendor:"长缆电工", qty:78, unit:"套", unitPrice:0.9, status:"已提交", sync:"未同步", date:"2026-03-12"},
        {id:uid("CG"), material:"接地扁钢 -40×4", project:"P-2404", vendor:"鑫达金属", qty:3200, unit:"m", unitPrice:0.012, status:"草稿", sync:"未同步", date:"2026-03-20"},
    ];

    const progress = [
        {id:uid("JD"), project:"P-2401", reporter:"张建国", date:"2026-06-08", percent:74, state:"正常"},
        {id:uid("JD"), project:"P-2402", reporter:"李志强", date:"2026-06-09", percent:68, state:"正常"},
        {id:uid("JD"), project:"P-2403", reporter:"王海涛", date:"2026-06-07", percent:85, state:"延期"},
        {id:uid("JD"), project:"P-2404", reporter:"陈明", date:"2026-06-09", percent:52, state:"正常"},
        {id:uid("JD"), project:"P-2407", reporter:"张建国", date:"2026-06-06", percent:61, state:"受阻"},
        {id:uid("JD"), project:"P-2408", reporter:"陈明", date:"2026-05-28", percent:35, state:"受阻"},
        {id:uid("JD"), project:"P-2406", reporter:"刘洋", date:"2025-12-20", percent:100, state:"已完成"},
    ];

    const cost = [
        {id:uid("CB"), project:"P-2401", type:"人工", supplier:"A标段劳务队", amount:1280, approval:"已批准", payment:"已付款", date:"2026-05-20"},
        {id:uid("CB"), project:"P-2401", type:"材料", supplier:"远东电缆", amount:2350, approval:"已批准", payment:"部分付款", date:"2026-04-15"},
        {id:uid("CB"), project:"P-2402", type:"材料", supplier:"金杯电工", amount:1680, approval:"已批准", payment:"已付款", date:"2026-03-28"},
        {id:uid("CB"), project:"P-2403", type:"分包", supplier:"运维分包商", amount:980, approval:"审批中", payment:"未付款", date:"2026-06-01"},
        {id:uid("CB"), project:"P-2404", type:"机械", supplier:"力士机械租赁", amount:420, approval:"已批准", payment:"已付款", date:"2026-05-10"},
        {id:uid("CB"), project:"P-2407", type:"材料", supplier:"平高电气", amount:5200, approval:"已批准", payment:"部分付款", date:"2026-04-30"},
        {id:uid("CB"), project:"P-2407", type:"人工", supplier:"安装劳务队", amount:1850, approval:"已批准", payment:"已付款", date:"2026-05-25"},
        {id:uid("CB"), project:"P-2404", type:"其他", supplier:"监理咨询费", amount:160, approval:"审批中", payment:"未付款", date:"2026-06-05"},
    ];

    const finance = [
        {id:uid("CW"), type:"收入", project:"P-2401", item:"工程进度款第三期", amount:2400, status:"已到账", date:"2026-05-18"},
        {id:uid("CW"), type:"支出", project:"P-2401", item:"材料采购付款", amount:1500, status:"已付款", date:"2026-04-20"},
        {id:uid("CW"), type:"收入", project:"P-2402", item:"工程进度款第二期", amount:1800, status:"已到账", date:"2026-04-25"},
        {id:uid("CW"), type:"收入", project:"P-2404", item:"开工预付款", amount:1600, status:"已到账", date:"2026-01-20"},
        {id:uid("CW"), type:"支出", project:"P-2407", item:"GIS设备预付款", amount:3200, status:"已付款", date:"2026-04-28"},
        {id:uid("CW"), type:"收入", project:"P-2403", item:"运维服务费Q1", amount:540, status:"待到账", date:"2026-06-05"},
        {id:uid("CW"), type:"支出", project:"P-2402", item:"分包进度款", amount:900, status:"已付款", date:"2026-05-08"},
    ];

    return {projects, contracts, boq, procurement, progress, cost, finance};
}

/* ---------- 持久化核心 ---------- */
let db = load();
const subs = [];

function load(){
    try{
        const raw = localStorage.getItem(KEY);
        if(raw) return JSON.parse(raw);
    }catch(e){}
    const s = seed();
    localStorage.setItem(KEY, JSON.stringify(s));
    return s;
}
function persist(){ localStorage.setItem(KEY, JSON.stringify(db)); subs.forEach(fn=>fn(db)); }

export const Store = {
    all(coll){ return (db[coll]||[]).slice(); },
    get(coll,id){ return (db[coll]||[]).find(r=>r.id===id); },
    add(coll,rec){ if(!rec.id) rec.id = uid(coll.slice(0,2).toUpperCase()); db[coll].unshift(rec); persist(); return rec; },
    update(coll,id,patch){ const r=db[coll].find(x=>x.id===id); if(r)Object.assign(r,patch); persist(); return r; },
    remove(coll,id){ db[coll]=db[coll].filter(r=>r.id!==id); persist(); },
    reset(){ db = seed(); persist(); },
    subscribe(fn){ subs.push(fn); },
    newId:uid,
};

/* ---------- 业务计算辅助 ---------- */
export const Calc = {
    grossProfit(p){ return p.contractAmount - p.actualCost; },
    profitRate(p){ return p.contractAmount ? ((p.contractAmount - p.actualCost)/p.contractAmount*100) : 0; },
    collectionRate(p){ return p.contractAmount ? (p.received/p.contractAmount*100) : 0; },
    receivable(p){ return p.contractAmount - p.received; },
};

/* ---------- 格式化 ---------- */
export const fmt = {
    money(v){ return "¥" + (v||0).toLocaleString("zh-CN",{maximumFractionDigits:1}) + "万"; },
    money0(v){ return "¥" + (v||0).toLocaleString("zh-CN",{maximumFractionDigits:0}); },
    pct(v){ return (v||0).toFixed(1) + "%"; },
    num(v){ return (v||0).toLocaleString("zh-CN"); },
};
