import 文件系统 from 'node:fs';
import 路径 from 'node:path';
import { createRequire as 创建加载器 } from 'node:module';
import { fileURLToPath as 文件地址转路径 } from 'node:url';
import { createHash as 创建摘要 } from 'node:crypto';

const 加载 = 创建加载器(import.meta.url);
const 解析器 = 加载(process.argv[2] || 'typescript');
const 转为简体 = 加载('opencc-js').Converter({ from: 'tw', to: 'cn' });
const 目录 = 路径.dirname(文件地址转路径(import.meta.url));
const 工作区 = 路径.resolve(目录, '../..');
const 来源目录 = 路径.join(工作区, 'TKFM-Data-Room/static/data/unit/general');
const 属性列表 = ['火', '水', '风', '光', '暗'];
const 职业列表 = ['攻击者', '治疗者', '守护者', '辅助者', '妨碍者'];

const 技能结构校核 = {
    '10043:LEADER:1:0': '使我方全体风属性角色最大HP增加35%\n使我方全体风属性角色获得「队伍中有5名风属性角色时，发动「被治疗时回复量增加25%丶攻击力增加100%」」\n第1回合时，触发「以机灵古怪赛露西亚攻击力40%使我方全体风属性角色攻击力增加(50回合)」\n使精灵王赛露西亚必杀技最大CD减少2回合\n使精灵王赛露西亚获得「必杀后，触发「使目标受到伤害增加20%(3回合)」」',
    '10045:LEADER:1:0': '使我方全体获得「队伍中至少有3名攻击者时，发动「攻击力增加30%」\n队伍中至少有3名火属性角色时，发动「攻击力增加40%」」',
    '10045:PASSIVE_1:1:0': '普攻时，触发「使自身必杀时，追加「以攻击力60.5%对目标进行追击」(7回合)」',
    '10045:PASSIVE_2:1:0': '每经过1回合，触发「使自身攻击力增加15%(最多6层)」\n必杀时，触发「使葫芦酒尽兴的攻击力增加状态减少2层」',
    '10056:LEADER:1:0': '使自身最大HP增加60%\n使自身必杀技最大CD减少1回合\n使自身获得「必杀时，触发「使结晶病赋予的受到伤害减少状态增加2层」」',
    '10060:LEADER:1:0': '我方全体最大HP增加35%\n我方全体获得「队伍中至少有(1/2/3)名攻击者时，各发动「攻击力增加(15/15/30)%」」\n我方全体获得「队伍中至少有1名守护者时，发动「普攻伤害增加40%丶必杀伤害增加20%」」',
    '10078:LEADER:1:0': '我方全体最大HP增加30%丶攻击力增加25%\n自身普攻伤害增加30%\n我方全体水属性队员获得《兽化》\n使我方全体获得「队伍中至少有4名水属性队员时，发动「《超危险兽化》」」\n使我方全体获得「队伍中至少有5名水属性队员时，发动「《超浓起司》」」\n\n《兽化》\n攻击时，触发「使目标被治疗时回复量减少20%(1回合)」\n普攻时，触发「使目标受到普攻伤害增加15%(最多5层)」\n普攻时，追加「以自身攻击力30%对目标造成伤害」\n\n《超危险兽化》\n普攻伤害增加50%\n攻击时，触发「使我方站位1的队员造成伤害增加5%(1回合)丶获得普攻时与必杀时，追加「以自身攻击力10%对目标造成伤害」(1回合)」\n\n《超浓起司》\n造成伤害增加30%\n攻击时，触发「使我方站位1的队员造成伤害增加10%(1回合)丶获得普攻时与必杀时，追加「以自身攻击力20%对目标造成伤害」(1回合)」',
    '10083:LEADER:1:0': '使我方全体攻击力增加30%\n自身必杀时，触发「《疯狂吸吮》」\n自身必杀时，触发「《也让我爽吧∼》」\n自身获得《爽到升天》\n\n《疯狂吸吮》\n使自身普攻时，追加「以自身攻击力50%进行追击3次」(2回合)\n《也让我爽吧∼》\n使自身以外的队员必杀时，触发「以自身攻击力50%使梦天堂店长咲野梦攻击力增加(2回合)」(1回合)\n《爽到升天》\n自身普攻时，触发「使自身攻击力增加10%(最多7层)」\n自身必杀时，触发「清除自身《爽到升天》赋予的攻击力增加状态」',
    '10198:PASSIVE_1:1:0': '自身以外我方全体获得「攻击时，触发「使我方【冷艳锋刃毛毛】获得1层《绯红蔷薇》(最多12层)」」\n自身《绯红蔷薇》≧4层时，开启「普攻伤害增加85%」\n自身《绯红蔷薇》≧8层时，开启「造成伤害增加30%」\n自身《绯红蔷薇》=12层时，开启「普攻时，追加「《蔷薇乱舞》」」\n\n《蔷薇乱舞》\n以自身攻击力30%对目标造成伤害4次\n使目标受到闇属性伤害增加37.5%(最多1层)\n清除自身《绯红蔷薇》的所有层数',
    '10206:LEADER:1:0': '我方全体最大HP增加55%\n我方全体攻击力增加51.5%\n自身获得「当我方队伍恰好为2种角色属性时，开启「每经过4回合时，触发「《温柔的自我》」」」\n自身获得「当我方队伍攻击者有2人以上时，开启「每经过4回合时，触发「《温柔的自我》」」」\n\n《温柔的自我》\n使我方全体造成伤害增加7.75%(最多4层)\n使我方全体必杀技伤害增加12.9%(最多4层)\n使我方全体受到伤害减少3.75%(最多4层)\n使我方全体获得「必杀时，追加「以自身攻击力51.5%对目标造成伤害」(4回合)」(触发1次后清除)\n使自身获得「必杀、防御时，触发「使目标受到风属性伤害增加7.75%(最多4层)丶受到伤害增加5.15%(最多4层)」(4回合)」(触发1次后清除)',
    '10207:LEADER:1:0': '我方全体最大HP增加55%\n我方全体攻击力增加88%\n自身获得「我方队伍水属性角色有5人以上时，开启「每经过4回合时，触发「《细心呵护♡》」」」\n我方全体攻击者、守护者、妨碍者获得「我方队伍水属性角色有5人以上时，开启「每经过4回合时，触发「《认真规划》」\n防御时，触发「使自身获得1层《绽放的新星✰》(最多3层)」」」\n\n《细心呵护♡》\n使目标受到伤害增加35.2%(1回合)\n使目标受到水属性伤害增加52.8%(1回合)\n使我方全体被治疗时回复量增加10%(最多2层)\n\n《认真规划》\n造成伤害增加52.8%(1回合)\n必杀技伤害增加88%(1回合)\n必杀时，追加「以自身攻击力176%对目标造成伤害」(1回合)',
};

