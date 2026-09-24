'use strict';
/*
 * _实验M2窗对齐.js：窗对齐构造 v2（修正版）原型验证。
 *
 * v1（_实验M窗对齐.js）失败教训（85队实测 构造39.28%→爬75.93% < 现终85.16%）：
 *   ① 首发例外误伤：位1(얀코) t5就绪被首发例外放行 t5放（DB 憋到 t7）；
 *   ② t<11 强制放阈值：位4/5 t12 被强制放（DB 憋到 t13 终局齐射）；
 *   ③ buff궁准点即放：位2(풍오라) t6就绪即放 궁[6,11]（DB [8,13]，t8那发靠 -1CD 级联为얀코 t10 铺路）；
 *   ④ 伤害궁次序用 atk×ultMag 代理而非序先验（位4 sat=0.855/位5 0.119/位1 0.010）。
 *
 * v2 规则（调试85队 curCd 轨迹逐位核对）：
 *   伤害궁：回合∈S → 放；回合∉S 且未来(S 中 >t 的回合)存在 → 憋(改평)；未来无窗 → 放（替代 t>=11 兜底）。
 *   buff궁：两族策略扫描——'窗憋'（同伤害궁规则）与 '准点'（就绪即放）。
 *   回合内出手序：沿用比分选择（buff궁 2e6 恒先于伤害궁 1e6；伤害궁序分改 序先验 饱和档内分 = 伤害궁분）。
 *   S 候选族：节拍族（队内每个 cd 值 × 全 t0，按集去重）∪ 机制周期族（bin CmpGTMod(Gated) → (t+off)%mod=rem
 *     窗集，含首发变体 S∪{1}）——全部静态可算，无角色专项判断。
 *   85 队预期：S={1,4,7,10,13} 时 位4궁[1,4,7,10,13]、位5[4,7,10,13]、位1[7,10,13]（t5 憋/t4 未就绪自然推迟）、
 *     位3 buff[4,7,10,13] —— 前四位与 DB 完全一致；位2 两族都不是 [8,13]，留给爬山精修。
 *
 * 两阶段：阶段A 纯构造扫描（~0.5s/队）打印构造dmg+궁相位+与DB相位对比；阶段B 对构造TopK爬山验证。
 * 用法: node _实验M2窗对齐.js [阶段B爬山预算=30000] [谷底=8] [TopK爬=3] [--仅构造]
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));
const 序先验 = require(path.join(__dirname, '序先验.js'));
const 机制特征 = require(path.join(__dirname, '机制特征.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');

function DB队(idsStr) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  let best = null;
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number).join(',');
    if (ids !== idsStr) continue;
    if (!best || d.recommend > best.recommend) best = d;
  }
  return best;
}

// ---- 伤害궁序先验档内分（与 排程器.伤害궁분 同构，本地复刻避免改生产导出）----
function 伤害序分(id, f) {
  const sat = 序先验.饱和(id);
  if (sat != null) return 1e6 + sat * 9e5;
  const 旧 = (f.atk * (f.ultMag > 0 ? f.ultMag : 1)) / 1000;
  return 1e6 + 4.5e5 + 旧;
}

// ---- 机制周期窗（bin cond: CmpGTMod / CmpGTModGated；定点 ÷1e4）----
function 周期窗列表(ids) {
  const d = 适配.机制数据();
  const 出 = [];
  for (const id of ids) {
    const rec = d.records.find(r => r.id === id);
    if (!rec) continue;
    for (const c of 机制特征.展开lib5(rec.cmds)) {
      if (!c.cond) continue;
      if (c.cond.kind !== 'CmpGTMod' && c.cond.kind !== 'CmpGTModGated') continue;
      const off = c.cond.a / 1e4, mod = c.cond.b / 1e4, rem = c.cond.nameIdx / 1e4;
      if (!(Number.isInteger(off) && Number.isInteger(mod) && mod >= 2 && mod <= 12 && Number.isInteger(rem))) continue;
      出.push({ id, off, mod, rem, gated: c.cond.kind === 'CmpGTModGated' });
    }
  }
  return 出;
}

// ---- S 候选族 ----
function S族(ids) {
  const 集 = new Map();
  const 加 = (S, 来源) => {
    if (!S.length) return;
    const 键 = S.join(',');
    if (!集.has(键)) 集.set(键, { S: S.slice().sort((a, b) => a - b), 来源 });
  };
  const cds = [...new Set(ids.map(id => (排程器.特征.get(id) || {}).cd).filter(c => c >= 1 && c <= 12))];
  for (const T of cds) for (let t0 = 1; t0 <= 13; t0++) {
    const S = []; for (let t = t0; t <= 13; t += T) S.push(t);
    加(S, `节拍T${T}t0=${t0}`);
  }
  for (const p of 周期窗列表(ids)) {
    const S = [];
    for (let t = 1; t <= 13; t++) {
      if ((t + p.off) % p.mod !== p.rem) continue;
      if (p.gated && t === 1) continue;
      S.push(t);
    }
    if (S.length) {
      加(S, `周期id${p.id}(t${p.off >= 0 ? '+' : ''}${p.off})%${p.mod}=${p.rem}${p.gated ? 'G' : ''}`);
      加([...new Set([1, ...S])], `周期同上+首发`);
    }
  }
  return [...集.values()];
}

// ---- 窗对齐构造 v2 ----
function 窗对齐构造(inst, ids, bonds, S, buff窗) {
  bonds = bonds || BOND;
  const inc = inst.increment;
  if (!inc.initBattle(ids, bonds, -1, null)) return null;
  const comp = inst.internals.comp;
  const 原 = inc.原语();
  const S集 = new Set(S);
  const 放计数 = {};

  // 选动作：buff궁(2e6，除非禁) > 伤害궁(1e6+序先验档内分，除非禁) > 딜러평(500) > 탱방(30) > 평(100) > 방(1)
  function 选(禁伤궁, 禁buff궁) {
    let bI = -1, bA = null, bS = -Infinity;
    for (let i = 0; i < 5; i++) {
      const c = comp[i];
      if (!c || c.isActed) continue;
      const f = 排程器.特征.get(ids[i]);
      if (!f) continue;
      const 평점 = (f.role === 0 ? 500 : 100) + (f.atkMag || 0) * f.atk / 1000;
      if (평점 > bS) { bS = 평점; bI = i; bA = '평'; }
      const 방점 = (f.role === 2 ? 30 : 1);
      if (방점 > bS) { bS = 방점; bI = i; bA = '방'; }
      if (c.curCd <= 0) {
        if (排程器.是伤害궁(f)) {
          if (禁伤궁) continue;
          const 궁점 = 伤害序分(ids[i], f);
          if (궁점 > bS) { bS = 궁점; bI = i; bA = '궁'; }
        } else {
          if (禁buff궁) continue;
          const 궁점 = 2e6 + f.atk / 1e6;
          if (궁점 > bS) { bS = 궁점; bI = i; bA = '궁'; }
        }
      }
    }
    return bI < 0 ? null : { i: bI, a: bA };
  }

  const toks = [];
  for (let k = 0; k < 65; k++) {
    const t = ((k / 5) | 0) + 1;
    let sel = 选(false, false);
    if (!sel) break;
    if (sel.a === '궁') {
      const f = 排程器.特征.get(ids[sel.i]);
      const 伤害 = 排程器.是伤害궁(f);
      const 有未来窗 = S.some(x => x > t);
      if (伤害 && !(放计数[sel.i] > 0)) { /* 首发不特判（v2：全靠 S 族覆盖） */ }
      const 要憋 = (伤害 || buff窗) && !S集.has(t) && 有未来窗;
      if (要憋) {
        const alt = 选(true, buff窗 || 伤害);   // 伤害궁→禁伤害궁重选；buff窗模式的buff궁→连buff궁一起禁（否则原样重选=没憋）
        if (alt) sel = alt;
        else if (伤害) 放计数[sel.i] = (放计数[sel.i] || 0) + 1;
      } else if (伤害) {
        放计数[sel.i] = (放计数[sel.i] || 0) + 1;
      }
    }
    const ok = sel.a === '평' ? 原.do_atk(sel.i) : (sel.a === '궁' ? 原.do_ult(sel.i) : 原.do_def(sel.i));
    if (!ok) break;
    toks.push({ idx: sel.i, act: sel.a });
  }
  if (toks.length < 65) {
    const 修 = 排程器.修复解码(inst, ids, toks, bonds);
    return 修 ? { toks: 修.toks, dmg: 修.dmg } : null;
  }
  return { toks, dmg: 排程器.重放(inst, ids, toks, bonds) };
}

