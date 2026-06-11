/* ============================================================
   认证与权限：账号登录 + 当前用户/角色 + 功能权限判定
   会话存于 localStorage("heyiyun_erp_user")，仅保存 roleId，
   角色权限始终从 sys_roles 实时读取，超管改权限后即时生效。
   ============================================================ */
import { Store } from "./store.js";

const SESS = "heyiyun_erp_user";

/** 账号密码登录，成功写入会话并返回 {ok:true,user}，失败返回 {ok:false,msg} */
export function login(username, password){
    const u = Store.all("sys_users").find(x=>x.username===String(username||"").trim());
    if(!u) return { ok:false, msg:"账号不存在" };
    if(u.status && u.status!=="启用") return { ok:false, msg:"该账号已停用，请联系管理员" };
    if(String(u.password)!==String(password)) return { ok:false, msg:"密码错误" };
    const role = Store.get("sys_roles", u.roleId);
    const sess = { username:u.username, name:u.name, roleId:u.roleId,
                   roleName: role?role.name:"", isSuper: !!(role&&role.isSuper), login:Date.now() };
    localStorage.setItem(SESS, JSON.stringify(sess));
    return { ok:true, user:sess };
}

export function currentUser(){ try{ return JSON.parse(localStorage.getItem(SESS)); }catch(e){ return null; } }
export function currentRole(){ const u=currentUser(); return u ? Store.get("sys_roles", u.roleId) : null; }
export function isSuper(){ const u=currentUser(); if(u&&u.isSuper) return true; const r=currentRole(); return !!(r&&r.isSuper); }

/** 是否有权访问某个菜单叶子（按 leaf.key） */
export function canLeaf(key){
    if(isSuper()) return true;
    const r=currentRole();
    return !!(r && Array.isArray(r.perms) && r.perms.includes(key));
}

export function logout(){ localStorage.removeItem(SESS); }
