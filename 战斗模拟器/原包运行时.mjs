
// 原包关卡表：Stage_C.bytes（60B/记录，4B头+3601条）。u16@0=关卡编号、u16@17=编组编号、u8@19=等级、u8@20=星等（偏移与 生成角色目录.mjs 构建期用法同源；三关卡 15249/60155/60161 与旧 关卡配置 常量逐字段对照一致）。
let 关卡表缓存 = null;
function 取关卡表() { return 关卡表缓存 ??= (() => {
    const 表 = new Map();
    for (let o = 4; o + 60 <= 关卡字节.length; o += 60) {
        const 编号 = 关卡字节[o] | (关卡字节[o + 1] << 8);
        表.set(编号, { 编号, 编组编号: 关卡字节[o + 17] | (关卡字节[o + 18] << 8), 等级: 关卡字节[o + 19], 星等: 关卡字节[o + 20], 固定队编号: 关卡字节[o + 58] | (关卡字节[o + 59] << 8) });
    }
    return 表;
})(); }
export const 原包关卡表 = new Proxy({}, { get: (目标, 键) => { const 表 = 取关卡表(); const 值 = 表[键]; return typeof 值 === 'function' ? 值.bind(表) : 值; }, has: (目标, 键) => 键 in 取关卡表(), ownKeys: () => Reflect.ownKeys(取关卡表()), getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }) });

// 原包编组表：MonsterGroup.bytes（22B/记录，4B头+4636条）。u16@0=编组编号，@2起5个 TMonsterData{id,AI}（各4B：u16角色编号+u16 AI编号）。AI键绝不能用角色编号替代：试玩MonsterGroup16={49514,AI16}，AI16含普攻行，EnemyAI按49514查则误判无规则；43146={43248,43248}是角色与AI同号的普通组，训练组51017则是五对(49514,16)的布局铁证。
let 编组表缓存 = null;
function 取编组表() { return 编组表缓存 ??= (() => {
    const 表 = new Map();
    for (let o = 4; o + 22 <= 编组字节.length; o += 22) {
        const 编号 = 编组字节[o] | (编组字节[o + 1] << 8);
        const 敌人 = [];
        for (let i = 0; i < 5; i++) {
            const 角色 = 编组字节[o + 2 + i * 4] | (编组字节[o + 3 + i * 4] << 8);
            const AI = 编组字节[o + 4 + i * 4] | (编组字节[o + 5 + i * 4] << 8);
            if (角色) 敌人.push({ 编号: 角色, AI编号: AI });
        }
        表.set(编号, 敌人);
    }
    return 表;
})(); }
export const 原包编组表 = new Proxy({}, { get: (目标, 键) => { const 表 = 取编组表(); const 值 = 表[键]; return typeof 值 === 'function' ? 值.bind(表) : 值; }, has: (目标, 键) => 键 in 取编组表(), ownKeys: () => Reflect.ownKeys(取编组表()), getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }) });
// 原包战斗编组表：Battle_C.bytes 含索引区与TBattleData条目区，不能把前部24B目录项当战斗记录。TBattleData 官方字段={battleId,pointMonster,monsterGroup}（元数据）；LoadBattleData(idx1337,VA=0x25baad0) 每条先读 pointMonster 数，读 battleId 与 pointMonster[5]，再读 monsterGroup 数及编组引用列表。单点怪单波的完整条目为28B：[u32点怪数][u16×5点怪数组元数据/容量][u16 battleId][u16×5 pointMonster][u32组数][u16×组数 monsterGroup]；首条点怪数组元数据为 10B，后续条目从 battleId 起读位置可见。条目区扫描按上述字段作合法性校验（点怪1..5、角色0或10000..65000、组数1..5），共识别858条，51043@49766→pointMonster=[49514]、monsterGroup=[16]，与 MonsterGroup16={49514,AI16} 完全闭环。
let 战斗表缓存 = null;
function 取战斗表() { return 战斗表缓存 ??= (() => {
    const 表 = new Map();
    const 读16 = 偏 => 战斗字节[偏] | (战斗字节[偏 + 1] << 8);
    const 读32 = 偏 => (战斗字节[偏] | (战斗字节[偏 + 1] << 8) | (战斗字节[偏 + 2] << 16) | (战斗字节[偏 + 3] << 24)) >>> 0;
    for (let o = 0; o + 28 <= 战斗字节.length; o += 2) {
        const 点数 = 读32(o);
        if (点数 < 1 || 点数 > 5) continue;
        const 编号 = 读16(o + 10), 点怪 = Array.from({ length: 5 }, (_, k) => 读16(o + 12 + k * 2)).filter(Boolean);
        if (编号 < 1 || 编号 > 65000 || 点怪.some(编号 => 编号 < 10000 || 编号 > 65000)) continue;
        const 组数 = 读32(o + 22);
        if (组数 < 1 || 组数 > 5 || o + 26 + 组数 * 2 > 战斗字节.length) continue;
        const 编组 = Array.from({ length: 组数 }, (_, k) => 读16(o + 26 + k * 2));
        if (编组.some(编号 => 编号 < 1 || 编号 > 65000)) continue;
        表.set(编号, { 编号, 点怪, 编组, 记录偏移: o });
    }
    return 表;
})(); }
export const 原包战斗表 = new Proxy({}, { get: (目标, 键) => { const 表 = 取战斗表(); const 值 = 表[键]; return typeof 值 === 'function' ? 值.bind(表) : 值; }, has: (目标, 键) => 键 in 取战斗表(), ownKeys: () => Reflect.ownKeys(取战斗表()), getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }) });

