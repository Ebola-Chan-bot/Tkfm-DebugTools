import { 新建战斗, 结算操作, 重放战斗, 当前攻击, 当前护盾, 加成, 可选敌人, 预览敌方行动 } from './战斗引擎.mjs';
import { 角色库, 真实角色目录, 获取真实角色, 获取真实技能, 创建角色, 职业列表, 属性列表, 调教加成, 普通等级范围, ELV突破档位, ELV技能解锁等级, 获取潜力养成, 计算调教面板, 统一面板基准, 准备角色技能, 获取技能覆盖报告, 技能模型规则, 获取适用ELv技能 } from './角色数据.mjs';
import { 当前关卡, 创建关卡配置, 敌方技能目录, 敌方技能名称 } from './关卡数据.mjs';
import { 默认CD条件, 比较方式 } from './敌方行动规则.mjs';

const 查 = 选择器 => document.querySelector(选择器);
const 全查 = 选择器 => [...document.querySelectorAll(选择器)];
const 转义 = 内容 => String(内容 ?? '').replace(/[&<>"']/g, 字符 => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[字符]));
const 数字 = 数值 => Math.floor(数值).toLocaleString('zh-CN');
const 简数 = 数值 => Math.abs(数值) >= 1e8 ? `${(数值 / 1e8).toFixed(2)} 亿` : Math.abs(数值) >= 1e4 ? `${(数值 / 1e4).toFixed(2)} 万` : 数字(数值);
const 职业图标 = { 治疗者: 'heart-pulse', 辅助者: 'sparkles', 攻击者: 'sword', 守护者: 'shield', 妨碍者: 'scan-eye' };
const 存档键 = '颠倒镜-战斗存档';
const 关卡存档键 = 关卡 => 关卡 === '夏日尾声' ? '夏日尾声-战斗存档' : 存档键;
let 配置 = 创建关卡配置();
let 操作列表 = [];
let 游标 = 0;
let 状态 = 新建战斗(配置);
let 提示计时器;
let 安装事件;
let 运行中 = false;
let 编队草稿 = null;
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

function 包装(函数) {
    return async 事件 => {
        try {
            if (运行中) throw new Error('整场模拟正在结算');
            await 函数(事件);
        }
        catch (错误) { 通知(错误.message || String(错误), true); }
    };
}

function 存档() {
    try {
        localStorage.setItem(关卡存档键(当前关卡(配置).编号), JSON.stringify({ 配置, 操作列表, 游标 }));
        localStorage.setItem('TKFM-当前关卡', 当前关卡(配置).编号);
        查('#保存状态').textContent = '已保存';
    } catch { 查('#保存状态').textContent = '存储不可用'; }
}

function 导入记录(记录) {
    if (!记录 || typeof 记录 !== 'object' || !Array.isArray(记录.操作列表) || 记录.操作列表.length > 2000) throw new Error('不是有效的战斗记录，或记录过长');
    const 新游标 = 记录.游标 ?? 记录.操作列表.length;
    if (!Number.isInteger(新游标) || 新游标 < 0 || 新游标 > 记录.操作列表.length) throw new Error('记录游标无效');
    const 新状态 = 重放战斗(记录.配置, 记录.操作列表.slice(0, 新游标));
    配置 = structuredClone(记录.配置);
    操作列表 = structuredClone(记录.操作列表);
    游标 = 新游标;
    状态 = 新状态;
    编队草稿 = null;
}

function 载入本地记录(关卡) {
    const 键 = 关卡存档键(关卡);
    const 已存 = localStorage.getItem(键);
    const 最近备份键 = localStorage.getItem(`${键}-最近旧模型备份`);
    旧记录备份 = (最近备份键 && localStorage.getItem(最近备份键)) || localStorage.getItem(`${键}-真实角色修正前备份`);
    if (已存) {
        const 记录 = JSON.parse(已存);
        try { 导入记录(记录); return; }
        catch (错误) {
            const 旧规则 = 记录.配置?.模型规则 !== 技能模型规则;
            if (!旧规则 && !记录.配置?.队伍?.some(单位 => !获取真实角色(单位.编号) || 单位.手动角色 || 单位.星级 === undefined)) throw 错误;
            const 备份键 = `${键}-技能模型备份-${Date.now()}`;
            localStorage.setItem(备份键, 已存);
            localStorage.setItem(`${键}-最近旧模型备份`, 备份键);
            旧记录备份 = 已存;
            配置 = 创建关卡配置(关卡);
            状态 = 新建战斗(配置);
            操作列表 = [];
            游标 = 0;
            编队草稿 = structuredClone(记录.配置.队伍).map(单位 => {
                if (获取真实角色(单位.编号) && !单位.手动角色) return 旧规则 ? { ...单位, 解放: 0, 已录入技能: false } : 单位;
                try {
                    const 真实 = 创建角色(单位.角色输入 || 单位.全名 || 单位.名称);
                    return { ...真实, 羁绊: 单位.羁绊 ?? 5, 调教: 单位.调教 ?? 3, 面板调教: 单位.面板调教 ?? 3 };
                } catch { return 单位; }
            });
            通知('旧记录需按自动面板与当前技能重新开始，原记录已备份；请确认潜力及解放后应用编队。', true);
            return;
        }
    }
    配置 = 创建关卡配置(关卡);
    状态 = 新建战斗(配置);
    操作列表 = [];
    游标 = 0;
    编队草稿 = null;
}

function 图标刷新() {
    globalThis.lucide?.createIcons({ attrs: { 'stroke-width': 1.7 } });
}

function 切换视图(名称) {
    全查('[data-view]').forEach(元素 => { 元素.hidden = 元素.dataset.view !== 名称; });
    全查('[data-tab]').forEach(按钮 => 按钮.setAttribute('aria-selected', String(按钮.dataset.tab === 名称)));
    if (名称 === '编队') 渲染编队();
    if (名称 === '模型') 渲染设置();
    if (名称 === '记录') 渲染记录();
    图标刷新();
}

function 日志行(列表) {
    if (!列表.length) return '<tr><td class="无记录" colspan="4">暂无结算记录</td></tr>';
    return 列表.map(项 => `<tr><td>${项.回合}</td><td><span class="事件签 ${转义(项.类别)}">${转义(项.类别)}</span></td><td>${转义(项.内容)}</td><td>${项.数值 === null ? '—' : 数字(项.数值)}</td></tr>`).join('');
}

function 渲染关卡() {
    const 关卡 = 当前关卡(配置);
    const 夏日 = 关卡.编号 === '夏日尾声';
    查('#关卡选择').value = 关卡.编号;
    查('#关卡名称').textContent = 关卡.名称;
    查('#关卡标签').textContent = 关卡.标签;
    查('#关卡简称').textContent = 关卡.简称;
    查('#关卡编号').textContent = 夏日 ? '60155 · 五敌' : '15249 · 单敌';
    document.title = `${关卡.名称} · 战斗实验室`;
    查('.镜面').src = 夏日 ? './海岸-512.png' : './镜面-512.png';
    查('.镜面').alt = 夏日 ? '夏日海岸原创标记' : '颠倒镜原创镜面标记';
    查('#品牌图').src = 夏日 ? './海岸-512.png' : './镜面-192.png';
    for (const 标识 of ['多敌区域', '夏日面板区域']) 查(`#${标识}`).hidden = !夏日;
    if (!夏日) return;
    const 可选 = 可选敌人(状态);
    if (!可选.some(单位 => 单位.位置 === 攻击目标)) 攻击目标 = 可选[0]?.位置 ?? 0;
    查('#当前目标').textContent = 可选.length ? `目标 · ${状态.敌人[攻击目标].名称}` : '全部击破';
    查('#敌方队伍').innerHTML = 状态.敌人.map(单位 => {
        const 可选择 = 可选.some(项 => 项.位置 === 单位.位置);
        const 标签 = [单位.生命 <= 0 ? '击破' : 单位.已行动 ? '已行动' : '待行动', 加成(单位, '嘲讽') > 0 ? '嘲讽' : '', 单位.防御 || 加成(单位, '防御') > 0 ? '防御' : '', 加成(单位, '锁血') > 0 ? '锁血' : ''].filter(Boolean).join(' · ');
        return `<button class="敌人卡" data-enemy="${单位.位置}" aria-pressed="${攻击目标 === 单位.位置}" aria-label="攻击目标 ${转义(单位.名称)}" ${可选择 ? '' : 'disabled'}><span class="敌人卡标题"><strong>${转义(单位.名称)}</strong><small>${单位.位置 + 1}</small></span><span>${简数(单位.生命)} / ${简数(单位.生命上限)}</span><span class="生命轨"><span style="width:${Math.max(0, 单位.生命 / 单位.生命上限 * 100)}%"></span></span><small>攻击 ${简数(当前攻击(单位))}</small><small>${标签}</small></button>`;
    }).join('');
}

function 角色动作状态(单位) {
    const 控制 = ['睡眠', '麻痹', '封印', '沉默'].filter(属性 => 加成(单位, 属性) > 0);
    const 跳过 = 控制.some(属性 => ['睡眠', '麻痹'].includes(属性));
    const 可攻击 = !控制.some(属性 => ['睡眠', '麻痹', '封印'].includes(属性));
    return { 控制, 跳过, 可攻击, 可必杀: 可攻击 && !控制.includes('沉默') && 单位.冷却剩余 === 0 };
}

function 渲染战场() {
    渲染关卡();
    const 总生命 = 状态.敌人.reduce((合计, 单位) => 合计 + 单位.生命, 0);
    const 总上限 = 状态.敌人.reduce((合计, 单位) => 合计 + 单位.生命上限, 0);
    const 比例 = Math.max(0, 总生命 / 总上限 * 100);
    查('#回合').innerHTML = `${String(状态.回合).padStart(2, '0')} <small>回合</small>`;
    查('#首领生命').textContent = `${配置.关卡 === '夏日尾声' ? '敌方合计 ' : ''}${简数(总生命)} / ${简数(总上限)}`;
    查('#首领比例').textContent = `${比例.toFixed(2)}%`;
    查('#首领生命条').style.width = `${比例}%`;
    const 叠层 = 配置.颠倒规则 ? Math.min(50, 状态.回合 - 1) : 0;
    查('#首领状态').innerHTML = 配置.关卡 === '夏日尾声' ? `<span>夏日 ${状态.首领.夏日层数} / 100</span><span>铃兰攻击 +${(加成(状态.首领, '攻击比例') * 100).toFixed(1)}%</span><span>回合回血 ${状态.首领.每回合回血 ? '5%' : '已移除'}</span>${状态.首领.蓄力 ? `<span>蓄力 · 关心 ${状态.首领.蓄力.关心} / 3 · 剩余 ${Math.max(0, 2 - (状态.回合 - 状态.首领.蓄力.开始回合))} 回合</span>` : ''}` : `<span>攻击 +${叠层 * 5}%</span><span>受盾 −${配置.颠倒规则 ? 配置.受盾降低 * 100 : 0}%</span><span>受疗 −${配置.颠倒规则 ? 配置.受疗降低 * 100 : 0}%</span>${状态.首领.蓄力 ? `<span>蓄力 ${状态.首领.蓄力.命中} / 99</span>` : ''}`;
    查('#总伤害').textContent = 简数(状态.累计伤害);
    查('#本回合回复').textContent = 简数(状态.本回合.回复);
    查('#本回合承伤').textContent = 简数(状态.本回合.承伤);
    查('#存活').innerHTML = `${状态.队伍.filter(单位 => 单位.生命 > 0).length} <small>/ 5</small>`;
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
        return `<article class="角色卡 ${类名}" data-unit="${单位.位置}"><div class="角色卡头"><span class="站位标">${String(单位.位置 + 1).padStart(2, '0')} ${单位.位置 === 0 ? ' / 队长' : ''}</span><button class="图标按钮" data-detail="${单位.位置}" title="${转义(单位.名称)}状态与技能" aria-label="${转义(单位.名称)}状态与技能"><i data-lucide="ellipsis"></i></button></div><div class="角色名行"><div class="职业像 ${转义(单位.职业)}"><i data-lucide="${职业图标[单位.职业]}"></i></div><div><h3 class="角色姓名">${转义(单位.名称)}</h3><div class="角色属性">${转义(单位.属性)} · ${转义(单位.职业)} · 羁绊 ${单位.羁绊}</div></div></div><div class="角色血量"><span>${简数(单位.生命)}</span><span class="比例">${百分比.toFixed(0)}%</span></div><div class="生命轨"><div style="width:${百分比}%;${百分比 < 30 ? 'background:var(--红)' : ''}"></div></div><div class="角色参数"><div><span>当前攻击</span><strong>${简数(当前攻击(单位))}</strong></div><div><span>有效护盾</span><strong>${简数(当前护盾(单位))}</strong></div></div><div class="角色状态"><span>${状态条}</span>${单位.冷却剩余 ? `<span>CD ${单位.冷却剩余}</span>` : '<span>必杀就绪</span>'}${单位.计数.守护 ? `<span>守护 ${单位.计数.守护}</span>` : ''}</div><div class="动作栏"><button data-action="普攻" data-position="${单位.位置}" ${可行动 && 动作状态.可攻击 ? '' : 'disabled'} title="${动作状态.可攻击 ? '普攻' : '受控，无法攻击'}">普攻</button><button data-action="必杀" data-position="${单位.位置}" ${可行动 && 动作状态.可必杀 ? '' : 'disabled'} title="${动作状态.控制.length ? '受控或沉默，无法施放必杀' : 单位.冷却剩余 ? `冷却 ${单位.冷却剩余} 回合` : '必杀'}">${单位.冷却剩余 ? `CD ${单位.冷却剩余}` : '必杀'}</button><button data-action="防御" data-position="${单位.位置}" ${可行动 ? '' : 'disabled'} title="${动作状态.跳过 ? '受控，跳过本次行动' : '防御'}" aria-label="${转义(单位.名称)}${动作状态.跳过 ? '跳过行动' : '防御'}"><i data-lucide="${动作状态.跳过 ? 'step-forward' : 'shield'}"></i></button></div></article>`;
    }).join('');
    const 结束 = 状态.阶段 === '结束';
    查('#结局').hidden = !结束;
    if (结束) 查('#结局').textContent = 状态.敌人.every(单位 => 单位.生命 <= 0) ? `${当前关卡(配置).名称}已通关` : 状态.队伍.every(单位 => 单位.生命 <= 0) ? '队伍全灭' : '已到达设定的回合上限';
    查('#最近日志').innerHTML = 日志行(状态.日志.slice(-10).reverse());
    图标刷新();
}

