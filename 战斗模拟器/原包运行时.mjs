
// 原包关卡表：Stage_C.bytes（60B/记录，4B头+3601条）。u16@0=关卡编号、u16@17=编组编号、u8@19=等级、u8@20=星等（偏移与 生成角色目录.mjs 构建期用法同源；三关卡 15249/60155/60161 与旧 关卡配置 常量逐字段对照一致）。
let 关卡表缓存 = null;
function 取关卡表() { return 关卡表缓存 ??= (() => {
    const 表 = new Map();
    for (let o = 4; o + 60 <= 关卡字节.length; o += 60) {
        const 编号 = 关卡字节[o] | (关卡字节[o + 1] << 8);
        表.set(编号, { 编号, 编组编号: 关卡字节[o + 17] | (关卡字节[o + 18] << 8), 等级: 关卡字节[o + 19], 星等: 关卡字节[o + 20] });
    }
    return 表;
})(); }
export const 原包关卡表 = new Proxy({}, { get: (目标, 键) => { const 表 = 取关卡表(); const 值 = 表[键]; return typeof 值 === 'function' ? 值.bind(表) : 值; }, has: (目标, 键) => 键 in 取关卡表(), ownKeys: () => Reflect.ownKeys(取关卡表()), getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }) });

// 原包编组表：MonsterGroup.bytes（22B/记录，4B头+4636条）。u16@0=编组编号、@2 起敌人编号×10 槽（每敌双编号槽，去重去 0 得敌人序列；43146→[43248]、42096→[42281..42285]、42095→[42286]）。
let 编组表缓存 = null;
function 取编组表() { return 编组表缓存 ??= (() => {
    const 表 = new Map();
    for (let o = 4; o + 22 <= 编组字节.length; o += 22) {
        const 编号 = 编组字节[o] | (编组字节[o + 1] << 8);
        const 敌人 = [];
        for (let i = 0; i < 10; i++) {
            const 敌 = 编组字节[o + 2 + i * 2] | (编组字节[o + 3 + i * 2] << 8);
            if (敌 && 敌人[敌人.length - 1] !== 敌) 敌人.push(敌);
        }
        表.set(编号, 敌人);
    }
    return 表;
})(); }
export const 原包编组表 = new Proxy({}, { get: (目标, 键) => { const 表 = 取编组表(); const 值 = 表[键]; return typeof 值 === 'function' ? 值.bind(表) : 值; }, has: (目标, 键) => 键 in 取编组表(), ownKeys: () => Reflect.ownKeys(取编组表()), getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }) });
// 原包运行时.mjs —— 浏览器端加载原包二进制表并解析为原包机制结构；Node 环境自动回退 node:fs 读取，供优化器等工具在无浏览器时复用同一份数据链路。
import { 解析原包机制 } from './原包数据.mjs';

export async function 读取原包文件(文件名, 转文本 = false) {
    try {
        const 响应 = await fetch(new URL(`./原包数据/${文件名}`, import.meta.url));
        if (!响应.ok) throw new Error(`HTTP ${响应.status}`);
        return 转文本 ? 响应.json() : new Uint8Array(await 响应.arrayBuffer());
    } catch (浏览器错误) {
        // Node 回退：优先本模块同目录 原包数据/，缺失则回退工作区 原包分析/（兼容未拷贝数据的仓库布局）。
        const { readFile } = await import('node:fs/promises');
        const { fileURLToPath } = await import('node:url');
        const { join, dirname } = await import('node:path');
        const 本目录 = dirname(fileURLToPath(import.meta.url));
        const 候选 = [join(本目录, '原包数据', 文件名), join(本目录, '../../原包分析/当前配置/maindata', 文件名), join(本目录, '../../原包分析/语言包', 文件名)];
        for (const 路径 of 候选) {
            try {
                const 内容 = await readFile(路径);
                return 转文本 ? JSON.parse(内容.toString('utf8')) : new Uint8Array(内容);
            } catch { /* 尝试下一候选 */ }
        }
        throw new Error(`原包数据读取失败：${文件名}（浏览器错误 ${浏览器错误.message}）`);
    }
}

