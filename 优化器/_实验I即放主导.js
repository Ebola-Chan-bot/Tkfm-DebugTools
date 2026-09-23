'use strict';
/*
 * 临时实验I：验证"即放填充主导评分、sync 分支改动被 max() 吃掉"假说。
 * 背景：role 泛化修复后 8 队达成率与束结果逐位不变（含扩展数），说明改动未影响任何评分排序。
 * 束搜索评分聚合（评分='sync'）：评 = Math.max(d即, d同)
 *   d即 = 规则快填(模式'rand', 延迟확률=0) → 要憋 恒 false（走 else 分支需 延迟확률>0）→ **从不憋궁**；
 *   d同 = 规则快填(模式'sync') → 才有憋궁逻辑（本次 role 泛化改的就是这条）。
 * 假说：对两支 88% 队，d即 ≥ d同 恒成立 → 评 = d即 → sync 分支的任何改动（含状态继承修复、role 泛化）都不生效。
 * 判别方法（零代码改动）：评分='rand' + R=1 → 循环只跑 r=0（即 即放），评 = 即放 = d即。
 *   若 rand/R=1 与 sync 的束结果逐位相同 → 假说成立（max 里是 d即 赢）。
 *   若不同 → d同 在部分层胜出，需另找未生效原因。
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
const 特例ID = new Set([10162, 10205]);
const getCharacter = 适配.角色数据().getCharacter;

function 选队(N) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const inst = 适配.createEngine();
  const 缓存 = new Map();
  const 角色 = id => { if (!缓存.has(id)) 缓存.set(id, getCharacter(id)); return 缓存.get(id); };
  const 可模拟 = id => { const c = 角色(id); return c && c.ok === true && c.rarity === 3 && c.hp && c.atk; };
  const 名单 = new Map();
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.length !== 5 || ids.some(id => !id || !可模拟(id) || 特例ID.has(id))) continue;
    const 键 = ids.join(',');
    const 旧 = 名单.get(键);
    if (!旧 || d.recommend > 旧.recommend) 名单.set(键, { 队: d.name || 键, ids, description: d.description, recommend: d.recommend });
  }
  const 强队 = [...名单.values()].sort((a, b) => b.recommend - a.recommend);
  const 用队 = [];
  for (const d of 强队) {
    if (用队.length >= N) break;
    const toks = 排程器.解析指令集(inst, d.ids, d.description, BOND);
    if (!toks || 排程器.重放(inst, d.ids, toks, BOND) !== d.recommend) continue;
    用队.push(d);
  }
  return 用队;
}

const 对照 = [
  { 名: '승나미', rec: 31005094926 },
  { 名: '칼리버', rec: 30270623339 },
  { 名: '88%队[4]', rec: 29902664856 },
  { 名: '88%队[7]', rec: 29581413492 },
];
const 队 = 选队(8);
const inst = 适配.createEngine();

for (const g of 对照) {
  const d = 队.find(x => x.recommend === g.rec);
  if (!d) { console.log(g.名 + ' 未找到'); continue; }
  const A = 排程器.束搜索(inst, d.ids, BOND, { width: 10, R: 4, 评分: 'sync', 时限秒: 600 });
  const B = 排程器.束搜索(inst, d.ids, BOND, { width: 10, R: 1, 评分: 'rand', 时限秒: 600 });
  const 相同 = A.dmg === B.dmg;
  console.log(`\n${g.名} ${d.ids.join(',')}  DB=${(d.recommend / 1e9).toFixed(2)}G`);
  console.log(`  sync  max(即,同): ${A.dmg.toLocaleString()} (${(A.dmg / d.recommend * 100).toFixed(2)}%) 扩${A.扩展数}`);
  console.log(`  rand/R1 纯即放 : ${B.dmg.toLocaleString()} (${(B.dmg / d.recommend * 100).toFixed(2)}%) 扩${B.扩展数}`);
  console.log(`  ⇒ ${相同 ? '逐位相同 = 即放主导，sync 分支（含本次 role 泛化）完全不生效 ✅假说成立' : '不同 = d同 在部分层胜出，假说不成立'}`);
  // 束胜者的 非딜러伤害궁 出手位置（10193/10147 这类 role≠0 伤害궁）
  const 非딜 = d.ids.map((id, i) => ({ id, i, c: getCharacter(id) })).filter(x => x.c.role !== 0 && (x.c.ultMag > 0 || x.c.atkMag > 0));
  for (const x of 非딜) {
    const 포 = t => t.map((tk, k) => (tk.idx === x.i && tk.act === '궁') ? `t${((k / 5) | 0) + 1}` : null).filter(Boolean).join(',');
    console.log(`  位${x.i + 1}=${x.id}(${x.c.role === 2 ? '탱' : x.c.role === 4 ? '디' : x.c.role === 3 ? '섶' : '힐'}) 궁出手: sync=[${포(A.toks)}] 纯即放=[${포(B.toks)}]`);
  }
}
