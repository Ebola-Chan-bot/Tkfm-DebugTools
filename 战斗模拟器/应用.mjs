import { 新建战斗, 结算操作, 重放战斗, 当前攻击, 当前护盾, 加成, 可选敌人 } from './战斗引擎.mjs';
import { 角色库, 创建编队 } from './角色数据.mjs';
import { 当前关卡, 创建关卡配置, 敌方技能目录, 夏日机制 } from './关卡数据.mjs';

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

function 渲染敌方技能() {
    const 旧技能 = 查('#敌方技能').value;
    const 目录 = 敌方技能目录(配置, Number(查('#行动敌人').value) || 0);
    查('#敌方技能').innerHTML = 目录.map(([名称]) => `<option>${转义(名称)}</option>`).join('');
    if (目录.some(项 => 项[0] === 旧技能)) 查('#敌方技能').value = 旧技能;
    查('#自定义敌方').hidden = 查('#敌方技能').value !== '自定义伤害';
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
    for (const 标识 of ['多敌区域', '行动敌人标签', '夏日机制栏', '夏日面板区域']) 查(`#${标识}`).hidden = !夏日;
    const 当前行动者 = 查('#行动敌人').value;
    const 待行动 = 状态.敌人.filter(单位 => 单位.生命 > 0 && !单位.已行动);
    查('#行动敌人').innerHTML = 待行动.map(单位 => `<option value="${单位.位置}">${转义(单位.名称)}</option>`).join('');
    if (待行动.some(单位 => String(单位.位置) === 当前行动者)) 查('#行动敌人').value = 当前行动者;
    渲染敌方技能();
    if (!夏日) return;
    const 可选 = 可选敌人(状态);
    if (!可选.some(单位 => 单位.位置 === 攻击目标)) 攻击目标 = 可选[0]?.位置 ?? 0;
    查('#当前目标').textContent = 可选.length ? `目标 · ${状态.敌人[攻击目标].名称}` : '全部击破';
    查('#敌方队伍').innerHTML = 状态.敌人.map(单位 => {
        const 可选择 = 可选.some(项 => 项.位置 === 单位.位置);
        const 标签 = [单位.生命 <= 0 ? '击破' : 单位.已行动 ? '已行动' : '待行动', 加成(单位, '嘲讽') > 0 ? '嘲讽' : '', 加成(单位, '防御') > 0 ? '防御' : '', 加成(单位, '锁血') > 0 ? '锁血' : ''].filter(Boolean).join(' · ');
        return `<button class="敌人卡" data-enemy="${单位.位置}" aria-pressed="${攻击目标 === 单位.位置}" aria-label="攻击目标 ${转义(单位.名称)}" ${可选择 ? '' : 'disabled'}><span class="敌人卡标题"><strong>${转义(单位.名称)}</strong><small>${单位.位置 + 1}</small></span><span>${简数(单位.生命)} / ${简数(单位.生命上限)}</span><span class="生命轨"><span style="width:${Math.max(0, 单位.生命 / 单位.生命上限 * 100)}%"></span></span><small>攻击 ${简数(当前攻击(单位))}</small><small>${标签}</small></button>`;
    }).join('');
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
    查('#一回合').disabled = 状态.阶段 !== '我方' || 运行中;
    查('#结算敌方').disabled = 状态.阶段 !== '敌方' || 运行中;
    查('#敌方标题').textContent = 状态.阶段 === '敌方' ? '我方行动完毕' : 状态.阶段 === '结束' ? '本场战斗结束' : '等待我方完成行动';
    查('#蓄力校准').hidden = 配置.关卡 === '夏日尾声' || !状态.首领.蓄力;
    if (状态.首领.蓄力 && 配置.关卡 !== '夏日尾声') 查('#命中数').value = 状态.首领.蓄力.命中;
    查('#角色队伍').innerHTML = 状态.队伍.map(单位 => {
        const 可行动 = 状态.阶段 === '我方' && 单位.生命 > 0 && !单位.已行动 && !运行中;
        const 百分比 = Math.max(0, 单位.生命 / 单位.生命上限 * 100);
        const 类名 = [单位.已行动 ? '已行动' : '', 单位.生命 <= 0 ? '已倒下' : '', 单位.防御 ? '防御中' : ''].join(' ');
        const 状态条 = 单位.生命 <= 0 ? '倒下' : 单位.防御 ? '防御中' : 单位.已行动 ? '已行动' : '待行动';
        return `<article class="角色卡 ${类名}" data-unit="${单位.位置}"><div class="角色卡头"><span class="站位标">${String(单位.位置 + 1).padStart(2, '0')} ${单位.位置 === 0 ? ' / 队长' : ''}</span><button class="图标按钮" data-detail="${单位.位置}" title="${转义(单位.名称)}状态与技能" aria-label="${转义(单位.名称)}状态与技能"><i data-lucide="ellipsis"></i></button></div><div class="角色名行"><div class="职业像 ${转义(单位.职业)}"><i data-lucide="${职业图标[单位.职业]}"></i></div><div><h3 class="角色姓名">${转义(单位.名称)}</h3><div class="角色属性">${转义(单位.属性)} · ${转义(单位.职业)} · 羁绊 ${单位.羁绊}</div></div></div><div class="角色血量"><span>${简数(单位.生命)}</span><span class="比例">${百分比.toFixed(0)}%</span></div><div class="生命轨"><div style="width:${百分比}%;${百分比 < 30 ? 'background:var(--红)' : ''}"></div></div><div class="角色参数"><div><span>当前攻击</span><strong>${简数(当前攻击(单位))}</strong></div><div><span>有效护盾</span><strong>${简数(当前护盾(单位))}</strong></div></div><div class="角色状态"><span>${状态条}</span>${单位.冷却剩余 ? `<span>CD ${单位.冷却剩余}</span>` : '<span>必杀就绪</span>'}${单位.计数.守护 ? `<span>守护 ${单位.计数.守护}</span>` : ''}</div><div class="动作栏"><button data-action="普攻" data-position="${单位.位置}" ${可行动 ? '' : 'disabled'} title="普攻">普攻</button><button data-action="必杀" data-position="${单位.位置}" ${可行动 && 单位.冷却剩余 === 0 ? '' : 'disabled'} title="${单位.冷却剩余 ? `冷却 ${单位.冷却剩余} 回合` : '必杀'}">${单位.冷却剩余 ? `CD ${单位.冷却剩余}` : '必杀'}</button><button data-action="防御" data-position="${单位.位置}" ${可行动 ? '' : 'disabled'} title="防御" aria-label="${转义(单位.名称)}防御"><i data-lucide="shield"></i></button></div></article>`;
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
    const 夏日 = 配置.关卡 === '夏日尾声';
    for (const 原文 of 内容.split('\n')) {
        const 行 = 原文.trim();
        if (!行) continue;
        const 匹配 = 行.match(夏日 ? /^(\d+)\s+(\S+)\s+(.+)$/ : /^(\d+)\s+(.+)$/);
        const 位置 = 夏日 ? 状态.敌人.findIndex(单位 => 单位.名称 === 匹配?.[2]) : 0;
        const 技能 = 匹配?.[夏日 ? 3 : 2]?.trim();
        if (!匹配 || 位置 < 0 || !敌方技能目录(配置, 位置).some(项 => 项[0] === 技能) || 技能 === '自定义伤害') throw new Error(`无效时间表：${行}`);
        const 回合 = Number(匹配[1]);
        const 键 = `${回合}:${位置}`;
        if (回合 < 1 || 回合 > 100 || 已见.has(键)) throw new Error(`回合无效或行动者重复：${回合}`);
        已见.add(键);
        结果.push({ 回合, ...(夏日 ? { 位置 } : {}), 技能 });
    }
    return 结果.sort((左, 右) => 左.回合 - 右.回合);
}

function 渲染设置() {
    const 表单 = 查('#模型表单');
    const 夏日 = 配置.关卡 === '夏日尾声';
    for (const 名称 of ['首领生命', '首领攻击', '回合上限', '首领减伤', '防御减伤', '受疗降低', '受盾降低', '持续治疗时点', '防御易伤目标', '倒置增益归属', '颠倒规则', '零回复触发']) {
        const 输入 = 表单.elements.namedItem(名称);
        const 专属 = ['首领生命', '首领攻击', '受疗降低', '受盾降低', '防御易伤目标', '倒置增益归属', '颠倒规则'].includes(名称);
        输入.disabled = 夏日 && 专属;
        输入.closest('label').hidden = 夏日 && 专属;
        if (输入.type === 'checkbox') 输入.checked = Boolean(配置[名称]);
        else 输入.value = ['首领减伤', '防御减伤', '受疗降低', '受盾降低'].includes(名称) ? 配置[名称] * 100 : 配置[名称];
    }
    表单.elements.namedItem('夏日开场').disabled = !夏日;
    表单.elements.namedItem('夏日开场').value = 配置.夏日开场 ?? 28759;
    查('#敌方面板').innerHTML = 夏日 ? 配置.敌人.map((单位, 位置) => `<div class="敌方面板行" data-enemy-stats="${位置}"><strong>${转义(单位.名称)}</strong><label>生命上限<input data-enemy-field="生命上限" type="number" min="1" value="${单位.生命上限}" required></label><label>基础攻击<input data-enemy-field="攻击" type="number" min="1" value="${单位.攻击}" required></label></div>`).join('') : '';
    查('#模型边界').textContent = 夏日 ? '五敌初值仅为客户端基础数值 × 被动生命 1.5，不含关卡等级与倍率，须校准。默认开场采用技能 28759；AI 条件未解，特殊机制须手动触发。并列目标按站位；增减伤同乘区相加；不含属性克制。' : 'Boss 面板为占位值；两条 50% 减伤暂按同乘区相加。零回复触发、持续治疗时点、真实伤害与护盾交互均待游戏校准。AI 阈值与官方行动表未还原。';
    查('#时间表').placeholder = 夏日 ? '1 铃兰 泳装售完\n1 娜娜 开心夏日\n2 阿尔蒂雅 小心海浪' : '1 普攻';
    查('#时间表').value = (配置.时间表 || []).map(行 => `${行.回合} ${夏日 ? `${状态.敌人[行.位置]?.名称} ` : ''}${行.技能}`).join('\n');
    const 目录 = 夏日 ? 状态.敌人.flatMap(单位 => 敌方技能目录(配置, 单位.位置).filter(项 => 项[1]).map(([名称, 编号, 描述]) => [`${单位.名称} · ${名称}`, 编号, 描述])) : 敌方技能目录(配置).filter(项 => 项[1]);
    查('#技能目录').innerHTML = 目录.map(([名称, 编号, 描述]) => `<div><strong>${转义(名称)}</strong><span>${转义(描述)}</span><span>原始技能 ${编号}</span></div>`).join('');
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
        const 动作 = 配置.关卡 === '夏日尾声' ? (单位.冷却剩余 === 0 ? '必杀' : '普攻') : 单位.职业 === '治疗者' && 单位.冷却剩余 === 0 ? '必杀' : 单位.职业 === '辅助者' ? '普攻' : '防御';
        const 目标 = 可选敌人(状态).some(敌人 => 敌人.位置 === 攻击目标) ? 攻击目标 : 可选敌人(状态)[0]?.位置 ?? 0;
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
    const 已存 = localStorage.getItem(关卡存档键(关卡));
    if (已存) 导入记录(JSON.parse(已存));
    else 应用新配置(创建关卡配置(关卡));
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
查('#行动敌人').addEventListener('change', 渲染敌方技能);
查('#夏日机制').innerHTML = 夏日机制.map(([名称, 编号]) => `<option value="${转义(名称)}">${转义(名称)}${编号 ? ` · ${编号}` : ''}</option>`).join('');
查('#夏日机制').addEventListener('change', () => { 查('#机制目标标签').hidden = 查('#夏日机制').value !== '造成伤害降低'; });
查('#触发机制').addEventListener('click', 包装(() => 执行({ 类型: '夏日机制', 技能: 查('#夏日机制').value, 目标: 查('#机制目标').value })));
查('#敌方技能').addEventListener('change', () => { 查('#自定义敌方').hidden = 查('#敌方技能').value !== '自定义伤害'; });
查('#结算敌方').addEventListener('click', 包装(() => {
    执行({ 类型: '敌方', 位置: Number(查('#行动敌人').value) || 0, 技能: 查('#敌方技能').value, 伤害: Number(查('#自定义伤害').value), 目标: 查('#自定义目标').value, 真实伤害: 查('#真实伤害').checked });
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
        if (!输入.name || 输入.disabled) continue;
        if (输入.type === 'checkbox') 新配置[输入.name] = 输入.checked;
        else if (输入.tagName === 'SELECT') 新配置[输入.name] = 输入.name === '夏日开场' ? Number(输入.value) : 输入.value;
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
    新配置.时间表 = 解析时间表(查('#时间表').value);
    应用新配置(新配置);
    切换视图('战场');
    通知('模型设置已应用');
}));
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
            if (状态.阶段 === '敌方') {
                if (配置.关卡 === '夏日尾声') {
                    for (const 单位 of 状态.敌人.filter(项 => 项.生命 > 0 && !项.已行动)) {
                        if (状态.阶段 !== '敌方') break;
                        执行({ 类型: '敌方', 位置: 单位.位置, 技能: 时间表.find(行 => 行.回合 === 状态.回合 && 行.位置 === 单位.位置)?.技能 || '待机' }, false);
                    }
                } else 执行({ 类型: '敌方', 技能: 时间表.find(行 => 行.回合 === 状态.回合)?.技能 || '待机' }, false);
            }
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
    } finally { 运行中 = false; 存档(); 渲染战场(); 渲染记录(); }
    通知('时间表结算完成');
}));
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
    应用新配置({ ...配置, 队伍: JSON.parse(查('#规则输入').value) });
    查('#规则弹窗').close();
    切换视图('战场');
}));
查('#证据').addEventListener('click', () => 打开详情('数据依据与模型边界', 配置.关卡 === '夏日尾声' ? '<p>客户端快照：关卡 60155（塔-55／夏日尾声）→ 编组 42096 → 单位 42281—42285。60162 是 SP 版，本场未使用其规则。Stage_C 编号为 UInt16；编组字段位于记录偏移 17。</p><h3>已纳入</h3><p>五敌、嘲讽、防御、锁血；技能 28755—28775 的已引用规则与蓄力后续 28768；伙伴技能 28802—28806、28809—28812。技能 35981 的目标未知，须手动指定。关心铃兰属于伙伴行动，不将我方攻击算入解除次数。</p><h3>校准边界</h3><p>五敌默认面板仅用原始基础值及最大生命 +50% 被动，未还原关卡等级和数值倍率。AI 条件、回合安排、开场 95%／125% 分支和不能放弃触发次数未知，须手动选择与触发。没有套用 SP 的 28776 减伤。属性克制未纳入；同乘区增减伤相加；并列血量与未防御者按站位；敌方施加的 1 回合效果覆盖下次我方回合。夏日 100 层真实伤害在攻击动作后触发。</p><h3>角色与实现</h3><p>仍为原有 8 位角色与 5 个自定义职业模板；未实现的角色和机制不能视为完整还原。数据只保存在本机；不加载或发布 tenkaassist 运行代码。</p>' : '<p>Boss 数据来自用户提供的客户端资源快照：关卡 15249 → 编组 43146 → 单位 43248。该敌人名称已核实为颠倒镜；赛季 SP 序号仍以用户确认作为定位锚。</p><h3>已纳入</h3><p>技能 22807—22811、28862—28865、22814—22819 的数值规则；当前生命比例选人、全体／单体伤害、职业反转、护盾与受疗压制、逐次治疗触发和可回放行动。</p><h3>尚未验证</h3><p>官方 AI 血线与回合触发、角色效果与 Boss 追加的精确先后顺序、同名减伤的叠加乘区、零回复是否触发受疗、持续治疗时点、真实伤害与护盾交互。默认时间表只是普通攻击，不代表官方 AI。Boss 面板为占位值，需手动校准。</p><h3>角色范围</h3><p>内置 8 位逐项建模的角色与 5 个明确标注的自定义职业模板，不等于全角色模拟器。露露支持三个技能组版本。其它解放、ELV、装备与未录入的专属机制须通过规则编辑补入，当前结果不可作为精确通关保证。</p><h3>独立实现</h3><p>页面不加载或发布 tenkaassist 的计算源码。图像为本项目生成，战斗数据与操作记录只保存在本机；离线缓存完成后无需后端服务。</p>'));

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
    const 已存 = localStorage.getItem(关卡存档键(上次关卡));
    if (已存) 导入记录(JSON.parse(已存));
    else 配置 = 创建关卡配置(上次关卡);
    if (!已存) 状态 = 新建战斗(配置);
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