function 渲染记录() {
    const 类别 = 查('#日志类别').value;
    查('#全部日志').innerHTML = 日志行(状态.日志.filter(项 => !类别 || 项.类别 === 类别).slice(-600).reverse());
    查('#报表').innerHTML = 状态.回合报表.length ? 状态.回合报表.map(行 => `<tr><td>${行.回合}</td><td>${转义(行.技能)}</td>${['伤害', '回复', '理论回复', '护盾生成', '护盾吸收', '承伤'].map(字段 => `<td>${简数(行[字段])}</td>`).join('')}<td>${行.存活}/5</td></tr>`).join('') : '<tr><td colspan="9" class="无记录">尚无已结算回合</td></tr>';
    查('#AI轨迹').innerHTML = (状态.AI轨迹 || []).slice(-400).reverse().map(项 => `<tr><td>${项.回合}</td><td>${转义(项.时点)}</td><td>${转义(状态.敌人.find(单位 => 单位.编号 === 项.单位编号)?.名称)}</td><td>${项.槽位 + 1}</td><td>${转义(敌方技能名称(配置, 项.技能编号))}</td><td>${转义(项.条件)}</td></tr>`).join('') || '<tr><td colspan="6">暂无 AI 记录</td></tr>';
}

function 解放选择(单位, 位置) {
    const 阶段 = 获取真实角色(单位.编号)?.解放阶段 || [];
    return `<label data-label="解放"><select data-field="解放" aria-label="站位${位置 + 1}解放" ${阶段.length ? '' : 'disabled'}>${[0, ...阶段].map(档 => `<option value="${档}" ${档 === 单位.解放 ? 'selected' : ''}>${档 ? `阶段${档}` : '未解放'}</option>`).join('')}</select></label>`;
}