// 原包固定队表：AssignParty_C.bytes=TStageTeamData，[u32条数97][24B行]；u16@0=teamID、u16×5@2=队伍角色编号、u8@12=普通等级/@13=星级/@14=羁绊/@15=潜力等级/@16=调教/@17=exceed/@18=ELV突破等级、u8×5@19=order。ToPlayerChar(idx2809,VA=0x28f190c)按team数组顺序构造TPlayerChar，未读取order；每个ELV突破档循环0..limitBreak并添加该档解锁技能，故固定队ELV列表按角色职业/属性各类在对应解锁档生成，0号空变体不加入。
let 固定队表缓存 = null;
function 取固定队表() { return 固定队表缓存 ??= (() => {
    const 表 = new Map();
    const 条数 = 固定队字节[0] | (固定队字节[1] << 8) | (固定队字节[2] << 16) | (固定队字节[3] << 24);
    if (固定队字节.length !== 4 + 条数 * 24) throw new Error('AssignParty_C记录边界不正确');
    for (let i = 0; i < 条数; i++) {
        const o = 4 + i * 24, 编号 = 固定队字节[o] | (固定队字节[o + 1] << 8);
        表.set(编号, { 编号, 队伍: Array.from({ length: 5 }, (_, k) => 固定队字节[o + 2 + k * 2] | (固定队字节[o + 3 + k * 2] << 8)).filter(Boolean), 普通等级: 固定队字节[o + 12], 星级: 固定队字节[o + 13], 羁绊: 固定队字节[o + 14], 潜力等级: 固定队字节[o + 15], 调教: 固定队字节[o + 16], 解放: 固定队字节[o + 17], ELV突破等级: 固定队字节[o + 18], order: Array.from({ length: 5 }, (_, k) => 固定队字节[o + 19 + k]) });
    }
    return 表;
})(); }
export const 原包固定队表 = new Proxy({}, { get: (目标, 键) => { const 表 = 取固定队表(); const 值 = 表[键]; return typeof 值 === 'function' ? 值.bind(表) : 值; }, has: (目标, 键) => 键 in 取固定队表(), ownKeys: () => Reflect.ownKeys(取固定队表()), getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }) });

