'use strict';
/*
 * 临时诊断I：非딜러(role≠0)伤害궁 角色的影响面 + CD 轨迹归因。
 * 实验H 实锤：束把 位4(10193, role2 탱커, 伤害궁) 的 궁 就绪即放打成 5 次(t1/t4/t7/t10/t13, 间隔3)，
 *   DB 憋到 buff 齐射回合只打 4 次(t2/t5/t9/t13)，次数少但每次吃满 buff → 总伤高 3.6G。
 *   根因：sync 填充憋궁判据写死 `f.role===0`（排程器.js 3 处），탱커/서포터的伤害궁永不被憋。
 * 本脚本回答两件事：
 *   ① 影响面：全库有多少可模拟 SSR 是"非딜러伤害궁"？8 支 benchmark 队里哪些队含此类角色？
 *      → 决定"role===0 → 任意伤害궁"这个泛化改动的风险边界。
 *   ② CD 轨迹：DB 能在 t2 放 cd4 的궁、束能 t1/t4/t7 间隔 3 放 → 必有 CD 操纵机制介入。
 *      逐步 trace idx3(curCd/谁刚行动) 找出降 CD 来源，确认憋궁窗口设计要不要考虑 CD 操纵。
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));
const 机制特征 = require(path.join(__dirname, '机制特征.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
const 特例ID = new Set([10162, 10205]);
const getCharacter = 适配.角色数据().getCharacter;

// ---- ① 影响面 ----
const SSR = 适配.可模拟SSR清单();
const 非딜伤害궁 = SSR.filter(c => c.role !== 0 && (c.ultMag > 0 || c.atkMag > 0));
const 딜伤害궁 = SSR.filter(c => c.role === 0 && (c.ultMag > 0 || c.atkMag > 0));
console.log(`可模拟 SSR = ${SSR.length}`);
console.log(`  딜러(role0)伤害궁 = ${딜伤害궁.length}`);
console.log(`  非딜러伤害궁      = ${非딜伤害궁.length}  ← 现行 sync 憋궁判据完全漏掉这一类`);
const 역할名 = ['딜', '힐', '탱', '섶', '디'];
const 分布 = {};
for (const c of 非딜伤害궁) 分布[역할名[c.role]] = (分布[역할名[c.role]] || 0) + 1;
console.log('  按 role 分布: ' + Object.entries(分布).map(([k, v]) => `${k}=${v}`).join(' '));
console.log('  样例: ' + 非딜伤害궁.slice(0, 12).map(c => `${c.id}(${역할名[c.role]},cd${c.cd})`).join(' '));

// 8 队里哪些含 非딜러伤害궁
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
const 队 = 选队(8);
console.log('\n---- 8 支 benchmark 队的 非딜러伤害궁 构成（= 泛化改动的直接影响面）----');
const 达成率 = { '31005094926': '98.16%승나미', '30484251363': '100%후지카', '30291656996': '98.34%', '30270623339': '100%칼리버', '29902664856': '88.05%', '29820359734': '100%', '29707752892': '100%신이카', '29581413492': '88.33%' };
for (const d of 队) {
  const 該当 = d.ids.map((id, i) => ({ id, i, c: getCharacter(id) })).filter(x => x.c.role !== 0 && (x.c.ultMag > 0 || x.c.atkMag > 0));
  console.log(`  ${d.ids.join(',')} DB=${(d.recommend / 1e9).toFixed(2)}G 束+爬${达成率[String(d.recommend)] || '?'}  非딜伤害궁: ${該当.length ?該当.map(x => `位${x.i + 1}=${x.id}(${역할명(x.c.role)},cd${x.c.cd})`).join(' ') : '无'}`);
}
function 역할명(r) { return 역할名[r] || r; }

// ---- ② CD 轨迹（队[4]）----
const d4 = 队.find(x => x.recommend === 29902664856);
const inst = 适配.createEngine();
const 목표toks = 排程器.解析指令集(inst, d4.ids, d4.description, BOND);
console.log(`\n---- ② 位4(idx3)=10193 CD 操纵机制 ----`);
for (const id of d4.ids) {
  const f = 机制特征.画像(id);
  console.log(`  ${id}(role${역할명(getCharacter(id).role)},cd${getCharacter(id).cd}): CD操纵数=${f ? f.CD操纵数 : '?'} 注入=${f ? f.注入数 : '?'} 门控=${f ? f.门控数 : '?'} 旗标位=${f ? f.旗标位 : '?'}`);
}

// 逐步 trace：每步后 idx3 的 curCd/isActed，标注谁刚行动 + 该步是否 궁
const inc = inst.increment;
inc.initBattle(d4.ids, BOND, -1, null);
const comp = inst.internals.comp;
console.log('\n---- DB toks 下 idx3(位4=10193) 的 curCd 轨迹（只看 t1~t5）----');
console.log('s\tt.k\tDB动作\tidx3.curCd\tidx3.isActed\t备注');
for (let k = 0; k < 25; k++) {
  const 前 = comp[3] ? comp[3].curCd : null;
  if (!inc.step(목표toks[k].idx, 목표toks[k].act)) { console.log(`${k}\t非法`); break; }
  const 后 = comp[3] ? comp[3].curCd : null;
  const 备注 = (前 !== 后 && 목표toks[k].idx !== 3) ? `⚠CD被他人改 ${前}→${后}` : (前 !== 后 ? `${前}→${后}` : '');
  console.log(`${k}\tt${((k / 5) | 0) + 1}.${k % 5 + 1}\t位${목표toks[k].idx + 1}${목표toks[k].act}\t${后}\t${comp[3] ? comp[3].isActed : '?'}\t${备注}`);
}