function ELv选择(单位, 位置) {
    const 技能 = 获取适用ELv技能(单位.编号);
    const 分类 = { profession1: '职业强化Ⅰ', common: '通用强化', element: '属性强化', profession2: '职业强化Ⅱ' };
    return `<details class="ELv详情"><summary title="按所选真实技能计算，不推定游戏槽位与解锁级别">ELv技能 <span class="ELv已选">${单位.ELv技能?.length || 0}项</span></summary>${Object.entries(分类).map(([键, 名]) => `<div class="ELv分类"><strong>${名}</strong><div class="ELv网格">${技能.filter(项 => 项.分类 === 键).map(项 => `<label class="ELv选项" title="${转义(`${项.编号}${项.校核依据 ? ` · ${项.校核依据}` : ''}`)}"><input type="checkbox" data-elv="${项.编号}" value="${项.编号}" ${(单位.ELv技能 || []).includes(项.编号) ? 'checked' : ''} aria-label="站位${位置 + 1} ELv ${转义(项.名称)}"><span><b>${转义(项.名称)}</b><small>${转义(项.校核说明 || 项.说明)}</small></span></label>`).join('')}</div></div>`).join('')}</details>`;
}

function 渲染编队() {
    编队草稿 ??= structuredClone(配置.队伍);
    查('#角色候选').innerHTML = 真实角色目录.map(单位 => `<option value="${单位.编号} ${转义(单位.全名)}" label="${转义([单位.资料, ...单位.别名.filter(名 => /[\u3400-\u9fff]/.test(名)).slice(0, 6)].join(' · '))}"></option>`).join('');
    查('#角色目录数量').textContent = `${真实角色目录.length}位 SSR 角色`;
    查('#导出旧记录').hidden = !旧记录备份;
    编队草稿 = 编队草稿.map(单位 => {
        let 面板;
        try { 面板 = 统一面板基准(单位); } catch { 面板 = { ...单位, 星级: 单位.星级 ?? 3, 调教: 单位.调教 ?? 3 }; }
        return { ...面板, 角色输入: 获取真实角色(单位.编号) ? 单位.角色输入 ?? `${单位.编号} ${单位.全名 || 单位.名称}` : '' };
    });
    查('#编队表').innerHTML = 编队草稿.map((单位, 位置) => `<div class="编队行" data-team-row="${位置}">
        <div class="编队主行">
            <div class="位置输入"><span class="站位标">${位置 + 1}</span><input data-field="角色输入" data-text type="text" list="角色候选" maxlength="100" value="${转义(单位.角色输入)}" aria-label="站位${位置 + 1}角色" placeholder="搜索 SSR 名称或编号" autocomplete="off"></div>
            <label data-label="普通等级"><input data-field="普通等级" type="number" min="${普通等级范围.最低}" max="${普通等级范围.最高}" step="1" value="${单位.普通等级 ?? 普通等级范围.最高}" aria-label="站位${位置 + 1}普通等级"></label>
            <label data-label="ELV突破"><input data-field="ELV突破等级" type="number" min="0" max="${ELV突破档位.at(-1).等级}" step="1" value="${单位.ELV突破等级 ?? 0}" aria-label="站位${位置 + 1}ELV突破等级" title="突破要求60级及潜力5满或6以上"></label>
            <label data-label="羁绊"><select data-field="羁绊" aria-label="站位${位置 + 1}羁绊">${[1, 2, 3, 4, 5].map(档 => `<option ${档 === 单位.羁绊 ? 'selected' : ''}>${档}</option>`).join('')}</select></label>
            <label data-label="星级"><select data-field="星级" aria-label="站位${位置 + 1}星级">${[3, 4, 5].map(星 => `<option ${星 === 单位.星级 ? 'selected' : ''}>${星}</option>`).join('')}</select></label>
            <label data-label="调教"><select data-field="调教" aria-label="站位${位置 + 1}调教">${调教加成.map((增加, 档) => `<option value="${档}" ${档 === 单位.调教 ? 'selected' : ''}>${档}</option>`).join('')}</select></label>${解放选择(单位, 位置)}
            <div class="面板结果" data-label="生命"><output data-panel-stat="生命上限" aria-label="站位${位置 + 1}生命"></output></div>
            <div class="面板结果" data-label="攻击"><output data-panel-stat="攻击" aria-label="站位${位置 + 1}攻击"></output></div>
            <div class="排序工具"><button class="图标按钮" data-move="${位置}:上" ${位置 === 0 ? 'disabled' : ''} title="上移站位" aria-label="上移站位"><i data-lucide="arrow-up"></i></button><button class="图标按钮" data-move="${位置}:下" ${位置 === 4 ? 'disabled' : ''} title="下移站位" aria-label="下移站位"><i data-lucide="arrow-down"></i></button></div>
        </div>
        <div class="潜力养成"><label>潜力<select data-field="潜力等级" aria-label="站位${位置 + 1}潜力等级">${Array.from({ length: 12 }, (_, 序) => 序 + 1).map(阶 => `<option ${阶 === 单位.潜力等级 ? 'selected' : ''}>${阶}</option>`).join('')}</select></label><fieldset class="潜力节点"><legend>本阶节点</legend>${Array.from({ length: 6 }, (_, 序) => `<label><input type="checkbox" data-potential="${序}" aria-label="站位${位置 + 1}潜力节点${序 + 1}"><span></span></label>`).join('')}</fieldset></div>
        <div class="编队参数"><label>职业<select aria-label="站位${位置 + 1}职业" disabled><option>${转义(单位.职业)}</option></select></label><label>属性<select aria-label="站位${位置 + 1}属性" disabled><option>${转义(单位.属性)}</option></select></label><span class="档案标签"></span></div>
    </div>`).join('');
    for (const [位置, 单位] of 编队草稿.entries()) {
        const 行 = 查(`[data-team-row="${位置}"]`);
        行.insertAdjacentHTML('beforeend', ELv选择(单位, 位置));
    }
    渲染编队说明();
    图标刷新();
}