const [技能字节, 技能组字节, 技能文本字节, 角色字节, 解放字节, 文本名字节, 潜力字节, 关卡字节, 编组字节] = await Promise.all([
    读取原包文件('Skill_C.bytes'),
    读取原包文件('SkillGroup.bytes'),
    读取原包文件('SkillStr_sc.bytes'),
    读取原包文件('Character_C.bytes'),
    读取原包文件('LimitBreak.bytes'),
    读取原包文件('CharacterStr_sc.bytes'),
    读取原包文件('PotentialUp.bytes'),
    读取原包文件('Stage_C.bytes'),
    读取原包文件('MonsterGroup.bytes'),
]);
// 原包文本：语言包技能说明（SkillStr 文本池）编号→[名称,说明]。ELv技能（405xx）等未入技能字典的孤岛记录从这里取显示文本。
// 技能文本表=SkillStr_sc.bytes 解析（[u32条数][键u32][u16长+文本]×2，33093 条整文件解完；40501 等逐条与旧JSON 33093 条对照一致）。同构 [{分表:0,编号,文本:[名称,说明]}] 供下游原样消费，替代旧 技能说明.json（7MB JSON→3.3MB 原包 bytes）。
const 文本表 = (() => {
    const 表 = [];
    let 位 = 0;
    while (位 + 4 <= 技能文本字节.length) {
        const n = 技能文本字节[位] | (技能文本字节[位 + 1] << 8) | (技能文本字节[位 + 2] << 16) | (技能文本字节[位 + 3] << 24); 位 += 4;
        if (n <= 0 || n > 200000) break;
        for (let i = 0; i < n; i++) {
            const 编号 = 技能文本字节[位] | (技能文本字节[位 + 1] << 8) | (技能文本字节[位 + 2] << 16) | (技能文本字节[位 + 3] << 24); 位 += 4;
            const 文本 = [];
            for (let j = 0; j < 2; j++) {
                const 长 = 技能文本字节[位] | (技能文本字节[位 + 1] << 8); 位 += 2;
                文本.push(new TextDecoder('utf-8').decode(技能文本字节.subarray(位, 位 + 长)));
                位 += 长;
            }
            表.push({ 分表: 0, 编号, 文本 });
        }
    }
    return 表;
})();
export const 原包文本 = new Map(文本表.map(项 => [项.编号, 项.文本]));
// 原包角色表：Character_C.bytes 55B/记录（4B头+3088条）。u8@7=稀有度(3=SSR)、u8@8=属性码(1火2水3风4光5暗)、u8@9=职业码(1攻2守3治4辅5妨——188角色全对照一致)、u32@10=基础生命、基础攻击=u32@18(玩家)或u32@22(部分怪物)取非零、技能组编号=编号×10+1(计算，SkillGroup 组ID规律已证)。
// 原包ELV：LimitBreak.bytes（TLimitBreakData 族）解析。lvData=lv u8 + 条×5B（条=kind u8 + val u32）至 kind=0 终止；kind1=攻击+val/100%、kind2=生命+val/100%、kind3=解锁技能（val=405xx 编号）。21 档增量按 lv 累计=突破档位（与计算调教面板 系数链同口径）；技能解锁门槛=kind3 条所在 lv（40501-510→lv5、40511-512→lv10、40513-522→lv15、40523-537→lv20，编号块归属=ELV分类块同源）。85 个块（职业×变体）共享同一 21 档序列，按 lv 去重聚合。
let 解放缓存 = null;
const 取ELV = () => 解放缓存 ??= (() => {
    const 按lv = new Map();
    for (let o = 4; o < 解放字节.length; o++) {
        const lv = 解放字节[o];
        if (lv > 20) continue;
        const 条 = [];
        let p = o + 1;
        let ok = true;
        for (let s = 0; s < 8; s++) {
            if (p + 5 > 解放字节.length) { ok = false; break; }
            const kind = 解放字节[p], val = 解放字节[p + 1] | (解放字节[p + 2] << 8) | (解放字节[p + 3] << 16) | (解放字节[p + 4] << 24);
            if (kind === 0 && val === 0) break;
            const 合 = ((kind === 1 || kind === 2) && val <= 1000) || (kind === 3 && val >= 40501 && val <= 40537);
            if (!合) { ok = false; break; }
            条.push([kind, val >>> 0]);
            p += 5;
        }
        if (ok && 条.length) {
            const 串 = 条.map(c => c.join("-")).join(",");
            if (!按lv.has(lv)) 按lv.set(lv, new Set());
            按lv.get(lv).add(串);
        }
    }
    let 生 = 0, 攻 = 0;
    const 突破档位 = [], 解锁计数 = {};
    for (let lv = 0; lv <= 20; lv++) {
        const 模 = [...(按lv.get(lv) || [""])][0].split(",").filter(Boolean);
        for (const c of 模) {
            const [k, v] = c.split("-").map(Number);
            if (k === 3) { const 类 = v <= 40510 ? "profession1" : v <= 40512 ? "common" : v <= 40522 ? "element" : "profession2"; (解锁计数[类] = 解锁计数[类] || {})[lv] = (解锁计数[类][lv] || 0) + 1; }
            else if (k === 2) 生 += v / 100;
            else if (k === 1) 攻 += v / 100;
        }
        突破档位.push({ 等级: lv, 生命百分比: Math.round(生 * 100) / 100, 攻击百分比: Math.round(攻 * 100) / 100 });
    }
    // 门槛=众数 lv（85 块（职业×变体）真模式计数；假阳性散落各 lv 计数低）。
    const 解锁 = {};
    for (const [类, 计] of Object.entries(解锁计数)) 解锁[类] = Number(Object.entries(计).sort((a, b) => b[1] - a[1])[0][0]);
    return { 突破档位, 技能解锁: 解锁 };
})();
const 属性码表 = ['无', '火', '水', '风', '光', '暗'];
const 职业码表 = ['无', '攻击者', '守护者', '治疗者', '辅助者', '妨碍者'];
// 惰性解析（同 原包机制 Proxy 模式）：循环 import 下顶层常量会 TDZ，推迟到首次访问再建表。
let 角色表缓存 = null;
function 取角色表() { return 角色表缓存 ??= (() => {
    const 表 = new Map();
    for (let o = 4; o + 55 <= 角色字节.length; o += 55) {
        const 编号 = 角色字节[o] | (角色字节[o + 1] << 8);
        const 读32 = 偏 => 角色字节[o + 偏] | (角色字节[o + 偏 + 1] << 8) | (角色字节[o + 偏 + 2] << 16) | (角色字节[o + 偏 + 3] << 24);
        表.set(编号, { 编号, 稀有度: 角色字节[o + 7], 属性: 属性码表[角色字节[o + 8]] ?? '无', 职业: 职业码表[角色字节[o + 9]] ?? '无', 基础生命: 读32(10) >>> 0, 基础攻击: (读32(18) >>> 0) || (读32(22) >>> 0), 技能组编号: 编号 * 10 + 1, 潜力类型码: 角色字节[o + 49], 记录偏移: o });
    }
    return 表;
})(); }
export const 原包角色表 = new Proxy({}, {
    get: (目标, 键) => { const 表 = 取角色表(); const 值 = 表[键]; return typeof 值 === 'function' ? 值.bind(表) : 值; },
    has: (目标, 键) => 键 in 取角色表(),
    ownKeys: () => Reflect.ownKeys(取角色表()),
    getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }),
});
export const 原包ELV = new Proxy({}, { get: (目标, 键) => { const 表 = 取ELV(); const 值 = 表[键]; return typeof 值 === 'function' ? 值.bind(表) : 值; }, has: (目标, 键) => 键 in 取ELV(), ownKeys: () => Reflect.ownKeys(取ELV()), getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }) });
// 惰性解析：解析原包机制 依赖关卡数据（夏日行动等），而关卡数据又依赖角色数据→本模块形成循环 import；模块体立即解析会在关卡数据初始化前触发 TDZ 错误。推迟到首次属性访问（运行时，全部模块已就绪）再解析，Proxy 保持 原包机制.技能 等访问形式不变。
let 解析缓存 = null;
function 取解析() { return 解析缓存 ??= 解析原包机制({ 技能字节, 技能组字节, 文本表 }); }
export const 原包机制 = new Proxy({}, {
    get: (目标, 键) => 取解析()[键],
    has: (目标, 键) => 键 in 取解析(),
    ownKeys: () => Reflect.ownKeys(取解析()),
    getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }),
});
// 原包角色文本：CharacterStr_sc.bytes（3720 条，格式 [u32条数][键u16][u16长+文本]×3；键=角色/怪物编号）。文本1=全名（"前缀　名称"全角空格分隔）、文本2=角色介绍、文本3=空。名称=全名末段拆分。
let 角色文本缓存 = null;
function 取角色文本() { return 角色文本缓存 ??= (() => {
    const 表 = new Map();
    let 位 = 4;
    const 条数 = 文本名字节[0] | (文本名字节[1] << 8) | (文本名字节[2] << 16) | (文本名字节[3] << 24);
    for (let i = 0; i < 条数 && 位 < 文本名字节.length; i++) {
        const 键 = 文本名字节[位] | (文本名字节[位 + 1] << 8); 位 += 2;
        const 文本 = [];
        for (let j = 0; j < 3; j++) {
            const 长 = 文本名字节[位] | (文本名字节[位 + 1] << 8); 位 += 2;
            文本.push(new TextDecoder('utf-8').decode(文本名字节.subarray(位, 位 + 长)));
            位 += 长;
        }
        const 全名 = 文本[0].replace(/[\s\u3000]+/g, ' ').trim();
        const 段落 = 文本[0].split(/[\s\u3000]+/).filter(Boolean);
        表.set(键, { 全名, 名称: 段落[段落.length - 1] ?? 全名, 介绍: 文本[1] });
    }
    return 表;
})(); }
export const 原包角色文本 = new Proxy({}, { get: (目标, 键) => { const 表 = 取角色文本(); const 值 = 表[键]; return typeof 值 === 'function' ? 值.bind(表) : 值; }, has: (目标, 键) => 键 in 取角色文本(), ownKeys: () => Reflect.ownKeys(取角色文本()), getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }) });

