/* ============================================================
   数据层：按需集合 + 旗舰集合种子 + localStorage 持久化 + 订阅
   接后端时只需把 load/persist 换成 API 调用
   ============================================================ */

import { MENU } from "./menu.js";

const KEY = "heyiyun_erp_db_v4";
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
    /* ---------- 银行账户 + 内部转账（一笔过账，双账户联动） ---------- */
    const bank_accounts = [
        {id:"ACC-01", name:"基本户", bank:"中国工商银行武汉临空港支行", account:"6212 2602 0001 8866", balance:3860, currency:"人民币", remark:"公司基本结算账户"},
        {id:"ACC-02", name:"一般户", bank:"中国建设银行武汉黄陂支行", account:"4367 4201 0055 2233", balance:1240, currency:"人民币", remark:"日常付款一般户"},
        {id:"ACC-03", name:"项目专户", bank:"中国农业银行武汉分行", account:"6228 4800 1234 5678", balance:920, currency:"人民币", remark:"500kV扩建项目专用"},
        {id:"ACC-04", name:"农民工工资专户", bank:"中国银行武汉东西湖支行", account:"6217 8500 9900 1122", balance:560, currency:"人民币", remark:"农民工工资专项支付"},
    ];
    const bank_transfers = [
        {id:"ZZ-2026-001", from:"ACC-01", to:"ACC-03", amount:500, date:"2026-05-22", summary:"拨付500kV项目专户用款", status:"已完成"},
        {id:"ZZ-2026-002", from:"ACC-01", to:"ACC-04", amount:300, date:"2026-06-02", summary:"农民工工资专户资金补充", status:"已完成"},
        {id:"ZZ-2026-003", from:"ACC-02", to:"ACC-01", amount:200, date:"2026-06-08", summary:"一般户结余归集至基本户", status:"已完成"},
    ];
    /* ---------- OKR 考核（电力工程真实岗位案例） ---------- */
    const okr_periods = [
        {id:"PD-2026Q2", name:"2026年 第二季度", start:"2026-04-01", end:"2026-06-30", status:"进行中"},
        {id:"PD-2026Q1", name:"2026年 第一季度", start:"2026-01-01", end:"2026-03-31", status:"已结束"},
    ];
    const okr_objectives = [
        {id:"O-001", period:"2026年 第二季度", owner:"张建国", dept:"工程一部", role:"项目经理", projectType:"输变电", project:"P-2407",
         type:"业绩目标", title:"高质量推进500kV变电站扩建，确保Q2关键里程碑达成", weight:50, status:"进行中",
         krs:[
            {title:"6月底GIS组合电器安装完成率≥80%", target:"80%", current:"58%", progress:73, weight:30},
            {title:"项目阶段实际毛利率≥15%", target:"15%", current:"13.8%", progress:92, weight:25},
            {title:"安全生产零事故、零违章", target:"0起", current:"0起", progress:100, weight:25},
            {title:"甲方月度履约评价≥90分", target:"90", current:"88", progress:85, weight:20},
         ], selfScore:88, mgrScore:86, checkins:[{date:"2026-05-30", note:"GIS基础全部完成，设备进场顺利；钢材涨价致毛利承压，已优化分包方案"}]},
        {id:"O-002", period:"2026年 第二季度", owner:"张建国", dept:"工程一部", role:"项目经理", projectType:"输变电", project:"",
         type:"成长目标", title:"培养后备项目管理人才，提升团队整体能力", weight:20, status:"进行中",
         krs:[
            {title:"培养1名后备项目经理并独立负责1个分部", target:"1人", current:"1人", progress:80, weight:50},
            {title:"组织项目部技术/安全培训≥4次", target:"4次", current:"3次", progress:75, weight:50},
         ], selfScore:85, mgrScore:88, checkins:[]},
        {id:"O-003", period:"2026年 第二季度", owner:"李志强", dept:"工程二部", role:"项目经理", projectType:"电缆敷设", project:"P-2402",
         type:"业绩目标", title:"保质保量完成城南电缆敷设二期工程", weight:60, status:"进行中",
         krs:[
            {title:"6月底电缆敷设完成率≥70%", target:"70%", current:"68%", progress:97, weight:35},
            {title:"工程一次验收合格率≥98%", target:"98%", current:"99%", progress:100, weight:30},
            {title:"材料损耗率控制在3%以内", target:"≤3%", current:"2.6%", progress:100, weight:20},
            {title:"按节点完成进度款回款≥1800万", target:"1800万", current:"1650万", progress:92, weight:15},
         ], selfScore:92, mgrScore:90, checkins:[{date:"2026-06-02", note:"进度略超计划，验收质量优秀，继续保持"}]},
        {id:"O-004", period:"2026年 第二季度", owner:"王海涛", dept:"运维中心", role:"运维主管", projectType:"电力运维", project:"P-2403",
         type:"业绩目标", title:"保障开发区变电站安全稳定运行，提升运维服务质量", weight:70, status:"延期",
         krs:[
            {title:"设备缺陷消缺及时率≥95%", target:"95%", current:"89%", progress:78, weight:30},
            {title:"计划巡检完成率100%", target:"100%", current:"96%", progress:96, weight:25},
            {title:"重大设备事故为0", target:"0起", current:"0起", progress:100, weight:30},
            {title:"客户投诉≤1次", target:"≤1次", current:"2次", progress:50, weight:15},
         ], selfScore:78, mgrScore:74, checkins:[{date:"2026-05-25", note:"消缺受备件供应影响，已建立常用备件库存清单"}]},
        {id:"O-005", period:"2026年 第二季度", owner:"陈明", dept:"技术质量部", role:"技术负责人", projectType:"输变电", project:"P-2404",
         type:"业绩目标", title:"强化110kV线路改造工程技术质量管控", weight:60, status:"进行中",
         krs:[
            {title:"技术交底覆盖率100%", target:"100%", current:"100%", progress:100, weight:30},
            {title:"设计变更闭环处理率≥95%", target:"95%", current:"90%", progress:88, weight:25},
            {title:"质量验收一次通过率≥97%", target:"97%", current:"96%", progress:95, weight:25},
            {title:"质量巡检问题整改率100%", target:"100%", current:"94%", progress:90, weight:20},
         ], selfScore:86, mgrScore:84, checkins:[]},
        {id:"O-006", period:"2026年 第二季度", owner:"赵立军", dept:"经营部", role:"商务经理", projectType:"经营管理", project:"",
         type:"业绩目标", title:"拓展电力工程市场，提升经营业绩", weight:80, status:"进行中",
         krs:[
            {title:"新签合同额≥8000万", target:"8000万", current:"6200万", progress:78, weight:35},
            {title:"投标中标率≥30%", target:"30%", current:"27%", progress:90, weight:25},
            {title:"重点客户回访覆盖率100%", target:"100%", current:"100%", progress:100, weight:20},
            {title:"应收账款回款率≥85%", target:"85%", current:"82%", progress:96, weight:20},
         ], selfScore:84, mgrScore:82, checkins:[{date:"2026-05-28", note:"两个EPC项目进入议标阶段，Q2签约有把握"}]},
        {id:"O-007", period:"2026年 第二季度", owner:"刘洋", dept:"安全监察部", role:"安全总监", projectType:"HSE管理", project:"",
         type:"安全目标", title:"筑牢安全生产防线，实现安全管理目标", weight:80, status:"进行中",
         krs:[
            {title:"全公司安全生产事故为0", target:"0起", current:"0起", progress:100, weight:35},
            {title:"项目安全检查覆盖率100%、月≥2次", target:"100%", current:"100%", progress:100, weight:25},
            {title:"安全隐患整改闭环率≥98%", target:"98%", current:"95%", progress:90, weight:25},
            {title:"全员安全培训持证上岗率100%", target:"100%", current:"98%", progress:95, weight:15},
         ], selfScore:90, mgrScore:92, checkins:[]},
        {id:"O-008", period:"2026年 第二季度", owner:"孙倩", dept:"经营部", role:"造价工程师", projectType:"造价管理", project:"",
         type:"业绩目标", title:"提升结算质量与成本管控水平", weight:70, status:"进行中",
         krs:[
            {title:"工程结算资料及时报送率≥95%", target:"95%", current:"92%", progress:92, weight:30},
            {title:"结算金额偏差率≤2%", target:"≤2%", current:"1.6%", progress:100, weight:30},
            {title:"清单双价档案完整率100%", target:"100%", current:"96%", progress:94, weight:20},
            {title:"材料消耗反算覆盖在建项目≥80%", target:"80%", current:"70%", progress:84, weight:20},
         ], selfScore:85, mgrScore:83, checkins:[]},
        {id:"O-009", period:"2026年 第二季度", owner:"周敏", dept:"财务部", role:"财务经理", projectType:"财务管理", project:"",
         type:"业绩目标", title:"强化资金管理与业财一体化", weight:70, status:"进行中",
         krs:[
            {title:"公司整体回款率≥85%", target:"85%", current:"81%", progress:94, weight:30},
            {title:"发票认证及时率100%", target:"100%", current:"99%", progress:99, weight:20},
            {title:"业财数据同步准确率≥98%", target:"98%", current:"97%", progress:97, weight:25},
            {title:"月度资金计划执行偏差≤5%", target:"≤5%", current:"4%", progress:96, weight:25},
         ], selfScore:87, mgrScore:85, checkins:[]},
        {id:"O-010", period:"2026年 第二季度", owner:"管理员", dept:"公司管理层", role:"总经理", projectType:"综合管理", project:"",
         type:"战略目标", title:"达成公司年度经营目标，推进数字化转型", weight:100, status:"进行中",
         krs:[
            {title:"公司综合毛利率≥18%", target:"18%", current:"22.6%", progress:100, weight:30},
            {title:"全员OKR制定与对齐率100%", target:"100%", current:"100%", progress:100, weight:20},
            {title:"ERP数字化系统全员上线使用率≥90%", target:"90%", current:"85%", progress:90, weight:25},
            {title:"重点项目按期交付率≥90%", target:"90%", current:"88%", progress:96, weight:25},
         ], selfScore:90, mgrScore:90, checkins:[]},
    ];
    const okr_templates = [
        {id:"T-1", role:"项目经理", projectType:"输变电 / EPC总包", icon:"🏗️",
         objectives:[
            {title:"高质量交付工程项目，达成经营指标", type:"业绩目标", krs:["关键里程碑/形象进度按期完成率≥95%","项目实际毛利率≥目标值","安全零事故、质量一次验收合格率≥97%","项目回款率≥85%"]},
            {title:"团队建设与人才培养", type:"成长目标", krs:["培养后备骨干≥1名","组织技术/安全培训≥4次"]},
         ]},
        {id:"T-2", role:"运维主管", projectType:"电力运维", icon:"🔧",
         objectives:[{title:"保障设备安全稳定运行，提升服务质量", type:"业绩目标", krs:["缺陷消缺及时率≥95%","计划巡检完成率100%","重大设备事故为0","客户满意度≥90分"]}]},
        {id:"T-3", role:"技术负责人", projectType:"输变电 / 电缆敷设", icon:"📐",
         objectives:[{title:"强化工程技术质量管控", type:"业绩目标", krs:["技术交底覆盖率100%","设计变更闭环率≥95%","质量一次验收通过率≥97%","质量整改闭环率100%"]}]},
        {id:"T-4", role:"商务经理", projectType:"经营管理", icon:"📈",
         objectives:[{title:"市场拓展与经营业绩", type:"业绩目标", krs:["新签合同额达标","投标中标率≥30%","重点客户回访100%","回款率≥85%"]}]},
        {id:"T-5", role:"安全总监", projectType:"HSE管理", icon:"🦺",
         objectives:[{title:"安全生产全面管控", type:"安全目标", krs:["安全生产事故为0","安全检查覆盖率100%","隐患整改闭环率≥98%","全员持证上岗率100%"]}]},
        {id:"T-6", role:"造价工程师", projectType:"造价管理", icon:"🧮",
         objectives:[{title:"结算与成本精细化管控", type:"业绩目标", krs:["结算资料及时报送率≥95%","结算偏差率≤2%","清单双价档案完整率100%","材料消耗反算覆盖≥80%"]}]},
        {id:"T-7", role:"材料员", projectType:"物资管理", icon:"📦",
         objectives:[{title:"材料供应保障与成本控制", type:"业绩目标", krs:["采购到货及时率≥95%","材料成本节超率≤0","库存账实相符率≥99%","材料计划执行率≥95%"]}]},
    ];
    const okr_rules = [
        {id:"RULE-1", selfWeight:30, mgrWeight:70, gradeS:90, gradeA:80, gradeB:70, gradeC:60,
         note:"考核以激励与成长为导向，鼓励设定有挑战性的目标；评分由员工自评(30%)与上级评分(70%)双向沟通确认，关注目标达成过程而非简单结果，不以末位淘汰为目的。"},
    ];

    /* ---------- 资质证书（带到期日，用于到期报警） ---------- */
    const certs = [
        // 公司资质
        {id:"ZS-001", name:"安全生产许可证", category:"公司资质", holder:"恒达电力工程有限公司", certNo:"(鄂)JZ安许证字[2023]0xxxx", issuer:"湖北省住建厅", issueDate:"2023-07-06", expiry:"2026-07-05", remark:"到期前30天需办理延期"},
        {id:"ZS-002", name:"电力工程施工总承包三级资质", category:"公司资质", holder:"恒达电力工程有限公司", certNo:"D342xxxxxxxx", issuer:"湖北省住建厅", issueDate:"2022-03-21", expiry:"2027-03-20", remark:""},
        {id:"ZS-003", name:"建筑业企业资质证书", category:"公司资质", holder:"恒达电力工程有限公司", certNo:"D142xxxxxxxx", issuer:"武汉市城建局", issueDate:"2021-06-26", expiry:"2026-06-25", remark:"临近到期，需提前换证"},
        {id:"ZS-004", name:"营业执照", category:"公司资质", holder:"恒达电力工程有限公司", certNo:"91420100MA4xxxxxx", issuer:"武汉市市场监管局", issueDate:"2020-04-01", expiry:"2050-03-31", remark:"长期"},
        // 体系认证
        {id:"ZS-005", name:"ISO9001 质量管理体系认证", category:"体系认证", holder:"恒达电力工程有限公司", certNo:"00123Q3xxxxR0M", issuer:"中certification认证中心", issueDate:"2023-08-31", expiry:"2026-08-30", remark:""},
        {id:"ZS-006", name:"ISO45001 职业健康安全体系认证", category:"体系认证", holder:"恒达电力工程有限公司", certNo:"00123S3xxxxR0M", issuer:"中certification认证中心", issueDate:"2024-02-10", expiry:"2027-02-09", remark:""},
        // 个人执业
        {id:"ZS-007", name:"一级建造师（机电工程）", category:"个人执业", holder:"张建国", certNo:"鄂142xxxxxxxx", issuer:"住建部", issueDate:"2021-09-06", expiry:"2026-09-05", remark:"项目经理岗位必备"},
        {id:"ZS-008", name:"二级建造师（机电工程）", category:"个人执业", holder:"李志强", certNo:"鄂242xxxxxxxx", issuer:"湖北省住建厅", issueDate:"2023-05-21", expiry:"2026-05-20", remark:"已过期，需尽快继续教育换证"},
        {id:"ZS-009", name:"注册安全工程师", category:"个人执业", holder:"陈明", certNo:"安42xxxxxxxx", issuer:"应急管理部", issueDate:"2024-01-16", expiry:"2027-01-15", remark:""},
        {id:"ZS-010", name:"注册造价工程师", category:"个人执业", holder:"孙倩", certNo:"造42xxxxxxxx", issuer:"住建部", issueDate:"2022-12-02", expiry:"2026-12-01", remark:""},
        {id:"ZS-011", name:"会计专业技术资格（中级）", category:"个人执业", holder:"周敏", certNo:"会42xxxxxxxx", issuer:"财政部", issueDate:"2023-07-29", expiry:"2026-07-28", remark:""},
        // 特种作业
        {id:"ZS-012", name:"高压电工进网作业许可证", category:"特种作业", holder:"王海涛", certNo:"T42xxxxxxxxxxxx", issuer:"应急管理局", issueDate:"2023-07-01", expiry:"2026-06-30", remark:"临近到期，需复审"},
        {id:"ZS-013", name:"特种作业操作证（高处作业）", category:"特种作业", holder:"刘洋", certNo:"T42xxxxxxxxxxxx", issuer:"应急管理局", issueDate:"2023-04-13", expiry:"2026-04-12", remark:"已过期，禁止上岗作业"},
        {id:"ZS-014", name:"焊工特种作业操作证", category:"特种作业", holder:"赵立军", certNo:"T42xxxxxxxxxxxx", issuer:"应急管理局", issueDate:"2024-05-15", expiry:"2027-05-14", remark:""},
    ];

    return { projects, contracts, subcontracts, boq, progress, cost, fin_income, fin_cash,
             bank_accounts, bank_transfers, certs,
             okr_periods, okr_objectives, okr_templates, okr_rules };
}