function 渲染编队说明() {
    编队草稿 = 编队草稿.map(单位 => 获取真实角色(单位.编号) ? 准备角色技能(单位) : 单位);
    for (const [位置, 单位] of 编队草稿.entries()) {
        const 行 = 查(`[data-team-row="${位置}"]`);
        const 潜力 = 获取潜力养成(单位);
        for (const 输入 of 行.querySelectorAll('[data-potential]')) {
            const 序 = Number(输入.dataset.potential);
            const 节点 = 潜力.节点[序];
            输入.checked = 潜力.潜力节点[序];
            输入.nextElementSibling.textContent = 节点.属性 === 'PASSIVE' ? `被动${节点.数值}` : `${节点.属性 === 'HP' ? '生命' : '攻击'} +${节点.数值}%`;
        }
        const 突破等级 = 单位.ELV突破等级 ?? 0;
        const 突破技能 = 获取适用ELv技能(单位.编号);
        for (const 输入 of 全查(`[data-team-row="${位置}"] [data-elv]`)) {
            const 技能 = 突破技能.find(项 => 项.编号 === Number(输入.value));
            const 门槛 = ELV技能解锁等级[技能.分类];
            输入.disabled = (单位.普通等级 ?? 普通等级范围.最高) !== 普通等级范围.最高 || !潜力.可突破 || 突破等级 < 门槛;
            输入.closest('label').title = `${技能.编号} · ELV${门槛}解锁${技能.校核依据 ? ` · ${技能.校核依据}` : ''}`;
        }
        const ELv标签 = 查(`[data-team-row="${位置}"] .ELv已选`);
        if (ELv标签) ELv标签.textContent = `${单位.ELv技能?.length || 0}项`;
        const 标签 = 查(`[data-team-row="${位置}"] .编队参数 .档案标签:last-child`);
        标签.textContent = !获取真实角色(单位.编号) ? '未匹配支持的 SSR' : 单位.已录入技能 ? '用户录入技能' : 单位.技能来源 === '真实文本模型' ? '文本模型 · 待实测' : 单位.技能已建模 ? '专属模型' : '技能缺口待补';
        try {
            const 面板 = 计算调教面板(单位);
            const ELV输入 = 查(`[data-team-row="${位置}"] [data-field="ELV突破等级"]`);
            ELV输入.value = 面板.ELV突破等级;
            ELV输入.disabled = 面板.普通等级 !== 普通等级范围.最高 || !潜力.可突破;
            for (const 输出 of 行.querySelectorAll('[data-panel-stat]')) 输出.value = 数字(面板[输出.dataset.panelStat]);
        } catch { for (const 输出 of 行.querySelectorAll('[data-panel-stat]')) 输出.value = '--'; }
    }
    查('#应用编队').disabled = 编队草稿.some(单位 => !获取真实角色(单位.编号) || !单位.技能已建模);
    查('#角色覆盖').innerHTML = 编队草稿.map((单位, 位置) => 获取真实角色(单位.编号) ? `<div><strong>${转义(单位.名称)}</strong><p>${转义(单位.覆盖说明)}<small>数据依据：${转义(单位.资料)} · ${单位.星级}星 · 调教 ${单位.调教}</small><button class="文字按钮" data-skill-source="${位置}">真实技能资料<i data-lucide="book-open"></i></button></p></div>` : `<div><strong>站位 ${位置 + 1}</strong><p>尚未匹配真实角色</p></div>`).join('');
}

