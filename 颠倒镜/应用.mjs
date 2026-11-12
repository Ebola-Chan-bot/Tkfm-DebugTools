import { 新建战斗, 结算操作, 重放战斗, 当前攻击, 当前护盾, 加成 } from './战斗引擎.mjs';
import { 角色库, 创建编队, 默认配置, 首领技能 } from './角色数据.mjs';

const 查 = 选择器 => document.querySelector(选择器);
const 全查 = 选择器 => [...document.querySelectorAll(选择器)];
const 转义 = 内容 => String(内容 ?? '').replace(/[&<>"']/g, 字符 => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[字符]));
const 数字 = 数值 => Math.floor(数值).toLocaleString('zh-CN');
const 简数 = 数值 => Math.abs(数值) >= 1e8 ? `${(数值 / 1e8).toFixed(2)} 亿` : Math.abs(数值) >= 1e4 ? `${(数值 / 1e4).toFixed(2)} 万` : 数字(数值);
const 职业图标 = { 治疗者: 'heart-pulse', 辅助者: 'sparkles', 攻击者: 'sword', 守护者: 'shield', 妨碍者: 'scan-eye' };
const 存档键 = '颠倒镜-战斗存档';
const 支持技能 = new Set(首领技能.map(项 => 项[0]));
let 配置 = 默认配置();
let 操作列表 = [];
let 游标 = 0;
let 状态 = 新建战斗(配置);
let 提示计时器;
let 安装事件;
let 运行中 = false;
let 编队草稿 = null;

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
            if (运行中) throw new Error('时间表正在结算');
            await 函数(事件);
        }
        catch (错误) { 通知(错误.message || String(错误), true); }
    };
}

