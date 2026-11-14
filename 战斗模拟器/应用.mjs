import { 新建战斗, 结算操作, 重放战斗, 当前攻击, 当前护盾, 加成, 可选敌人, 预览敌方行动 } from './战斗引擎.mjs';
import { 真实角色目录, 获取真实角色, 获取真实技能, 创建角色, 职业列表, 属性列表, 调教加成, 普通等级范围, ELV突破档位, ELV技能解锁等级, 获取潜力养成, 计算调教面板, 技能模型规则, 获取适用ELv技能, 提取角色养成 } from './角色数据.mjs';
import { 更新池角色, 删除池角色, 校验编队引用, 解析角色引用, 生成角色池文件, 解析角色池文件, 合并角色池, 生成引用编队文件, 解析引用编队文件, 新建池角色 } from './玩家角色池.mjs';
import { 当前关卡, 创建关卡配置, 敌方技能目录, 敌方技能名称, 是旧夏日默认面板, 修正夏日默认面板 } from './关卡数据.mjs';

const 查 = 选择器 => document.querySelector(选择器);
const 全查 = 选择器 => [...document.querySelectorAll(选择器)];
const 转义 = 内容 => String(内容 ?? '').replace(/[&<>"']/g, 字符 => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[字符]));
const 数字 = 数值 => Math.floor(数值).toLocaleString('zh-CN');
const 简数 = 数值 => Math.abs(数值) >= 1e8 ? `${(数值 / 1e8).toFixed(2)} 亿` : Math.abs(数值) >= 1e4 ? `${(数值 / 1e4).toFixed(2)} 万` : 数字(数值);
const 职业图标 = { 攻击者: 'attacker', 治疗者: 'healer', 守护者: 'protector', 辅助者: 'supporter', 妨碍者: 'obstructer' };
const 职业像 = 职业 => `<img class="职业像 ${转义(职业)}" src="./职业图标/${职业图标[职业] ?? 'attacker'}.png" width="34" height="38" alt="${转义(职业)}" title="${转义(职业)}">`;
const 存档键 = '颠倒镜-战斗存档';
const 关卡存档键 = 关卡 => 关卡 === '夏日尾声' ? '夏日尾声-战斗存档' : 存档键;
const 角色池存档键 = 'TKFM-玩家角色池';
const 玩家编队存档键 = 'TKFM-玩家编队';
let 玩家角色池 = [];
let 玩家编队 = [];
let 角色编辑草稿 = null;
let 新增角色中 = false;
let 玩家数据就绪 = false;
let 配置 = 创建关卡配置();
let 操作列表 = [];
let 游标 = 0;
let 状态 = 新建战斗(配置);
let 提示计时器;
let 安装事件;
let 运行中 = false;
let 攻击目标 = 0;
let 旧记录备份 = null;

function 通知(消息, 错误 = false) {
    clearTimeout(提示计时器);
    const 区域 = 查('#通知');
    区域.textContent = 消息;
    区域.classList.toggle('错误', 错误);
    区域.hidden = false;
    提示计时器 = setTimeout(() => { 区域.hidden = true; }, 错误 ? 6500 : 3200);
}

function 用户错误(错误) {
    const 消息 = 错误?.message || String(错误);
    if (/模型|编译|建模|占位技能|未支持/.test(消息)) return '此编队或记录暂不可用，请确认角色养成后重新开始。';
    return 消息;
}

function 包装(函数) {
    return async 事件 => {
        try {
            if (运行中) throw new Error('整场模拟正在结算');
            await 函数(事件);
        }
        catch (错误) { 通知(用户错误(错误), true); }
    };
}

function 存档() {
    try {
        localStorage.setItem(关卡存档键(当前关卡(配置).编号), JSON.stringify({ 配置, 操作列表, 游标, 未开始: !状态 }));
        localStorage.setItem('TKFM-当前关卡', 当前关卡(配置).编号);
        查('#保存状态').textContent = '已保存';
    } catch { 查('#保存状态').textContent = '存储不可用'; }
}

function 保存玩家数据(角色池 = 玩家角色池, 引用 = 玩家编队) {
    const 编队 = 校验编队引用(引用, 角色池, true);
    const 原池 = localStorage.getItem(角色池存档键);
    const 原队 = localStorage.getItem(玩家编队存档键);
    try {
        localStorage.setItem(角色池存档键, JSON.stringify({ 类型: 'TKFM角色池', 版本: 1, 角色: 角色池 }));
        localStorage.setItem(玩家编队存档键, JSON.stringify(编队));
    } catch (错误) {
        try {
            if (原池 === null) localStorage.removeItem(角色池存档键); else localStorage.setItem(角色池存档键, 原池);
            if (原队 === null) localStorage.removeItem(玩家编队存档键); else localStorage.setItem(玩家编队存档键, 原队);
        } catch {}
        throw new Error('角色池或编队未能保存，请检查浏览器存储空间');
    }
    玩家角色池 = structuredClone(角色池);
    玩家编队 = 编队;
    查('#保存状态').textContent = '已保存';
}

function 初始化玩家数据(关卡) {
    const 当前记录 = localStorage.getItem(关卡存档键(关卡));
    let 当前存档 = null;
    try { 当前存档 = 当前记录 ? JSON.parse(当前记录) : null; } catch {}
    const 草稿原文 = sessionStorage.getItem('TKFM-待迁移角色草稿');
    let 原草稿 = null;
    try { 原草稿 = 草稿原文 ? JSON.parse(草稿原文) : null; } catch {}
    let 已存池 = null;
    const 池原文 = localStorage.getItem(角色池存档键);
    if (池原文 !== null) {
        try { 已存池 = 解析角色池文件(池原文); }
        catch { try { localStorage.setItem(`TKFM-损坏角色池备份-${Date.now()}`, 池原文); } catch {} }
    }
    if (已存池) 玩家角色池 = 已存池;
    else {
        const 原记录 = Object.fromEntries(['颠倒镜', '夏日尾声'].map(名称 => [名称, localStorage.getItem(关卡存档键(名称))]).filter(([, 内容]) => 内容));
        if (Object.keys(原记录).length || 原草稿?.length) {
            try { localStorage.setItem(`TKFM-角色池迁移前备份-${Date.now()}`, JSON.stringify({ 原记录, 草稿: 原草稿 })); } catch {}
            for (const 单位 of 当前存档?.配置?.队伍 || []) {
                try { 玩家角色池 = 更新池角色(玩家角色池, 单位); } catch {}
            }
            for (const 内容 of Object.values(原记录)) {
                let 记录 = null;
                try { 记录 = JSON.parse(内容); } catch {}
                for (const 单位 of 记录?.配置?.队伍 || []) if (!玩家角色池.some(项 => 项.编号 === 单位.编号)) {
                    try { 玩家角色池 = 更新池角色(玩家角色池, 单位); } catch {}
                }
            }
            for (const 单位 of 原草稿 || []) {
                try { 玩家角色池 = 更新池角色(玩家角色池, 单位); } catch {}
            }
        }
    }
    const 已存引用原文 = localStorage.getItem(玩家编队存档键);
    let 已存引用 = null;
    if (已存引用原文 !== null) {
        try { 已存引用 = 校验编队引用(JSON.parse(已存引用原文), 玩家角色池, true); } catch {}
    }
    玩家编队 = 已存引用 ?? [...new Set([...(当前存档?.配置?.队伍 || []), ...(原草稿 || [])].map(单位 => 单位?.编号).filter(编号 => Number.isSafeInteger(编号) && 玩家角色池.some(项 => 项.编号 === 编号)))].slice(0, 5);
    保存玩家数据();
    玩家数据就绪 = true;
    try { sessionStorage.removeItem('TKFM-待迁移角色草稿'); } catch {}
}

function 导入记录(记录) {
    if (!记录 || typeof 记录 !== 'object' || !Array.isArray(记录.操作列表) || 记录.操作列表.length > 2000) throw new Error('不是有效的战斗记录，或记录过长');
    const 新游标 = 记录.游标 ?? 记录.操作列表.length;
    if (!Number.isInteger(新游标) || 新游标 < 0 || 新游标 > 记录.操作列表.length) throw new Error('记录游标无效');
    if (记录.未开始 && (记录.操作列表.length || 记录.配置?.队伍?.length)) throw new Error('未开始的战斗记录无效');
    const 新状态 = 记录.未开始 ? null : 重放战斗(记录.配置, 记录.操作列表.slice(0, 新游标));
    配置 = structuredClone(记录.配置);
    操作列表 = structuredClone(记录.操作列表);
    游标 = 新游标;
    状态 = 新状态;
}

function 载入本地记录(关卡) {
    const 键 = 关卡存档键(关卡);
    const 已存 = localStorage.getItem(键);
    const 最近备份键 = localStorage.getItem(`${键}-最近旧模型备份`);
    const 切换备份键 = localStorage.getItem(`${键}-最近编队切换备份`);
    旧记录备份 = (切换备份键 && localStorage.getItem(切换备份键)) || (最近备份键 && localStorage.getItem(最近备份键)) || localStorage.getItem(`${键}-真实角色修正前备份`);
    if (已存) {
        const 记录 = JSON.parse(已存);
        try { 导入记录(记录); return; }
        catch (错误) {
            const 旧规则 = 记录.配置?.模型规则 !== 技能模型规则;
            const 旧敌方面板 = 是旧夏日默认面板(记录.配置);
            if (!旧规则 && !旧敌方面板 && !记录.配置?.队伍?.some(单位 => !获取真实角色(单位.编号) || 单位.手动角色 || 单位.星级 === undefined)) throw 错误;
            const 备份键 = `${键}-${旧敌方面板 ? '敌方面板修正前备份' : '技能模型备份'}-${Date.now()}`;
            localStorage.setItem(备份键, 已存);
            localStorage.setItem(`${键}-最近旧模型备份`, 备份键);
            旧记录备份 = 已存;
            if (旧敌方面板 && !旧规则) {
                配置 = 修正夏日默认面板(structuredClone(记录.配置));
                状态 = 新建战斗(配置);
                操作列表 = [];
                游标 = 0;
                存档();
            } else {
                配置 = { ...创建关卡配置(关卡), 队伍: [] };
                状态 = null;
                操作列表 = [];
                游标 = 0;
            }
            通知(旧敌方面板 && !旧规则 ? '已更新本场战斗数据，原记录已备份，编队和设置已保留。' : '此记录需要重新开始。原记录已备份，请确认编队后应用。', true);
            return;
        }
    }
    配置 = { ...创建关卡配置(关卡), 队伍: [] };
    状态 = null;
    操作列表 = [];
    游标 = 0;
}

function 图标刷新() {
    globalThis.lucide?.createIcons({ attrs: { 'stroke-width': 1.7 } });
}

function 切换视图(名称) {
    全查('[data-view]').forEach(元素 => { 元素.hidden = 元素.dataset.view !== 名称; });
    全查('[data-tab]').forEach(按钮 => 按钮.setAttribute('aria-selected', String(按钮.dataset.tab === 名称)));
    try { sessionStorage.setItem('TKFM-当前视图', 名称); } catch {}
    刷新当前视图();
}

function 刷新当前视图() {
    const 名称 = 查('[data-tab][aria-selected="true"]')?.dataset.tab;
    if (名称 === '编队') 渲染编队();
    if (名称 === '角色池') 渲染角色池();
    if (名称 === '模型') 渲染设置();
    if (名称 === '记录') 渲染记录();
    图标刷新();
}

function 行动说明(内容) {
    return String(内容 ?? '')
        .replace(/\b\d{5,6}:\d+:引用:([^·\r\n]+?)(?::\d+)+(?=\s*(?:$|·))/g, (_, 名称) => 名称)
        .replace(/\b\d{5,6}:\d+:[^·\r\n]+/g, '技能效果')
        .replace(/\bELv:\d+:[\d:]+/g, 'ELV强化')
        .replace(/([:：])(\d{5,6})(?=$|[\s/])/g, (_, 分隔, 编号) => {
            const 名称 = 敌方技能名称(配置, Number(编号));
            return 分隔 + (名称 === 编号 ? '特殊行动' : 名称);
        });
}

function 日志行(列表) {
    if (!列表.length) return '<tr><td class="无记录" colspan="4">暂无结算记录</td></tr>';
    return 列表.map(项 => `<tr><td>${项.回合}</td><td><span class="事件签 ${转义(项.类别)}">${转义(项.类别)}</span></td><td>${转义(行动说明(项.内容))}</td><td>${项.数值 === null ? '—' : 数字(项.数值)}</td></tr>`).join('');
}

function 渲染关卡() {
    const 关卡 = 当前关卡(配置);
    const 夏日 = 关卡.编号 === '夏日尾声';
    查('#关卡选择').value = 关卡.编号;
    查('#关卡名称').textContent = 关卡.名称;
    查('#关卡标签').textContent = 关卡.标签;
    查('#关卡简称').textContent = 关卡.简称;
    查('#关卡编号').textContent = 夏日 ? '五名敌人' : '首领战';
    document.title = `${关卡.名称} · 战斗模拟器`;
    查('.镜面').src = 夏日 ? './海岸-512.png' : './镜面-512.png';
    查('.镜面').alt = 夏日 ? '夏日海岸' : '颠倒镜';
    查('#品牌图').src = 夏日 ? './海岸-512.png' : './镜面-192.png';
    for (const 标识 of ['多敌区域', '夏日面板区域']) 查(`#${标识}`).hidden = !夏日;
    查('#首领详情').hidden = !状态;
    if (!夏日 || !状态) {
        if (夏日) { 查('#当前目标').textContent = '尚未开始'; 查('#敌方队伍').innerHTML = ''; }
        return;
    }
    const 可选 = 可选敌人(状态);
    if (!可选.some(单位 => 单位.位置 === 攻击目标)) 攻击目标 = 可选[0]?.位置 ?? 0;
    查('#当前目标').textContent = 可选.length ? `目标 · ${状态.敌人[攻击目标].名称}` : '全部击破';
    查('#敌方队伍').innerHTML = 状态.敌人.map(单位 => {
        const 可选择 = 可选.some(项 => 项.位置 === 单位.位置);
        const 标签 = [单位.生命 <= 0 ? '击破' : 单位.已行动 ? '已行动' : '待行动', 加成(单位, '嘲讽') > 0 ? '嘲讽' : '', 单位.防御 || 加成(单位, '防御') > 0 ? '防御' : '', 加成(单位, '锁血') > 0 ? '锁血' : ''].filter(Boolean).join(' · ');
        return `<div class="敌人卡" role="button" tabindex="${可选择 ? '0' : '-1'}" data-enemy="${单位.位置}" aria-pressed="${攻击目标 === 单位.位置}" aria-label="攻击目标 ${转义(单位.名称)}" title="${转义(`生命 ${数字(单位.生命)} / ${数字(单位.生命上限)}；攻击 ${数字(当前攻击(单位))}`)}"><span class="敌人卡标题"><strong>${转义(单位.名称)}</strong><span class="敌人卡标题工具"><small>${单位.位置 + 1}</small><button type="button" class="图标按钮" data-enemy-detail="${单位.位置}" title="${转义(单位.名称)}状态详情" aria-label="${转义(单位.名称)}状态详情"><i data-lucide="ellipsis"></i></button></span></span><button type="button" class="敌人卡选择" data-enemy-select="${单位.位置}" ${可选择 ? '' : 'disabled'} aria-label="选择攻击目标 ${转义(单位.名称)}"><span>${数字(单位.生命)} / ${数字(单位.生命上限)}</span><span class="生命轨"><span style="width:${Math.max(0, 单位.生命 / 单位.生命上限 * 100)}%"></span></span><small>攻击 ${简数(当前攻击(单位))}</small><small>${标签}</small></button></div>`;
    }).join('');
}

function 角色动作状态(单位) {
    const 控制 = ['睡眠', '麻痹', '封印', '沉默'].filter(属性 => 加成(单位, 属性) > 0);
    const 跳过 = 控制.some(属性 => ['睡眠', '麻痹'].includes(属性));
    const 可攻击 = !控制.some(属性 => ['睡眠', '麻痹', '封印'].includes(属性));
    return { 控制, 跳过, 可攻击, 可必杀: 可攻击 && !控制.includes('沉默') && 单位.冷却剩余 === 0 };
}

function 渲染未开战() {
    查('#回合').innerHTML = `00 <small>回合</small>`;
    查('#首领生命').textContent = '— / —';
    查('#首领比例').textContent = '0.00%';
    查('#首领生命条').style.width = '0%';
    查('#首领状态').innerHTML = '';
    查('#总伤害').textContent = '0';
    查('#本回合回复').textContent = '0';
    查('#本回合承伤').textContent = '0';
    查('#存活').innerHTML = `0 <small>/ ${玩家编队.length}</small>`;
    查('#阶段').textContent = '未开始';
    for (const 键 of ['#撤销', '#重做', '#一回合', '#整场运行']) 查(键).disabled = true;
    查('#整场运行').innerHTML = '<i data-lucide="play"></i>运行至结束';
    查('#旧记录栏').hidden = true;
    查('#AI预览').innerHTML = '';
    查('#角色队伍').innerHTML = '<div class="空状态"><i data-lucide="swords"></i><h3>战斗尚未开始</h3><p>到「编队」页从角色池选择角色并应用后即可开战</p></div>';
    查('#结局').hidden = true;
    查('#最近日志').innerHTML = 日志行([]);
    图标刷新();
}

function 渲染战场() {
    渲染关卡();
    if (!状态) return 渲染未开战();
    const 总生命 = 状态.敌人.reduce((合计, 单位) => 合计 + 单位.生命, 0);
    const 总上限 = 状态.敌人.reduce((合计, 单位) => 合计 + 单位.生命上限, 0);
    const 比例 = Math.max(0, 总生命 / 总上限 * 100);
    查('#回合').innerHTML = `${String(状态.回合).padStart(2, '0')} <small>回合</small>`;
    查('#首领生命').textContent = `${配置.关卡 === '夏日尾声' ? '敌方合计 ' : ''}${数字(总生命)} / ${数字(总上限)}`;
    查('#首领比例').textContent = `${比例.toFixed(2)}%`;
    查('#首领生命条').style.width = `${比例}%`;
    const 叠层 = 配置.颠倒规则 ? Math.min(50, 状态.回合 - 1) : 0;
    查('#首领状态').innerHTML = 配置.关卡 === '夏日尾声' ? `<span>夏日 ${状态.首领.夏日层数} / 100</span><span>铃兰攻击 +${(加成(状态.首领, '攻击比例') * 100).toFixed(1)}%</span><span>回合回血 ${状态.首领.每回合回血 ? '5%' : '已移除'}</span>${状态.首领.蓄力 ? `<span>蓄力 · 关心 ${状态.首领.蓄力.关心} / 3 · 剩余 ${Math.max(0, 2 - (状态.回合 - 状态.首领.蓄力.开始回合))} 回合</span>` : ''}` : `<span>攻击 +${叠层 * 5}%</span><span>受盾 −${配置.颠倒规则 ? 配置.受盾降低 * 100 : 0}%</span><span>受疗 −${配置.颠倒规则 ? 配置.受疗降低 * 100 : 0}%</span>${状态.首领.蓄力 ? `<span>蓄力 ${状态.首领.蓄力.命中} / 99</span>` : ''}`;
    查('#总伤害').textContent = 简数(状态.累计伤害);
    查('#本回合回复').textContent = 简数(状态.本回合.回复);
    查('#本回合承伤').textContent = 简数(状态.本回合.承伤);
    查('#存活').innerHTML = `${状态.队伍.filter(单位 => 单位.生命 > 0).length} <small>/ ${状态.队伍.length}</small>`;
    查('#阶段').textContent = 状态.阶段 === '我方' ? '我方' : 状态.阶段 === '敌方' ? '敌方' : '已结束';
    查('#撤销').disabled = 游标 === 0 || 运行中;
    查('#重做').disabled = 游标 >= 操作列表.length || 运行中;
    查('#一回合').disabled = 状态.阶段 !== '我方' || 运行中 || !配置.自动敌方;
    查('#旧记录栏').hidden = Boolean(配置.自动敌方);
    查('#整场运行').disabled = 状态.阶段 === '结束' || !配置.自动敌方;
    查('#整场运行').innerHTML = 运行中 ? '<i data-lucide="pause"></i>停止' : '<i data-lucide="play"></i>运行至结束';
    查('#AI预览').innerHTML = 预览敌方行动(状态).map(项 => `<div><strong>${转义(项.名称)}</strong><span>${转义(项.技能?.map(编号 => 编号 === '普攻' ? 编号 : 敌方技能名称(配置, 编号)).join(' + ') || 项.行动)}</span><span>${项.冷却 === null ? '' : `CD ${项.冷却}`}</span></div>`).join('');
    查('#角色队伍').innerHTML = 状态.队伍.map(单位 => {
        const 可行动 = 状态.阶段 === '我方' && 单位.生命 > 0 && !单位.已行动 && !运行中 && 配置.自动敌方;
        const 百分比 = Math.max(0, 单位.生命 / 单位.生命上限 * 100);
        const 动作状态 = 角色动作状态(单位);
        const 类名 = [单位.已行动 ? '已行动' : '', 单位.生命 <= 0 ? '已倒下' : '', 单位.防御 ? '防御中' : ''].join(' ');
        const 状态条 = 单位.生命 <= 0 ? '倒下' : 动作状态.控制.length ? 动作状态.控制.join(' · ') : 单位.防御 ? '防御中' : 单位.已行动 ? '已行动' : '待行动';
        const 全名 = 单位.全名 || 获取真实角色(单位.编号)?.全名 || 单位.名称;
        return `<article class="角色卡 ${类名}" data-unit="${单位.位置}"><div class="角色卡头"><span class="站位标">${String(单位.位置 + 1).padStart(2, '0')} ${单位.位置 === 0 ? ' / 队长' : ''}</span><button class="图标按钮" data-detail="${单位.位置}" title="${转义(全名)}状态与技能" aria-label="${转义(全名)}状态与技能"><i data-lucide="ellipsis"></i></button></div><div class="角色名行">${职业像(单位.职业)}<div><h3 class="角色姓名">${转义(全名)}</h3><div class="角色属性">${转义(单位.属性)} · ${转义(单位.职业)} · 羁绊 ${单位.羁绊}</div></div></div><div class="角色血量"><span>${数字(单位.生命)}</span><span class="比例">${百分比.toFixed(0)}%</span></div><div class="生命轨"><div style="width:${百分比}%;${百分比 < 30 ? 'background:var(--红)' : ''}"></div></div><div class="角色参数"><div><span>当前攻击</span><strong>${简数(当前攻击(单位))}</strong></div><div><span>有效护盾</span><strong>${简数(当前护盾(单位))}</strong></div></div><div class="角色状态"><span>${状态条}</span>${单位.冷却剩余 ? `<span>CD ${单位.冷却剩余}</span>` : '<span>必杀就绪</span>'}${单位.计数.守护 ? `<span>守护 ${单位.计数.守护}</span>` : ''}</div><div class="动作栏"><button data-action="普攻" data-position="${单位.位置}" ${可行动 && 动作状态.可攻击 ? '' : 'disabled'} title="${动作状态.可攻击 ? '普攻' : '受控，无法攻击'}">普攻</button><button data-action="必杀" data-position="${单位.位置}" ${可行动 && 动作状态.可必杀 ? '' : 'disabled'} title="${动作状态.控制.length ? '受控或沉默，无法施放必杀' : 单位.冷却剩余 ? `冷却 ${单位.冷却剩余} 回合` : '必杀'}">${单位.冷却剩余 ? `CD ${单位.冷却剩余}` : '必杀'}</button><button data-action="防御" data-position="${单位.位置}" ${可行动 ? '' : 'disabled'} title="${动作状态.跳过 ? '受控，跳过本次行动' : '防御'}" aria-label="${转义(单位.名称)}${动作状态.跳过 ? '跳过行动' : '防御'}"><i data-lucide="${动作状态.跳过 ? 'step-forward' : 'shield'}"></i></button></div></article>`;
    }).join('');
    const 结束 = 状态.阶段 === '结束';
    查('#结局').hidden = !结束;
    if (结束) 查('#结局').textContent = 状态.敌人.every(单位 => 单位.生命 <= 0) ? `${当前关卡(配置).名称}已通关` : 状态.队伍.every(单位 => 单位.生命 <= 0) ? '队伍全灭' : '已到达设定的回合上限';
    查('#最近日志').innerHTML = 日志行(状态.日志.filter(项 => !['AI', '系统'].includes(项.类别)).slice(-10).reverse());
    图标刷新();
}

function 渲染记录() {
    const 类别 = 查('#日志类别').value;
    const 日志 = 状态?.日志 ?? [];
    const 报表 = 状态?.回合报表 ?? [];
    查('#全部日志').innerHTML = 日志行(日志.filter(项 => !['AI', '系统'].includes(项.类别) && (!类别 || 项.类别 === 类别)).slice(-600).reverse());
    查('#报表').innerHTML = 报表.length ? 报表.map(行 => `<tr><td>${行.回合}</td><td>${转义(行动说明(行.技能))}</td>${['伤害', '回复', '理论回复', '护盾生成', '护盾吸收', '承伤'].map(字段 => `<td>${简数(行[字段])}</td>`).join('')}<td>${行.存活}/${状态 ? 状态.队伍.length : 0}</td></tr>`).join('') : '<tr><td colspan="9" class="无记录">尚无已结算回合</td></tr>';
}

function 解放选择(单位, 标签) {
    const 阶段 = 获取真实角色(单位.编号)?.解放阶段 || [];
    return `<label data-label="解放"><select data-field="解放" aria-label="${标签}解放" ${阶段.length ? '' : 'disabled'}>${[0, ...阶段].map(档 => `<option value="${档}" ${档 === 单位.解放 ? 'selected' : ''}>${档 ? `阶段${档}` : '未解放'}</option>`).join('')}</select></label>`;
}

function ELv选择(单位, 标签) {
    const 技能 = 获取适用ELv技能(单位.编号);
    const 分类 = { profession1: '职业强化Ⅰ', common: '通用强化', element: '属性强化', profession2: '职业强化Ⅱ' };
    return `<details class="ELv详情"><summary>ELv技能 <span class="ELv已选">${单位.ELv技能?.length || 0}项</span></summary>${Object.entries(分类).map(([键, 名]) => {
        const 项目 = 技能.filter(项 => 项.分类 === 键);
        const 已选 = 项目.filter(项 => (单位.ELv技能 || []).includes(项.编号));
        const 组名 = `ELv-${标签}-${键}`;
        return `<div class="ELv分类"><strong>${名}</strong><div class="ELv网格" role="radiogroup" aria-label="${标签}${名}">${项目.map(项 => `<label class="ELv选项"><input type="radio" name="${组名}" data-elv="${项.编号}" value="${项.编号}" ${已选.length === 1 && 已选[0].编号 === 项.编号 ? 'checked' : ''} aria-label="${标签} ELv ${转义(项.名称)}"><span><b>${转义(项.名称)}</b><small>${转义(项.校核说明 || 项.说明)}</small></span></label>`).join('')}<label class="ELv选项"><input type="radio" name="${组名}" data-elv-none="${键}" value="" ${已选.length === 0 ? 'checked' : ''} aria-label="${标签} ELv ${名}未强化"><span><b>未强化</b></span></label></div></div>`;
    }).join('')}</details>`;
}

function 养成摘要(养成) {
    return `Lv ${养成.普通等级 ?? 普通等级范围.最高} · ELV ${养成.ELV突破等级 ?? 0} · 潜力 ${养成.潜力等级 ?? 12} · ${养成.星级 ?? 3}星 · 羁绊 ${养成.羁绊 ?? 5} · 调教 ${养成.调教 ?? 3}${养成.解放 ? ` · 解放 ${养成.解放}` : ''}${养成.ELv技能?.length ? ` · ELv ${养成.ELv技能.length}项` : ''}`;
}

function 面板预览(养成) {
    try { const 面板 = 计算调教面板(养成); return { 生命上限: 面板.生命上限, 攻击: 面板.攻击 }; }
    catch { return null; }
}

function 构建角色候选() {
    const 列表 = 查('#角色候选');
    if (列表.childElementCount) return;
    列表.innerHTML = 真实角色目录.map(单位 => `<option value="${单位.编号} ${转义(单位.全名)}" label="${转义(单位.别名.filter(名 => /[\u3400-\u9fff]/.test(名)).slice(0, 6).join(' · '))}"></option>`).join('');
}

function 显示角色技能(养成) {
    const 档案 = 获取真实角色(养成.编号);
    const 技能 = 获取真实技能(养成.编号, 养成.羁绊, null, 养成.解放 ?? 0);
    if (!档案 || !技能) return;
    const 分类 = [['普攻', 技能.ATTACK], [`必杀 · 羁绊${养成.羁绊}`, 技能.当前必杀], ['队长技', 技能.LEADER], ['被动一', 技能.PASSIVE_1], ['被动二', 技能.PASSIVE_2], ['被动三', 技能.PASSIVE_3], ['潜力技能一', 技能.GENERAL_1], ['潜力技能二', 技能.GENERAL_2]];
    打开详情(`${档案.全名} · 技能`, 分类.filter(([, 项]) => 项).map(([类别, 项]) => `<h3>${转义(类别)} · ${转义(项.名称)}</h3><p style="white-space:pre-wrap">${转义(项.校核说明 || 项.说明)}</p>`).join(''));
}

function 渲染编队() {
    查('#角色目录数量').textContent = `${玩家编队.length}/5`;
    查('#导出旧记录').hidden = !旧记录备份;
    查('#添加角色').disabled = 玩家编队.length >= 5 || !玩家角色池.length;
    查('#应用编队').disabled = 玩家编队.length < 1;
    查('#编队表').innerHTML = 玩家编队.length ? 玩家编队.map((编号, 位置) => {
        const 养成 = 玩家角色池.find(项 => 项.编号 === 编号);
        const 面板 = 养成 ? 面板预览(养成) : null;
        const 选项 = 玩家角色池.map(项 => {
            const 档案 = 获取真实角色(项.编号);
            const 占用 = 玩家编队.includes(项.编号) && 项.编号 !== 编号;
            return `<option value="${项.编号}" ${项.编号 === 编号 ? 'selected' : ''} ${占用 ? 'disabled' : ''}>${转义(档案?.全名 || `编号 ${项.编号}`)}</option>`;
        }).join('');
        return `<div class="引用行" data-team-row="${位置}"><div class="引用主行">
            <div class="位置输入"><span class="站位标">${位置 + 1}${位置 === 0 ? ' · 队长' : ''}</span><select data-team-select aria-label="站位${位置 + 1}角色">${选项}</select></div>
            <div class="面板结果" data-label="生命"><output aria-label="站位${位置 + 1}生命">${面板 ? 数字(面板.生命上限) : '--'}</output></div>
            <div class="面板结果" data-label="攻击"><output aria-label="站位${位置 + 1}攻击">${面板 ? 数字(面板.攻击) : '--'}</output></div>
            <div class="养成摘要" data-label="养成"><span>${养成 ? 转义(养成摘要(养成)) : '该角色已不在角色池中'}</span><button class="文字按钮" data-skill-source="${编号}" title="查看技能"><i data-lucide="book-open"></i>技能</button>${养成 ? `<button class="文字按钮" data-edit-reference="${编号}" title="到角色池编辑养成"><i data-lucide="sliders-horizontal"></i>养成</button>` : ''}</div>
            <div class="排序工具"><button class="图标按钮" data-move="${位置}:上" ${位置 === 0 ? 'disabled' : ''} title="上移站位" aria-label="上移站位"><i data-lucide="arrow-up"></i></button><button class="图标按钮" data-move="${位置}:下" ${位置 === 玩家编队.length - 1 ? 'disabled' : ''} title="下移站位" aria-label="下移站位"><i data-lucide="arrow-down"></i></button><button class="图标按钮 编队移除" data-remove="${位置}" title="移出编队" aria-label="移出站位${位置 + 1}角色"><i data-lucide="user-minus"></i></button></div>
        </div></div>`;
    }).join('') : '<div class="空状态"><i data-lucide="users-round"></i><h3>编队为空</h3><p>点击上方“加入角色”从角色池编入；若角色池为空，请先到「角色池」页添加角色</p></div>';
    for (const 位置 of 玩家编队.keys()) 查(`[data-team-row="${位置}"]`).prepend(查('#编队表头模板').content.firstElementChild.cloneNode(true));
    图标刷新();
}

function 填充池筛选() {
    const 职业 = 查('#角色池职业');
    const 属性 = 查('#角色池属性');
    if (职业.options.length <= 1) 职业.innerHTML = `<option value="">全部职业</option>${职业列表.map(项 => `<option>${项}</option>`).join('')}`;
    if (属性.options.length <= 1) 属性.innerHTML = `<option value="">全部属性</option>${属性列表.map(项 => `<option>${项}</option>`).join('')}`;
}

function 渲染角色池() {
    填充池筛选();
    const 搜索 = 查('#角色池搜索').value.trim().toLowerCase();
    const 职业 = 查('#角色池职业').value;
    const 属性 = 查('#角色池属性').value;
    查('#角色池数量').textContent = `${玩家角色池.length}/${真实角色目录.length}`;
    const 匹配 = 玩家角色池.filter(养成 => {
        const 档案 = 获取真实角色(养成.编号);
        if (!档案) return false;
        if (职业 && 档案.职业 !== 职业) return false;
        if (属性 && 档案.属性 !== 属性) return false;
        if (!搜索) return true;
        return String(养成.编号).includes(搜索) || [档案.全名, 档案.名称, 档案.资料, ...档案.别名].filter(Boolean).some(名 => String(名).toLowerCase().includes(搜索));
    });
    查('#角色池列表').innerHTML = !玩家角色池.length
        ? '<div class="空状态"><i data-lucide="contact-round"></i><h3>角色池是空的</h3><p>点击“添加角色”创建你的第一个角色档案，或“载入角色池”导入文件</p></div>'
        : !匹配.length ? '<div class="空状态"><i data-lucide="search-x"></i><h3>没有匹配的角色</h3><p>换个搜索词或筛选条件试试</p></div>'
        : 匹配.map(养成 => {
            const 档案 = 获取真实角色(养成.编号);
            const 面板 = 面板预览(养成);
            const 站位 = 玩家编队.indexOf(养成.编号);
            return `<article class="池角色" data-pool-id="${养成.编号}">
                ${职业像(档案.职业)}
                <div class="池名称"><h3>${转义(档案.全名)}</h3><small>${养成.编号} · ${转义(档案.职业)} · ${转义(档案.属性)}${站位 >= 0 ? ` · <b class="入队签">编队站位 ${站位 + 1}</b>` : ''}</small></div>
                <div class="池面板"><span>生命<strong>${面板 ? 数字(面板.生命上限) : '--'}</strong></span><span>攻击<strong>${面板 ? 数字(面板.攻击) : '--'}</strong></span></div>
                <div class="池养成">${转义(养成摘要(养成))}</div>
                <div class="池工具"><button class="文字按钮" data-pool-join="${养成.编号}" ${站位 >= 0 || 玩家编队.length >= 5 ? 'disabled' : ''} title="${站位 >= 0 ? '已在编队中' : 玩家编队.length >= 5 ? '编队已满5人' : '加入编队'}">编入</button><button class="文字按钮" data-pool-edit="${养成.编号}" title="编辑养成">养成</button><button class="文字按钮" data-pool-del="${养成.编号}" ${站位 >= 0 ? 'disabled title="请先从编队移除"' : 'title="从角色池删除"'}>删除</button></div>
            </article>`;
        }).join('');
    图标刷新();
}

function 打开角色编辑器(编号 = null) {
    新增角色中 = 编号 === null;
    if (新增角色中) {
        if (玩家角色池.length >= 真实角色目录.length) throw new Error('全部 SSR 角色都已在角色池中');
        构建角色候选();
        const 候选 = 真实角色目录.find(单位 => !玩家角色池.some(项 => 项.编号 === 单位.编号));
        角色编辑草稿 = { ...新建池角色(候选.编号), 角色输入: `${候选.编号} ${候选.全名}` };
    } else {
        const 养成 = 玩家角色池.find(项 => 项.编号 === 编号);
        if (!养成) throw new Error('角色池中已没有此角色');
        角色编辑草稿 = { ...structuredClone(养成), 角色输入: `${养成.编号} ${获取真实角色(养成.编号).全名}` };
    }
    渲染角色编辑表单();
    查('#角色编辑弹窗').showModal();
}

function 渲染角色编辑表单() {
    const 单位 = 角色编辑草稿;
    const 档案 = 获取真实角色(单位.编号);
    查('#角色编辑标题').textContent = `${档案.全名} · ${新增角色中 ? '新角色' : '养成编辑'}`;
    查('#角色编辑表').innerHTML = `
    <div class="编辑网格">
        <label class="角色选择" data-label="角色"><input data-field="角色输入" data-text type="text" list="角色候选" maxlength="100" value="${转义(单位.角色输入)}" aria-label="角色" placeholder="搜索 SSR 名称或编号" autocomplete="off" ${新增角色中 ? '' : 'disabled'}></label>
        <label data-label="普通等级"><input data-field="普通等级" type="number" min="${普通等级范围.最低}" max="${普通等级范围.最高}" step="1" value="${单位.普通等级 ?? 普通等级范围.最高}" aria-label="普通等级"></label>
        <label data-label="ELV突破"><input data-field="ELV突破等级" type="number" min="0" max="${ELV突破档位.at(-1).等级}" step="1" value="${单位.ELV突破等级 ?? 0}" aria-label="ELV突破等级" title="突破要求60级及潜力5满或6以上"></label>
        <label data-label="羁绊"><select data-field="羁绊" aria-label="羁绊">${[1, 2, 3, 4, 5].map(档 => `<option ${档 === 单位.羁绊 ? 'selected' : ''}>${档}</option>`).join('')}</select></label>
        <label data-label="星级"><select data-field="星级" aria-label="星级">${[3, 4, 5].map(星 => `<option ${星 === 单位.星级 ? 'selected' : ''}>${星}</option>`).join('')}</select></label>
        <label data-label="调教"><select data-field="调教" aria-label="调教">${调教加成.map((增加, 档) => `<option value="${档}" ${档 === 单位.调教 ? 'selected' : ''}>${档}</option>`).join('')}</select></label>
        ${解放选择(单位, '角色编辑')}
        <div class="面板结果" data-label="生命"><output data-panel-stat="生命上限" aria-label="生命"></output></div>
        <div class="面板结果" data-label="攻击"><output data-panel-stat="攻击" aria-label="攻击"></output></div>
    </div>
    <div class="编辑身份"><span><span>职业</span><strong>${转义(档案.职业)}</strong></span><span><span>属性</span><strong>${转义(档案.属性)}</strong></span><button class="文字按钮" data-skill-source="${单位.编号}" title="查看技能"><i data-lucide="book-open"></i>技能</button></div>
    <div class="潜力养成"><label>潜力<select data-field="潜力等级" aria-label="潜力等级">${Array.from({ length: 12 }, (_, 序) => 序 + 1).map(阶 => `<option ${阶 === 单位.潜力等级 ? 'selected' : ''}>${阶}</option>`).join('')}</select></label><fieldset class="潜力节点"><legend>本阶节点</legend>${Array.from({ length: 6 }, (_, 序) => `<label><input type="checkbox" data-potential="${序}" aria-label="潜力节点${序 + 1}"><span></span></label>`).join('')}</fieldset></div>
    ${ELv选择(单位, '角色编辑')}
    <p class="编辑警告" hidden></p>`;
    刷新角色编辑说明();
}

function 刷新角色编辑说明() {
    const 单位 = 角色编辑草稿;
    if (!单位) return;
    const 表单 = 查('#角色编辑表');
    const 警告 = 表单.querySelector('.编辑警告');
    try {
        const 潜力 = 获取潜力养成(单位);
        for (const 输入 of 表单.querySelectorAll('[data-potential]')) {
            const 序 = Number(输入.dataset.potential);
            const 节点 = 潜力.节点[序];
            输入.checked = 潜力.潜力节点[序];
            输入.nextElementSibling.textContent = 节点.属性 === 'PASSIVE' ? `被动${节点.数值}` : `${节点.属性 === 'HP' ? '生命' : '攻击'} +${节点.数值}%`;
        }
        const 突破等级 = 单位.ELV突破等级 ?? 0;
        const 突破技能 = 获取适用ELv技能(单位.编号);
        for (const 输入 of 表单.querySelectorAll('[data-elv]')) {
            const 技能 = 突破技能.find(项 => 项.编号 === Number(输入.value));
            if (!技能) { 输入.disabled = true; continue; }
            const 门槛 = ELV技能解锁等级[技能.分类];
            输入.disabled = (单位.普通等级 ?? 普通等级范围.最高) !== 普通等级范围.最高 || !潜力.可突破 || 突破等级 < 门槛;
            输入.closest('label').title = `ELV${门槛}解锁`;
        }
        for (const 输入 of 表单.querySelectorAll('[data-elv-none]')) 输入.checked = !突破技能.some(项 => 项.分类 === 输入.dataset.elvNone && (单位.ELv技能 || []).includes(项.编号));
        const ELv标签 = 表单.querySelector('.ELv已选');
        if (ELv标签) ELv标签.textContent = `${单位.ELv技能?.length || 0}项`;
        const 面板 = 计算调教面板(单位);
        const ELV输入 = 表单.querySelector('[data-field="ELV突破等级"]');
        ELV输入.value = 面板.ELV突破等级;
        ELV输入.disabled = 面板.普通等级 !== 普通等级范围.最高 || !潜力.可突破;
        for (const 输出 of 表单.querySelectorAll('[data-panel-stat]')) 输出.value = 数字(面板[输出.dataset.panelStat]);
        提取角色养成(单位);
        警告.hidden = true;
        警告.textContent = '';
        查('#保存池角色').disabled = false;
    } catch (错误) {
        for (const 输出 of 表单.querySelectorAll('[data-panel-stat]')) 输出.value = '--';
        警告.hidden = false;
        警告.textContent = 错误.message || String(错误);
        查('#保存池角色').disabled = true;
    }
}

function 读取角色编辑输入() {
    const 表单 = 查('#角色编辑表');
    const 原单位 = 角色编辑草稿;
    const 单位 = structuredClone(原单位);
    for (const 输入 of 表单.querySelectorAll('[data-field]')) {
        if (输入.disabled) continue;
        单位[输入.dataset.field] = 输入.hasAttribute('data-text') ? 输入.value.trim() : Number(输入.value);
    }
    if (单位.角色输入 !== 原单位.角色输入) {
        const 匹配 = 创建角色(单位.角色输入);
        if (匹配.编号 !== 原单位.编号) return { ...新建池角色(匹配.编号), 角色输入: 匹配.角色输入 };
        单位.角色输入 = 匹配.角色输入;
    }
    单位.潜力节点 = [...表单.querySelectorAll('[data-potential]')].map(输入 => 输入.checked);
    if (单位.潜力等级 !== 原单位.潜力等级) 单位.潜力节点 = Array(6).fill(false);
    if (单位.普通等级 < 普通等级范围.最高 || !获取潜力养成(单位).可突破) 单位.ELV突破等级 = 0;
    单位.ELv技能 = [...表单.querySelectorAll('input[data-elv]:checked')].map(输入 => Number(输入.value));
    if (单位.普通等级 !== 原单位.普通等级 || 单位.ELV突破等级 !== 原单位.ELV突破等级) {
        const 解锁 = 获取适用ELv技能(单位.编号).filter(项 => 单位.普通等级 === 普通等级范围.最高 && 单位.ELV突破等级 >= ELV技能解锁等级[项.分类]).map(项 => 项.编号);
        单位.ELv技能 = 单位.ELv技能.filter(编号 => 解锁.includes(编号));
    }
    return 单位;
}

function 渲染设置() {
    const 表单 = 查('#模型表单');
    const 夏日 = 配置.关卡 === '夏日尾声';
    for (const 名称 of ['首领生命', '首领攻击', '回合上限']) {
        const 输入 = 表单.elements.namedItem(名称);
        const 专属 = ['首领生命', '首领攻击', '受疗降低', '受盾降低', '防御易伤目标', '倒置增益归属', '颠倒规则'].includes(名称);
        输入.disabled = 夏日 && 专属;
        输入.closest('label').hidden = 夏日 && 专属;
        if (输入.type === 'checkbox') 输入.checked = Boolean(配置[名称]);
        else 输入.value = ['首领减伤', '防御减伤', '受疗降低', '受盾降低'].includes(名称) ? 配置[名称] * 100 : 配置[名称] ?? (名称 === 'AI初始冷却' ? 1 : 名称 === 'AI事件时点' ? '伤害后' : 夏日 ? 4 : 5);
    }
    查('#敌方面板').innerHTML = 夏日 ? 配置.敌人.map((单位, 位置) => `<div class="敌方面板行" data-enemy-stats="${位置}"><strong>${转义(单位.名称)}</strong><label>生命上限<input data-enemy-field="生命上限" type="number" min="1" value="${单位.生命上限}" required></label><label>攻击力<input data-enemy-field="攻击" type="number" min="1" value="${单位.攻击}" required></label></div>`).join('') : '';
    const 目录 = 夏日 ? 配置.敌人.flatMap((单位, 位置) => 敌方技能目录(配置, 位置).filter(项 => 项[1]).map(([名称, 编号, 描述]) => [`${单位.名称} · ${名称}`, 编号, 描述])) : 敌方技能目录(配置).filter(项 => 项[1]);
    查('#技能目录').innerHTML = 目录.filter(([, , 描述]) => !/目标未解|校准|推定/.test(描述)).map(([名称, 编号, 描述]) => `<div><strong>${转义(名称)}</strong><span>${转义(描述)}</span></div>`).join('');
}

function 应用新配置(新配置) {
    新配置 = { ...新配置, 自动敌方: true };
    const 初始 = 新建战斗(新配置);
    配置 = structuredClone(新配置);
    操作列表 = [];
    游标 = 0;
    状态 = 初始;
    存档();
    渲染战场();
    渲染记录();
    刷新当前视图();
}

function 执行(操作, 重绘 = true) {
    const 新状态 = 结算操作(状态, 操作);
    操作列表 = 操作列表.slice(0, 游标);
    操作列表.push(structuredClone(操作));
    游标++;
    状态 = 新状态;
    if (重绘) { 存档(); 渲染战场(); 渲染记录(); }
}

function 自动我方() {
    const 可用 = 状态.队伍.filter(单位 => 单位.生命 > 0 && !单位.已行动);
    for (const 单位 of 可用) {
        if (状态.阶段 !== '我方') break;
        const 当前单位 = 状态.队伍[单位.位置];
        if (当前单位.生命 <= 0) continue;
        const 动作状态 = 角色动作状态(当前单位);
        const 计划动作 = 配置.关卡 === '夏日尾声' ? (动作状态.可必杀 ? '必杀' : '普攻') : 当前单位.职业 === '治疗者' && 动作状态.可必杀 ? '必杀' : 当前单位.职业 === '辅助者' ? '普攻' : '防御';
        const 动作 = !动作状态.可攻击 ? '防御' : 计划动作;
        const 敌人列表 = 可选敌人(状态, 当前单位);
        const 目标 = 敌人列表.some(敌人 => 敌人.位置 === 攻击目标) ? 攻击目标 : 敌人列表[0]?.位置 ?? 0;
        执行({ 类型: '角色', 位置: 单位.位置, 动作, 目标 }, false);
    }
}

function 保存下载(名称, 内容, 类型 = 'application/json') {
    const 地址 = URL.createObjectURL(new Blob([内容], { type: 类型 }));
    const 链接 = document.createElement('a');
    链接.href = 地址;
    链接.download = 名称;
    链接.click();
    setTimeout(() => URL.revokeObjectURL(地址), 1000);
}

function 打开详情(标题, 正文) {
    查('#详情标题').textContent = 标题;
    查('#详情正文').innerHTML = 正文;
    查('#详情弹窗').showModal();
    图标刷新();
}

function 效果数值(效果) {
    if (效果.属性 === '攻击固定') return 数字(效果.数值);
    if (['锁血', '嘲讽', '防御', '睡眠', '麻痹', '封印', '沉默'].includes(效果.属性)) return '生效';
    return `${(效果.数值 * 100).toFixed(1)}%`;
}

function 敌方详情(位置) {
    if (!状态) return;
    const 单位 = 状态.敌人[位置];
    if (!单位) return;
    const 标记 = [单位.生命 <= 0 ? '击破' : 单位.已行动 ? '已行动' : '待行动', 加成(单位, '嘲讽') > 0 ? '嘲讽' : '', 单位.防御 || 加成(单位, '防御') > 0 ? '防御' : '', 加成(单位, '锁血') > 0 ? '锁血' : '', 单位.蓄力 ? `蓄力 · 关心 ${单位.蓄力.关心 ?? 0}/3` : ''].filter(Boolean).join(' · ');
    const 效果 = (单位.效果 || []).map(效果 => `<tr><td>${转义(效果.属性)}</td><td>${效果数值(效果)}</td><td>${效果.层数 ?? 1}</td><td>${效果.剩余 >= 999 ? '常驻' : 效果.剩余 ?? '—'}</td></tr>`).join('');
    const 夏日字段 = 配置.关卡 === '夏日尾声' ? `<dt>夏日层数</dt><dd>${单位.夏日层数 ?? 0}</dd><dt>夏日攻击层数</dt><dd>${单位.夏日攻击层数 ?? 0}</dd><dt>每回合回血</dt><dd>${单位.每回合回血 ? '5%' : '无'}</dd>` : '';
    打开详情(`${单位.位置 + 1} · ${单位.名称} · 敌方状态`, `<p>${转义(单位.全名 || 当前关卡(配置).名称)}</p><dl><dt>当前生命</dt><dd>${数字(单位.生命)} / ${数字(单位.生命上限)}</dd><dt>当前攻击</dt><dd>${数字(当前攻击(单位))}</dd><dt>基础攻击</dt><dd>${数字(单位.攻击)}</dd>${夏日字段}</dl><p class="敌人状态标记">${转义(标记)}</p><h3>当前效果</h3><div class="表格区"><table><thead><tr><th>属性</th><th>单层数值</th><th>层数</th><th>剩余回合</th></tr></thead><tbody>${效果 || '<tr><td colspan="4">无</td></tr>'}</tbody></table></div>`);
}

function 角色详情(位置) {
    const 单位 = 状态.队伍[位置];
    const 汇总 = ['伤害', '回复', '理论回复', '护盾生成', '护盾吸收', '承伤'].map(名称 => `<dt>${名称}</dt><dd>${数字(单位.统计[名称])}</dd>`).join('');
    const 效果 = 单位.效果.map(效果 => `<tr><td>${转义(效果.属性)}</td><td>${效果数值(效果)}</td><td>${效果.层数}</td><td>${效果.剩余 >= 999 ? '常驻' : 效果.剩余}</td></tr>`).join('');
    打开详情(`${单位.位置 + 1} · ${单位.名称}`, `<p>${转义(单位.全名)}</p><dl><dt>生命上限</dt><dd>${数字(单位.生命上限)}</dd><dt>当前攻击</dt><dd>${数字(当前攻击(单位))}</dd>${汇总}</dl><h3>当前效果</h3><div class="表格区"><table><thead><tr><th>属性</th><th>单层数值</th><th>层数</th><th>剩余回合</th></tr></thead><tbody>${效果 || '<tr><td colspan="4">无</td></tr>'}</tbody></table></div>`);
}

全查('[data-tab]').forEach(按钮 => 按钮.addEventListener('click', () => 切换视图(按钮.dataset.tab)));
全查('[data-open-tab]').forEach(按钮 => 按钮.addEventListener('click', () => 切换视图(按钮.dataset.openTab)));
全查('[data-close]').forEach(按钮 => 按钮.addEventListener('click', () => 按钮.closest('dialog').close()));
查('#关卡选择').addEventListener('change', 包装(事件 => {
    const 关卡 = 事件.target.value;
    const 当前队伍 = structuredClone(配置.队伍);
    const 编队标识 = 队伍 => JSON.stringify(队伍.map(单位 => ({
        ...Object.fromEntries(['编号', '羁绊', '星级', '调教', '普通等级', 'ELV突破等级', '潜力等级', '潜力节点', '解放', '技能版本'].map(字段 => [字段, 单位[字段] ?? null])),
        ELv技能: [...(单位.ELv技能 || [])].sort((前, 后) => 前 - 后),
        录入模型: 单位.已录入技能 ? 单位 : null,
    })));
    存档();
    载入本地记录(关卡);
    if (当前队伍.length && 编队标识(配置.队伍) !== 编队标识(当前队伍)) {
        const 新配置 = { ...配置, 队伍: 当前队伍 };
        const 初始 = 新建战斗(新配置);
        const 键 = 关卡存档键(关卡);
        const 原记录 = localStorage.getItem(键);
        if (原记录) {
            const 备份键 = `${键}-切换编队前备份-${Date.now()}`;
            localStorage.setItem(备份键, 原记录);
            localStorage.setItem(`${键}-最近编队切换备份`, 备份键);
            旧记录备份 = 原记录;
        }
        配置 = 新配置;
        状态 = 初始;
        操作列表 = [];
        游标 = 0;
    }
    攻击目标 = 0;
    存档(); 渲染战场(); 渲染记录(); 刷新当前视图();
}));
查('#敌方队伍').addEventListener('click', 包装(事件 => {
    const 详情 = 事件.target.closest('[data-enemy-detail]');
    if (详情) return 敌方详情(Number(详情.dataset.enemyDetail));
    const 按钮 = 事件.target.closest('[data-enemy-select]');
    if (!按钮 || 按钮.disabled) return;
    攻击目标 = Number(按钮.dataset.enemySelect);
    渲染战场();
}));
查('#敌方队伍').addEventListener('keydown', 事件 => {
    if (!['Enter', ' '].includes(事件.key) || 事件.target.closest('button')) return;
    const 卡片 = 事件.target.closest('[data-enemy]');
    if (!卡片) return;
    事件.preventDefault();
    攻击目标 = Number(卡片.dataset.enemy);
    渲染战场();
});
查('#首领详情').addEventListener('click', 包装(() => 敌方详情(0)));
查('#角色队伍').addEventListener('click', 包装(事件 => {
    const 详情 = 事件.target.closest('[data-detail]');
    if (详情) return 角色详情(Number(详情.dataset.detail));
    const 按钮 = 事件.target.closest('[data-action]');
    if (按钮) 执行({ 类型: '角色', 位置: Number(按钮.dataset.position), 动作: 按钮.dataset.action, 目标: 攻击目标 });
}));
查('#撤销').addEventListener('click', 包装(() => {
    if (游标 === 0 || !状态) return;
    状态 = 重放战斗(配置, 操作列表.slice(0, --游标));
    存档(); 渲染战场(); 渲染记录();
}));
查('#重做').addEventListener('click', 包装(() => {
    if (游标 >= 操作列表.length || !状态) return;
    const 新状态 = 结算操作(状态, 操作列表[游标]);
    游标++;
    状态 = 新状态;
    存档(); 渲染战场(); 渲染记录();
}));
查('#重置').addEventListener('click', () => {
    if (运行中 || !状态) return;
    if (游标 && !confirm('重置本场战斗？编队和战斗设置保留。')) return;
    应用新配置(配置);
});
查('#一回合').addEventListener('click', 包装(() => { if (!状态) return; 自动我方(); 存档(); 渲染战场(); 渲染记录(); }));
查('#启用自动').addEventListener('click', 包装(() => {
    if (!状态) { 通知('请先应用编队开始战斗', true); return; }
    if (游标 && !confirm('保留当前编队与面板，使用自动 AI 重新开始？原记录请先导出。')) return;
    应用新配置({ ...配置, AI初始冷却: 配置.AI初始冷却 ?? 1, 敌方星等: 配置.敌方星等 ?? (配置.关卡 === '夏日尾声' ? 4 : 5) });
}));
查('#日志类别').addEventListener('change', 渲染记录);
查('#应用编队').addEventListener('click', 包装(() => {
    if (!玩家编队.length) throw new Error('请先从角色池编入至少1位角色');
    应用新配置({ ...配置, 队伍: 解析角色引用(玩家编队, 玩家角色池) });
    通知('编队已应用');
}));
查('#添加角色').addEventListener('click', 包装(() => {
    if (玩家编队.length >= 5) throw new Error('最多可编入5位角色');
    if (!玩家角色池.length) throw new Error('角色池是空的，请先到「角色池」页添加角色');
    const 候选 = 玩家角色池.find(项 => !玩家编队.includes(项.编号));
    if (!候选) throw new Error('角色池中的角色都已编入');
    玩家编队 = 校验编队引用([...玩家编队, 候选.编号], 玩家角色池);
    保存玩家数据();
    渲染编队();
    查(`[data-team-row="${玩家编队.length - 1}"] [data-team-select]`)?.focus();
}));
查('#导出编队').addEventListener('click', 包装(() => {
    保存下载('编队.json', JSON.stringify(生成引用编队文件(玩家编队, 玩家角色池), null, 2));
}));
查('#载入编队').addEventListener('click', () => 查('#编队文件').click());
查('#编队文件').addEventListener('change', 包装(async 事件 => {
    const 输入 = 事件.currentTarget;
    const 文件 = 输入.files[0];
    if (!文件) return;
    try {
        if (文件.size > 2000000) throw new Error('编队文件不能超过2 MB');
        const 引用 = 解析引用编队文件(await 文件.text(), 玩家角色池);
        玩家编队 = 引用;
        保存玩家数据();
        刷新当前视图();
        通知(`已载入${引用.length}人编队，应用后生效`);
    } finally { 输入.value = ''; }
}));
查('#编队表').addEventListener('change', 包装(事件 => {
    const 选择 = 事件.target.closest('[data-team-select]');
    if (!选择) return;
    const 位置 = Number(选择.closest('[data-team-row]').dataset.teamRow);
    const 编号 = Number(选择.value);
    if (!Number.isSafeInteger(编号) || 编号 === 玩家编队[位置]) { 渲染编队(); return; }
    const 新队 = [...玩家编队];
    新队[位置] = 编号;
    try { 玩家编队 = 校验编队引用(新队, 玩家角色池); }
    catch (错误) { 渲染编队(); throw 错误; }
    保存玩家数据();
    渲染编队();
}));
查('#导出旧记录').addEventListener('click', () => { if (旧记录备份) 保存下载(`${当前关卡(配置).名称}-原记录.json`, 旧记录备份); });
查('#编队表').addEventListener('click', 包装(事件 => {
    const 技能 = 事件.target.closest('[data-skill-source]');
    if (技能) { const 养成 = 玩家角色池.find(项 => 项.编号 === Number(技能.dataset.skillSource)); if (养成) 显示角色技能(养成); return; }
    const 编辑 = 事件.target.closest('[data-edit-reference]');
    if (编辑) return 打开角色编辑器(Number(编辑.dataset.editReference));
    const 移除 = 事件.target.closest('[data-remove]');
    if (移除) {
        const 位置 = Number(移除.dataset.remove);
        玩家编队 = 校验编队引用(玩家编队.filter((_, 序) => 序 !== 位置), 玩家角色池, true);
        保存玩家数据();
        渲染编队();
        return;
    }
    const 按钮 = 事件.target.closest('[data-move]');
    if (!按钮) return;
    const [位置文字, 方向] = 按钮.dataset.move.split(':');
    const 位置 = Number(位置文字);
    const 目标 = 位置 + (方向 === '上' ? -1 : 1);
    if (目标 < 0 || 目标 >= 玩家编队.length) return;
    const 新队 = [...玩家编队];
    [新队[位置], 新队[目标]] = [新队[目标], 新队[位置]];
    玩家编队 = 校验编队引用(新队, 玩家角色池);
    保存玩家数据();
    渲染编队();
}));
查('#池添加角色').addEventListener('click', 包装(() => 打开角色编辑器(null)));
查('#导出角色池').addEventListener('click', 包装(() => {
    保存下载('角色池.json', JSON.stringify(生成角色池文件(玩家角色池), null, 2));
}));
查('#载入角色池').addEventListener('click', () => 查('#角色池文件').click());
查('#角色池文件').addEventListener('change', 包装(async 事件 => {
    const 输入 = 事件.currentTarget;
    const 文件 = 输入.files[0];
    if (!文件) return;
    try {
        if (文件.size > 5000000) throw new Error('角色池文件不能超过 5 MB');
        const 导入角色 = 解析角色池文件(await 文件.text());
        const 新池 = 合并角色池(玩家角色池, 导入角色);
        保存玩家数据(新池);
        渲染角色池();
        通知(`已导入${导入角色.length}位角色，同编号以导入内容覆盖`);
    } finally { 输入.value = ''; }
}));
查('#角色池列表').addEventListener('click', 包装(事件 => {
    const 编入 = 事件.target.closest('[data-pool-join]');
    if (编入) {
        const 编号 = Number(编入.dataset.poolJoin);
        if (玩家编队.length >= 5) throw new Error('最多可编入5位角色');
        if (玩家编队.includes(编号)) throw new Error('此角色已在编队中');
        玩家编队 = 校验编队引用([...玩家编队, 编号], 玩家角色池);
        保存玩家数据();
        渲染角色池();
        通知(`已编入第${玩家编队.length}站位，到编队页应用后生效`);
        return;
    }
    const 编辑 = 事件.target.closest('[data-pool-edit]');
    if (编辑) return 打开角色编辑器(Number(编辑.dataset.poolEdit));
    const 删除 = 事件.target.closest('[data-pool-del]');
    if (删除) {
        const 编号 = Number(删除.dataset.poolDel);
        const 档案 = 获取真实角色(编号);
        if (!confirm(`从角色池删除「${档案?.全名 ?? 编号}」？此操作不可撤销`)) return;
        const 新池 = 删除池角色(玩家角色池, 编号, 玩家编队);
        保存玩家数据(新池);
        渲染角色池();
        通知('已删除角色');
    }
}));
查('#角色池搜索').addEventListener('input', 渲染角色池);
查('#角色池职业').addEventListener('change', 渲染角色池);
查('#角色池属性').addEventListener('change', 渲染角色池);
查('#保存池角色').addEventListener('click', 包装(() => {
    if (!角色编辑草稿) return;
    const 读取 = 读取角色编辑输入();
    if (!获取真实角色(读取.编号)) throw new Error('请先选择有效的 SSR 角色');
    if (新增角色中 && 玩家角色池.some(项 => 项.编号 === 读取.编号)) throw new Error('此角色已在角色池中，请直接在列表里编辑');
    const 新池 = 更新池角色(玩家角色池, 读取);
    保存玩家数据(新池);
    const 名称 = 获取真实角色(读取.编号).全名;
    const 是新增 = 新增角色中;
    角色编辑草稿 = null;
    新增角色中 = false;
    查('#角色编辑弹窗').close();
    刷新当前视图();
    通知(是新增 ? `已将「${名称}」加入角色池` : `已保存「${名称}」的养成设置`);
}));
查('#角色编辑表').addEventListener('change', 包装(事件 => {
    if (!事件.target.dataset.field && !事件.target.dataset.elv && !事件.target.hasAttribute('data-elv-none') && !事件.target.hasAttribute('data-potential')) return;
    try { 角色编辑草稿 = 读取角色编辑输入(); 事件.target.setCustomValidity(''); }
    catch (错误) { 事件.target.setCustomValidity(错误.message); throw 错误; }
    if (事件.target.dataset.field === '角色输入') 渲染角色编辑表单();
    else 刷新角色编辑说明();
}));
查('#角色编辑表').addEventListener('input', 事件 => { if (事件.target.dataset.field === '角色输入') 事件.target.setCustomValidity(''); });
查('#角色编辑表').addEventListener('click', 事件 => {
    const 技能 = 事件.target.closest('[data-skill-source]');
    if (技能 && 角色编辑草稿) 显示角色技能(角色编辑草稿);
});
查('#角色编辑弹窗').addEventListener('close', () => { 角色编辑草稿 = null; 新增角色中 = false; });
查('#模型表单').addEventListener('submit', 包装(事件 => {
    事件.preventDefault();
    const 表单 = 事件.currentTarget;
    const 新配置 = structuredClone(配置);
    for (const 输入 of 表单.elements) {
        if (!输入.name || 输入.disabled) continue;
        if (输入.type === 'checkbox') 新配置[输入.name] = 输入.checked;
        else if (输入.tagName === 'SELECT') 新配置[输入.name] = 输入.value;
        else 新配置[输入.name] = Number(输入.value) / (['首领减伤', '防御减伤', '受疗降低', '受盾降低'].includes(输入.name) ? 100 : 1);
    }
    if (配置.关卡 === '夏日尾声') {
        新配置.敌人 = 配置.敌人.map((单位, 位置) => {
            const 行 = 查(`[data-enemy-stats="${位置}"]`);
            const 生命上限 = Number(行.querySelector('[data-enemy-field="生命上限"]').value);
            const 攻击 = Number(行.querySelector('[data-enemy-field="攻击"]').value);
            return { ...单位, 生命上限, 攻击, 自定义校准: 单位.自定义校准 || 生命上限 !== 单位.生命上限 || 攻击 !== 单位.攻击 };
        });
        新配置.首领生命 = 新配置.敌人[0].生命上限;
        新配置.首领攻击 = 新配置.敌人[0].攻击;
    }
    应用新配置(新配置);
    通知('战斗设置已应用');
}));
查('#整场运行').addEventListener('click', async () => {
    if (运行中) { 运行中 = false; return; }
    if (!配置.自动敌方 || !状态 || 状态.阶段 === '结束') return;
    运行中 = true;
    渲染战场();
    try {
        while (运行中 && 状态.阶段 !== '结束') {
            const 原游标 = 游标;
            自动我方();
            if (状态.阶段 === '敌方') 执行({ 类型: '敌方自动' }, false);
            if (游标 === 原游标) throw new Error('战斗未推进，请检查当前状态');
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
    } catch (错误) { 通知(用户错误(错误), true);
    } finally { 运行中 = false; 存档(); 渲染战场(); 渲染记录(); }
});
查('#导出').addEventListener('click', () => 保存下载(`${当前关卡(配置).名称}-战斗记录.json`, JSON.stringify({ 配置, 操作列表, 游标, 未开始: !状态 }, null, 2)));
查('#导入').addEventListener('click', () => 查('#导入文件').click());
查('#导入文件').addEventListener('change', 包装(async 事件 => {
    const 文件 = 事件.target.files[0];
    if (!文件) return;
    if (文件.size > 2000000) throw new Error('记录文件不能超过 2 MB');
    导入记录(JSON.parse(await 文件.text()));
    存档(); 渲染战场(); 渲染记录(); 刷新当前视图();
    查('#导入文件').value = '';
    通知('战斗记录已恢复');
}));
查('#导出报表').addEventListener('click', () => {
    const 字段 = ['回合', '技能', '伤害', '回复', '理论回复', '溢出回复', '护盾生成', '护盾吸收', '承伤', '首领回血', '首领生命', '存活'];
    const 报表 = 状态?.回合报表 ?? [];
    const 行列 = [字段, ...报表.map(行 => 字段.map(字段名 => 字段名 === '技能' ? 行动说明(行[字段名]) : 行[字段名]))];
    保存下载(`${当前关卡(配置).名称}-回合报表.csv`, '\ufeff' + 行列.map(行 => 行.map(值 => `"${String(值 ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
});

window.addEventListener('beforeinstallprompt', 事件 => {
    事件.preventDefault();
    安装事件 = 事件;
    查('#安装').hidden = false;
});
查('#安装').addEventListener('click', 包装(async () => {
    if (!安装事件) return;
    await 安装事件.prompt();
    await 安装事件.userChoice;
    安装事件 = null;
    查('#安装').hidden = true;
}));
window.addEventListener('online', () => { 查('#离线状态').textContent = '本地存档'; });
window.addEventListener('offline', () => { 查('#离线状态').textContent = '离线运行'; });

try {
    const 上次关卡 = localStorage.getItem('TKFM-当前关卡') || '颠倒镜';
    初始化玩家数据(上次关卡);
    载入本地记录(上次关卡);
} catch (错误) { 通知(`记录未恢复：${用户错误(错误)}`, true); }
渲染战场();
渲染记录();
try {
    const 上次视图 = sessionStorage.getItem('TKFM-当前视图');
    if (['编队', '角色池', '模型', '记录'].includes(上次视图)) 切换视图(上次视图);
} catch {}
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./离线.js', { scope: './', updateViaCache: 'none' }).then(async 注册 => {
        await navigator.serviceWorker.ready;
        查('#离线状态').textContent = navigator.onLine ? '离线就绪' : '离线运行';
        注册.update().catch(() => {});
    }).catch(() => { 查('#离线状态').textContent = '离线缓存不可用'; });
}
Object.defineProperty(globalThis, '颠倒镜实验室', { value: { get 状态() { return structuredClone(状态); }, get 配置() { return structuredClone(配置); }, get 操作() { return structuredClone(操作列表.slice(0, 游标)); } } });