function 数值指纹(文本) {
    return (文本.normalize('NFKC').replace(/时1发动/g, '时发动').match(/\d+(?:\.\d+)?/g) || []).map(Number).join(',');
}

function 属性(对象, 名称) {
    return 对象.properties.find(项 => 解析器.isPropertyAssignment(项) && 项.name.getText().replace(/["']/g, '') === 名称)?.initializer;
}

function 字面值(节点) {
    if (!节点) return null;
    if (解析器.isStringLiteral(节点) || 解析器.isNoSubstitutionTemplateLiteral(节点)) return 节点.text;
    if (解析器.isNumericLiteral(节点)) return Number(节点.text);
    if (解析器.isArrayLiteralExpression(节点)) return 节点.elements.map(字面值);
    if (节点.kind === 解析器.SyntaxKind.NullKeyword) return null;
    if (节点.kind === 解析器.SyntaxKind.TrueKeyword) return true;
    if (节点.kind === 解析器.SyntaxKind.FalseKeyword) return false;
    throw new Error(`不是可提取的数据字面量：${节点.getText().slice(0, 80)}`);
}

function 地区值(对象, 地区) {
    if (!对象 || !解析器.isObjectLiteralExpression(对象)) return null;
    const 项 = 对象.properties.find(项 => 解析器.isPropertyAssignment(项) && 项.name.getText() === `[Locale.${地区}]`);
    return 项 ? 字面值(项.initializer) : null;
}

function 提取中文技能(技能组, 编号, { 版本 = 1, 解放阶段 = 0 } = {}) {
    const 中文 = 技能组?.properties.find(项 => 解析器.isPropertyAssignment(项) && 项.name.getText() === '[Locale.sc]')?.initializer;
    if (!中文 || !解析器.isObjectLiteralExpression(中文)) throw new Error(`缺少中文技能：${编号}`);
    const 繁中 = 技能组.properties.find(项 => 解析器.isPropertyAssignment(项) && 项.name.getText() === '[Locale.tc]')?.initializer;
    return Object.fromEntries(中文.properties.filter(项 => 解析器.isPropertyAssignment(项)).map(项 => {
        const 对照 = 繁中?.properties.find(候选 => 候选.name.getText() === 项.name.getText())?.initializer;
        const 名称 = 字面值(属性(项.initializer, 'name'));
        const 说明 = 字面值(属性(项.initializer, 'description'));
        const 备用名称 = 对照 ? 转为简体(字面值(属性(对照, 'name')) || '') : '';
        const 备用说明 = 对照 ? 转为简体(字面值(属性(对照, 'description')) || '') : '';
        const 类型 = 项.name.getText().replace(/^\[SkillType\.|\]$/g, '');
        const 校核说明 = 技能结构校核[`${编号}:${类型}:${版本}:${解放阶段}`];
        if (校核说明 && 数值指纹(校核说明) !== 数值指纹(说明)) throw new Error(`结构校核改变了技能数值或源数据已更新：${编号} ${类型}`);
        return [类型, { 名称, 说明, ...(校核说明 ? { 校核说明, 校核依据: '原文结构逐段核对，所有数值顺序保持一致' } : {}), ...(备用说明 && (备用说明 !== 说明 || 备用名称 !== 名称) ? { 备用名称, 备用说明, 备用来源: '同源繁体技能说明，经OpenCC转换' } : {}) }];
    }));
}

function 找声明(源码, 名称) {
    let 结果;
    function 遍历(节点) {
        if (解析器.isVariableDeclaration(节点) && 节点.name.getText() === 名称) 结果 = 节点.initializer;
        if (!结果) 解析器.forEachChild(节点, 遍历);
    }
    遍历(源码);
    return 结果;
}

const 站点文件 = 路径.join(工作区, 'tenkaassist/js/characterJson.js');
const 站点源码 = 解析器.createSourceFile(站点文件, 文件系统.readFileSync(站点文件, 'utf8'), 解析器.ScriptTarget.Latest, true, 解析器.ScriptKind.JS);
const 数据声明 = 找声明(站点源码, 'chJSON');
const 数据数组 = 数据声明 && 属性(数据声明, 'data');
if (!数据数组 || !解析器.isArrayLiteralExpression(数据数组)) throw new Error('角色面板数据声明不存在');
const 面板表 = new Map(数据数组.elements.map(对象 => {
    const 读取 = 名称 => 字面值(属性(对象, 名称));
    return [读取('id'), { 生命上限: 读取('hp'), 攻击: 读取('atk'), 冷却: 读取('cd'), 属性: 属性列表[读取('element')], 职业: 职业列表[读取('role')], 别名: [读取('name'), 读取('fullname')] }];
}));

const 结果 = [];
const 技能资料 = [];
for (const 文件名 of 文件系统.readdirSync(来源目录).filter(名称 => /^SSR-\d+\.ts$/.test(名称)).sort()) {
    const 文件 = 路径.join(来源目录, 文件名);
    const 源码 = 解析器.createSourceFile(文件, 文件系统.readFileSync(文件, 'utf8'), 解析器.ScriptTarget.Latest, true, 解析器.ScriptKind.TS);
    const 声明 = 源码.statements.find(项 => 解析器.isVariableStatement(项));
    const 对象 = 声明?.declarationList.declarations[0]?.initializer;
    if (!对象 || !解析器.isObjectLiteralExpression(对象)) throw new Error(`缺少角色对象：${文件名}`);
    const 编号 = Number(字面值(属性(对象, 'ID')));
    const 名称表 = 属性(对象, 'name');
    const 前缀表 = 属性(对象, 'prefix');
    const 简称表 = 属性(对象, 'abbreviation');
    const 全名 = 地区 => `${地区值(前缀表, 地区) || ''} ${地区值(名称表, 地区) || ''}`.trim();
    const 面板 = 面板表.get(编号);
    const 初始生命 = 字面值(属性(对象, 'initHP'));
    const 初始攻击 = 字面值(属性(对象, 'initATK'));
    const 稀有度 = 属性(对象, 'rarity')?.getText().split('.').at(-1);
    if (稀有度 !== 'SSR') throw new Error(`仅支持 SSR 角色：${文件名}`);
    const 初始星等 = 3;
    const 成长 = Math.pow(1.1, 59);
    if (!Number.isSafeInteger(编号) || 编号 < 10000 || 编号 >= 20000) throw new Error(`非法真实角色编号：${文件名}`);
    const 别名 = new Set([String(编号), 文件名.slice(0, -3), 字面值(属性(对象, 'metaCode')), ...(面板?.别名 || [])]);
    for (const 地区 of ['sc', 'tc', 'en', 'jp', 'kr']) {
        别名.add(全名(地区));
        别名.add(地区值(名称表, 地区));
        for (const 简称 of 地区值(简称表, 地区) || []) 别名.add(简称);
    }
    const 属性值 = 属性(对象, 'element')?.getText().split('.').at(-1);
    const 职业值 = 属性(对象, 'position')?.getText().split('.').at(-1);
    const 游戏属性 = { FIRE: '火', WATER: '水', WIND: '风', LIGHT: '光', DARK: '暗' }[属性值];
    const 游戏职业 = { ATTACKER: '攻击者', HEALER: '治疗者', PROTECTOR: '守护者', SUPPORTER: '辅助者', OBSTRUCTER: '妨碍者', DEFENDER: '守护者', DEBUFFER: '妨碍者' }[职业值];
    if (!游戏属性 || !游戏职业) throw new Error(`未识别职业属性：${文件名} ${属性值} ${职业值}`);
    if (面板 && (面板.属性 !== 游戏属性 || 面板.职业 !== 游戏职业)) throw new Error(`两份资料职业属性不一致：${编号}`);
    结果.push({ 编号, 名称: 地区值(名称表, 'sc'), 全名: 全名('sc'), 资料: 文件名.slice(0, -3), 稀有度, 职业: 游戏职业, 属性: 游戏属性,
        生命上限: 面板?.生命上限 ?? (初始生命 ? Math.floor(初始生命 * 成长) : null), 攻击: 面板?.攻击 ?? (初始攻击 ? Math.floor(初始攻击 * 成长) : null), 冷却: 面板?.冷却 ?? null,
        初始生命, 初始攻击, 初始星等, 潜力类型: 属性(对象, 'potential')?.getText().split('.').at(-1), 参考等级: 60, 参考星等: 3, 面板来源: 面板?.生命上限 ? '参考角色表' : '资料站初始属性与等级星级公式',
        别名: [...别名].filter(项 => typeof 项 === 'string' && 项.trim()),
    });
    const 技能文件 = 路径.join(工作区, 'TKFM-Data-Room/static/data/unit/skillset', 文件名);
    if (!文件系统.existsSync(技能文件)) throw new Error(`缺少技能资料：${文件名}`);
    const 技能源码 = 解析器.createSourceFile(技能文件, 文件系统.readFileSync(技能文件, 'utf8'), 解析器.ScriptTarget.Latest, true, 解析器.ScriptKind.TS);
    const 技能声明 = 找声明(技能源码, `SkillSet_${编号}`);
    if (!技能声明 || !解析器.isArrayLiteralExpression(技能声明)) throw new Error(`无法读取技能版本：${编号}`);
    const 版本 = 技能声明.elements.map(对象 => {
        const 技能 = 提取中文技能(属性(对象, 'skill'), 编号, { 版本: 字面值(属性(对象, 'version')) });
        return { 版本: 字面值(属性(对象, 'version')), 截止日期: 字面值(属性(对象, 'lastDate')) || null, 备注: 地区值(属性(对象, 'remark'), 'sc') || '', 技能 };
    });
    const 当前版本 = [...版本].sort((甲, 乙) => Number(Boolean(甲.截止日期)) - Number(Boolean(乙.截止日期)) || 乙.版本 - 甲.版本)[0];
    const 标准必杀 = 当前版本?.技能.SKILL_5?.说明 || 当前版本?.技能.SKILL_S?.说明 || '';
    结果.at(-1).冷却 ??= Number(标准必杀.match(/CD\s*[:：]\s*(\d+)/i)?.[1]) || null;
    const 解放文件 = 路径.join(工作区, 'TKFM-Data-Room/static/data/unit/liberate', 文件名);
    const 解放 = [];
    if (文件系统.existsSync(解放文件)) {
        const 解放源码 = 解析器.createSourceFile(解放文件, 文件系统.readFileSync(解放文件, 'utf8'), 解析器.ScriptTarget.Latest, true, 解析器.ScriptKind.TS);
        const 解放声明 = 找声明(解放源码, `LiberateSkillSet_${编号}`);
        if (!解放声明 || !解析器.isArrayLiteralExpression(解放声明)) throw new Error(`无法读取解放阶段：${编号}`);
        for (const 对象 of 解放声明.elements) {
            const 详情 = 属性(对象, 'detail');
            const 阶段 = 详情.properties.map(项 => {
                const 阶段号 = Number(项.name.getText().match(/LIBERATION_(\d+)/)?.[1]);
                if (!阶段号) throw new Error(`无法识别解放阶段号：${编号}`);
                const 技能 = 提取中文技能(属性(项.initializer, 'skill'), 编号, { 版本: 字面值(属性(对象, 'version')), 解放阶段: 阶段号 });
                const 面板提升 = 技能.BASE_STAT?.说明.match(/HP与ATK.*?提升([\d.]+)%/);
                if (技能.BASE_STAT && !面板提升) throw new Error(`无法识别解放基础面板：${编号}`);
                return { 阶段: 阶段号, 面板加成: Number(面板提升?.[1] || 0) / 100, 技能 };
            }).sort((甲, 乙) => 甲.阶段 - 乙.阶段);
            解放.push({ 版本: 字面值(属性(对象, 'version')), 截止日期: 字面值(属性(对象, 'lastDate')) || null, 备注: 地区值(属性(对象, 'remark'), 'sc') || '', 阶段 });
        }
    }
    const 当前解放 = [...解放].sort((甲, 乙) => Number(Boolean(甲.截止日期)) - Number(Boolean(乙.截止日期)) || 乙.版本 - 甲.版本)[0];
    结果.at(-1).解放阶段 = 当前解放?.阶段.map(项 => 项.阶段) || [];
    结果.at(-1).解放面板加成 = Array.from({ length: Math.max(0, ...结果.at(-1).解放阶段) + 1 }, (_, 阶段) => (当前解放?.阶段 || []).filter(项 => 项.阶段 <= 阶段).reduce((和, 项) => 和 + 项.面板加成, 0));
    技能资料.push({ 编号, 版本, 解放 });
}
if (结果.length < 100 || new Set(结果.map(项 => 项.编号)).size !== 结果.length) throw new Error('真实目录数量或唯一性校验失败');
结果.sort((左, 右) => 左.编号 - 右.编号);
const 输出 = 路径.join(目录, '真实角色目录.json');
文件系统.writeFileSync(输出, JSON.stringify(结果, null, 2) + '\n', 'utf8');
技能资料.sort((左, 右) => 左.编号 - 右.编号);
for (const 角色 of 技能资料) 角色.资料指纹 = 创建摘要('sha256').update(JSON.stringify({ 版本: 角色.版本, 解放: 角色.解放 })).digest('hex');
文件系统.writeFileSync(路径.join(目录, '真实角色技能.json'), JSON.stringify(技能资料, null, 2) + '\n', 'utf8');
const 强化文件 = 路径.join(工作区, 'TKFM-Data-Room/static/data/unit/limitBreak.ts');
const 强化源码 = 解析器.createSourceFile(强化文件, 文件系统.readFileSync(强化文件, 'utf8'), 解析器.ScriptTarget.Latest, true, 解析器.ScriptKind.TS);
const 强化声明 = 找声明(强化源码, 'limitBreakSkills');
if (!强化声明 || !解析器.isArrayLiteralExpression(强化声明)) throw new Error('缺少ELv真实技能表');
const 强化技能 = 强化声明.elements.map(对象 => {
    const 技能对象 = 属性(对象, 'skill');
    const 中文 = 技能对象.properties.find(项 => 项.name.getText() === '[Locale.sc]')?.initializer;
    const 英文 = 技能对象.properties.find(项 => 项.name.getText() === '[Locale.en]')?.initializer;
    if (!中文) throw new Error('ELv缺少简体说明');
    const 编号 = 字面值(属性(对象, 'id'));
    const 说明 = 字面值(属性(中文, 'description'));
    const 职业代码 = 属性(对象, 'position')?.getText().split('.').at(-1);
    const 属性代码 = 属性(对象, 'element')?.getText().split('.').at(-1);
    const 校核说明 = 编号 === 40536 ? 说明.replace('受到普攻伤害7.5%', '受到普攻伤害增加7.5%') : null;
    if (校核说明 && 数值指纹(校核说明) !== 数值指纹(说明)) throw new Error('ELv校核改变数值');
    return { 编号, 分类: 字面值(属性(对象, 'group')), 职业: { ATTACKER: '攻击者', HEALER: '治疗者', PROTECTOR: '守护者', SUPPORTER: '辅助者', OBSTRUCTER: '妨碍者' }[职业代码] || null, 属性: { FIRE: '火', WATER: '水', WIND: '风', LIGHT: '光', DARK: '暗' }[属性代码] || null, 名称: 字面值(属性(中文, 'name')), 说明, 英文说明: 英文 ? 字面值(属性(英文, 'description')) : null, ...(校核说明 ? { 校核说明, 校核依据: '同源英文、日文与韩文明确为受到普攻伤害增加；原文缺动词' } : {}) };
});
if (强化技能.length !== 37 || new Set(强化技能.map(项 => 项.编号)).size !== 37 || 强化技能.some(项 => !项.名称 || !项.说明)) throw new Error('ELv技能数量、编号或说明不完整');
for (const 技能 of 强化技能) 技能.资料指纹 = 创建摘要('sha256').update(JSON.stringify(技能)).digest('hex');
文件系统.writeFileSync(路径.join(目录, '真实ELv技能.json'), JSON.stringify(强化技能, null, 2) + '\n', 'utf8');
const 养成来源 = ['TKFM-Data-Room/static/data/stat/level.ts', 'TKFM-Data-Room/static/data/stat/limitBreak.ts', 'TKFM-Data-Room/plugins/utils/components/StatCal/General.ts', 'TKFM-Data-Room/plugins/utils/components/StatCal/LimitBreak.ts', 'TKFM-Data-Room/static/data/stat/potential.ts', 'TKFM-Data-Room/plugins/utils/components/StatCal/Potential.ts'];
const 养成源码 = 养成来源.map(文件 => 解析器.createSourceFile(文件, 文件系统.readFileSync(路径.join(工作区, 文件), 'utf8'), 解析器.ScriptTarget.Latest, true, 解析器.ScriptKind.TS));
const 等级声明 = 找声明(养成源码[0], 'levels');
const 突破声明 = 找声明(养成源码[1], 'limitBreakLevels');
const 分类声明 = 找声明(养成源码[1], 'limitBreakGroups');
const 等级幂 = 找声明(养成源码[2], 'levelBuff');
if (![等级声明, 突破声明, 分类声明].every(项 => 项 && 解析器.isArrayLiteralExpression(项)) || !等级幂 || !解析器.isCallExpression(等级幂) || 等级幂.expression.getText() !== 'Math.pow') throw new Error('缺少普通等级或ELV养成资料');
const 指数 = 等级幂.arguments[1];
if (!解析器.isBinaryExpression(指数) || 指数.operatorToken.kind !== 解析器.SyntaxKind.MinusToken || !解析器.isPropertyAccessExpression(指数.left) || 指数.left.name.text !== 'level' || 字面值(指数.right) !== 1) throw new Error('普通等级成长公式发生变化，需要重新校核');
const 等级列表 = 等级声明.elements.map(项 => 字面值(属性(项, 'level')));
const 突破列表 = 突破声明.elements.map(项 => ({ 等级: 字面值(属性(项, 'elv')), 生命百分比: 字面值(属性(项, 'hpPercent')), 攻击百分比: 字面值(属性(项, 'atkPercent')) }));
if (等级列表.length !== 60 || 等级列表.some((级, 序) => 级 !== 序 + 1) || 突破列表.length !== 21 || 突破列表.some((项, 序) => 项.等级 !== 序 || ![项.生命百分比, 项.攻击百分比].every(值 => Number.isFinite(值) && 值 >= 0))) throw new Error('普通等级或ELV表不完整');
const 潜力声明 = 找声明(养成源码[4], 'potentials');
if (!潜力声明 || !解析器.isArrayLiteralExpression(潜力声明)) throw new Error('缺少潜力节点表');
const 角色潜力类型 = new Set(结果.map(项 => 项.潜力类型));
const 潜力 = Object.fromEntries(潜力声明.elements.filter(项 => 角色潜力类型.has(属性(项, 'type')?.getText().split('.').at(-1))).map(项 => {
    const 类型 = 属性(项, 'type').getText().split('.').at(-1);
    const 阶段 = 属性(项, 'detail').elements.map(阶 => 阶.elements.map(节点 => ({ 属性: 属性(节点, 'type').getText().split('.').at(-1), 数值: 字面值(属性(节点, 'value')) })));
    if (阶段.length !== 12 || 阶段.some(阶 => 阶.length !== 6 || 阶.some(节点 => !['HP', 'ATK', 'PASSIVE'].includes(节点.属性) || !Number.isFinite(节点.数值) || 节点.数值 < 0))) throw new Error(`潜力节点不完整：${类型}`);
    return [类型, 阶段];
}));
if (结果.some(项 => !潜力[项.潜力类型] || ![项.初始生命, 项.初始攻击].every(值 => Number.isFinite(值) && 值 > 0))) throw new Error('角色缺少真实初始属性或潜力类型');
const 养成资料 = {
    普通等级: { 最低: 等级列表[0], 最高: 等级列表.at(-1), 每级倍率: 字面值(等级幂.arguments[0]) },
    ELV突破: 突破列表,
    ELV技能解锁: Object.fromEntries(分类声明.elements.map(项 => [字面值(属性(项, 'key')), 字面值(属性(项, 'gate'))])),
    潜力,
    突破要求: { 普通等级: 60, 潜力: '5满或6以上' },
    来源: 养成来源,
    来源指纹: Object.fromEntries(养成来源.map(文件 => [文件, 创建摘要('sha256').update(文件系统.readFileSync(路径.join(工作区, 文件))).digest('hex')])),
};
文件系统.writeFileSync(路径.join(目录, '真实养成数据.json'), JSON.stringify(养成资料, null, 2) + '\n', 'utf8');
console.log(`SSR 角色目录：${结果.length}，面板完整：${结果.filter(项 => 项.生命上限 && 项.攻击 && 项.冷却).length}`);
console.log(`技能资料：${技能资料.length}，版本数：${技能资料.reduce((总, 项) => 总 + 项.版本.length, 0)}`);
console.log(`ELv真实技能：${强化技能.length}，按资料中的5／10／15／20级解锁分类，不推定账号已持有项目`);
console.log(`养成资料：普通等级${等级列表[0]}至${等级列表.at(-1)}，ELV0至${突破列表.at(-1).等级}`);