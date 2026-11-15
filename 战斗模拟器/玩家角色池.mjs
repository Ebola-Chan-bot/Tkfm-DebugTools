import { 真实角色目录, 创建角色, 校验文件编队, 提取角色养成, 获取真实角色 } from './角色数据.mjs';

export function 校验角色池(角色) {
    if (!Array.isArray(角色) || 角色.length > 真实角色目录.length) throw new Error('角色池文件中的角色列表无效');
    const 编号 = new Set();
    return 角色.map(单位 => {
        const 养成 = 提取角色养成(单位);
        if (编号.has(养成.编号)) throw new Error('角色池中不能重复添加同一角色');
        编号.add(养成.编号);
        return 养成;
    });
}

export function 更新池角色(角色池, 单位) {
    const 角色 = 提取角色养成(单位);
    const 位置 = 角色池.findIndex(项 => 项.编号 === 角色.编号);
    if (位置 < 0 && 角色池.length >= 真实角色目录.length) throw new Error('角色池已达到可添加角色上限');
    return 位置 < 0 ? [...角色池, 角色] : 角色池.map((项, 序) => 序 === 位置 ? 角色 : 项);
}

export function 删除池角色(角色池, 编号, 引用 = []) {
    if (引用.includes(编号)) throw new Error('此角色正在编队中，请先从编队移除或替换');
    if (!角色池.some(项 => 项.编号 === 编号)) throw new Error('角色池中没有此角色');
    return 角色池.filter(项 => 项.编号 !== 编号).map(项 => structuredClone(项));
}

export function 校验编队引用(引用, 角色池, 允许空 = false) {
    if (!Array.isArray(引用) || 引用.length < (允许空 ? 0 : 1) || 引用.length > 5 || 引用.some(编号 => !Number.isSafeInteger(编号))) throw new Error('编队须引用角色池中的1至5位角色');
    if (new Set(引用).size !== 引用.length) throw new Error('编队不能重复选择同一角色');
    const 已有 = new Set(角色池.map(项 => 项.编号));
    if (引用.some(编号 => !已有.has(编号))) throw new Error('编队引用的角色不在角色池中，请先添加该角色');
    return [...引用];
}

export function 解析角色引用(引用, 角色池) {
    const 编号 = 校验编队引用(引用, 角色池);
    return 校验文件编队(编号.map(编号 => 角色池.find(项 => 项.编号 === 编号)));
}

export function 生成角色池文件(角色池) {
    return { 类型: 'TKFM角色池', 版本: 1, 角色: 校验角色池(角色池) };
}

export function 解析角色池文件(内容) {
    let 文件;
    try { 文件 = JSON.parse(内容); }
    catch { throw new Error('无法读取角色池文件'); }
    if (!文件 || 文件.类型 !== 'TKFM角色池' || 文件.版本 !== 1) throw new Error('请选择导出的角色池文件');
    return 校验角色池(文件.角色);
}

export function 合并角色池(原角色池, 导入角色) {
    const 合并 = new Map(校验角色池(原角色池).map(项 => [项.编号, 项]));
    for (const 角色 of 校验角色池(导入角色)) 合并.set(角色.编号, 角色);
    return [...合并.values()];
}

const Have字母表 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_!';

function Have转十进制(代码) {
    let 数值 = 0n;
    for (const 字符 of 代码) {
        const 位置 = Have字母表.indexOf(字符);
        if (位置 < 0) throw new Error(`have代码包含非法字符：${字符}`);
        数值 = 数值 * 64n + BigInt(位置);
    }
    return 数值.toString();
}

export function 解析Have角色代码(内容) {
    if (typeof 内容 !== 'string' || !内容.trim()) throw new Error('请粘贴从tenkaassist的have模块复制的代码');
    const 分段 = 内容.replaceAll(/\s/g, '').split(':');
    if (分段.length !== 2 || !分段[0] || !分段[1]) throw new Error('have代码须包含队员段和羁绊段，并以冒号分隔');
    const 编号段 = Have转十进制(分段[0]);
    if (编号段.length < 5) throw new Error('have代码的队员段过短');
    const 编号文本 = 编号段.slice(2);
    if (编号文本.length % 3 !== 0) throw new Error('have代码的队员段长度无效');
    const 羁绊文本 = Have转十进制(分段[1]);
    const 角色 = Array.from({ length: 编号文本.length / 3 }, (_, 序) => ({ 编号: Number(编号文本.slice(序 * 3, 序 * 3 + 3)) + 10000, 羁绊: Number(羁绊文本[序]) }));
    if (!角色.length || 角色.length !== 羁绊文本.length || 角色.some(项 => !Number.isInteger(项.羁绊) || 项.羁绊 < 1 || 项.羁绊 > 5)) throw new Error('have代码中的角色数量与羁绊不匹配');
    if (new Set(角色.map(项 => 项.编号)).size !== 角色.length) throw new Error('have代码包含重复角色');
    for (const 项 of 角色) 创建角色(项.编号);
    return 角色;
}

export function 合并Have角色(原角色池, 导入角色) {
    const 原池 = 校验角色池(原角色池);
    const 合并 = new Map(原池.map(项 => [项.编号, 项]));
    let 新增 = 0;
    for (const 导入 of 导入角色) {
        const 已有 = 合并.get(导入.编号);
        const 档案 = 获取真实角色(导入.编号);
        const 默认值 = 提取角色养成({ 编号: 导入.编号, 羁绊: 导入.羁绊, 星级: 5, 调教: 3, 普通等级: 60, ELV突破等级: 20, 潜力等级: 12, 潜力节点: Array(6).fill(true), 解放: 档案.编号 === 10006 ? Math.max(0, ...档案.解放阶段) : 0, ELv技能: [] });
        合并.set(导入.编号, 已有 ? { ...默认值, ...已有, 羁绊: 导入.羁绊 } : 默认值);
        if (!已有) 新增++;
    }
    return { 角色池: [...合并.values()], 新增, 更新: 导入角色.length - 新增 };
}

export function 生成引用编队文件(引用, 角色池) {
    return { 类型: 'TKFM编队', 版本: 2, 角色引用: 校验编队引用(引用, 角色池) };
}

export function 解析引用编队文件(内容, 角色池) {
    let 文件;
    try { 文件 = JSON.parse(内容); }
    catch { throw new Error('无法读取编队文件'); }
    if (!文件 || 文件.类型 !== 'TKFM编队' || 文件.版本 !== 2) throw new Error('请选择只包含角色池引用的编队文件');
    return 校验编队引用(文件.角色引用, 角色池);
}

export function 新建池角色(输入) {
    return 提取角色养成(创建角色(输入));
}