function 读取编队输入() {
    return 全查('[data-team-row]').map((行, 位置) => {
        const 原单位 = 编队草稿[位置];
        const 单位 = structuredClone(原单位);
        for (const 输入 of 行.querySelectorAll('[data-field]')) {
            if (输入.disabled) continue;
            单位[输入.dataset.field] = 输入.hasAttribute('data-text') ? 输入.value.trim() : Number(输入.value);
        }
        if (单位.角色输入 !== 原单位.角色输入) {
            const 匹配 = 创建角色(单位.角色输入);
            if (匹配.编号 !== 原单位.编号) return 匹配;
            单位.角色输入 = 匹配.角色输入;
        }
        单位.潜力节点 = [...行.querySelectorAll('[data-potential]')].map(输入 => 输入.checked);
        if (单位.潜力等级 !== 原单位.潜力等级) 单位.潜力节点 = Array(6).fill(false);
        if (单位.普通等级 < 普通等级范围.最高 || !获取潜力养成(单位).可突破) 单位.ELV突破等级 = 0;
        单位.ELv技能 = [...行.querySelectorAll('input[data-elv]:checked')].map(输入 => Number(输入.value));
        if (单位.普通等级 !== 原单位.普通等级 || 单位.ELV突破等级 !== 原单位.ELV突破等级) {
            const 解锁 = 获取适用ELv技能(单位.编号).filter(项 => 单位.普通等级 === 普通等级范围.最高 && 单位.ELV突破等级 >= ELV技能解锁等级[项.分类]).map(项 => 项.编号);
            单位.ELv技能 = 单位.ELv技能.filter(编号 => 解锁.includes(编号));
            for (const 输入 of 行.querySelectorAll('[data-elv]')) 输入.checked = 单位.ELv技能.includes(Number(输入.value));
        }
        return 统一面板基准(单位);
    });
}

