'use strict';
/*
 * _探针memo判别.js —— 量化"全局memo跨段碰撞"与静态机制特征的判别关系（只构造不爬山，秒级/队）
 * 背景：_AB全局memo 实测跨段命中 1/6（仅후지카=全队无伤害궁队，省28s/1.51x；其余 命中0、0.95~0.98x 纯开销）。
 *   memo 命中必要条件 = 相位/节拍/窗 三种构造范式塌缩到同一 toks（可行时间线被 CD 锁死时才会发生）。
 *   本探针在 R9g 同口径前 200 队上批量数碰撞，并与静态特征（无伤害궁/cd结构/闸门特征）交叉，
 *   判定：①碰撞率整体多少（决定 memo 是否值得默认开）②哪个特征能干净判别（决定若门控用什么门）。
 * 口径与生产一致：相位档{5,99}含档间去重、节拍TopK3(排程器内已先去重后slice的生产顺序)、窗TopK3(含toks去重)。
 * 碰撞定义：把各段"送去爬山的候选toks键"拼成一条链（=生产兜底链的爬山调用序列，未达标才走后续段，
 *   这里全部段都数——保守上界；真实命中还需 终<recommend 门控成立）。
 * 用法：node _探针memo判别.js [topN=200]
 */
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const 排 = require('./排程器.js'), 适配 = require('./引擎适配.js'), 机制特征 = require('./机制特征.js');
const DATA_JSON = path.resolve(__dirname, '..', '..', 'tenkaassist_data', 'data', 'data.json');
const BOND = [5, 5, 5, 5, 5];
const 特例ID = new Set([10162, 10205]);
const topN = Number(process.argv[2]) || 200;

// ---- 选队（与 内层benchmark.选队 同口径） ----
const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
const inst = 适配.createEngine();
const getCharacter = 适配.角色数据().getCharacter;
const 缓存 = new Map();
function 角色(id) { if (!缓存.has(id)) 缓存.set(id, getCharacter(id)); return 缓存.get(id); }
const 可模拟 = id => { const c = 角色(id); return c && c.ok === true && c.rarity === 3 && c.hp && c.atk; };
const 名单 = new Map();
for (const d of arr) {
  if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
  const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
  if (ids.length !== 5 || ids.some(id => !id || !可模拟(id) || 特例ID.has(id))) continue;
  const 键 = ids.join(',');
  const 旧 = 名单.get(键);
  if (!旧 || d.recommend > 旧.recommend) 名单.set(键, { 队: d.name, ids, description: d.description, recommend: d.recommend });
}
const 队列 = [];
for (const d of [...名单.values()].sort((a, b) => b.recommend - a.recommend)) {
  if (队列.length >= topN) break;
  const toks = 排.解析指令集(inst, d.ids, d.description, BOND);
  if (toks && 排.重放(inst, d.ids, toks, BOND) === d.recommend) 队列.push(d);
}
console.log(`探针memo判别: ${队列.length} 队（bit级复现过）\n`);
console.log('队名           | 碰撞(链-独) | 链长 | 无伤궁 | cd单一 | 需相位 | 需窗 | ids');

const 行 = [];
for (let i = 0; i < 队列.length; i++) {
  const d = 队列[i];
  const 链 = [];
  try {
    // 相位段：档{5,99}+档间去重（生产见构逻辑同口径用toks键）
    const 见相 = new Set();
    for (const 憋 of [5, 99]) {
      const g = 排.相位对齐构造(inst, d.ids, BOND, { 最大憋: 憋 });
      if (!g || !(g.dmg > 0)) continue;
      const k = 排.toks键(g.toks);
      if (见相.has(k)) continue;
      见相.add(k);
      链.push(k);
    }
    // 节拍段：TopK3（排程器内部已含生产去重）
    for (const 构 of (排.节拍对齐构造(inst, d.ids, BOND, { TopK: 3 }) || [])) 链.push(排.toks键(构.toks));
    // 窗段：TopK3（排程器内部已含生产去重）
    for (const 构 of (排.窗对齐构造(inst, d.ids, BOND, { TopK: 3 }) || [])) 链.push(排.toks键(构.toks));
  } catch (e) {
    console.log(`${d.队} 构造异常: ${e.message.slice(0, 50)}`);
    continue;
  }
  const 独 = new Set(链).size;
  const 碰撞 = 链.length - 独;
  // 静态特征
  const 无伤 = d.ids.every(id => { const f = 排.特征.get(id) || {}; return !(f.ultMag > 0 || f.atkMag > 0); });
  const cd列 = d.ids.map(id => (排.特征.get(id) || {}).cd || 0).filter(c => c > 0);
  const cd单一 = new Set(cd列).size <= 1;
  const 需相 = 机制特征.需相位规划(d.ids);
  const 需窗 = 机制特征.需窗规划(d.ids);
  const r = { 名: d.队, ids: d.ids.join(','), 碰撞, 链长: 链.length, 无伤, cd单一, 需相, 需窗 };
  行.push(r);
  if (碰撞 > 0 || 无伤) console.log(`${d.队.slice(0, 12).padEnd(12)} | ${碰撞} | ${r.链长} | ${无伤 ? '★' : '-'} | ${cd单一 ? 'Y' : 'N'} | ${需相 ? 'Y' : 'N'} | ${需窗 ? 'Y' : 'N'} | ${r.ids}`);
}

// ---- 交叉汇总 ----
const 碰组 = 行.filter(r => r.碰撞 > 0), 零组 = 行.filter(r => r.碰撞 === 0);
const 率 = (组, f) => 组.length ? (组.filter(f).length / 组.length * 100).toFixed(0) + '%' : '-';
console.log(`\n=== 交叉汇总（n=${行.length}）===`);
console.log(`碰撞组=${碰组.length} 队 (${(碰组.length / 行.length * 100).toFixed(1)}%)   零碰撞组=${零组.length}`);
for (const [特名, f] of [['全队无伤害궁', r => r.无伤], ['cd单一', r => r.cd单一], ['需相位规划', r => r.需相], ['需窗规划', r => r.需窗]]) {
  const a = 碰组.filter(f).length, b = 零组.filter(f).length;
  const 覆盖 = 碰组.length ? (a / 碰组.length * 100).toFixed(0) : '-';
  const 误报 = 行.filter(f).length ? (b / 行.filter(f).length * 100).toFixed(0) : '-';
  console.log(`${特名}: 碰撞组中占比=${覆盖}%(${a}/${碰组.length})  该特征队中零碰撞比例=${误报}%(${b}/${行.filter(f).length})`);
}
const 总碰 = 行.reduce((s, r) => s + r.碰撞, 0), 总链 = 行.reduce((s, r) => s + r.链长, 0);
console.log(`\n全局碰撞率: ${总碰}/${总链} = ${(总碰 / 总链 * 100).toFixed(1)}%（memo可省的爬山调用占比上界）`);
console.log('判读: 碰撞集中在无伤궁 → memo 可门控"全队无伤害궁才开"；碰撞分散 → memo 默认开(期望值正)或删。');
