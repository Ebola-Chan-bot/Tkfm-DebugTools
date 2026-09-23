'use strict';
/*
 * 临时实验L：保守方案的构造式验证——"严格对齐 buff 回合"的真值构造解 vs 束搜索结果。
 *
 * 实验K 为何失败：它用"改写 toks + 修复解码"造变体，但 CD 演化对不上（把궁从 t1 挪到 t2 时，
 *   引擎里该角色 t2 并未就绪）→ 修复解码把非法궁改回평 → 16 变体全部退化回束基线。
 *   ⇒ 正确做法：用引擎真实状态（legalActs/curCd）逐步构造，而不是事后改写 token。
 *
 * 实验K 的相位对照给出确切机理：
 *   DB : 位4궁 @ t2,t5,t9,t13   （首发推迟 1 回合 → 后续全落 buff 齐射回合）
 *   束 : 位4궁 @ t1,t4,t7,t10,t13（首发 t1 → CD 链锁死错位相位，4 次孤立释放）
 *   位5/位1（cd4、未被降 CD）两者完全一致 @ t5,t9,t13。
 *   ⇒ 只有被 10197（注入4，每行动降队友 1CD）催成 3 回合周期的 位4=10193 走偏。
 *   ⇒ sync 填充的憋궁兜底 `最大憋=3` 恰好逼它在 t10 前释放，错过 t5/t9 齐射。
 *
 * 本实验：按 `最大憋 ∈ {3, 5, 8, 99}` 构造"伤害궁只在有 buff궁 的回合放"的整场排程（真值 fastReplay 打分），
 *   与束搜索结果按真值取优 → 能否收回 88% 缺口；同时验证 승나미/칼리버 不回退。
 *   保守原则：不用 rollout 估值排序（那正是剪掉正确路径的剪枝），只认真值。
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

function 取DB队(idsStr) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  let best = null;
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.join(',') !== idsStr) continue;
    if (!best || d.recommend > best.recommend) best = { 队: d.name || idsStr, ids, description: d.description, recommend: d.recommend };
  }
  return best;
}

// 构造式"严格对齐 buff 回合"排程：用引擎真实状态逐步选动作，伤害궁受 最大憋 控制何时才允许释放。
// 与束搜索的 规则快填 同构，但（a）从头构造整场（非续走）（b）最大憋 可配（c）返回 toks 供真值重放。
function 构造同步排程(inst, ids, 最大憋) {
  const inc = inst.increment;
  if (!inc.initBattle(ids, BOND, -1, null)) return null;
  const comp = inst.internals.comp;
  const 原 = inc.原语();
  const F = ids.map(id => { const c = getCharacter(id); return c ? { role: c.role, atkMag: c.atkMag || 0, ultMag: c.ultMag || 0, atk: c.atk || 0 } : null; });
  const 是伤 = i => F[i] && (F[i].ultMag > 0 || F[i].atkMag > 0);
  const 憋计数 = {};
  const toks = [];
  let 本回合buff = false, 当前回合 = -1;

  // 选动作：buff궁最高(2e6) > 伤害궁(1e6档,若允许放) > 딜러평(500) > 탱방(30) > 기타평(100) > 방(1)
  function 选(禁伤궁) {
    let bI = -1, bA = null, bS = -Infinity;
    for (let i = 0; i < 5; i++) {
      const c = comp[i];
      if (!c || c.isActed || !F[i]) continue;
      const 평分 = (F[i].role === 0 ? 500 : 100) + (F[i].atkMag || 0) * F[i].atk / 1000;
      if (평分 > bS) { bS = 평分; bI = i; bA = '평'; }
      const 방분 = (F[i].role === 2 ? 30 : 1);
      if (방분 > bS) { bS = 방분; bI = i; bA = '방'; }
      if (c.curCd <= 0) {
        if (是伤(i)) {
          if (禁伤궁) continue;
          const 궁점수 = 1e6 + 4.5e5 + (F[i].atk * (F[i].ultMag > 0 ? F[i].ultMag : 1)) / 1000;   // 1e6 档（与排程器同档）
          if (궁점수 > bS) { bS = 궁점수; bI = i; bA = '궁'; }
        } else {
          const 궁점수 = 2e6 + F[i].atk / 1e6;   // buff궁 最高档 → 本回合先铺 buff
          if (궁점수 > bS) { bS = 궁점수; bI = i; bA = '궁'; }
        }
      }
    }
    return bI < 0 ? null : { i: bI, a: bA };
  }

  for (let k = 0; k < 65; k++) {
    const t = (k / 5) | 0;
    if (t !== 当前回合) { 当前回合 = t; 本回合buff = false; }
    let sel = 选(false);
    if (!sel) break;
    if (sel.a === '궁') {
      if (!是伤(sel.i)) {
        本回合buff = true;
      } else {
        憋计数[sel.i] = 憋计数[sel.i] || 0;
        // 要憋：本回合还没 buff + 未到 t11 兜底 + 憋次数未达上限
        if (!本回合buff && t < 11 && 憋计数[sel.i] < 最大憋) {
          const alt = 选(true);
          if (alt) { 憋计数[sel.i]++; sel = alt; }
        } else {
          憋计数[sel.i] = 0;
        }
      }
    }
    const ok = sel.a === '평' ? 原.do_atk(sel.i) : (sel.a === '궁' ? 原.do_ult(sel.i) : 原.do_def(sel.i));
    if (!ok) break;
    toks.push({ idx: sel.i, act: sel.a });
  }
  if (toks.length < 65) {
    const 修 = 排程器.修复解码(inst, ids, toks, BOND);
    return 修 ? { toks: 修.toks, dmg: 修.dmg } : null;
  }
  return { toks, dmg: 排程器.重放(inst, ids, toks, BOND) };
}

const 目标队 = [
  '10197,10152,10096,10193,10147',   // 88%队[4]
  '10197,10096,10134,10193,10147',   // 88%队[7]
  '10177,10060,10211,10208,10197',   // 승나미 97.96%（验证不变差）
  '10211,10167,10128,10168,10197',   // 칼리버 100%（验证不回退）
  '10213,10190,10167,10187,10155',   // 후지카 100%（验证不回退）
  '10194,10167,10108,10213,10155',   // 신이카 100%（验证不回退）
];
const inst = 适配.createEngine();
const 憋组 = [3, 5, 8, 99];

for (const idsStr of 目标队) {
  const d0 = 取DB队(idsStr);
  if (!d0) { console.log(idsStr + ' 未找到'); continue; }
  const 목표toks = 排程器.解析指令集(inst, d0.ids, d0.description, BOND);
  const 真값 = 排程器.重放(inst, d0.ids, 목표toks, BOND);
  console.log(`\n########## ${d0.ids.join(',')}  DB=${(真값 / 1e9).toFixed(3)}G  需相位规划=${机制特征.需相位规划(d0.ids)} ##########`);

  const base = 排程器.束搜索(inst, d0.ids, BOND, { width: 10, R: 4, 评分: 'sync', 时限秒: 600 });
  const base爬 = 排程器.爬山(inst, d0.ids, base.toks, BOND, 3000);
  const 现状 = Math.max(base.dmg, base爬.dmg);
  console.log(`束=${(base.dmg / 真값 * 100).toFixed(2)}% 束+爬=${(现状 / 真값 * 100).toFixed(2)}%`);

  let 最优 = { dmg: 现状, 描述: '束+爬(现状)' };
  for (const 憋 of 憋组) {
    const t0 = Date.now();
    const c = 构造同步排程(inst, d0.ids, 憋);
    const ms = Date.now() - t0;
    if (!c || !(c.dmg > 0)) { console.log(`  最大憋=${憋}: 构造失败`); continue; }
    // 构造解也爬山收尾（真值邻域，成本可控）
    const h = 排程器.爬山(inst, d0.ids, c.toks, BOND, 10000);
    const 取 = Math.max(c.dmg, h.dmg);
    const 标 = 取 > 最优.dmg ? ' ★' : '';
    console.log(`  最大憋=${String(憋).padEnd(3)} 构造=${(c.dmg / 真값 * 100).toFixed(2)}% +爬=${(取 / 真값 * 100).toFixed(2)}% (${ms}ms)${标}`);
    if (取 > 最优.dmg) 最优 = { dmg: 取, 描述: `最大憋=${憋} 构造+爬` };
  }
  const pp = (最优.dmg - 现状) / 真값 * 100;
  console.log(`★ 最优 = ${(最优.dmg / 真값 * 100).toFixed(2)}% [${最优.描述}]  ${pp >= 0 ? '+' : ''}${pp.toFixed(2)}pp  缺口 ${((真값 - 现状) / 1e9).toFixed(3)}G → ${((真값 - 最优.dmg) / 1e9).toFixed(3)}G`);

  const 포 = t => t.map((tk, k) => (tk.act === '궁' ? `位${tk.idx + 1}t${((k / 5) | 0) + 1}` : null)).filter(Boolean).join(' ');
  console.log(`  DB相位: ${포(목표toks)}`);
  console.log(`  束相位: ${포(base.toks)}`);
}

