'use strict';
/* 调试85队：静态特征 + DB 重放中每槽 curCd 引擎视角轨迹（窗对齐构造为何崩） */
const path = require('path');
const 基 = __dirname;
const 适配 = require(path.join(基, '引擎适配.js'));
const 排程器 = require(path.join(基, '排程器.js'));
const 序先验 = require(path.join(基, '序先验.js'));
const fs = require('fs'), zlib = require('zlib');
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
const BOND = [5, 5, 5, 5, 5];
const IDS = '10197,10060,10177,10193,10208';
const ids0 = IDS.split(',').map(Number);

const 表 = 适配.角色表().filter(c => ids0.includes(c.id));
console.log('===== 静态特征 =====');
for (const c of 表.sort((a, b) => ids0.indexOf(a.id) - ids0.indexOf(b.id))) {
  const f = 排程器.特征.get(c.id);
  const sat = 序先验.饱和(c.id);
  console.log(`位${ids0.indexOf(c.id) + 1}=${c.id} ${c.name} role${c.role} cd${c.cd} atkMag${c.atkMag} ultMag${c.ultMag} 元素${c.element} 伤害궁=${f.ultMag > 0 || f.atkMag > 0} 序先验sat=${sat == null ? 'null' : sat.toFixed(4)}`);
}

// DB 궁相位
const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
let best = null;
for (const d of arr) {
  if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
  if (String(d.compstr).split(/\s+/).filter(Boolean).map(Number).join(',') !== IDS) continue;
  if (!best || d.recommend > best.recommend) best = d;
}
const inst = 适配.createEngine();
const DBtoks = 排程器.解析指令集(inst, ids0, best.description, BOND);
console.log('\n===== DB 排程 =====');
const 궁落 = {};
DBtoks.forEach((x, k) => { if (x.act === '궁') { const t = ((k / 5) | 0) + 1; (궁落[x.idx] = 궁落[x.idx] || []).push(t); } });
for (let i = 0; i < 5; i++) {
  const 방t = DBtoks.map((x, k) => x.idx === i && x.act === '방' ? ((k / 5) | 0) + 1 : null).filter(t => t);
  console.log(`  位${i + 1}: 궁[${(궁落[i] || []).join(',')}] 방[t${방t.join(',t')}]`);
}

// DB 重放：每回合首各槽 curCd 轨迹（引擎视角，看降CD如何改写相位）
console.log('\n===== DB 重放中每槽 curCd@每回合首（引擎视角）=====');
{
  const inc = inst.increment;
  inc.initBattle(ids0, BOND, -1, null);
  const comp = inst.internals.comp;
  const 轨迹 = [[], [], [], [], []];
  for (let k = 0; k < 65; k++) {
    const t = ((k / 5) | 0) + 1, j = k % 5;
    if (j === 0) for (let i = 0; i < 5; i++) 轨迹[i].push(`t${t}:${comp[i].curCd}`);
    if (!inc.step(DBtoks[k].idx, DBtoks[k].act)) { console.log('  非法步@', k); break; }
  }
  console.log('  伤害累计:', (inc.dmgSoFar() / 1e9).toFixed(3), 'G  (DB=' + (best.recommend / 1e9).toFixed(3) + 'G)');
  for (let i = 0; i < 5; i++) console.log(`  位${i + 1}: ${轨迹[i].join(' ')}`);
}

// 窗对齐构造（S={1,4,7,10,13}，实验M #1，构造39.28%）的궁相位
console.log('\n===== 窗对齐构造 S={1,4,7,10,13} 的궁相位 =====');
{
  const inc = inst.increment;
  if (inc.initBattle(ids0, BOND, -1, null)) {
    const comp = inst.internals.comp;
    const 原 = inc.原语();
    const S = new Set([1, 4, 7, 10, 13]);
    const 放计数 = {};
    const toks = [];
    for (let k = 0; k < 65; k++) {
      const t = ((k / 5) | 0) + 1;
      // 选：buff궁(2e6) > 伤害궁(1e6档) > 딜러평(500) > 방(30/1) > 평(100/1)
      let bI = -1, bA = null, bS = -Infinity;
      for (let i = 0; i < 5; i++) {
        const c = comp[i];
        if (!c || c.isActed) continue;
        const f = 排程器.特征.get(ids0[i]) || {};
        const 평점 = (f.role === 0 ? 500 : 100) + (f.atkMag || 0) * f.atk / 1000;
        if (평점 > bS) { bS = 평점; bI = i; bA = '평'; }
        const 방점 = (f.role === 2 ? 30 : 1);
        if (방점 > bS) { bS = 방점; bI = i; bA = '방'; }
        if (c.curCd <= 0) {
          const 궁점 = 排程器.是伤害궁(f) ? 1e6 + 4.5e5 + f.atk * (f.ultMag > 0 ? f.ultMag : 1) / 1000 : 2e6 + f.atk / 1e6;
          if (궁점 > bS) { bS = 궁점; bI = i; bA = '궁'; }
        }
      }
      if (bI < 0) break;
      let sel = { i: bI, a: bA };
      if (sel.a === '궁' && 排程器.是伤害궁(排程器.特征.get(ids0[sel.i]))) {
        if (!S.has(t) && (放计数[sel.i] || 0) > 0 && t < 11) {
          // 憋：禁伤害궁重选
          let aI = -1, aA = null, aS = -Infinity;
          for (let i = 0; i < 5; i++) {
            const c = comp[i];
            if (!c || c.isActed) continue;
            const f = 排程器.特征.get(ids0[i]) || {};
            const 평점 = (f.role === 0 ? 500 : 100) + (f.atkMag || 0) * f.atk / 1000;
            if (평점 > aS) { aS = 평점; aI = i; aA = '평'; }
            const 방점 = (f.role === 2 ? 30 : 1);
            if (방점 > aS) { aS = 방점; aI = i; aA = '방'; }
            if (c.curCd <= 0 && !排程器.是伤害궁(f)) {
              const 궁점 = 2e6 + f.atk / 1e6;
              if (궁점 > aS) { aS = 궁점; aI = i; aA = '궁'; }
            }
          }
          if (aI >= 0) sel = { i: aI, a: aA };
          else 放计数[sel.i] = (放计数[sel.i] || 0) + 1;
        } else 放计数[sel.i] = (放计数[sel.i] || 0) + 1;
      }
      const ok = sel.a === '평' ? 原.do_atk(sel.i) : (sel.a === '궁' ? 原.do_ult(sel.i) : 原.do_def(sel.i));
      if (!ok) break;
      toks.push({ idx: sel.i, act: sel.a });
    }
    const 궁落2 = {};
    toks.forEach((x, k) => { if (x.act === '궁') { const t = ((k / 5) | 0) + 1; (궁落2[x.idx] = 궁落2[x.idx] || []).push(t); } });
    for (let i = 0; i < 5; i++) console.log(`  位${i + 1}: 궁[${(궁落2[i] || []).join(',')}] (toks=${toks.length})`);
    console.log('  构造dmg:', (排程器.重放(inst, ids0, toks, BOND) / 1e9).toFixed(3), 'G =', (排程器.重放(inst, ids0, toks, BOND) / best.recommend * 100).toFixed(2), '%');
  }
}
