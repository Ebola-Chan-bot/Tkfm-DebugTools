'use strict';
/*
 * _验证检查点.js —— captureState/restoreState 对 fastReplay 的 bit 级差分 + 成本实测
 *
 * 放行门槛（任一不满足即判失败，搜索路径不得接入）：
 *   ① 零偏差：对每支队的每个切点 p∈[0,65]，
 *        initBattle → 裸放前缀[0,p) → capture → 裸放后缀[p,65) 的 dmgSoFar()
 *        === fastReplay(整场) === restore(capture) 后再裸放后缀[p,65) 的 dmgSoFar()
 *      逐位相等（含 restore 幂等：同一 cp 反复还原结果不变，证 snapshot 未被引擎 push 污染）。
 *   ② 动态字段覆盖：对含 10134(turnHeal)/10140(isFirstTurnActed/check) 的队，capture 后
 *      人为破坏这些字段再 restore，必须复原——证明动态扫描确实纳入 characterToJson 遗漏的字段。
 *   ③ 成本：capture/restore 单次耗时相对"一步 do_* / 整场 fastReplay"的比值，用于预估提速上限。
 *
 * 口径与 内层benchmark 一致：DB recommend 降序 + 站位去重 + 本地 bit 级复现（重放===recommend）。
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const 适配 = require('./引擎适配.js');
const 排程器 = require('./排程器.js');

const argv = process.argv.slice(2);
const 取数 = (flag, 默认) => { const a = argv.find(x => x.startsWith(flag + '=')); return a ? Number(a.split('=')[1]) : 默认; };
const 队上限 = 取数('--队', 15);
const BOND = [5, 5, 5, 5, 5];
const 风险角色 = new Set([10134, 10140]);   // 动态标量字段（characterToJson 固定集遗漏）

const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');

// ---- 载入候选队（recommend 降序 + 站位键去重）----
function 载入候选() {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const 名单 = new Map();
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.length !== 5) continue;
    const 键 = ids.join(',');                                   // 保序键（口径=内层benchmark：站位不同即不同队）
    const 旧 = 名单.get(键);
    if (!旧 || d.recommend > 旧.recommend) 名单.set(键, { 队: d.name, ids, description: d.description, recommend: d.recommend });
  }
  return [...名单.values()].sort((a, b) => b.recommend - a.recommend);
}

// ---- 裸放 [from,to) token（不经 step/saveCur），与 fastReplay 主体同构 ----
function 裸放(原语, toks, from, to) {
  for (let i = from; i < to; i++) {
    const { idx, act } = toks[i];
    let ok;
    if (act === '평') ok = 原语.do_atk(idx);
    else if (act === '궁') ok = 原语.do_ult(idx);
    else ok = 原语.do_def(idx);
    if (!ok) return false;
  }
  return true;
}

function main() {
  const inst = 适配.createEngine();
  const inc = inst.increment;
  const 原语 = inc.原语();
  const 候选 = 载入候选();

  // 选队：top bit级复现强队 + 强制并入含风险角色的队
  const 选定 = [];
  const seen = new Set();
  for (const d of 候选) {
    if (选定.length >= 队上限) break;
    const toks = 排程器.解析指令集(inst, d.ids, d.description, BOND);
    if (!toks) continue;
    if (排程器.重放(inst, d.ids, toks, BOND) !== d.recommend) continue;   // 仅收 bit 级复现队
    const 键 = d.ids.join(',');
    if (seen.has(键)) continue;
    seen.add(键); 选定.push({ ...d, toks });
  }
  // 强制风险覆盖（限 10 支：10134/10140 在强队中占比极高，全量会拖爆验证时长）
  let 风险已收 = 0;
  for (const d of 候选) {
    if (风险已收 >= 10) break;
    if (!d.ids.some(id => 风险角色.has(id))) continue;
    const 键 = d.ids.join(',');
    if (seen.has(键)) continue;
    const toks = 排程器.解析指令集(inst, d.ids, d.description, BOND);
    if (!toks) continue;
    if (排程器.重放(inst, d.ids, toks, BOND) <= 0) continue;   // 风险队只要求合法重放（不强制===recommend）
    seen.add(键); 选定.push({ ...d, toks, 风险: true }); 风险已收++;
  }

  console.log(`[验证检查点] 选定 ${选定.length} 队（含风险角色队 ${选定.filter(x => x.风险).length}）`);

  let 总切点 = 0, 总失配 = 0, 覆盖命中 = 0;
  for (const d of 选定) {
    const baseline = inc.fastReplay(d.ids, d.toks, BOND, -1, null);
    if (baseline <= 0) { console.log(`  [跳过] ${d.队} baseline=${baseline}`); continue; }
    let 失配 = 0, 幂等失配 = 0;
    for (let p = 0; p <= 65; p++) {
      inc.initBattle(d.ids, BOND, -1, null);
      if (!裸放(原语, d.toks, 0, p)) break;              // 前缀非法（不应发生，baseline 合法）
      const cp = inc.captureState();
      if (!裸放(原语, d.toks, p, 65)) break;
      const dmgA = inc.dmgSoFar();
      if (dmgA !== baseline) 失配++;
      // restore 幂等：连做 3 次，每次后缀结果一致
      for (let r = 0; r < 3; r++) {
        inc.restoreState(cp);
        if (!裸放(原语, d.toks, p, 65)) { 幂等失配++; break; }
        if (inc.dmgSoFar() !== baseline) 幂等失配++;
      }
      总切点++;
    }
    // 动态字段覆盖断言（风险队）
    let 覆盖 = '';
    if (d.风险) {
      inc.initBattle(d.ids, BOND, -1, null);
      裸放(原语, d.toks, 0, 30);
      const cp = inc.captureState();
      const boss0 = inst.internals.boss, comp0 = inst.internals.comp;
      const 字段名 = [];
      for (let i = 0; i < 5; i++) for (const k of ['turnHeal', 'isFirstTurnActed', 'check']) if (k in comp0[i]) 字段名.push([i, k]);
      if (字段名.length) {
        // 破坏
        for (const [i, k] of 字段名) comp0[i][k] = '__破坏__';
        // 还原
        inc.restoreState(cp);
        let 全复原 = true;
        for (const [i, k] of 字段名) if (comp0[i][k] === '__破坏__') 全复原 = false;
        覆盖 = 全复原 ? `覆盖[${字段名.map(x => x[1]).join(',')}]✓` : `覆盖✗(${字段名.length}字段有未复原)`;
        if (全复原) 覆盖命中++; else 总失配++;
      } else 覆盖 = '覆盖[无该字段实例]';
    }
    总失配 += 失配 + 幂等失配;
    const 标 = (失配 + 幂等失配) === 0 ? '✓' : '✗';
    console.log(`  ${标} ${d.队}[${d.ids}] DB=${d.recommend.toLocaleString()} 失配=${失配} 幂等失配=${幂等失配} ${覆盖}`);
  }

  // ---- 成本实测 ----
  const d0 = 选定.find(x => !x.风险) || 选定[0];
  let 每步us = 0, capUs = 0, resUs = 0;
  if (d0) {
    const R = 300;
    let t0 = process.hrtime.bigint();
    for (let r = 0; r < R; r++) inc.fastReplay(d0.ids, d0.toks, BOND, -1, null);
    let t1 = process.hrtime.bigint();
    每步us = Number(t1 - t0) / 1000 / R / 65;

    inc.initBattle(d0.ids, BOND, -1, null); 裸放(原语, d0.toks, 0, 30);
    const N = 20000;
    t0 = process.hrtime.bigint();
    for (let r = 0; r < N; r++) inc.captureState();
    t1 = process.hrtime.bigint();
    capUs = Number(t1 - t0) / 1000 / N;

    const cp = inc.captureState();
    t0 = process.hrtime.bigint();
    for (let r = 0; r < N; r++) inc.restoreState(cp);
    t1 = process.hrtime.bigint();
    resUs = Number(t1 - t0) / 1000 / N;
  }

  console.log('\n[成本] 每步do_*≈' + 每步us.toFixed(2) + 'us  capture≈' + capUs.toFixed(2) + 'us  restore≈' + resUs.toFixed(2) + 'us');
  console.log('[成本] capture/步=' + (capUs / 每步us).toFixed(2) + '  restore/步=' + (resUs / 每步us).toFixed(2) +
    '  (检查点=capture+restore)/步=' + ((capUs + resUs) / 每步us).toFixed(2));
  console.log(`\n[结论] 总切点=${总切点} 总失配=${总失配} 风险队覆盖命中=${覆盖命中} → ${总失配 === 0 ? '零偏差，放行' : '✗有偏差，禁止接入'}`);
}

main();
