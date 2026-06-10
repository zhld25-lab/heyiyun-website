/* ============================================================
   数据层：按需集合 + 旗舰集合种子 + localStorage 持久化 + 订阅
   接后端时只需把 load/persist 换成 API 调用
   ============================================================ */

const KEY = "heyiyun_erp_db_v2";
function uid(prefix){ return (prefix||"R") + "-" + Math.random().toString(36).slice(2,7).toUpperCase(); }

function seed(){
    const projects = [
        {id:"P-2401", name:"220kV输变电工程A标段", manager:"张建国", status:"进行中", type:"输变电", risk:"mid", contractAmount:8650, actualCost:6420, received:6900, startDate:"2025-09-12", endDate:"2026-08-30"},
        {id:"P-2402", name:"城南电缆敷设二期工程", manager:"李志强", status:"进行中", type:"电缆敷设", risk:"low", contractAmount:4280, actualCost:2980, received:3650, startDate:"2025-11-01", endDate:"2026-07-15"},
        {id:"P-2403", name:"开发区变电站运维项目", manager:"王海涛", status:"进行中", type:"电力运维", risk:"high", contractAmount:2160, actualCost:1880, received:1320, startDate:"2025-06-20", endDate:"2026-06-19"},
        {id:"P-2404", name:"110kV架空线路改造工程", manager:"陈明", status:"进行中", type:"输变电", risk:"mid", contractAmount:5320, actualCost:3410, received:4100, startDate:"2026-01-08", endDate:"2026-10-30"},
        {id:"P-2405", name:"工业园区配电EPC总包", manager:"赵立军", status:"筹备", type:"EPC总包", risk:"low", contractAmount:12600, actualCost:680, received:1200, startDate:"2026-05-15", endDate:"2027-05-14"},
        {id:"P-2406", name:"市政路灯电力配套工程", manager:"刘洋", status:"已完工", type:"电缆敷设", risk:"low", contractAmount:1860, actualCost:1490, received:1860, startDate:"2025-03-10", endDate:"2025-12-20"},
        {id:"P-2407", name:"500kV变电站扩建工程", manager:"张建国", status:"进行中", type:"输变电", risk:"critical", contractAmount:18900, actualCost:14200, received:11500, startDate:"2025-04-01", endDate:"2026-12-31"},
        {id:"P-2408", name:"光伏并网送出线路工程", manager:"陈明", status:"暂停", type:"输变电", risk:"high", contractAmount:3450, actualCost:1980, received:1500, startDate:"2025-10-15", endDate:"2026-09-30"},
    ];
    const contracts = [
        {id:"HT-001", name:"220kV输变电A标段施工合同", project:"P-2401", partyA:"国网某省电力公司", type:"甲方", amount:8650, received:6900, status:"执行中", approval:"已批准", signedDate:"2025-09-10"},
        {id:"HT-003", name:"城南电缆敷设二期主合同", project:"P-2402", partyA:"某市供电局", type:"甲方", amount:4280, received:3650, status:"执行中", approval:"已批准", signedDate:"2025-10-28"},
        {id:"HT-004", name:"变电站运维服务合同", project:"P-2403", partyA:"开发区管委会", type:"甲方", amount:2160, received:1320, status:"执行中", approval:"已批准", signedDate:"2025-06-18"},
        {id:"HT-005", name:"110kV线路改造施工合同", project:"P-2404", partyA:"国网某市供电公司", type:"甲方", amount:5320, received:4100, status:"执行中", approval:"已批准", signedDate:"2026-01-05"},
        {id:"HT-006", name:"配电EPC总承包合同", project:"P-2405", partyA:"某产业园区开发公司", type:"甲方", amount:12600, received:1200, status:"执行中", approval:"审批中", signedDate:"2026-05-12"},
        {id:"HT-007", name:"500kV扩建工程总承包合同", project:"P-2407", partyA:"国网某省电力公司", type:"甲方", amount:18900, received:11500, status:"执行中", approval:"已批准", signedDate:"2025-03-28"},
    ];
    const subcontracts = [
        {id:"FB-001", name:"A标段土建工程分包", project:"P-2401", partyA:"宏盛建筑劳务", type:"分包", amount:2300, received:1800, status:"执行中", approval:"已批准", signedDate:"2025-09-25"},
        {id:"FB-002", name:"500kV电气安装分包", project:"P-2407", partyA:"中电安装公司", type:"分包", amount:5600, received:4200, status:"执行中", approval:"已批准", signedDate:"2025-04-15"},
        {id:"FB-003", name:"电缆敷设劳务分包", project:"P-2402", partyA:"城建劳务队", type:"分包", amount:1200, received:850, status:"执行中", approval:"已批准", signedDate:"2025-11-10"},
    ];
    const boq = [
        {id:uid("BQ"), project:"P-2401", code:"01-001", name:"基础混凝土浇筑", category:"土建", unit:"m³", ctrlQty:1200, partyAPrice:0.085, subPrice:0.062, actualQty:880},
        {id:uid("BQ"), project:"P-2401", code:"01-002", name:"钢管杆组立", category:"安装", unit:"基", ctrlQty:46, partyAPrice:3.2, subPrice:2.4, actualQty:32},
        {id:uid("BQ"), project:"P-2402", code:"02-002", name:"高压电缆敷设", category:"安装", unit:"m", ctrlQty:8600, partyAPrice:0.32, subPrice:0.25, actualQty:5800},
        {id:uid("BQ"), project:"P-2407", code:"07-002", name:"主变压器安装", category:"安装", unit:"台", ctrlQty:3, partyAPrice:120, subPrice:92, actualQty:2},
    ];
    const progress = [
        {id:uid("JD"), project:"P-2401", wbs:"杆塔组立", reporter:"张建国", date:"2026-06-08", percent:74, status:"正常"},
        {id:uid("JD"), project:"P-2402", wbs:"电缆敷设", reporter:"李志强", date:"2026-06-09", percent:68, status:"正常"},
        {id:uid("JD"), project:"P-2403", wbs:"运维巡检", reporter:"王海涛", date:"2026-06-07", percent:85, status:"延期"},
        {id:uid("JD"), project:"P-2407", wbs:"GIS安装", reporter:"张建国", date:"2026-06-06", percent:61, status:"受阻"},
    ];
    const cost = [
        {id:uid("CB"), project:"P-2401", subject:"人工", party:"A标段劳务队", amount:1280, date:"2026-05-20", status:"已付款"},
        {id:uid("CB"), project:"P-2401", subject:"材料", party:"远东电缆", amount:2350, date:"2026-04-15", status:"部分付款"},
        {id:uid("CB"), project:"P-2407", subject:"材料", party:"平高电气", amount:5200, date:"2026-04-30", status:"部分付款"},
        {id:uid("CB"), project:"P-2407", subject:"人工", party:"安装劳务队", amount:1850, date:"2026-05-25", status:"已付款"},
        {id:uid("CB"), project:"P-2404", subject:"机械", party:"力士机械租赁", amount:420, date:"2026-05-10", status:"已付款"},
    ];
    const fin_income = [
        {id:uid("SK"), project:"P-2401", contract:"HT-001", party:"国网某省电力公司", amount:2400, method:"银行转账", date:"2026-05-18", status:"已到账"},
        {id:uid("SK"), project:"P-2402", contract:"HT-003", party:"某市供电局", amount:1800, method:"银行转账", date:"2026-04-25", status:"已到账"},
        {id:uid("SK"), project:"P-2404", contract:"HT-005", party:"国网某市供电公司", amount:1600, method:"承兑汇票", date:"2026-01-20", status:"已到账"},
        {id:uid("SK"), project:"P-2403", contract:"HT-004", party:"开发区管委会", amount:540, method:"银行转账", date:"2026-06-05", status:"待到账"},
    ];
    const fin_cash = [
        {id:uid("XJ"), direction:"收入", project:"P-2401", account:"基本户", amount:2400, date:"2026-05-18", summary:"工程进度款第三期"},
        {id:uid("XJ"), direction:"支出", project:"P-2401", account:"基本户", amount:1500, date:"2026-04-20", summary:"材料采购付款"},
        {id:uid("XJ"), direction:"收入", project:"P-2402", account:"基本户", amount:1800, date:"2026-04-25", summary:"工程进度款第二期"},
        {id:uid("XJ"), direction:"支出", project:"P-2407", account:"一般户", amount:3200, date:"2026-04-28", summary:"GIS设备预付款"},
        {id:uid("XJ"), direction:"支出", project:"P-2402", account:"基本户", amount:900, date:"2026-05-08", summary:"分包进度款"},
    ];
    return { projects, contracts, subcontracts, boq, progress, cost, fin_income, fin_cash };
}

