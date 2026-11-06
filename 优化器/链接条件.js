'use strict';
/*
 * 链接条件.js —— tenkaassist 链接、中文别称与战场条件的共享入口。
 *
 * 支持的链接：/make/（list=持有名单，bond=对应羁绊，bossEl/options=战场条件）、/simulator/ 与 /lab/simulator/（list=5 人队伍）。
 * make 链接可用 起点=id1,id2,id3,id4,id5 额外指定跨队搜索的起点；全池独立搜索请使用仓库根目录的 搜索最优队伍.js --链接。
 * 未提供 bond 时采用模拟器缺省全员 5 绊；options 必须恰好 8 项，前三项是组队筛选条件，后五项是 Boss 减益。
 * ELV、hpUp、fit13t 属于另一类榜单/筛选口径，本优化器只负责非 ELV 的 13 回合 dmg13；遇到这些参数会明确报错，不静默算错目标。
 */
const fs = require('fs');
const path = require('path');
const 适配 = require('./引擎适配.js');

const 属性编号 = { fire: 0, water: 1, wind: 2, light: 3, dark: 4, none: -1 };
const 属性名称 = ['火', '水', '风', '光', '暗'];
const COMMON = path.resolve(__dirname, '..', '..', 'tenkaassist', 'js', 'common.js');
let _别名索引 = null;

function 数字列表(文本, 名称, 缺省) {
  if (文本 == null || 文本 === '') return 缺省;
  const a = String(文本).split(/[,\s]+/).filter(Boolean).map(Number);
  if (!a.length || a.some(x => !Number.isInteger(x))) throw new Error(`${名称} 必须是整数列表`);
  return a;
}

function 解析链接(文本) {
  if (typeof 文本 !== 'string' || !文本.trim()) throw new Error('缺少链接');
  let u;
  try { u = new URL(文本.trim()); } catch (e) { throw new Error('链接格式错误：请粘贴完整 http(s) 地址'); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('只支持 http(s) 链接');
  const q = u.searchParams;
  const 路径名 = u.pathname.replace(/\/+$/, '');
  if (!/\/(make|simulator)(\/|$)/.test(路径名)) throw new Error(`不支持的页面 ${路径名}：请使用 make 或 simulator 链接`);
  if (q.get('elv') === 'true' || q.get('elv') != null) throw new Error('本入口只计算非 ELV 的 dmg13；链接含 elv 参数，请先关闭 ELV 后再导出链接');
  for (const k of ['hpUp', 'fit13t']) {
    const v = Number(q.get(k) || 0);
    if (v !== 0) throw new Error(`${k} 是榜单筛选条件而非战场条件，本入口不处理；请移除该参数`);
  }
  const 持有ids = 数字列表(q.get('list'), 'list', []);
  if (!持有ids.length) throw new Error('链接缺少 list 角色名单');
  if (new Set(持有ids).size !== 持有ids.length) throw new Error('list 含重复角色 id');
  const 数据 = 适配.角色数据();
  for (const id of 持有ids) {
    const c = 数据.getCharacter(id);
    if (!c || c.ok !== true || c.rarity !== 3 || !c.hp || !c.atk) throw new Error(`角色 ${id} 不是可模拟 SSR，无法纳入搜索`);
  }
  const 羁绊表 = 数字列表(q.get('bond'), 'bond', []);
  if (羁绊表.length && 羁绊表.length !== 持有ids.length) throw new Error(`bond 数量 ${羁绊表.length} 与 list 数量 ${持有ids.length} 不一致`);
  if (羁绊表.some(x => x < 1 || x > 5)) throw new Error('bond 每项必须在 1..5');
  const 羁绊 = new Map();
  持有ids.forEach((id, i) => 羁绊.set(id, 羁绊表.length ? 羁绊表[i] : 5));
  const 选项 = 数字列表(q.get('options'), 'options', null);
  if (选项 && 选项.length !== 8) throw new Error(`options 必须恰好 8 项，实际 ${选项 ? 选项.length : 0} 项`);
  if (选项 && 选项.some(x => x < 0)) throw new Error('options 不接受负数');
  const boss文本 = (q.get('bossEl') || 'none').toLowerCase();
  if (!(boss文本 in 属性编号)) throw new Error(`未知 bossEl=${boss文本}；支持 fire/water/wind/light/dark/none`);
  const 起点文本 = q.get('起点');
  const 起点ids = 起点文本 ? 数字列表(起点文本, '起点', []) : [];
  if (起点ids.length && 起点ids.length !== 5) throw new Error('起点 必须恰好 5 个角色 id');
  for (const id of 起点ids) if (!持有ids.includes(id)) throw new Error(`起点角色 ${id} 不在 list 持有名单中`);
  return {
    链接: u.href, 页面: 路径名, 持有ids, 羁绊,
    bossElement: 属性编号[boss文本], boss名称: 属性编号[boss文本] < 0 ? '无属性' : 属性名称[属性编号[boss文本]],
    options: 选项 && 选项.some(x => x !== 0) ? 选项 : null,
    组队条件: 选项 ? 选项.slice(0, 3) : [0, 0, 0], 起点ids,
    全队羁绊(ids) { return ids.map(id => 羁绊.get(id) || 5); },
    描述() {
      const b = this.options;
      return `Boss=${this.boss名称}(${this.bossElement})；Boss减益=${b ? `[${b.slice(3).join(',')}]` : '无'}；options=[${b ? b.join(',') : '0,0,0,0,0,0,0,0'}]；羁绊缺省=5`;
    },
  };
}

function 应用条件(inst, 条件) {
  if (!inst || !inst.increment) throw new Error('应用条件需要完整引擎实例');
  const 原初始化 = inst.increment.initBattle, 原重放 = inst.increment.fastReplay;
  inst.increment.initBattle = function(ids, bonds, boss, options) {
    return 原初始化(ids, bonds, boss == null || boss === -1 ? 条件.bossElement : boss, options == null ? 条件.options : options);
  };
  inst.increment.fastReplay = function(ids, toks, bonds, boss, options) {
    return 原重放(ids, toks, bonds, boss == null || boss === -1 ? 条件.bossElement : boss, options == null ? 条件.options : options);
  };
  return inst;
}

function 创建引擎(条件, opts) { return 应用条件(适配.createEngine(opts), 条件); }

function 建别名索引() {
  if (_别名索引) return _别名索引;
  const 表 = 适配.角色表(), 韩名指id = new Map(), id指全名 = new Map(), 角色韩名集 = new Set();
  for (const c of 表) {
    if (!c || c.id == null || !c.name) continue;
    韩名指id.set(c.name, c.id); id指全名.set(c.id, c.fullname || c.name); 角色韩名集.add(c.name);
  }
  const 韩名指别名 = new Map(), common = fs.readFileSync(COMMON, 'utf8'), re = /"([^"]+)"\s*:\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(common))) {
    const 韩名 = m[1], 体 = m[2];
    if (!角色韩名集.has(韩名)) continue;
    韩名指别名.set(韩名, { sc: (体.match(/\bsc\s*:\s*"([^"]*)"/) || [])[1], tc: (体.match(/\btc\s*:\s*"([^"]*)"/) || [])[1], en: (体.match(/\ben\s*:\s*"([^"]*)"/) || [])[1] });
  }
  const id指别称 = new Map(), 别称指ids = new Map(), 全体 = [];
  const 加 = (键, id) => { if (!键) return; const k = String(键).toLowerCase(); if (!别称指ids.has(k)) 别称指ids.set(k, new Set()); 别称指ids.get(k).add(id); };
  for (const [韩名, b] of 韩名指别名) {
    const id = 韩名指id.get(韩名);
    if (id == null) continue;
    id指别称.set(id, b.sc || b.tc || id指全名.get(id) || 韩名);
    加(b.sc, id); 加(b.tc, id); 加(b.en, id); 加(韩名, id);
    全体.push({ id, 名: [b.sc, b.tc, b.en, 韩名].filter(Boolean) });
  }
  _别名索引 = { 韩名指id, id指全名, id指别称, 别称指ids, 全体 };
  return _别名索引;
}

