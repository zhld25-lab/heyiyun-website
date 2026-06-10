/* ============================================================
   全量菜单树（信息架构）
   叶子可为字符串(名称) 或 {n:名称, coll?:集合名, kind?:页型}
   kind: list(默认业务单据) | stat(统计) | special:xxx
   ============================================================ */

export const MENU = [
{ key:"me", name:"个人", icon:"🙋", groups:[
    { name:"我的工作", leaves:[
        {n:"待办事项", kind:"todo"}, {n:"已办事项", kind:"todo"}, {n:"知会事项", kind:"todo"},
        {n:"我的考勤", kind:"stat"}, {n:"我的薪资", kind:"stat"},
        {n:"修改密码", kind:"special:password"}, {n:"逻辑图", kind:"special:diagram"},
    ]},
]},

{ key:"decision", name:"决策", icon:"📊", groups:[
    { name:"经营决策", leaves:[
        {n:"项目总览", kind:"special:dashboard"},
        {n:"收入分析", kind:"stat", src:"fin_income"}, {n:"现金流", kind:"stat", src:"fin_cash"},
        {n:"项目风险", kind:"stat", src:"projects"},
        {n:"承包合同", coll:"contracts", kind:"stat"}, {n:"分包合同", coll:"subcontracts", kind:"stat"},
        {n:"采购合同", coll:"mat_pur_contract", kind:"stat"}, {n:"设备租赁", coll:"eq_lease_contract", kind:"stat"},
        {n:"周材租赁", coll:"zc_lease_contract", kind:"stat"},
    ]},
]},

{ key:"okr", name:"考核", icon:"🎯", groups:[
    { name:"OKR 管理", leaves:[
        {n:"OKR总览", kind:"okr_overview"}, {n:"我的OKR", kind:"okr_my"},
        {n:"目标制定", kind:"okr_objectives"}, {n:"周期管理", coll:"okr_periods"},
    ]},
    { name:"考核评分", leaves:[
        {n:"自评", kind:"okr_self"}, {n:"上级评分", kind:"okr_review"}, {n:"考核结果", kind:"okr_results"},
    ]},
    { name:"配置", leaves:[
        {n:"岗位OKR模板", kind:"okr_templates"}, {n:"考核规则", kind:"okr_rules"},
    ]},
]},

{ key:"project", name:"项目", icon:"🏗️", groups:[
    { name:"项目信息", leaves:[
        {n:"立项登记", coll:"projects"}, "供电报装", {n:"工程量清单", coll:"boq"},
        "项目人员", "项目班组", "项目维护", "报装状态", "报装受理人",
    ]},
    { name:"承包合同", leaves:[
        {n:"承包合同", coll:"contracts"}, "进度款申报", "完工结算", "合同收款", "合同开票",
        "合同变更", "合同索赔", "合同扣款", "合同罚款", "甲方单位",
        {n:"承包合同统计", coll:"contracts", kind:"stat"}, {n:"承包合同管理", coll:"contracts", kind:"stat"},
    ]},
    { name:"项目进度", leaves:[
        "分部分项", {n:"进度填报", coll:"progress"}, {n:"进度分析", coll:"progress", kind:"stat"},
        {n:"进度总览", coll:"progress", kind:"stat"}, "形象进度", "形象管理",
    ]},
    { name:"项目成本", leaves:[
        "间接成本计划", {n:"间接成本登记", coll:"cost"}, {n:"间接成本统计", coll:"cost", kind:"stat"},
        {n:"成本分析", coll:"cost", kind:"stat"}, {n:"汇总分析", coll:"cost", kind:"stat"}, "成本科目",
    ]},
    { name:"项目资金", leaves:[
        "收入计划", "支出计划", {n:"资金计划统计", kind:"stat", src:"fin_income"},
        {n:"经营分析", kind:"stat", src:"projects"}, {n:"收入分析", kind:"stat", src:"fin_income"},
        {n:"收支分析", kind:"stat", src:"fin_cash"}, {n:"现金流", kind:"stat", src:"fin_cash"},
    ]},
    { name:"施工管理", leaves:[ "施工日志", "施工方案", "技术交底", "设计变更" ]},
    { name:"质量管理", leaves:[ "质量巡检", "质量整改", "维修申报" ]},
    { name:"安全管理", leaves:[ "安全日志", "安全检查" ]},
    { name:"项目风险", leaves:[ {n:"项目告警", kind:"stat", src:"projects"}, "告警设置" ]},
]},

{ key:"sub", name:"分包", icon:"🤝", groups:[
    { name:"分包合同", leaves:[
        "分包计划", {n:"分包合同", coll:"subcontracts"}, "分包进度款申报", "分包完工结算",
        "分包付款", "分包收票", "分包合同变更", "分包合同索赔", "分包合同扣款", "分包合同罚款",
        "分包商", {n:"分包合同统计", coll:"subcontracts", kind:"stat"}, {n:"分包合同管理", coll:"subcontracts", kind:"stat"},
    ]},
    { name:"劳务管理", leaves:[
        "劳务计划", "劳务队", "劳务人员", "劳务工种", {n:"劳务考勤", kind:"attendance"},
        {n:"打卡统计", kind:"stat", src:"sub_laborAttend"}, "劳务工资", "预支工资", "黑名单",
    ]},
]},

{ key:"material", name:"材料", icon:"📦", groups:[
    { name:"材料计划", leaves:[
        "材料需用计划", "材料计划", {n:"材料需用分析", kind:"stat", src:"mat_demand"}, {n:"计划执行分析", kind:"stat", src:"mat_plan"},
    ]},
    { name:"材料采购", leaves:[
        {n:"采购合同", coll:"mat_pur_contract"}, "采购结算", "材料采购付款", "材料采购收票",
        "供应商", "供应商报价", {n:"采购报价对比", kind:"stat", src:"mat_quote"}, "采购入库",
        "采购退货出库", "采购现场收货", "采购现场退货", {n:"采购到货统计", kind:"stat", src:"mat_inbound"},
    ]},
    { name:"甲供材料", leaves:[
        "甲供入库", "甲供退货出库", "甲供现场收货", "甲供现场退货", {n:"甲供材料统计", kind:"stat", src:"mat_jg_in"},
    ]},
    { name:"材料领用", leaves:[
        "领用出库", "领用退库", "现场材料调拨", {n:"材料领用统计", kind:"stat", src:"mat_issue"},
    ]},
    { name:"库存管理", leaves:[
        {n:"库存查询", kind:"stat", src:"mat_stock"}, {n:"库存报表", kind:"stat", src:"mat_stock"},
        {n:"库存分布", kind:"stat", src:"mat_stock"}, {n:"出入库明细", kind:"stat", src:"mat_inbound"},
        "库存调拨", "库存盘点", "其他入库", "其他出库",
    ]},
    { name:"基础信息", leaves:[ "材料类别", "材料信息", "仓库管理", "库存初始化" ]},
]},

{ key:"equip", name:"设备", icon:"🛠️", groups:[
    { name:"设备采购", leaves:[ "设备申购", "设备采购合同", "设备采购付款", "设备采购收票" ]},
    { name:"设备租赁", leaves:[
        "租赁计划", {n:"租赁合同", coll:"eq_lease_contract"}, "租赁结算", "设备租赁付款", "设备租赁收票",
        "租赁商", "租赁商报价", {n:"租赁合同统计", coll:"eq_lease_contract", kind:"stat"},
    ]},
    { name:"设备管理", leaves:[
        "设备计划", "设备台账", {n:"设备台账查询", kind:"stat", src:"eq_ledger"}, "设备调度",
        {n:"设备调度查询", kind:"stat", src:"eq_dispatch"}, "设备计量", {n:"设备计量查询", kind:"stat", src:"eq_meter"},
        "设备检查", {n:"设备检查查询", kind:"stat", src:"eq_check"}, "设备维保", {n:"设备维保查询", kind:"stat", src:"eq_maint"},
        "设备油耗", {n:"设备油耗查询", kind:"stat", src:"eq_fuel"}, "设备类别", "设备信息",
    ]},
]},

{ key:"turnover", name:"周材", icon:"🧱", groups:[
    { name:"周材采购", leaves:[ "周材申购", "周材采购合同", "周材采购付款", "周材采购发票" ]},
    { name:"周材租赁", leaves:[
        {n:"周材租赁合同", coll:"zc_lease_contract"}, "周材租赁收货", "周材租赁归还", "周材租赁结算", "周材租赁付款", "周材租赁收票",
    ]},
    { name:"周材计量", leaves:[
        "周材计划", "周材计量", {n:"周材计量查询", kind:"stat", src:"zc_meter"}, "现场周材调拨", "周材报损", {n:"周材报损查询", kind:"stat", src:"zc_loss"},
    ]},
    { name:"周材库管", leaves:[
        "周材入库", "周材出库", {n:"库存查询", kind:"stat", src:"zc_stock"}, "周材库存调拨", "周材库存盘点",
    ]},
    { name:"基础信息", leaves:[ "周材类别", "周材信息", "库存初始化" ]},
]},

{ key:"finance", name:"财务", icon:"💰", groups:[
    { name:"收款管理", leaves:[ {n:"承包合同收款", coll:"fin_income"}, "其他收款" ]},
    { name:"付款管理", leaves:[
        "分包付款", "材料采购付款", "设备采购付款", "设备租赁付款", "周材采购付款", "周材租赁付款", "薪资付款", "其他付款",
    ]},
    { name:"发票管理", leaves:[
        "承包合同开票", "分包合同收票", "材料采购收票", "设备采购收票", "设备租赁收票",
        "周材采购收票", "周材租赁收票", "其他开票申请", "其他收票登记",
    ]},
    { name:"借款报销", leaves:[
        "借款申请", "还款申请", "费用报销", "差旅费报销", "运费报销", {n:"借款余额", kind:"stat", src:"fin_loan"},
    ]},
    { name:"保证金", leaves:[
        "投标保证金", "联营投标保证金", "履约保证金", {n:"履约保证金管理", kind:"stat", src:"fin_bond_perf"},
        "分包保证金", {n:"分包保证金管理", kind:"stat", src:"fin_bond_sub"},
    ]},
    { name:"银行账户", leaves:[ "银行账户", "收支登记" ]},
]},

{ key:"customer", name:"客户", icon:"🧑‍💼", groups:[
    { name:"客户管理", leaves:[ "客户信息", "联系人", "联系记录", "授权管理", "客户来源", "客户行业", "客户区域" ]},
    { name:"投标管理", leaves:[ "投标登记", "标书购买", "资格自审", "项目勘察", "投标文件", "竞争对手", "投标保证金", "联营投标保证金" ]},
]},

{ key:"admin", name:"行政", icon:"🏢", groups:[
    { name:"通知公告", leaves:[ "通知公告", "通知管理" ]},
    { name:"协同工作", leaves:[ "协同工作", "报告请示", "礼品申请", "用车申请", "车(机)票申请", "宾馆预定" ]},
    { name:"办公用品", leaves:[
        "物品申购", "物品入库", "物品出库", {n:"库存查询", kind:"stat", src:"adm_goods_in"}, {n:"出入库明细", kind:"stat", src:"adm_goods_in"},
        "库存盘点", "物品类别", "物品信息", "仓库管理", "库存初始化",
    ]},
    { name:"印章管理", leaves:[ "印章登记", "用印申请" ]},
    { name:"证书管理", leaves:[ "证书登记", "证书借用", "证书类别" ]},
]},

{ key:"hr", name:"人事", icon:"👥", groups:[
    { name:"考勤管理", leaves:[
        "请假申请", "出差申请", {n:"考勤记录", kind:"attendance"}, {n:"考勤统计", kind:"stat", src:"hr_attend"}, "班时设置", "工作日设置",
    ]},
    { name:"薪资管理", leaves:[ "薪资发布" ]},
]},

{ key:"doc", name:"资料", icon:"📁", groups:[
    { name:"资料中心", leaves:[ "资料类别", "资料中心", "资料借阅" ]},
]},

{ key:"system", name:"系统", icon:"⚙️", groups:[
    { name:"组织", leaves:[ "组织架构", "角色管理" ]},
    { name:"流程", leaves:[ {n:"流程设置", kind:"flow"}, {n:"流程监控", kind:"stat", src:"contracts"}, "流程移交" ]},
]},
];

/* ---------- 归一化：生成稳定 key 与覆盖 ---------- */
export function buildIndex(){
    const leaves = {};   // key -> {key,name,coll,kind,src,module,group,icon}
    MENU.forEach((m,mi)=>{
        m.groups.forEach((g,gi)=>{
            g.leaves = g.leaves.map((lf,li)=>{
                const o = typeof lf==="string" ? {n:lf} : lf;
                const key = `${m.key}_${gi}_${li}`;
                const leaf = { key, name:o.n, coll:o.coll||key, kind:o.kind||"list",
                               src:o.src||null, module:m.name, moduleKey:m.key, group:g.name, icon:m.icon };
                leaves[key] = leaf;
                return leaf;
            });
        });
    });
    return { leaves };
}