// 原包多队表：MultiteamStage_C.bytes（24B/记录，4B头+18条）。u16@0=活动编号、u16@2=多队编号、@4起5×u16关卡槽（去0得关卡序列），字段序与元数据 TMultiStageData（eventID/multiID/stageID/completeReward）一致。时之裂缝SP四场分组铁证：活动9027多队15209=[15234,15239,15244,15249]（StageStr 四名皆'时-SP/凯萨考验之刻'），15249=第4场；上季活动9026多队15109=[15129,15134,15139,15144] 同构。UI_TimeCrackStageInfo.mMultiId/ClickedLeft/ClickedRight 即消费此分组。
let 多队表缓存 = null;
function 取多队表() { return 多队表缓存 ??= (() => {
    const 表 = new Map();
    for (let o = 4; o + 24 <= 多队字节.length; o += 24) {
        const 活动编号 = 多队字节[o] | (多队字节[o + 1] << 8);
        const 多队编号 = 多队字节[o + 2] | (多队字节[o + 3] << 8);
        const 关卡序列 = [];
        for (let i = 0; i < 5; i++) {
            const 关 = 多队字节[o + 4 + i * 2] | (多队字节[o + 5 + i * 2] << 8);
            if (关) 关卡序列.push(关);
        }
        关卡序列.forEach((关, 序) => 表.set(关, { 活动编号, 多队编号, 场次: 序 + 1, 总场次: 关卡序列.length, 关卡序列 }));
    }
    return 表;
})(); }
export const 原包多队表 = new Proxy({}, { get: (目标, 键) => { const 表 = 取多队表(); const 值 = 表[键]; return typeof 值 === 'function' ? 值.bind(表) : 值; }, has: (目标, 键) => 键 in 取多队表(), ownKeys: () => Reflect.ownKeys(取多队表()), getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }) });
// 原包运行时.mjs —— 浏览器端加载原包二进制表并解析为原包机制结构；Node 环境自动回退 node:fs 读取，供优化器等工具在无浏览器时复用同一份数据链路。
import { 解析原包机制, 敌方组推导, 关卡编号组 } from './原包数据.mjs';
export { 关卡编号组 };

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

const [技能字节, 技能组字节, 技能文本字节, 角色字节, 解放字节, 文本名字节, 潜力字节, 关卡字节, 编组字节, 关卡名字节, 多队字节, 固定队字节, 战斗字节] = await Promise.all([
    读取原包文件('Skill_C.bytes'),
    读取原包文件('SkillGroup.bytes'),
    读取原包文件('SkillStr_sc.bytes'),
    读取原包文件('Character_C.bytes'),
    读取原包文件('LimitBreak.bytes'),
    读取原包文件('CharacterStr_sc.bytes'),
    读取原包文件('PotentialUp.bytes'),
    读取原包文件('Stage_C.bytes'),
    读取原包文件('MonsterGroup.bytes'),
    读取原包文件('StageStr_sc.bytes'),
    读取原包文件('MultiteamStage_C.bytes'),
    读取原包文件('AssignParty_C.bytes'),
    读取原包文件('Battle_C.bytes'),
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
    const 按lv = new Map(), 角色技能 = new Map();
    // TLimitBreakData.id 与 Character_C.limitBreakID（u8@50）关联。id 是 u8、且85个合法块均只出现一次；块内 TLimitBreakLvData=lv u8 + skills(kind u8+val u32)×N，kind3即解锁技能。ToPlayerChar 只取该角色limitBreakID对应的块逐档加入，不能按职业/属性把同类的两个变体都塞给固定队。
    for (const id of new Set(Array.from({ length: 256 }, (_, 序) => 序))) {
        const 位 = 解放字节.indexOf(id, 4);
        if (位 < 4 || 位 + 800 > 解放字节.length) continue;
        const 技能 = [];
        for (let o = 位; o + 6 <= Math.min(解放字节.length, 位 + 800); o++) {
            const lv = 解放字节[o], kind = 解放字节[o + 1], val = 解放字节[o + 2] | (解放字节[o + 3] << 8) | (解放字节[o + 4] << 16) | (解放字节[o + 5] << 24);
            if (![5, 10, 15, 20].includes(lv) || kind !== 3 || val < 40501 || val > 40537) continue;
            技能.push({ lv, 编号: val });
        }
        if (技能.length === 4) 角色技能.set(id, 技能);
    }
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
            switch (k) {
                case 3: { const 类 = v <= 40510 ? "profession1" : v <= 40512 ? "common" : v <= 40522 ? "element" : "profession2"; (解锁计数[类] = 解锁计数[类] || {})[lv] = (解锁计数[类][lv] || 0) + 1; break; }
                case 2: 生 += v / 100; break;
                case 1: 攻 += v / 100; break;
            }
        }
        突破档位.push({ 等级: lv, 生命百分比: Math.round(生 * 100) / 100, 攻击百分比: Math.round(攻 * 100) / 100 });
    }
    // 门槛=众数 lv（85 块（职业×变体）真模式计数；假阳性散落各 lv 计数低）。
    const 解锁 = {};
    for (const [类, 计] of Object.entries(解锁计数)) 解锁[类] = Number(Object.entries(计).sort((a, b) => b[1] - a[1])[0][0]);
    return { 突破档位, 技能解锁: 解锁, 角色技能 };
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
        表.set(编号, { 编号, 稀有度: 角色字节[o + 7], 属性: 角色字节[o + 8], 职业: 角色字节[o + 9], 基础生命: 读32(10) >>> 0, 基础攻击: (读32(18) >>> 0) || (读32(22) >>> 0), 技能组编号: 编号 * 10 + 1, 潜力类型码: 角色字节[o + 49], 突破类型码: 角色字节[o + 50], 登场角色: 角色字节[o + 2] | (角色字节[o + 3] << 8), 记录偏移: o });
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
// 惰性解析：解析原包机制 依赖敌方行动规则（敌方规则），而敌方行动规则依赖本模块读取原包文件→循环 import；模块体立即解析会触发 TDZ 错误。推迟到首次属性访问（运行时，全部模块已就绪）再解析，Proxy 保持 原包机制.技能 等访问形式不变。
let 解析缓存 = null;
function 取解析() { return 解析缓存 ??= 解析原包机制({ 技能字节, 技能组字节, 文本表, 敌方组: 敌方组推导(关卡字节, 编组字节) }); }
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
                // 节点属性直接用原包 kind 码（1=HP/2=ATK/3=PASSIVE，与 枚举.潜力生命/潜力攻击/潜力被动 同码）；基点保留原始 u16（百分比×100）供养成按整数累加，避免 3.5/2.75 等半分点浮点求和后再取整丢精度。
                节.push({ 属性: kind, 数值: kind === 3 ? val : val / 100, 基点: val });
                位 += 12;
            }
            档.push({ 等级: lv, 消耗: cost, 节点: 节 });
        }
        if (ok) 组[id] = 档;
    }
    return { 1: (组[1] || []).map(g => g.节点), 2: (组[2] || []).map(g => g.节点), 3: (组[3] || []).map(g => g.节点) };
})(); }
export const 原包潜力 = new Proxy({}, { get: (目标, 键) => { const 表 = 取潜力(); const 值 = 表[键]; return typeof 值 === 'function' ? 值.bind(表) : 值; }, has: (目标, 键) => 键 in 取潜力(), ownKeys: () => Reflect.ownKeys(取潜力()), getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }) });

