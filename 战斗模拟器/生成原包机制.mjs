import 文件系统 from 'node:fs';
import 路径 from 'node:path';
import { createHash as 创建摘要 } from 'node:crypto';
import { fileURLToPath as 文件地址转路径 } from 'node:url';
import { 解析原包机制 } from './原包数据.mjs';

const 目录 = 路径.dirname(文件地址转路径(import.meta.url));
const 工作区 = 路径.resolve(目录, '../..');
const 原包目录 = 路径.join(工作区, '原包分析');
const 技能字节 = 文件系统.readFileSync(路径.join(原包目录, '当前配置/maindata/Skill_C.bytes'));
const 技能组字节 = 文件系统.readFileSync(路径.join(原包目录, '当前配置/maindata/SkillGroup.bytes'));
const 文本字节 = 文件系统.readFileSync(路径.join(原包目录, '语言包/技能说明.json'));
const 文本表 = JSON.parse(文本字节.toString('utf8'));

// 翻译与校核逻辑收敛在 原包数据.mjs（与前端运行时共用同一份，杜绝双实现漂移）；本脚本只负责读原始表、解析、写参照 JSON 供回归对照。
const 解析 = 解析原包机制({ 技能字节, 技能组字节, 文本表 });
const 结果 = {
    类型: '原包机制直译', 版本: 1,
    来源: { Skill_C: { SHA256: 创建摘要('sha256').update(技能字节).digest('hex'), 文件字节: 技能字节.length }, SkillGroup: { SHA256: 创建摘要('sha256').update(技能组字节).digest('hex') }, 技能说明: { SHA256: 创建摘要('sha256').update(文本字节).digest('hex') } },
    说明: '数值、目标、职业、触发与子技能来自Skill_C原始字段；文本仅用于名称和人工核对，不用作文本倍率来源。未支持效果保留原始字段并显式列出。',
    ...解析,
};
文件系统.writeFileSync('D:/天下布魔/原包分析/原包关卡机制快照.json', JSON.stringify(结果, null, 2) + '\n', 'utf8');
console.log(`原包机制翻译完成：${Object.keys(解析.技能).length}条技能；颠倒镜${解析.校核.颠倒镜记录数}条全部有字段映射；SP61五个伤害/增益/控制锚点通过；全量未映射效果${解析.校核.未支持.length}条已显式保留。`);
