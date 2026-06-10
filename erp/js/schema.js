/* ============================================================
   Schema 推断引擎
   按叶子名称/分组归类 → 生成字段(驱动 列表/表单/详情)、筛选、页型
   字段显示提示：col(进列表) money(金额) badge(状态) bar(百分比) date(日期)
   ============================================================ */
import { Store } from "./store.js";

const APPROVAL = ["草稿","待审批","审批中","已批准","已驳回"];
const SOURCE = ["手工新建","导入","流程生成","上游单据"];

const projOpts = () => Store.all("projects").map(p=>({value:p.id,label:p.name}));

/* 字段构造助手 */
const F = (key,label,o={}) => Object.assign({key,label,type:"text"},o);
const fProject = () => F("project","所属项目",{type:"select",options:projOpts(),col:true,filter:true});
const fParty   = (label="往来单位") => F("party",label,{col:true,filter:true});
const fAmount  = (label="金额(万元)") => F("amount",label,{type:"number",money:true,col:true,align:"right"});
const fDate    = (label="单据日期") => F("date",label,{type:"date",col:true,date:true});
const fApproval= () => F("approval","审批状态",{type:"select",options:APPROVAL,badge:true,col:true,filter:true,default:"草稿"});
const fStatus  = (opts,label="业务状态",def) => F("status",label,{type:"select",options:opts,badge:true,col:true,filter:true,default:def||opts[0]});
const tail = () => [ F("attachments","附件",{type:"text",placeholder:"附件名称/数量"}),
                     F("remark","备注",{type:"textarea",full:true}),
                     F("source","来源",{type:"select",options:SOURCE,default:"手工新建"}) ];

/* 关键字归类 */
function classify(name, group){
    const t = name+"|"+group;
    if(/逻辑图/.test(name)) return "diagram";
    if(/修改密码/.test(name)) return "password";
    if(/合同$|^承包合同|^分包合同|采购合同|租赁合同/.test(name)) return "contract";
    if(/进度款申报/.test(name)) return "progresspay";
    if(/结算/.test(name)) return "settle";
    if(/索赔|扣款|罚款/.test(name)) return "adjust";
    if(/变更/.test(name)) return "change";
    if(/开票|收票|发票/.test(name)) return "invoice";
    if(/保证金/.test(name)) return "deposit";
    if(/收款/.test(name)) return "receipt";
    if(/付款|报销|预支工资|薪资付款|薪资发布/.test(name)) return "payment";
    if(/借款申请|还款申请/.test(name)) return "loan";
    if(/银行账户/.test(name)) return "bank";
    if(/收支登记/.test(name)) return "cashlog";
    if(/入库|收货/.test(name)) return "inbound";
    if(/出库|退货|退库|归还|报损/.test(name)) return "outbound";
    if(/调拨/.test(name)) return "transfer";
    if(/盘点/.test(name)) return "stocktake";
    if(/初始化/.test(name)) return "stockinit";
    if(/计划|需用/.test(name)) return "plan";
    if(/申购|申请|报装|申报/.test(name)) return "apply";
    if(/进度填报|分部分项|形象/.test(name)) return "progress";
    if(/成本/.test(name)) return "cost";
    if(/设备台账|设备信息|设备计量|设备调度|设备检查|设备维保|设备油耗|租赁商报价|供应商报价/.test(name)) return "equipment";
    if(/人员|联系人|班组|劳务队|工种|黑名单|项目人员|受理人|竞争对手/.test(name)) return "person";
    if(/供应商|分包商|租赁商|甲方单位|客户信息/.test(name)) return "party";
    if(/类别|信息|仓库|账户|科目|设置|区域|行业|来源|工作日|班时|组织架构|角色|授权/.test(name)) return "master";
    if(/日志|方案|交底|巡检|整改|检查|公告|通知|请示|勘察|自审|登记|协同|预定|用印|借阅|证书|印章|物品|供电报装|项目维护|标书|投标文件|礼品|用车|车\(机\)票|宾馆|报告|资料/.test(name)) return "doc";
    return "generic";
}

