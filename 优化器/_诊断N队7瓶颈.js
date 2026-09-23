'use strict';
/*
 * 临时诊断N：最差队（队[7] 10197,10096,10134,10193,10147，终值91.48%）瓶颈归因。
 * 区分三假说：
 *   H1 搜索资源不够 → 爬山预算递增轨迹（10k+20k+30k）与束扩宽（w10/20/30 R4、w10 R8）是否仍能提升终值；
 *      注：实验E 的扩宽无效结论产生于 sync 状态继承修复【之前】，填充已换血，需重测。
 *   H2 在无效区间浪费时间 → 递增轨迹中每段预算的提升次数：若大部分评估发生在最后一次峰值之后，
 *      说明资源耗在平顶区（但需对比各路径耗时占比才能判定"浪费"是否为主要矛盾）。
 *   H3 过早剪掉正解 → 兜底终局解 vs DB 的逐位 token 编辑距离 + 궁相位对照表：
 *      距离若远超邻域半径(1~2)，束/爬山在结构上到不了 DB；配合诊断F 已实锤的
 *      "DB 前缀在 s2（t1 全평层）被 width 线挤出、填充续航低估至真值 75.7~79.6%"定性剪枝位置。
 * 对照组：队[4]（92.53%，同模式但兜底收效更大），轻量跑（不含束扩宽网格）。
 * 全部用公开 API，不改核心。
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');

function DB队(idsStr) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  let best = null;
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.join(',') !== idsStr) continue;
    if (!best || d.recommend > best.recommend) best = { ids, description: d.description, recommend: d.recommend };
  }
  return best;
}

const 目标组 = [
  { 名: '队[7]最差', ids: '10197,10096,10134,10193,10147', 完整: true },
  { 名: '队[4]对照', ids: '10197,10152,10096,10193,10147', 完整: false },
];
const inst = 适配.createEngine();

// 工具：逐位 token 编辑距离（65 步中 idx 或 act 不同的步数）
function 编辑距离(a, b) {
  let n = 0;
  for (let k = 0; k < Math.min(a.length, b.length); k++) {
    if (a[k].idx !== b[k].idx || a[k].act !== b[k].act) n++;
  }
  return n;
}
// 工具：궁相位表（每位角色的 궁 落在哪些回合）
function 궁相位表(t) {
  const m = new Map();
  t.forEach((x, k) => {
    if (x.act !== '궁') return;
    const T = ((k / 5) | 0) + 1;
    if (!m.has(x.idx)) m.set(x.idx, []);
    m.get(x.idx).push('t' + T);
  });
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([i, v]) => `位${i + 1}:${v.join('/')}`).join('  ');
}
const pct = (x, r) => (x / r * 100).toFixed(2) + '%';

for (const g of 目标组) {
  const d0 = DB队(g.ids);
  const 真값 = d0.recommend;
  const DBtoks = 排程器.解析指令集(inst, d0.ids, d0.description, BOND);
  console.log(`\n########## ${g.名} ${g.ids}  DB=${(真값 / 1e9).toFixed(3)}G ##########`);
  console.log(`  DB 궁相位: ${궁相位表(DBtoks)}`);

  // ---- 标准兜底路径（benchmark 同口径，预算10000）----
  let 最优 = { dmg: 0, toks: null, 描述: '' };
  const 记 = (dmg, toks, 描述) => { if (dmg > 最优.dmg) 最优 = { dmg, toks, 描述 }; };
  const 构造5 = 排程器.相位对齐构造(inst, d0.ids, BOND, { 最大憋: 5 });
  const 构造99 = 排程器.相位对齐构造(inst, d0.ids, BOND, { 最大憋: 99 });
  console.log(`  构造5=${pct(构造5.dmg, 真값)} 构造99=${pct(构造99.dmg, 真값)}`);
  记(构造5.dmg, 构造5.toks, '构造5');
  记(构造99.dmg, 构造99.toks, '构造99');

  // ---- H1a/H2：爬山预算递增轨迹（从构造5终点续跑，段预算 10k→20k→30k，累计60k）----
  console.log(`\n  [H1a/H2] 爬山预算递增轨迹（起点=构造5解）:`);
  let cur = { toks: 构造5.toks, dmg: 构造5.dmg };
  const h0 = 排程器.爬山(inst, d0.ids, cur.toks, BOND, 10000);
    console.log(`    段1  预算10k: ${pct(h0.dmg, 真값)} 提升${h0.提升}次/评估${h0.评估}`);
  if (h0.dmg > cur.dmg) cur = { toks: h0.toks, dmg: h0.dmg };
  记(cur.dmg, cur.toks, `构造5+爬10k`);
  let 峰值段 = cur.dmg === h0.dmg ? 1 : 0;
  const 段组 = [[2, 20000], [3, 30000]];
  for (const [序号, 预算] of 段组) {
    const h = 排程器.爬山(inst, d0.ids, cur.toks, BOND, 预算);
    const 涨 = h.dmg > cur.dmg;
    console.log(`    段${序号}  预算${预算 / 1000}k: ${pct(h.dmg, 真값)} 提升${h.提升}次/评估${h.评估}${涨 ? ' ★新峰值' : '（无提升）'}`);
    if (涨) { cur = { toks: h.toks, dmg: h.dmg }; 峰值段 = 序号; }
    记(cur.dmg, cur.toks, `构造5+爬累计${序号}段`);
  }
  const 总段数 = 段组.length + 1;
  console.log(`    ⇒ 最后峰值出现在段${峰值段}/${总段数}；其后段评估 ${峰值段 < 总段数 ? '在平顶区消耗' : '无'}`);

  const 爬99 = 排程器.爬山(inst, d0.ids, 构造99.toks, BOND, 10000);
  console.log(`  构造99+爬10k = ${pct(爬99.dmg, 真값)}`);
  记(爬99.dmg, 爬99.toks, '构造99+爬10k');

  // ---- H1b：束扩宽网格（仅队[7]；填充修复后从未测过）----
  if (g.完整) {
    console.log(`\n  [H1b] 束扩宽网格（+爬10k）:`);
    for (const [w, R] of [[10, 4], [20, 4], [30, 4], [10, 8]]) {
      const t0 = Date.now();
      const b = 排程器.束搜索(inst, d0.ids, BOND, { width: w, R, 评分: 'sync', 时限秒: 900 });
      const bh = 排程器.爬山(inst, d0.ids, b.toks, BOND, 10000);
      const 取 = Math.max(b.dmg, bh.dmg);
      console.log(`    w=${String(w).padEnd(2)} R=${R}: 束${pct(b.dmg, 真값)} +爬${pct(取, 真값)}  [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
      记(取, (bh.dmg > b.dmg ? bh : b).toks, `束w${w}R${R}+爬`);
    }
  }

  // ---- H3：最优解 vs DB 的结构距离与相位差 ----
  console.log(`\n  [H3] 结构对照（当前最优 = ${pct(最优.dmg, 真값)} [${最优.描述}]）:`);
  console.log(`    DB   궁相位: ${궁相位表(DBtoks)}`);
  console.log(`    最优 궁相位: ${궁相位表(最优.toks)}`);
  console.log(`    编辑距离(最优,DB) = ${编辑距离(最优.toks, DBtoks)}/65 步`);

  // 逐回合伤害归因：最优解 vs DB
  const 曲线 = toks => {
    const inc = inst.increment;
    if (!inc.initBattle(d0.ids, BOND, -1, null)) return null;
    const out = [];
    for (let k = 0; k < 65; k++) {
      if (!inc.step(toks[k].idx, toks[k].act)) { out.push(null); break; }
      if (k % 5 === 4) out.push(inc.dmgSoFar());
    }
    return out;
  };
  const db曲 = 曲线(DBtoks), 优曲 = 曲线(最优.toks);
  console.log(`    逐回合缺口: ` + db曲.map((c, t) => {
    const o = 优曲[t];
    return (c != null && o != null) ? `t${t + 1}:${((c - o) / 1e9).toFixed(2)}` : `t${t + 1}:?`;
  }).join(' '));
}
console.log('\n完成');