/* ---------- 权限：默认角色与账号（电力工程公司常见岗位） ---------- */
// 不调用 buildIndex（避免重复改写 MENU），按相同规则就地推导各模块的叶子 key
function leafKeysOfModules(modKeys){
    const out=[];
    MENU.forEach(m=>{ if(!modKeys.includes(m.key)) return;
        m.groups.forEach((g,gi)=> g.leaves.forEach((lf,li)=> out.push(`${m.key}_${gi}_${li}`)) ); });
    return out;
}
function authDefaults(){
    const roles = [
        {id:"R-super", name:"超级管理员", isSuper:true,  perms:[], note:"系统最高权限，可配置角色、账号与功能权限"},
        {id:"R-gm",    name:"总经理",     isSuper:false, note:"全局经营视角（除系统设置外全部可见）",
            perms:leafKeysOfModules(["me","decision","okr","project","sub","material","equip","turnover","finance","customer","admin","hr","doc"])},
        {id:"R-gma",   name:"总经理助理", isSuper:false, note:"协助总经理，侧重决策辅助与行政人事协同",
            perms:leafKeysOfModules(["me","decision","okr","customer","admin","hr","doc"])},
        {id:"R-fin",   name:"财务经理",   isSuper:false, note:"财务资金、收付款、发票与业财一体化",
            perms:leafKeysOfModules(["me","decision","finance","doc"])},
        {id:"R-pm",    name:"项目经理",   isSuper:false, note:"项目执行：进度、分包、材料、设备、周材",
            perms:leafKeysOfModules(["me","project","sub","material","equip","turnover"])},
        {id:"R-mat",   name:"材料员",     isSuper:false, note:"材料计划、采购、库存",
            perms:leafKeysOfModules(["me","material"])},
    ];
    const users = [
        {id:"U-admin", username:"admin",     name:"超级管理员",      password:"123456", roleId:"R-super", status:"启用"},
        {id:"U-gm",    username:"gm",        name:"张总（总经理）",  password:"123456", roleId:"R-gm",    status:"启用"},
        {id:"U-gma",   username:"assistant", name:"李助理",          password:"123456", roleId:"R-gma",   status:"启用"},
        {id:"U-fin",   username:"finance",   name:"周敏（财务经理）",password:"123456", roleId:"R-fin",   status:"启用"},
        {id:"U-pm",    username:"pm",        name:"张建国（项目经理）",password:"123456", roleId:"R-pm",  status:"启用"},
        {id:"U-mat",   username:"material",  name:"孙倩（材料员）",  password:"123456", roleId:"R-mat",   status:"启用"},
    ];
    return { roles, users };
}
// 非破坏性注入：缺失才补，已存在的角色/账号与其它业务数据均不动
function ensureAuth(data){
    if(!Array.isArray(data.sys_roles) || !data.sys_roles.length || !Array.isArray(data.sys_users) || !data.sys_users.length){
        const a = authDefaults();
        if(!Array.isArray(data.sys_roles) || !data.sys_roles.length) data.sys_roles = a.roles;
        if(!Array.isArray(data.sys_users) || !data.sys_users.length) data.sys_users = a.users;
    }
    return data;
}
// 非破坏性注入证书台账（老库缺失时补默认数据，不动其它数据）
function ensureCerts(data){
    if(!Array.isArray(data.certs) || !data.certs.length){ data.certs = seed().certs; }
    return data;
}
/* 审批流程定义（可在 系统→流程设置 中修改）
   steps 按顺序逐级流转；minAmount 表示金额(万元)达到该值才需要这一级 */