/* 各类目字段 */
function fieldsFor(cat, name){
    switch(cat){
    case "contract": return [
        F("code","合同编号",{col:true}), F("name","合同名称",{required:true,full:true,col:true}),
        fProject(), fParty("相对方单位"), F("type","合同类型",{type:"select",options:["甲方合同","分包合同","采购合同","租赁合同"],col:true}),
        fAmount("合同金额(万元)"), F("received","已收/付(万元)",{type:"number",money:true,align:"right"}),
        F("signedDate","签订日期",{type:"date",col:true,date:true}),
        fApproval(), fStatus(["执行中","已完成","已作废"],"合同状态","执行中"), ...tail() ];
    case "progresspay": return [
        F("code","申报编号",{col:true}), F("name","申报名称",{required:true,full:true,col:true}),
        fProject(), F("contract","关联合同",{col:true,filter:true}), F("period","申报期数",{col:true}),
        fAmount("本期申报(万元)"), fDate("申报日期"), fApproval(), fStatus(["待确认","已确认","已支付"],"申报状态"), ...tail() ];
    case "settle": return [
        F("code","结算编号",{col:true}), F("name","结算名称",{required:true,full:true,col:true}),
        fProject(), F("contract","关联合同",{col:true,filter:true}),
        fAmount("结算金额(万元)"), fDate("结算日期"), fApproval(), fStatus(["待结算","结算中","已结算"],"结算状态"), ...tail() ];
    case "adjust": return [
        F("code","单据编号",{col:true}), F("name",name+"事由",{required:true,full:true,col:true}),
        fProject(), F("contract","关联合同",{col:true,filter:true}),
        fAmount(name+"金额(万元)"), fDate("发生日期"), fApproval(), fStatus(["待处理","已生效"],"状态"), ...tail() ];
    case "change": return [
        F("code","变更编号",{col:true}), F("name","变更事项",{required:true,full:true,col:true}),
        fProject(), F("contract","关联合同",{col:true,filter:true}),
        fAmount("变更金额(万元)"), fDate("变更日期"), fApproval(), fStatus(["待审","已批准","已驳回"],"变更状态"), ...tail() ];
    case "invoice": return [
        F("code","发票编号",{col:true}), F("invoiceNo","发票号码",{col:true}),
        fProject(), F("contract","关联合同",{col:true,filter:true}), fParty("开票/受票单位"),
        fAmount("价税合计(万元)"), F("taxRate","税率(%)",{type:"number"}), fDate("开票日期"),
        fApproval(), fStatus(["待开票","已开票","已认证"],"发票状态"), ...tail() ];
    case "deposit": return [
        F("code","保证金编号",{col:true}), F("name",name+"名称",{required:true,full:true,col:true}),
        fProject(), fParty("收取/缴纳单位"), F("dtype","保证金类型",{type:"select",options:["投标","履约","分包","其他"],col:true}),
        fAmount("保证金金额(万元)"), fDate("缴纳日期"), F("refundDate","退还日期",{type:"date"}),
        fApproval(), fStatus(["已缴纳","已退还","已没收"],"状态"), ...tail() ];
    case "receipt": return [
        F("code","收款单号",{col:true}), fProject(), F("contract","关联合同",{col:true,filter:true}), fParty("付款单位"),
        fAmount("收款金额(万元)"), F("method","收款方式",{type:"select",options:["银行转账","承兑汇票","现金","其他"]}),
        fDate("收款日期"), fApproval(), fStatus(["待到账","已到账"],"到账状态"), ...tail() ];
    case "payment": return [
        F("code","付款单号",{col:true}), F("name","付款事由",{full:true,col:true}), fProject(),
        F("contract","关联合同",{filter:true}), fParty("收款单位/人"),
        fAmount("付款金额(万元)"), F("method","付款方式",{type:"select",options:["银行转账","承兑汇票","现金","其他"]}),
        fDate("付款日期"), fApproval(), fStatus(["待付款","部分付款","已付款"],"付款状态"), ...tail() ];
    case "loan": return [
        F("code","单据编号",{col:true}), F("applicant","申请人",{col:true}), fProject(),
        fAmount("金额(万元)"), F("reason","事由",{full:true}), fDate("申请日期"),
        fApproval(), fStatus(["待还","部分归还","已结清"],"借款状态"), ...tail() ];
    case "bank": return [
        F("name","账户名称",{required:true,col:true}), F("bank","开户行",{col:true}),
        F("account","银行账号",{col:true}), F("balance","余额(万元)",{type:"number",money:true,align:"right",col:true}),
        F("currency","币种",{type:"select",options:["人民币"],default:"人民币"}), F("remark","备注",{type:"textarea",full:true}) ];
    case "cashlog": return [
        F("code","流水号",{col:true}), F("direction","收支方向",{type:"select",options:["收入","支出"],badge:true,col:true,filter:true}),
        fProject(), F("account","银行账户",{col:true}), fAmount("金额(万元)"),
        fDate("发生日期"), F("summary","摘要",{full:true,col:true}), ...tail() ];
    case "inbound": return [
        F("code","入库单号",{col:true}), fProject(), F("warehouse","仓库",{col:true,filter:true}),
        F("material","物料名称",{required:true,col:true}), F("spec","规格",{}), F("qty","数量",{type:"number",col:true,align:"right"}),
        F("unit","单位",{}), fAmount("金额(万元)"), fParty("供应商"), fDate("入库日期"),
        fApproval(), fStatus(["待入库","已入库"],"入库状态","已入库"), ...tail() ];
    case "outbound": return [
        F("code","单据编号",{col:true}), fProject(), F("warehouse","仓库",{col:true,filter:true}),
        F("material","物料名称",{required:true,col:true}), F("qty","数量",{type:"number",col:true,align:"right"}),
        F("unit","单位",{}), F("receiver","领用/退货人",{col:true}), fDate("单据日期"),
        fApproval(), fStatus(["待出库","已出库"],"状态","已出库"), ...tail() ];
    case "transfer": return [
        F("code","调拨单号",{col:true}), fProject(), F("fromWh","调出仓库",{col:true}), F("toWh","调入仓库",{col:true}),
        F("material","物料名称",{required:true,col:true}), F("qty","数量",{type:"number",col:true,align:"right"}), F("unit","单位",{}),
        fDate("调拨日期"), fApproval(), fStatus(["待调拨","已调拨"],"状态"), ...tail() ];
    case "stocktake": return [
        F("code","盘点单号",{col:true}), fProject(), F("warehouse","仓库",{col:true,filter:true}),
        F("bookQty","账面数",{type:"number",align:"right",col:true}), F("realQty","实盘数",{type:"number",align:"right",col:true}),
        F("diff","盈亏",{type:"number",align:"right",col:true}), fDate("盘点日期"),
        fApproval(), fStatus(["盘点中","已完成"],"状态"), ...tail() ];
    case "stockinit": return [
        F("material","物料/物品",{required:true,col:true}), F("warehouse","仓库",{col:true}),
        F("qty","期初数量",{type:"number",align:"right",col:true}), F("unit","单位",{}),
        F("price","单价(万元)",{type:"number",align:"right"}), fAmount("期初金额(万元)"), F("remark","备注",{type:"textarea",full:true}) ];
    case "plan": return [
        F("code","计划编号",{col:true}), F("name","计划名称",{required:true,full:true,col:true}), fProject(),
        F("item","项目内容",{col:true}), F("qty","计划数量",{type:"number",align:"right",col:true}), F("unit","单位",{}),
        F("planDate","需用日期",{type:"date",col:true,date:true}), fApproval(),
        fStatus(["待执行","执行中","已完成"],"执行状态"), ...tail() ];
    case "apply": return [
        F("code","申请编号",{col:true}), F("name","申请事项",{required:true,full:true,col:true}), F("applicant","申请人",{col:true}),
        fProject(), fAmount("涉及金额(万元)"), fDate("申请日期"), fApproval(),
        fStatus(["待处理","处理中","已完成"],"状态"), ...tail() ];
    case "progress": return [
        fProject(), F("wbs","分部分项/部位",{col:true}), F("reporter","填报人",{col:true}),
        F("percent","完成进度",{type:"number",bar:true,col:true}), F("period","填报期间",{col:true}),
        fDate("填报日期"), fStatus(["正常","延期","受阻","已完成"],"进度状态"), ...tail() ];
    case "cost": return [
        F("code","成本编号",{col:true}), fProject(), F("subject","成本科目",{type:"select",options:["人工","材料","机械","分包","间接费","其他"],col:true,filter:true}),
        fParty("供应商/对象"), fAmount("成本金额(万元)"), fDate("发生日期"),
        fApproval(), fStatus(["待付款","部分付款","已付款"],"付款状态"), ...tail() ];
    case "equipment": return [
        F("code","编号",{col:true}), F("name",name.replace(/查询/,"")+"名称",{required:true,col:true}),
        fProject(), F("model","型号规格",{col:true}), F("value","数值/金额",{type:"number",align:"right",col:true}),
        F("operator","责任人",{col:true}), fDate("日期"), fStatus(["正常","停用","维修中"],"状态"), ...tail() ];
    case "person": return [
        F("code","编号",{col:true}), F("name","姓名/名称",{required:true,col:true}), fProject(),
        F("role","角色/工种",{col:true}), F("phone","联系电话",{col:true}), F("idcard","证件号",{}),
        fStatus(["在职","离场","黑名单"],"状态","在职"), F("remark","备注",{type:"textarea",full:true}) ];
    case "party": return [
        F("code","编号",{col:true}), F("name","单位名称",{required:true,full:true,col:true}),
        F("contact","联系人",{col:true}), F("phone","联系电话",{col:true}), F("type","类别",{col:true}),
        F("address","地址",{full:true}), fStatus(["合作中","停用"],"状态","合作中"), F("remark","备注",{type:"textarea",full:true}) ];
    case "master": return [
        F("code","编码",{col:true}), F("name","名称",{required:true,col:true}),
        F("category","分类/上级",{col:true}), F("sort","排序",{type:"number"}),
        fStatus(["启用","停用"],"状态","启用"), F("remark","说明",{type:"textarea",full:true}) ];
    case "doc": return [
        F("code","编号",{col:true}), F("title","标题/事项",{required:true,full:true,col:true}), fProject(),
        F("owner","负责人/填报人",{col:true}), fDate("日期"), F("content","内容描述",{type:"textarea",full:true}),
        fApproval(), fStatus(["草稿","已提交","已归档"],"状态"), ...tail() ];
    default: return [
        F("code","编号",{col:true}), F("name","名称",{required:true,full:true,col:true}), fProject(),
        fAmount(), fDate(), fApproval(), fStatus(["未开始","进行中","已完成","已关闭"],"业务状态"), ...tail() ];
    }
}