let db = load();
const subs = [];
function load(){
    try{ const raw=localStorage.getItem(KEY); if(raw) return JSON.parse(raw); }catch(e){}
    const s=seed(); localStorage.setItem(KEY, JSON.stringify(s)); return s;
}
function persist(){ localStorage.setItem(KEY, JSON.stringify(db)); subs.forEach(fn=>fn(db)); }

export const Store = {
    all(coll){ return (db[coll]||[]).slice(); },
    get(coll,id){ return (db[coll]||[]).find(r=>r.id===id); },
    add(coll,rec){ if(!db[coll]) db[coll]=[]; if(!rec.id) rec.id=uid(coll.slice(0,2).toUpperCase()); db[coll].unshift(rec); persist(); return rec; },
    update(coll,id,patch){ const r=(db[coll]||[]).find(x=>x.id===id); if(r)Object.assign(r,patch); persist(); return r; },
    remove(coll,id){ if(db[coll]) db[coll]=db[coll].filter(r=>r.id!==id); persist(); },
    reset(){ db=seed(); persist(); },
    subscribe(fn){ subs.push(fn); },
    newId:uid,
};

export const Calc = {
    grossProfit:p=>p.contractAmount-p.actualCost,
    profitRate:p=>p.contractAmount?((p.contractAmount-p.actualCost)/p.contractAmount*100):0,
    collectionRate:p=>p.contractAmount?(p.received/p.contractAmount*100):0,
    receivable:p=>p.contractAmount-p.received,
};
export const fmt = {
    money:v=>"¥"+(+v||0).toLocaleString("zh-CN",{maximumFractionDigits:1})+"万",
    money0:v=>"¥"+(+v||0).toLocaleString("zh-CN",{maximumFractionDigits:0}),
    pct:v=>(+v||0).toFixed(1)+"%",
    num:v=>(+v||0).toLocaleString("zh-CN"),
};