function 궁相位串(toks) {
  const m = new Map();
  toks.forEach((x, k) => {
    if (x.act !== '궁') return;
    const t = ((k / 5) | 0) + 1;
    if (!m.has(x.idx)) m.set(x.idx, []);
    m.get(x.idx).push(t);
  });
  return Array.from({ length: 5 }, (_, i) => `位${i + 1}[${(m.get(i) || []).join(',')}]`).join(' ');
}

// ---- 目标队 ----
const 目标 = [
  { 名: '85队얀코', ids: '10197,10060,10177,10193,10208', 现终: 85.16 },
  { 名: '89队얀코', ids: '10197,10060,10177,10193,10211', 现终: 89.74 },
  { 名: '91队얀코', ids: '10197,10152,10196,10177,10147', 现终: 91.70 },
  { 名: '92승나미', ids: '10177,10152,10208,10211,10197', 现终: 91.92 },
  { 名: '92얀코125', ids: '10197,10152,10196,10125,10147', 现终: 92.28 },
  { 名: '92나리', ids: '10202,10212,10133,10210,10072', 现终: 92.91 },
  { 名: '승나미本队(对照)', ids: '10177,10060,10211,10208,10197', 现终: 98.16 },
  { 名: '칼리버(对照)', ids: '10211,10167,10128,10168,10197', 现终: 100.0 },
];
// 命令行可只指定一队（阶段A调试用）：node _实验M2窗对齐.js ... --队=10197,10060,10177,10193,10208
const 队参 = process.argv.find(a => a.startsWith('--队='));
const 目标过滤 = 队参 ? 队参.slice(4) : null;