function 解析角色(token) {
  const 索 = 建别名索引(), s = String(token).trim();
  if (/^\d+$/.test(s)) {
    const id = Number(s);
    if (!索.id指全名.has(id)) return { 错误: `id ${id} 不在角色表中` };
    return { id, 别称: 索.id指别称.get(id) || 索.id指全名.get(id) };
  }
  const k = s.toLowerCase();
  if (索.别称指ids.has(k)) {
    const set = [...索.别称指ids.get(k)];
    if (set.length === 1) { const id = set[0]; return { id, 别称: 索.id指别称.get(id) || s }; }
    return { 歧义: `"${s}" 命中多个角色: ` + set.map(id => `${id}(${索.id指别称.get(id) || 索.id指全名.get(id)})`).join(' ') };
  }
  const 命中 = 索.全体.filter(e => e.名.some(n => n && n.toLowerCase().includes(k)));
  if (命中.length === 1) { const id = 命中[0].id; return { id, 别称: 索.id指别称.get(id) || s, 子串: true }; }
  if (命中.length > 1) return { 歧义: `"${s}" 子串命中多个角色: ` + 命中.slice(0, 12).map(e => `${e.id}(${索.id指别称.get(e.id) || '?'})`).join(' ') + (命中.length > 12 ? ' …' : '') };
  return { 错误: `"${s}" 未匹配到任何角色（tenkaassist sc/tc/en/韩文名/id）` };
}

function 角色名(id) { const 索 = 建别名索引(); return 索.id指别称.get(id) || 索.id指全名.get(id) || String(id); }
function 队伍名(ids) { return ids.map(id => `${角色名(id)}(${id})`).join(' > '); }

module.exports = { 解析链接, 应用条件, 创建引擎, 建别名索引, 解析角色, 角色名, 队伍名 };
