// 原包运行时.mjs —— 浏览器端加载原包二进制表并解析为原包机制结构；Node 环境自动回退 node:fs 读取，供优化器等工具在无浏览器时复用同一份数据链路。
import { 解析原包机制 } from './原包数据.mjs';

async function 读取原包文件(文件名, 转文本 = false) {
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

const [技能字节, 技能组字节, 文本表, 角色字节] = await Promise.all([
    读取原包文件('Skill_C.bytes'),
    读取原包文件('SkillGroup.bytes'),
    读取原包文件('技能说明.json', true),
    读取原包文件('Character_C.bytes'),
]);
// 原包文本：语言包技能说明（SkillStr 文本池）编号→[名称,说明]。ELv技能（405xx）等未入技能字典的孤岛记录从这里取显示文本。
export const 原包文本 = new Map(文本表.map(项 => [项.编号, 项.文本]));
// 原包角色表：Character_C.bytes 55B/记录（4B头+3088条）。u8@7=稀有度(3=SSR)、u8@8=属性码(1火2水3风4光5暗)、u8@9=职业码(1攻2守3治4辅5妨——188角色全对照一致)、u32@10=基础生命、基础攻击=u32@18(玩家)或u32@22(部分怪物)取非零、技能组编号=编号×10+1(计算，SkillGroup 组ID规律已证)。
const 属性码表 = ['无', '火', '水', '风', '光', '暗'];
const 职业码表 = ['无', '攻击者', '守护者', '治疗者', '辅助者', '妨碍者'];
// 惰性解析（同 原包机制 Proxy 模式）：循环 import 下顶层常量会 TDZ，推迟到首次访问再建表。
let 角色表缓存 = null;
function 取角色表() { return 角色表缓存 ??= (() => {
    const 表 = new Map();
    for (let o = 4; o + 55 <= 角色字节.length; o += 55) {
        const 编号 = 角色字节[o] | (角色字节[o + 1] << 8);
        const 读32 = 偏 => 角色字节[o + 偏] | (角色字节[o + 偏 + 1] << 8) | (角色字节[o + 偏 + 2] << 16) | (角色字节[o + 偏 + 3] << 24);
        表.set(编号, { 编号, 稀有度: 角色字节[o + 7], 属性: 属性码表[角色字节[o + 8]] ?? '无', 职业: 职业码表[角色字节[o + 9]] ?? '无', 基础生命: 读32(10) >>> 0, 基础攻击: (读32(18) >>> 0) || (读32(22) >>> 0), 技能组编号: 编号 * 10 + 1, 记录偏移: o });
    }
    return 表;
})(); }
export const 原包角色表 = new Proxy({}, {
    get: (目标, 键) => { const 表 = 取角色表(); const 值 = 表[键]; return typeof 值 === 'function' ? 值.bind(表) : 值; },
    has: (目标, 键) => 键 in 取角色表(),
    ownKeys: () => Reflect.ownKeys(取角色表()),
    getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }),
});
// 惰性解析：解析原包机制 依赖关卡数据（夏日行动等），而关卡数据又依赖角色数据→本模块形成循环 import；模块体立即解析会在关卡数据初始化前触发 TDZ 错误。推迟到首次属性访问（运行时，全部模块已就绪）再解析，Proxy 保持 原包机制.技能 等访问形式不变。
let 解析缓存 = null;
function 取解析() { return 解析缓存 ??= 解析原包机制({ 技能字节, 技能组字节, 文本表 }); }
export const 原包机制 = new Proxy({}, {
    get: (目标, 键) => 取解析()[键],
    has: (目标, 键) => 键 in 取解析(),
    ownKeys: () => Reflect.ownKeys(取解析()),
    getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }),
});
