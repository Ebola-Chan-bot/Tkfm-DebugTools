'use strict';
/*
 * 临时实验G：两支 88% 队的逐回合伤害归因——DB 排程 vs 束搜索产物，差距在哪个回合产生。
 * 诊断F 已实锤：死亡层 s2（t1 全평、无궁），width线评分 === top评分（前 54 名巨大平票块），
 *   DB 前缀低 1.5% 即被挤出；填充续航低估至真值 75.7~79.6%（远比 승나미 修复前的 88.2% 严重）。
 * 本脚本回答：填充器在哪一回合开始偏离 DB、偏离造成多少伤害损失。
 * 方法（全用公开 API，不改核心）：initBattle + 逐步 step，每回合末记 dmgSoFar → 累计伤害曲线；
 *   DB toks 与 束搜索 r.toks 各跑一次，逐回合对比 Δ 与首个分歧点。
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
const 特例ID = new Set([10162, 10205]);

function 选队(N) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const inst = 适配.createEngine();
  const getCharacter = 适配.角色数据().getCharacter;
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

// 逐回合累计伤害曲线（每 5 步记一次 dmgSoFar）
function 逐回合曲线(inst, ids, toks) {
  const inc = inst.increment;
  if (!inc.initBattle(ids, BOND, -1, null)) return null;
  const 曲线 = [];
  for (let k = 0; k < toks.length; k++) {
    if (!inc.step(toks[k].idx, toks[k].act)) { 曲线.push(null); break; }
    if (k % 5 === 4) 曲线.push(inc.dmgSoFar());
  }
  return 曲线;
}

const 队 = 选队(8);
const 目标 = 队.filter(d => d.recommend === 29902664856 || d.recommend === 29581413492);
const inst = 适配.createEngine();

for (const d of 目标) {
  console.log(`\n########## ${d.ids.join(',')}  DB=${d.recommend.toLocaleString()} ##########`);
  const 목표toks = 排程器.解析指令集(inst, d.ids, d.description, BOND);
  const r = 排程器.束搜索(inst, d.ids, BOND, { width: 10, R: 4, 评分: 'sync', 时限秒: 600 });
  console.log(`束 = ${r.dmg.toLocaleString()} (${(r.dmg / d.recommend * 100).toFixed(2)}%)  缺口 = ${((d.recommend - r.dmg) / 1e9).toFixed(2)}G`);

  const db曲线 = 逐回合曲线(inst, d.ids, 목표toks);
  const 束曲线 = 逐回合曲线(inst, d.ids, r.toks);

  // 首个分歧点
  let 首分歧 = -1;
  for (let k = 0; k < 65; k++) {
    if (목표toks[k].idx !== r.toks[k].idx || 목표toks[k].act !== r.toks[k].act) { 首分歧 = k; break; }
  }
  console.log(首分歧 >= 0 ? `首个分歧步 s=${首分歧} (t${((首分歧 / 5) | 0) + 1}.${首分歧 % 5 + 1}): DB=位${목표toks[首分歧].idx + 1}${목표toks[首分歧].act}  束=位${r.toks[首分歧].idx + 1}${r.toks[首分歧].act}` : '两排程完全一致');

  console.log('\nt\tDB累计G\t束累计G\tΔG\tDB当回合G\t束当回合G\tDB动作\t\t束动作');
  for (let t = 0; t < 13; t++) {
    const dbC = db曲线[t], 束C = 束曲线[t];
    if (dbC == null || 束C == null) { console.log(`t${t + 1}\t(非法中断)`); continue; }
    const db增 = t === 0 ? dbC : dbC - db曲线[t - 1];
    const 束增 = t === 0 ? 束C : 束C - 束曲线[t - 1];
    const dbA = 목표toks.slice(t * 5, t * 5 + 5).map(x => `位${x.idx + 1}${x.act}`).join(' ');
    const 束A = r.toks.slice(t * 5, t * 5 + 5).map(x => `位${x.idx + 1}${x.act}`).join(' ');
    console.log(`t${t + 1}\t${(dbC / 1e9).toFixed(3)}\t${(束C / 1e9).toFixed(3)}\t${((dbC - 束C) / 1e9).toFixed(3)}\t${(db增 / 1e9).toFixed(3)}\t\t${(束增 / 1e9).toFixed(3)}\t\t${dbA}  |  ${束A}`);
  }
}