function 存档() {
    try {
        localStorage.setItem(存档键, JSON.stringify({ 配置, 操作列表, 游标 }));
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

function 渲染战场() {
    const 比例 = Math.max(0, 状态.首领.生命 / 状态.首领.生命上限 * 100);
    查('#回合').innerHTML = `${String(状态.回合).padStart(2, '0')} <small>回合</small>`;
    查('#首领生命').textContent = `${简数(状态.首领.生命)} / ${简数(状态.首领.生命上限)}`;
    查('#首领比例').textContent = `${比例.toFixed(2)}%`;
    查('#首领生命条').style.width = `${比例}%`;
    const 叠层 = 配置.颠倒规则 ? Math.min(50, 状态.回合 - 1) : 0;
    查('#首领状态').innerHTML = `<span>攻击 +${叠层 * 5}%</span><span>受盾 −${配置.颠倒规则 ? 配置.受盾降低 * 100 : 0}%</span><span>受疗 −${配置.颠倒规则 ? 配置.受疗降低 * 100 : 0}%</span>${状态.首领.蓄力 ? `<span>蓄力 ${状态.首领.蓄力.命中} / 99</span>` : ''}`;
    查('#总伤害').textContent = 简数(状态.累计伤害);
    查('#本回合回复').textContent = 简数(状态.本回合.回复);
    查('#本回合承伤').textContent = 简数(状态.本回合.承伤);
    查('#存活').innerHTML = `${状态.队伍.filter(单位 => 单位.生命 > 0).length} <small>/ 5</small>`;
    查('#阶段').textContent = 状态.阶段 === '我方' ? '我方' : 状态.阶段 === '敌方' ? '敌方' : '已结束';
    查('#撤销').disabled = 游标 === 0 || 运行中;
    查('#重做').disabled = 游标 >= 操作列表.length || 运行中;
    查('#一回合').disabled = 状态.阶段 !== '我方' || 运行中;
    查('#结算敌方').disabled = 状态.阶段 !== '敌方' || 运行中;
    查('#敌方标题').textContent = 状态.阶段 === '敌方' ? '我方行动完毕' : 状态.阶段 === '结束' ? '本场战斗结束' : '等待我方完成行动';
    查('#蓄力校准').hidden = !状态.首领.蓄力;
    if (状态.首领.蓄力) 查('#命中数').value = 状态.首领.蓄力.命中;
    查('#角色队伍').innerHTML = 状态.队伍.map(单位 => {
        const 可行动 = 状态.阶段 === '我方' && 单位.生命 > 0 && !单位.已行动 && !运行中;
        const 百分比 = Math.max(0, 单位.生命 / 单位.生命上限 * 100);
        const 类名 = [单位.已行动 ? '已行动' : '', 单位.生命 <= 0 ? '已倒下' : '', 单位.防御 ? '防御中' : ''].join(' ');
        const 状态条 = 单位.生命 <= 0 ? '倒下' : 单位.防御 ? '防御中' : 单位.已行动 ? '已行动' : '待行动';
        return `<article class="角色卡 ${类名}" data-unit="${单位.位置}"><div class="角色卡头"><span class="站位标">${String(单位.位置 + 1).padStart(2, '0')} ${单位.位置 === 0 ? ' / 队长' : ''}</span><button class="图标按钮" data-detail="${单位.位置}" title="${转义(单位.名称)}状态与技能" aria-label="${转义(单位.名称)}状态与技能"><i data-lucide="ellipsis"></i></button></div><div class="角色名行"><div class="职业像 ${转义(单位.职业)}"><i data-lucide="${职业图标[单位.职业]}"></i></div><div><h3 class="角色姓名">${转义(单位.名称)}</h3><div class="角色属性">${转义(单位.属性)} · ${转义(单位.职业)} · 羁绊 ${单位.羁绊}</div></div></div><div class="角色血量"><span>${简数(单位.生命)}</span><span class="比例">${百分比.toFixed(0)}%</span></div><div class="生命轨"><div style="width:${百分比}%;${百分比 < 30 ? 'background:var(--红)' : ''}"></div></div><div class="角色参数"><div><span>当前攻击</span><strong>${简数(当前攻击(单位))}</strong></div><div><span>有效护盾</span><strong>${简数(当前护盾(单位))}</strong></div></div><div class="角色状态"><span>${状态条}</span>${单位.冷却剩余 ? `<span>CD ${单位.冷却剩余}</span>` : '<span>必杀就绪</span>'}${单位.计数.守护 ? `<span>守护 ${单位.计数.守护}</span>` : ''}</div><div class="动作栏"><button data-action="普攻" data-position="${单位.位置}" ${可行动 ? '' : 'disabled'} title="普攻">普攻</button><button data-action="必杀" data-position="${单位.位置}" ${可行动 && 单位.冷却剩余 === 0 ? '' : 'disabled'} title="${单位.冷却剩余 ? `冷却 ${单位.冷却剩余} 回合` : '必杀'}">${单位.冷却剩余 ? `CD ${单位.冷却剩余}` : '必杀'}</button><button data-action="防御" data-position="${单位.位置}" ${可行动 ? '' : 'disabled'} title="防御" aria-label="${转义(单位.名称)}防御"><i data-lucide="shield"></i></button></div></article>`;
    }).join('');
    const 结束 = 状态.阶段 === '结束';
    查('#结局').hidden = !结束;
    if (结束) 查('#结局').textContent = 状态.首领.生命 <= 0 ? '颠倒镜已击破' : 状态.队伍.every(单位 => 单位.生命 <= 0) ? '队伍全灭' : '已到达设定的回合上限';
    查('#最近日志').innerHTML = 日志行(状态.日志.slice(-10).reverse());
    图标刷新();
}

function 渲染记录() {
    const 类别 = 查('#日志类别').value;
    查('#全部日志').innerHTML = 日志行(状态.日志.filter(项 => !类别 || 项.类别 === 类别).slice(-600).reverse());
    查('#报表').innerHTML = 状态.回合报表.length ? 状态.回合报表.map(行 => `<tr><td>${行.回合}</td><td>${转义(行.技能)}</td>${['伤害', '回复', '理论回复', '护盾生成', '护盾吸收', '承伤'].map(字段 => `<td>${简数(行[字段])}</td>`).join('')}<td>${行.存活}/5</td></tr>`).join('') : '<tr><td colspan="9" class="无记录">尚无已结算回合</td></tr>';
}

function 渲染编队() {
    编队草稿 ??= structuredClone(配置.队伍);
    查('#编队表').innerHTML = 编队草稿.map((单位, 位置) => `<div class="编队行" data-team-row="${位置}"><div class="位置输入"><span class="站位标">${位置 + 1}</span><select data-field="编号" aria-label="站位${位置 + 1}角色">${角色库.map(角色 => `<option value="${角色.编号}" ${角色.编号 === 单位.编号 ? 'selected' : ''}>${转义(角色.名称)}</option>`).join('')}${角色库.some(角色 => 角色.编号 === 单位.编号) ? '' : `<option selected value="${单位.编号}">${转义(单位.名称)}</option>`}</select></div><label data-label="羁绊"><select data-field="羁绊" aria-label="站位${位置 + 1}羁绊">${[1, 2, 3, 4, 5].map(档位 => `<option ${档位 === 单位.羁绊 ? 'selected' : ''}>${档位}</option>`).join('')}</select></label><label data-label="解放"><select data-field="解放" aria-label="站位${位置 + 1}解放" ${单位.编号 === 10006 ? '' : 'disabled'}>${['标准', '部分解放', '完全解放'].map((名称, 索引) => `<option value="${索引}" ${索引 === 单位.解放 ? 'selected' : ''}>${名称}</option>`).join('')}</select></label><label class="面板输入" data-label="生命上限"><input data-field="生命上限" type="number" min="1" value="${单位.生命上限}" aria-label="站位${位置 + 1}生命上限"></label><label class="面板输入" data-label="基础攻击"><input data-field="攻击" type="number" min="1" value="${单位.攻击}" aria-label="站位${位置 + 1}基础攻击"></label><div class="排序工具"><button class="图标按钮" data-move="${位置}:上" ${位置 === 0 ? 'disabled' : ''} title="上移站位" aria-label="上移站位"><i data-lucide="arrow-up"></i></button><button class="图标按钮" data-move="${位置}:下" ${位置 === 4 ? 'disabled' : ''} title="下移站位" aria-label="下移站位"><i data-lucide="arrow-down"></i></button></div></div>`).join('');
    查('#角色覆盖').innerHTML = 编队草稿.map(单位 => `<div><strong>${转义(单位.名称)}</strong><p>${转义(单位.覆盖说明)}<small>数据依据：${转义(单位.资料)} · 基础面板默认采用养成系数 3.25，可手动覆盖</small></p></div>`).join('');
    图标刷新();
}

function 读取编队输入() {
    return 全查('[data-team-row]').map((行, 位置) => {
        const 原单位 = 编队草稿[位置];
        const 单位 = structuredClone(原单位);
        for (const 输入 of 行.querySelectorAll('[data-field]')) 单位[输入.dataset.field] = Number(输入.value);
        return 单位;
    });
}

function 解析时间表(内容) {
    const 结果 = [];
    const 已见 = new Set();
    for (const 原文 of 内容.split('\n')) {
        const 行 = 原文.trim();
        if (!行) continue;
        const 匹配 = 行.match(/^(\d+)\s+(.+)$/);
        if (!匹配 || !支持技能.has(匹配[2].trim()) || 匹配[2].trim() === '自定义伤害') throw new Error(`无效时间表：${行}`);
        const 回合 = Number(匹配[1]);
        if (回合 < 1 || 回合 > 100 || 已见.has(回合)) throw new Error(`回合无效或重复：${回合}`);
        已见.add(回合);
        结果.push({ 回合, 技能: 匹配[2].trim() });
    }
    return 结果.sort((左, 右) => 左.回合 - 右.回合);
}

function 渲染设置() {
    const 表单 = 查('#模型表单');
    for (const 名称 of ['首领生命', '首领攻击', '回合上限', '首领减伤', '防御减伤', '受疗降低', '受盾降低', '持续治疗时点', '防御易伤目标', '倒置增益归属', '颠倒规则', '零回复触发']) {
        const 输入 = 表单.elements.namedItem(名称);
        if (输入.type === 'checkbox') 输入.checked = Boolean(配置[名称]);
        else 输入.value = ['首领减伤', '防御减伤', '受疗降低', '受盾降低'].includes(名称) ? 配置[名称] * 100 : 配置[名称];
    }
    查('#时间表').value = (配置.时间表 || []).map(行 => `${行.回合} ${行.技能}`).join('\n');
}

function 应用新配置(新配置) {
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
        const 动作 = 单位.职业 === '治疗者' && 单位.冷却剩余 === 0 ? '必杀' : 单位.职业 === '辅助者' ? '普攻' : '防御';
        执行({ 类型: '角色', 位置: 单位.位置, 动作 }, false);
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
查('#角色队伍').addEventListener('click', 包装(事件 => {
    const 详情 = 事件.target.closest('[data-detail]');
    if (详情) return 角色详情(Number(详情.dataset.detail));
    const 按钮 = 事件.target.closest('[data-action]');
    if (按钮) 执行({ 类型: '角色', 位置: Number(按钮.dataset.position), 动作: 按钮.dataset.action });
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
查('#敌方技能').innerHTML = 首领技能.map(([名称]) => `<option>${名称}</option>`).join('');
查('#敌方技能').addEventListener('change', () => { 查('#自定义敌方').hidden = 查('#敌方技能').value !== '自定义伤害'; });
查('#结算敌方').addEventListener('click', 包装(() => {
    执行({ 类型: '敌方', 技能: 查('#敌方技能').value, 伤害: Number(查('#自定义伤害').value), 目标: 查('#自定义目标').value, 真实伤害: 查('#真实伤害').checked });
}));
查('#校准').addEventListener('click', 包装(() => 执行({ 类型: '命中校准', 次数: Number(查('#命中数').value) })));
查('#日志类别').addEventListener('change', 渲染记录);
查('#应用编队').addEventListener('click', 包装(() => { 应用新配置({ ...配置, 队伍: 读取编队输入() }); 切换视图('战场'); 通知('编队已应用'); }));
查('#编队表').addEventListener('change', 包装(事件 => {
    if (事件.target.dataset.field !== '编号') return;
    const 位置 = Number(事件.target.closest('[data-team-row]').dataset.teamRow);
    const 编号 = Number(事件.target.value);
    const 新队伍 = 读取编队输入();
    新队伍[位置] = 创建编队([编号])[0];
    编队草稿 = 新队伍;
    渲染编队();
}));
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
        if (!输入.name) continue;
        if (输入.type === 'checkbox') 新配置[输入.name] = 输入.checked;
        else if (输入.tagName === 'SELECT') 新配置[输入.name] = 输入.value;
        else 新配置[输入.name] = Number(输入.value) / (['首领减伤', '防御减伤', '受疗降低', '受盾降低'].includes(输入.name) ? 100 : 1);
    }
    新配置.时间表 = 解析时间表(查('#时间表').value);
    应用新配置(新配置);
    切换视图('战场');
    通知('模型设置已应用');
}));
查('#技能目录').innerHTML = 首领技能.filter(项 => 项[1]).map(([名称, 编号, 描述]) => `<div><strong>${名称}</strong><span>${描述}</span><span>原始技能 ${编号}</span></div>`).join('');
查('#运行时间表').addEventListener('click', 包装(async () => {
    const 时间表 = 解析时间表(查('#时间表').value);
    if (!时间表.length) throw new Error('时间表为空');
    if (游标 && !confirm('从第一回合重放当前时间表？')) return;
    应用新配置({ ...配置, 时间表 });
    运行中 = true;
    切换视图('战场');
    渲染战场();
    try {
        const 末回合 = Math.min(配置.回合上限, Math.max(...时间表.map(行 => 行.回合)));
        while (状态.阶段 !== '结束' && 状态.回合 <= 末回合) {
            自动我方();
            if (状态.阶段 === '敌方') 执行({ 类型: '敌方', 技能: 时间表.find(行 => 行.回合 === 状态.回合)?.技能 || '待机' }, false);
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
    } finally { 运行中 = false; 存档(); 渲染战场(); 渲染记录(); }
    通知('时间表结算完成');
}));
查('#导出').addEventListener('click', () => 保存下载('颠倒镜-战斗记录.json', JSON.stringify({ 配置, 操作列表, 游标 }, null, 2)));
查('#导入').addEventListener('click', () => 查('#导入文件').click());
查('#导入文件').addEventListener('change', 包装(async 事件 => {
    const 文件 = 事件.target.files[0];
    if (!文件) return;
    if (文件.size > 2000000) throw new Error('记录文件不能超过 2 MB');
    导入记录(JSON.parse(await 文件.text()));
    存档(); 渲染战场(); 渲染记录();
    查('#导入文件').value = '';
    通知('战斗记录已恢复');
}));
查('#导出报表').addEventListener('click', () => {
    const 字段 = ['回合', '技能', '伤害', '回复', '理论回复', '溢出回复', '护盾生成', '护盾吸收', '承伤', '首领回血', '首领生命', '存活'];
    const 行列 = [字段, ...状态.回合报表.map(行 => 字段.map(字段名 => 行[字段名]))];
    保存下载('颠倒镜-回合报表.csv', '\ufeff' + 行列.map(行 => 行.map(值 => `"${String(值 ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
});
查('#编辑规则').addEventListener('click', () => {
    查('#规则输入').value = JSON.stringify(读取编队输入(), null, 2);
    查('#规则弹窗').showModal();
});
查('#保存规则').addEventListener('click', 包装(() => {
    应用新配置({ ...配置, 队伍: JSON.parse(查('#规则输入').value) });
    查('#规则弹窗').close();
    切换视图('战场');
}));
查('#证据').addEventListener('click', () => 打开详情('数据依据与模型边界', '<p>Boss 数据来自用户提供的客户端资源快照：关卡 15249 → 编组 43146 → 单位 43248。该敌人名称已核实为颠倒镜；赛季 SP 序号仍以用户确认作为定位锚。</p><h3>已纳入</h3><p>技能 22807—22811、28862—28865、22814—22819 的数值规则；当前生命比例选人、全体／单体伤害、职业反转、护盾与受疗压制、逐次治疗触发和可回放行动。</p><h3>尚未验证</h3><p>官方 AI 血线与回合触发、角色效果与 Boss 追加的精确先后顺序、同名减伤的叠加乘区、零回复是否触发受疗、持续治疗时点、真实伤害与护盾交互。默认时间表只是普通攻击，不代表官方 AI。Boss 面板为占位值，需手动校准。</p><h3>角色范围</h3><p>内置 8 位逐项建模的角色与 5 个明确标注的自定义职业模板，不等于全角色模拟器。露露支持三个技能组版本。其它解放、ELV、装备与未录入的专属机制须通过规则编辑补入，当前结果不可作为精确通关保证。</p><h3>独立实现</h3><p>页面不加载或发布 tenkaassist 的计算源码。图像为本项目生成，战斗数据与操作记录只保存在本机；离线缓存完成后无需后端服务。</p>'));

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
    const 已存 = localStorage.getItem(存档键);
    if (已存) 导入记录(JSON.parse(已存));
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