// 原包潜力：PotentialUp.bytes（TPotentialData 族）。组头=u32标+id u8+档数u32；档=lv u8+cost u32+6×节点12B（节点=kind u16+val u16+道具对×2；kind1=HP/2=ATK/3=PASSIVE技能，val=基点×100）。组id=潜力类型（1=ATTACK/2=BALANCE/3=DEFENCE，与 Character_C u8@49=potentialID 实证一致）；组4=6档混合（TS 未收录，模拟器不用）。36 档与潜力表逐档对照全对。
let 潜力缓存 = null;
function 取潜力() { return 潜力缓存 ??= (() => {
    let 位 = 0;
    const 组 = {};
    while (位 + 9 <= 潜力字节.length) {
        位 += 4;
        const id = 潜力字节[位]; 位 += 1;
        const 档数 = 潜力字节[位] | (潜力字节[位 + 1] << 8) | (潜力字节[位 + 2] << 16) | (潜力字节[位 + 3] << 24); 位 += 4;
        const 档 = [];
        let ok = true;
        for (let l = 0; l < 档数 && ok; l++) {
            if (位 + 77 > 潜力字节.length) { ok = false; break; }
            const lv = 潜力字节[位];
            const cost = 潜力字节[位 + 1] | (潜力字节[位 + 2] << 8) | (潜力字节[位 + 3] << 16) | (潜力字节[位 + 4] << 24);
            位 += 5;
            const 节 = [];
            for (let s = 0; s < 6; s++) {
                const kind = 潜力字节[位] | (潜力字节[位 + 1] << 8);
                const val = 潜力字节[位 + 2] | (潜力字节[位 + 3] << 8);
                节.push({ 属性: kind === 1 ? 'HP' : kind === 2 ? 'ATK' : 'PASSIVE', 数值: kind === 3 ? val : val / 100 });
                位 += 12;
            }
            档.push({ 等级: lv, 消耗: cost, 节点: 节 });
        }
        if (ok) 组[id] = 档;
    }
    return { ATTACK: (组[1] || []).map(g => g.节点), BALANCE: (组[2] || []).map(g => g.节点), DEFENCE: (组[3] || []).map(g => g.节点) };
})(); }
export const 原包潜力 = new Proxy({}, { get: (目标, 键) => { const 表 = 取潜力(); const 值 = 表[键]; return typeof 值 === 'function' ? 值.bind(表) : 值; }, has: (目标, 键) => 键 in 取潜力(), ownKeys: () => Reflect.ownKeys(取潜力()), getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }) });
