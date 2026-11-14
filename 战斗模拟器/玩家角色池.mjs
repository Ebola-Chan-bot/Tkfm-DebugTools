import { 真实角色目录, 创建角色, 校验文件编队, 提取角色养成 } from './角色数据.mjs';

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