function 渲染设置() {
    const 表单 = 查('#模型表单');
    const 夏日 = 配置.关卡 === '夏日尾声';
    for (const 名称 of ['首领生命', '首领攻击', '回合上限', 'AI初始冷却', 'AI事件时点', '敌方星等', '首领减伤', '防御减伤', '受疗降低', '受盾降低', '持续治疗时点', '防御易伤目标', '倒置增益归属', '颠倒规则', '零回复触发']) {
        const 输入 = 表单.elements.namedItem(名称);
        const 专属 = ['首领生命', '首领攻击', '受疗降低', '受盾降低', '防御易伤目标', '倒置增益归属', '颠倒规则'].includes(名称);
        输入.disabled = 夏日 && 专属;
        输入.closest('label').hidden = 夏日 && 专属;
        if (输入.type === 'checkbox') 输入.checked = Boolean(配置[名称]);
        else 输入.value = ['首领减伤', '防御减伤', '受疗降低', '受盾降低'].includes(名称) ? 配置[名称] * 100 : 配置[名称] ?? (名称 === 'AI初始冷却' ? 1 : 名称 === 'AI事件时点' ? '伤害后' : 夏日 ? 4 : 5);
    }
    查('#敌方面板').innerHTML = 夏日 ? 配置.敌人.map((单位, 位置) => `<div class="敌方面板行" data-enemy-stats="${位置}"><strong>${转义(单位.名称)}</strong><label>生命上限<input data-enemy-field="生命上限" type="number" min="1" value="${单位.生命上限}" required></label><label>基础攻击<input data-enemy-field="攻击" type="number" min="1" value="${单位.攻击}" required></label></div>`).join('') : '';
    查('#模型边界').textContent = 'AI 按原表条件与槽位调度；CD 解释、事件时点和敌方面板仍需实测校准。明确属性参与克制，未设属性按中性。';
    查('#AI条件配置').innerHTML = Object.entries(默认CD条件).map(([编号, 默认]) => {
        const 条件 = 配置.AICD条件?.[编号] || 默认;
        return `<div class="敌方面板行" data-ai-condition="${编号}"><strong>条件 ${编号}</strong><label>字段<select data-ai-field="字段" aria-label="条件${编号}字段">${['当前冷却', '最大冷却'].map(字段 => `<option ${字段 === 条件.字段 ? 'selected' : ''}>${字段}</option>`).join('')}</select></label><label>比较<select data-ai-field="比较" aria-label="条件${编号}比较">${比较方式.map(方式 => `<option ${方式 === 条件.比较 ? 'selected' : ''} value="${转义(方式)}">${转义(方式)}</option>`).join('')}</select></label></div>`;
    }).join('');
    const 目录 = 夏日 ? 状态.敌人.flatMap(单位 => 敌方技能目录(配置, 单位.位置).filter(项 => 项[1]).map(([名称, 编号, 描述]) => [`${单位.名称} · ${名称}`, 编号, 描述])) : 敌方技能目录(配置).filter(项 => 项[1]);
    查('#技能目录').innerHTML = 目录.map(([名称, 编号, 描述]) => `<div><strong>${转义(名称)}</strong><span>${转义(描述)}</span><span>原始技能 ${编号}</span></div>`).join('');
}