const 爬山预算 = Number(process.argv[2]) || 30000;
const 谷底 = Number(process.argv[3]) || 8;
const TOP爬 = Number(process.argv[4]) || 3;
const 仅构造 = process.argv.includes('--仅构造');

const inst = 适配.createEngine();

for (const g of 目标) {
  if (目标过滤 && g.ids !== 目标过滤) continue;
  const db = DB队(g.ids);
  if (!db) { console.log(`${g.名}: DB无记录`); continue; }
  const ids0 = g.ids.split(',').map(Number);
  const DBtoks = 排程器.解析指令集(inst, ids0, db.description, BOND);
  const 真값 = 排程器.重放(inst, ids0, DBtoks, BOND);
  const pct = x => (x / 真값 * 100).toFixed(2) + '%';
  console.log(`\n########## ${g.名} ${g.ids} DB=${(真값 / 1e9).toFixed(3)}G 现终=${g.现终}% ##########`);
  console.log(`DB 궁相位: ${궁相位串(DBtoks)}`);
  console.log(`机制周期: ${JSON.stringify(周期窗列表(ids0))}`);

  // 阶段A：构造扫描（S × buff策略）
  const 候选 = S族(ids0);
  const 构造们 = [];
  for (const c of 候选) {
    for (const buff窗 of [true, false]) {
      const r = 窗对齐构造(inst, ids0, BOND, c.S, buff窗);
      if (r && r.dmg > 0) 构造们.push({ ...c, buff窗, ...r });
    }
  }
  构造们.sort((a, b) => b.dmg - a.dmg);
  console.log(`S族${候选.length}个 × 2buff策略 → 合法构造 ${构造们.length} 个, Top6:`);
  构造们.slice(0, 6).forEach((r, i) =>
    console.log(`  #${i + 1} S={${r.S.join(',')}} ${r.来源} buff${r.buff窗 ? '窗憋' : '准点'} 构造${pct(r.dmg)}\n      ${궁相位串(r.toks)}`));

  if (仅构造) continue;

  // 阶段B：TopK 构造+爬山(预算+谷底试探)
  let 终 = { dmg: 0, 名: '-' };
  for (const r of 构造们.slice(0, TOP爬)) {
    const t0 = Date.now();
    const h = 排程器.爬山(inst, ids0, r.toks, BOND, 爬山预算, null, null, 谷底);
    const 终点 = (h && h.dmg > r.dmg) ? h.dmg : r.dmg;
    console.log(`  爬 S={${r.S.join(',')}} buff${r.buff窗 ? '窗憋' : '准点'} (${r.来源}): 构造${pct(r.dmg)} → ${pct(终点)} (试探${h ? h.谷底试探数 : 0}/采纳${h ? h.谷底采纳数 : 0}) [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
    if (终点 > 终.dmg) 终 = { dmg: 终点, 名: `S={${r.S.join(',')}}buff${r.buff窗 ? '窗' : '准'}(${r.来源})` };
  }
  const 提升 = 终.dmg / 真값 * 100 - g.现终;
  console.log(`  ===== v2窗对齐终=${pct(终.dmg)} [${终.名}] vs 现终=${g.现终}% → ${提升 > 0.05 ? '★提升+' + 提升.toFixed(2) + 'pp' : (提升 < -0.05 ? '▼低于现终' + 提升.toFixed(2) + 'pp' : '≈持平')} =====`);
}
console.log('\n完成');
