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

const [技能字节, 技能组字节, 文本表] = await Promise.all([
    读取原包文件('Skill_C.bytes'),
    读取原包文件('SkillGroup.bytes'),
    读取原包文件('技能说明.json', true),
]);
// 惰性解析：解析原包机制 依赖关卡数据（夏日行动等），而关卡数据又依赖角色数据→本模块形成循环 import；模块体立即解析会在关卡数据初始化前触发 TDZ 错误。推迟到首次属性访问（运行时，全部模块已就绪）再解析，Proxy 保持 原包机制.技能 等访问形式不变。
let 解析缓存 = null;
function 取解析() { return 解析缓存 ??= 解析原包机制({ 技能字节, 技能组字节, 文本表 }); }
export const 原包机制 = new Proxy({}, {
    get: (目标, 键) => 取解析()[键],
    has: (目标, 键) => 键 in 取解析(),
    ownKeys: () => Reflect.ownKeys(取解析()),
    getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }),
});
