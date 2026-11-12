import 文件系统 from 'node:fs';
import 路径 from 'node:path';
import { fileURLToPath as 文件地址转路径 } from 'node:url';

export function 解析敌方行动(数据) {
    const 数量 = 数据.readUInt32LE(0);
    if (数据.length !== 4 + 数量 * 703) throw new Error('EnemyAI 记录边界不匹配');
    const 结果 = [];
    for (let 序号 = 0; 序号 < 数量; 序号++) {
        const 偏移 = 4 + 序号 * 703;
        const 记录 = 数据.subarray(偏移, 偏移 + 703);
        const 规则 = [];
        for (let 槽位 = 0; 槽位 < 20; 槽位++) {
            const 字节 = 记录.subarray(3 + 槽位 * 35, 38 + 槽位 * 35);
            const 动作码 = 字节.readUInt16LE(0);
            const 技能编号 = 字节.readUInt32LE(2);
            if (!动作码 && !技能编号) continue;
            const 条件 = 条件偏移 => ({ 编号: 字节.readUInt16LE(条件偏移), 参数一: 字节.readInt32LE(条件偏移 + 2), 参数二: 字节.readInt32LE(条件偏移 + 6) });
            规则.push({
                槽位, 文件偏移: 偏移 + 3 + 槽位 * 35, 动作码, 技能编号,
                附加编号: 字节.readUInt16LE(6), 行为标志: 字节.readUInt16LE(8), 触发模式: 字节.readUInt16LE(10),
                条件: [条件(12), 条件(22)], 条件连接: 字节.readUInt8(32), 选敌码: 字节.readUInt8(33), 目标码: 字节.readInt8(34),
                原始字节: 字节.toString('hex'),
            });
        }
        结果.push({ 单位编号: 记录.readUInt16LE(0), 头标志: 记录.readUInt8(2), 文件偏移: 偏移, 规则 });
    }
    if (new Set(结果.map(项 => 项.单位编号)).size !== 数量) throw new Error('EnemyAI 单位编号不唯一');
    return 结果;
}

const 当前文件 = 文件地址转路径(import.meta.url);
if (process.argv[1] && 路径.resolve(process.argv[1]) === 当前文件) {
    const 数据目录 = 路径.resolve(路径.dirname(当前文件), '../../原包分析/当前配置/maindata');
    const 单位编号 = process.argv.slice(2).map(Number);
    const 结果 = 解析敌方行动(文件系统.readFileSync(路径.join(数据目录, 'EnemyAI.bytes')));
    console.log(JSON.stringify(单位编号.length ? 结果.filter(项 => 单位编号.includes(项.单位编号)) : 结果, null, 2));
}