// 原包关卡文本：StageStr_sc.bytes（[u32条数][键u16][u16长+文本]×2，4850 条整文件解完）。键=关卡编号；文本[0]=简称/分类（'无'/'活动'/'时-SP'/'塔-55'…）、文本[1]=关卡名称（'凯萨考验之刻'/'夏日尾声'…）。魔狱塔 vs 时之裂缝 由简称前缀（'塔'/'时'）区分。
let 关卡文本缓存 = null;
function 取关卡文本() { return 关卡文本缓存 ??= (() => {
    const 表 = new Map();
    let 位 = 4;
    const 条数 = 关卡名字节[0] | (关卡名字节[1] << 8) | (关卡名字节[2] << 16) | (关卡名字节[3] << 24);
    for (let i = 0; i < 条数 && 位 < 关卡名字节.length; i++) {
        const 键 = 关卡名字节[位] | (关卡名字节[位 + 1] << 8); 位 += 2;
        const 文本 = [];
        for (let j = 0; j < 2; j++) {
            const 长 = 关卡名字节[位] | (关卡名字节[位 + 1] << 8); 位 += 2;
            文本.push(new TextDecoder('utf-8').decode(关卡名字节.subarray(位, 位 + 长)));
            位 += 长;
        }
        表.set(键, { 简称: 文本[0], 名称: 文本[1] });
    }
    return 表;
})(); }
export const 原包关卡文本 = new Proxy({}, { get: (目标, 键) => { const 表 = 取关卡文本(); const 值 = 表[键]; return typeof 值 === 'function' ? 值.bind(表) : 值; }, has: (目标, 键) => 键 in 取关卡文本(), ownKeys: () => Reflect.ownKeys(取关卡文本()), getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }) });