/* 统计页聚合配置 */
function statConfig(leaf){
    const src = leaf.src || leaf.coll;
    // 维度：金额型 vs 计数型
    const amountColls = ["contracts","subcontracts","cost","fin_income","fin_cash","mat_pur_contract","eq_lease_contract","zc_lease_contract"];
    return { src, byProject:true, isAmount: amountColls.includes(src) };
}

/* ---------- 旗舰集合：精调 schema（与种子数据字段对齐） ---------- */
const RISK = [{value:"low",label:"低风险"},{value:"mid",label:"中风险"},{value:"high",label:"高风险"},{value:"critical",label:"严重"}];
function bespoke(){
    const PT = ["输变电","电缆敷设","电力运维","EPC总包"];
    const contractFields = (partyLabel,defType)=>[
        F("name","合同名称",{required:true,full:true,col:true}), fProject(), F("partyA",partyLabel,{col:true,filter:true}),
        F("type","合同类型",{col:true,default:defType}), fAmount("合同金额(万元)"), F("received","已收款(万元)",{type:"number",money:true,align:"right"}),
        fStatus(["执行中","已完成","已作废"],"合同状态","执行中"), fApproval(), F("signedDate","签订日期",{type:"date",col:true,date:true}), ...tail() ];
    return {
        projects:[ F("name","项目名称",{required:true,full:true,col:true}), F("type","项目类型",{type:"select",options:PT,col:true,filter:true}),
            F("manager","项目负责人",{col:true}), F("contractAmount","合同金额(万元)",{type:"number",money:true,align:"right",col:true}),
            F("actualCost","实际成本(万元)",{type:"number",money:true,align:"right"}), F("received","已收款(万元)",{type:"number",money:true,align:"right"}),
            F("risk","风险等级",{type:"select",options:RISK,riskBadge:true,col:true,filter:true,default:"low"}),
            fStatus(["进行中","筹备","暂停","已完工"],"项目状态","进行中"),
            F("startDate","开工日期",{type:"date",col:true,date:true}), F("endDate","计划竣工",{type:"date"}) ],
        contracts: contractFields("相对方单位","甲方合同"),
        subcontracts: contractFields("分包商","分包合同"),
        boq:[ F("code","清单编码",{col:true}), F("name","清单名称",{required:true,full:true,col:true}), fProject(),
            F("category","类别",{type:"select",options:["土建","安装","其他"],col:true,filter:true}), F("unit","单位",{col:true}),
            F("ctrlQty","控制总量",{type:"number",align:"right",col:true}), F("actualQty","实际完成量",{type:"number",align:"right",col:true}),
            F("partyAPrice","甲方综合单价",{type:"number",align:"right",col:true}), F("subPrice","分包综合单价",{type:"number",align:"right",col:true}), F("remark","备注",{type:"textarea",full:true}) ],
        progress:[ fProject(), F("wbs","分部分项/部位",{col:true}), F("reporter","填报人",{col:true}),
            F("percent","完成进度",{type:"number",bar:true,col:true}), F("date","填报日期",{type:"date",col:true,date:true}),
            fStatus(["正常","延期","受阻","已完成"],"进度状态","正常"), F("remark","备注",{type:"textarea",full:true}) ],
        cost:[ fProject(), F("subject","成本科目",{type:"select",options:["人工","材料","机械","分包","间接费","其他"],col:true,filter:true}),
            F("party","供应商/对象",{col:true}), fAmount("成本金额(万元)"), F("date","发生日期",{type:"date",col:true,date:true}),
            fStatus(["待付款","部分付款","已付款"],"付款状态","待付款"), F("remark","备注",{type:"textarea",full:true}) ],
        fin_income:[ fProject(), F("contract","关联合同",{col:true,filter:true}), F("party","付款单位",{col:true}),
            fAmount("收款金额(万元)"), F("method","收款方式",{type:"select",options:["银行转账","承兑汇票","现金","其他"]}),
            F("date","收款日期",{type:"date",col:true,date:true}), fStatus(["待到账","已到账"],"到账状态","待到账"), F("remark","备注",{type:"textarea",full:true}) ],
        fin_cash:[ F("direction","收支方向",{type:"select",options:["收入","支出"],badge:true,col:true,filter:true,default:"收入"}), fProject(),
            F("account","银行账户",{col:true}), fAmount("金额(万元)"), F("date","发生日期",{type:"date",col:true,date:true}),
            F("summary","摘要",{full:true,col:true}), F("remark","备注",{type:"textarea",full:true}) ],
        okr_periods:[ F("name","周期名称",{required:true,col:true,full:true}), F("start","开始日期",{type:"date",col:true,date:true}),
            F("end","结束日期",{type:"date",col:true}), fStatus(["未开始","进行中","已结束"],"周期状态","进行中"), F("remark","说明",{type:"textarea",full:true}) ],
    };
}
const BESPOKE = bespoke();

export function schemaFor(leaf){
    if(leaf.kind==="special:dashboard") return {kind:"dashboard"};
    if(leaf.kind==="special:password") return {kind:"password"};
    if(leaf.kind==="special:diagram") return {kind:"diagram"};
    if(leaf.kind==="todo") return {kind:"todo"};
    if(leaf.kind==="flow") return {kind:"flow"};
    if(leaf.kind==="attendance") return {kind:"attendance"};
    if(leaf.kind && leaf.kind.indexOf("okr_")===0) return {kind:leaf.kind};

    const cat = classify(leaf.name, leaf.group);
    if(leaf.kind==="stat") return { kind:"stat", cat, fields:fieldsFor(cat,leaf.name), stat:statConfig(leaf) };
    if(BESPOKE[leaf.coll]) return { kind:"list", cat, fields:BESPOKE[leaf.coll] };
    return { kind:"list", cat, fields:fieldsFor(cat, leaf.name) };
}