function flowDefaults(){
    return [
        {id:"FL-salary", name:"薪资付款审批", colls:["fin_salary"],
         steps:[{roleId:"R-gm", name:"总经理"}]},
        {id:"FL-cost", name:"成本/报销审批", colls:["cost"],
         steps:[{roleId:"R-pm", name:"项目经理"},{roleId:"R-fin", name:"财务经理"},{roleId:"R-gm", name:"总经理", minAmount:100}]},
        {id:"FL-contract", name:"合同审批", colls:["contracts","subcontracts"],
         steps:[{roleId:"R-fin", name:"财务经理"},{roleId:"R-gm", name:"总经理"}]},
        {id:"FL-income", name:"收款确认", colls:["fin_income"],
         steps:[{roleId:"R-fin", name:"财务经理"}]},
        {id:"FL-default", name:"通用审批", colls:["*"],
         steps:[{roleId:"R-gm", name:"总经理"}]},
    ];
}
function ensureFlows(data){
    if(!Array.isArray(data.sys_flows) || !data.sys_flows.length){ data.sys_flows = flowDefaults(); }
    return data;
}

let db = load();
const subs = [];
function load(){
    let data=null;
    try{ const raw=localStorage.getItem(KEY); if(raw) data=JSON.parse(raw); }catch(e){}
    if(!data) data=seed();
    ensureAuth(data);
    ensureCerts(data);
    ensureFlows(data);
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
}
function persist(){ localStorage.setItem(KEY, JSON.stringify(db)); subs.forEach(fn=>fn(db)); }

export const Store = {
    all(coll){ return (db[coll]||[]).slice(); },
    get(coll,id){ return (db[coll]||[]).find(r=>r.id===id); },
    add(coll,rec){ if(!db[coll]) db[coll]=[]; if(!rec.id) rec.id=uid(coll.slice(0,2).toUpperCase()); db[coll].unshift(rec); persist(); return rec; },
    update(coll,id,patch){ const r=(db[coll]||[]).find(x=>x.id===id); if(r)Object.assign(r,patch); persist(); return r; },
    remove(coll,id){ if(db[coll]) db[coll]=db[coll].filter(r=>r.id!==id); persist(); },
    reset(){ db=ensureFlows(ensureCerts(ensureAuth(seed()))); persist(); },
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