function 应用新配置(新配置) {
    新配置 = { ...新配置, 自动敌方: true };
    const 初始 = 新建战斗(新配置);
    配置 = structuredClone(新配置);
    操作列表 = [];
    游标 = 0;
    状态 = 初始;
    编队草稿 = null;
    存档();
    渲染战场();
    渲染记录();
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

function 角色详情(位置) {
    const 单位 = 状态.队伍[位置];
    const 汇总 = ['伤害', '回复', '理论回复', '护盾生成', '护盾吸收', '承伤'].map(名称 => `<dt>${名称}</dt><dd>${数字(单位.统计[名称])}</dd>`).join('');
    const 效果 = 单位.效果.map(效果 => `<tr><td>${转义(效果.属性)}</td><td>${效果.属性 === '攻击固定' ? 数字(效果.数值) : `${(效果.数值 * 100).toFixed(1)}%`}</td><td>${效果.层数}</td><td>${效果.剩余 >= 999 ? '常驻' : 效果.剩余}</td></tr>`).join('');
    打开详情(`${单位.位置 + 1} · ${单位.名称}`, `<p>${转义(单位.全名)} · ${转义(单位.资料)}</p><p>${转义(单位.覆盖说明)}</p><dl><dt>生命上限</dt><dd>${数字(单位.生命上限)}</dd><dt>当前攻击</dt><dd>${数字(当前攻击(单位))}</dd>${汇总}</dl><h3>有效增益</h3><div class="表格区"><table><thead><tr><th>属性</th><th>单层数值</th><th>层数</th><th>剩余回合</th></tr></thead><tbody>${效果 || '<tr><td colspan="4">无</td></tr>'}</tbody></table></div>`);
}

全查('[data-tab]').forEach(按钮 => 按钮.addEventListener('click', () => 切换视图(按钮.dataset.tab)));
全查('[data-open-tab]').forEach(按钮 => 按钮.addEventListener('click', () => 切换视图(按钮.dataset.openTab)));
全查('[data-close]').forEach(按钮 => 按钮.addEventListener('click', () => 按钮.closest('dialog').close()));
查('#关卡选择').addEventListener('change', 包装(事件 => {
    const 关卡 = 事件.target.value;
    存档();
    载入本地记录(关卡);
    攻击目标 = 0;
    存档(); 渲染战场(); 渲染记录(); 切换视图('战场');
}));
查('#敌方队伍').addEventListener('click', 事件 => {
    const 按钮 = 事件.target.closest('[data-enemy]');
    if (!按钮) return;
    攻击目标 = Number(按钮.dataset.enemy);
    渲染战场();
});
查('#角色队伍').addEventListener('click', 包装(事件 => {
    const 详情 = 事件.target.closest('[data-detail]');
    if (详情) return 角色详情(Number(详情.dataset.detail));
    const 按钮 = 事件.target.closest('[data-action]');
    if (按钮) 执行({ 类型: '角色', 位置: Number(按钮.dataset.position), 动作: 按钮.dataset.action, 目标: 攻击目标 });
}));
查('#撤销').addEventListener('click', 包装(() => {
    if (游标 === 0) return;
    状态 = 重放战斗(配置, 操作列表.slice(0, --游标));
    存档(); 渲染战场(); 渲染记录();
}));
查('#重做').addEventListener('click', 包装(() => {
    if (游标 >= 操作列表.length) return;
    const 新状态 = 结算操作(状态, 操作列表[游标]);
    游标++;
    状态 = 新状态;
    存档(); 渲染战场(); 渲染记录();
}));
查('#重置').addEventListener('click', () => {
    if (运行中) return;
    if (游标 && !confirm('重置本场战斗？编队和模型设置保留。')) return;
    应用新配置(配置);
});
查('#一回合').addEventListener('click', 包装(() => { 自动我方(); 存档(); 渲染战场(); 渲染记录(); }));
查('#启用自动').addEventListener('click', 包装(() => {
    if (游标 && !confirm('保留当前编队与面板，使用自动 AI 重新开始？原记录请先导出。')) return;
    应用新配置({ ...配置, AI初始冷却: 配置.AI初始冷却 ?? 1, 敌方星等: 配置.敌方星等 ?? (配置.关卡 === '夏日尾声' ? 4 : 5) });
}));
查('#日志类别').addEventListener('change', 渲染记录);
查('#应用编队').addEventListener('click', 包装(() => { 应用新配置({ ...配置, 队伍: 读取编队输入() }); 切换视图('战场'); 通知('编队已应用'); }));
查('#编队表').addEventListener('change', 包装(事件 => {
    if (!事件.target.dataset.field && !事件.target.dataset.elv && !事件.target.hasAttribute('data-potential')) return;
    try { 编队草稿 = 读取编队输入(); 事件.target.setCustomValidity(''); }
    catch (错误) { 事件.target.setCustomValidity(错误.message); throw 错误; }
    if (事件.target.dataset.field === '角色输入') 渲染编队();
    else 渲染编队说明();
}));
查('#编队表').addEventListener('input', 事件 => { if (事件.target.dataset.field === '角色输入') 事件.target.setCustomValidity(''); });
查('#导出旧记录').addEventListener('click', () => { if (旧记录备份) 保存下载('真实角色修正前-旧记录.json', 旧记录备份); });
查('#角色覆盖').addEventListener('click', 事件 => {
    const 按钮 = 事件.target.closest('[data-skill-source]');
    if (!按钮) return;
    const 单位 = 编队草稿[Number(按钮.dataset.skillSource)];
    const 技能 = 获取真实技能(单位.编号, 单位.羁绊, 单位.技能版本 ?? null, 单位.解放 ?? 0);
    if (!技能) return;
    const 分类 = [['普攻', 技能.ATTACK], [`必杀 · 羁绊${单位.羁绊}`, 技能.当前必杀], ['队长技', 技能.LEADER], ['被动一', 技能.PASSIVE_1], ['被动二', 技能.PASSIVE_2], ['被动三', 技能.PASSIVE_3], ['潜力技能一', 技能.GENERAL_1], ['潜力技能二', 技能.GENERAL_2]];
    打开详情(`${单位.全名} · 技能资料`, `<p>修订 ${技能.版本} · 解放阶段 ${技能.解放}</p>` + 分类.filter(([, 项]) => 项).map(([类别, 项]) => `<h3>${转义(类别)} · ${转义(项.名称)}</h3><p style="white-space:pre-wrap">${转义(项.说明)}</p>${项.校核说明 ? `<details><summary>结构校核说明</summary><p>${转义(项.校核依据)}</p><p style="white-space:pre-wrap">${转义(项.校核说明)}</p></details>` : ''}`).join(''));
});
查('#编队表').addEventListener('click', 包装(事件 => {
    const 按钮 = 事件.target.closest('[data-move]');
    if (!按钮) return;
    const [位置文字, 方向] = 按钮.dataset.move.split(':');
    const 位置 = Number(位置文字);
    const 目标 = 位置 + (方向 === '上' ? -1 : 1);
    const 队伍 = 读取编队输入();
    [队伍[位置], 队伍[目标]] = [队伍[目标], 队伍[位置]];
    编队草稿 = 队伍;
    渲染编队();
}));
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
            return { ...单位, 生命上限: Number(行.querySelector('[data-enemy-field="生命上限"]').value), 攻击: Number(行.querySelector('[data-enemy-field="攻击"]').value) };
        });
        新配置.首领生命 = 新配置.敌人[0].生命上限;
        新配置.首领攻击 = 新配置.敌人[0].攻击;
    }
    新配置.AICD条件 = Object.fromEntries(全查('[data-ai-condition]').map(行 => [行.dataset.aiCondition, { 字段: 行.querySelector('[data-ai-field="字段"]').value, 比较: 行.querySelector('[data-ai-field="比较"]').value }]));
    应用新配置(新配置);
    切换视图('战场');
    通知('模型设置已应用');
}));
查('#整场运行').addEventListener('click', async () => {
    if (运行中) { 运行中 = false; return; }
    if (!配置.自动敌方 || 状态.阶段 === '结束') return;
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
    } catch (错误) { 通知(错误.message, true);
    } finally { 运行中 = false; 存档(); 渲染战场(); 渲染记录(); }
});
查('#导出AI').addEventListener('click', () => 保存下载(`${当前关卡(配置).名称}-AI轨迹.json`, JSON.stringify({ 配置, 操作列表, 游标, AI轨迹: 状态.AI轨迹 || [] }, null, 2)));
查('#导出技能覆盖').addEventListener('click', () => 保存下载('SSR-技能覆盖.json', JSON.stringify(获取技能覆盖报告(), null, 2)));
查('#导出').addEventListener('click', () => 保存下载(`${当前关卡(配置).名称}-战斗记录.json`, JSON.stringify({ 配置, 操作列表, 游标 }, null, 2)));
查('#导入').addEventListener('click', () => 查('#导入文件').click());
查('#导入文件').addEventListener('change', 包装(async 事件 => {
    const 文件 = 事件.target.files[0];
    if (!文件) return;
    if (文件.size > 2000000) throw new Error('记录文件不能超过 2 MB');
    导入记录(JSON.parse(await 文件.text()));
    存档(); 渲染战场(); 渲染记录(); 切换视图('战场');
    查('#导入文件').value = '';
    通知('战斗记录已恢复');
}));
查('#导出报表').addEventListener('click', () => {
    const 字段 = ['回合', '技能', '伤害', '回复', '理论回复', '溢出回复', '护盾生成', '护盾吸收', '承伤', '首领回血', '首领生命', '存活'];
    const 行列 = [字段, ...状态.回合报表.map(行 => 字段.map(字段名 => 行[字段名]))];
    保存下载(`${当前关卡(配置).名称}-回合报表.csv`, '\ufeff' + 行列.map(行 => 行.map(值 => `"${String(值 ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
});
查('#编辑规则').addEventListener('click', () => {
    查('#规则输入').value = JSON.stringify(读取编队输入(), null, 2);
    查('#规则弹窗').showModal();
});
查('#保存规则').addEventListener('click', 包装(() => {
    const 队伍 = JSON.parse(查('#规则输入').value);
    if (Array.isArray(队伍)) for (const 单位 of 队伍) if (获取真实角色(单位.编号) && Array.isArray(单位.普攻) && 单位.普攻.length && Array.isArray(单位.必杀) && 单位.必杀.length) { 单位.已录入技能 = true; 单位.技能已建模 = true; }
    应用新配置({ ...配置, 队伍 });
    查('#规则弹窗').close();
    切换视图('战场');
}));
查('#证据').addEventListener('click', () => {
    const 来源 = 配置.关卡 === '夏日尾声' ? '关卡60155 → 编组42096 → 单位42281—42285。60162为SP版，不作为当前关卡。原表等级字段68、星等字段4。' : '关卡15249 → 编组43146 → 单位43248。名称已核对为颠倒镜，第27季SP-4以用户确认名称为锚。';
    打开详情('数据依据与模型边界', `<p>${来源}</p><h3>直接证据</h3><p>EnemyAI全表1225条，单条703字节，其中20个35字节规则。两关6名敌人共43条规则的动作、技能、条件参数、连接与选敌字段均与原表一致。原生测试敌人60136／60137及技能23976—23991明确说明60—65为当回合普攻、必杀、防御次数。周期技能及参数、血线和人数参数来自原表，不是人工填写时间表。</p><h3>自动运行</h3><p>开场、事件、普通行动与蓄力后续自动执行。每次命中保留回合、时点、敌人、原规则槽位和条件，可导出AI记录并确定性重放。</p><h3>待实测的解释</h3><p>16、42、45、76、78的CD比较含义，触发模式0／1／2及行为标志的执行时点为静态交叉推定，尚未从受保护的IL2CPP方法直接验证。实际面板、伤害乘区、并列选人和真伤与护盾关系亦需校准。</p><h3>养成与技能覆盖</h3><p>全部${真实角色目录.length}位真实SSR使用统一文本模型，覆盖3至5星、羁绊1至5及资料存在的真实解放阶段。生命和攻击由真实初始属性、等级、星级、调教、解放、潜力节点与ELV自动计算，不使用手填数值。ELv技能按真实编号显式选择，并校验职业、属性及突破资格。可从编队导出全档覆盖报告，技能编译覆盖不穷举潜力节点组合，也不等于官方实测校准。数据仅保存在本机，不发布tenkaassist运行代码。</p>`);
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
    载入本地记录(上次关卡);
} catch (错误) { 通知(`存档未恢复：${错误.message}`, true); }
渲染战场();
渲染记录();
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./离线.js', { scope: './', updateViaCache: 'none' }).then(async 注册 => {
        await navigator.serviceWorker.ready;
        查('#离线状态').textContent = navigator.onLine ? '离线就绪' : '离线运行';
        注册.update().catch(() => {});
    }).catch(() => { 查('#离线状态').textContent = '离线缓存不可用'; });
}
Object.defineProperty(globalThis, '颠倒镜实验室', { value: { get 状态() { return structuredClone(状态); }, get 配置() { return structuredClone(配置); }, get 操作() { return structuredClone(操作列表.slice(0, 游标)); } } });