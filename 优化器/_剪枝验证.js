'use strict';
/*
 * 临时验证：剪枝A 落地后的正确性与无损性。
 * 核心命题：剪枝(默认开)对【层0/层1】队伍无损，对【层2】队伍根本不禁用任何방（计算禁用防守返回全false）。
 *
 * ① 名单模块自检 + 分层/禁用槽位抽样打印。
 * ② 前瞻贪心（确定性）：剪枝开 {} vs 关 {禁防守剪枝:false}，对比 dmg 与 toks键——层0/1/2 预期【完全一致】
 *    （因为前瞻贪心的最优候选从来不是无机制캐的방，剪掉不改变每步选择）。统计每步被剪的방分支数=禁用槽位数。
 * ③ 束搜索（sync确定性）：层0/层1各抽少量队，剪枝开 vs 关对比 dmg——预期 开 >= 关（被剪방无损，beam纳入更多有效前缀）。
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require('./引擎适配.js');
const 排程器 = require('./排程器.js');
const 防守名单 = require('./防守名单.js');

const inst = 适配.createEngine({ 启用机制表: { binPath: path.join(__dirname, '机制表', 'build', 'mechanisms.bin') } });
const inc = inst.increment;
const 羁绊 = [5, 5, 5, 5, 5];

function 加载队伍库() {
  const p = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
  const buf = fs.readFileSync(p);
  let raw; try { raw = zlib.gunzipSync(buf); } catch (e) { raw = zlib.inflateSync(buf); }
  let txt = raw.toString('utf8'); if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1);
  return JSON.parse(txt);
}
const DB = 加载队伍库();
const 可模拟 = id => { const c = 适配.角色数据().getCharacter(id); return c && c.ok === true && c.rarity === 3 && !!c.hp; };

// ===== ① 自检 + 分层抽样 =====
console.log('===== ① 名单自检 =====');
console.log(`有防守机制=${防守名单.有防守机制清单.length} 授予者=${防守名单.授予者清单.length} 授予者⊆有防守机制=${防守名单.授予者清单.every(防守名单.有防守机制)} (自检已在require时断言)`);

const 见 = new Set();
const 层池 = [[], [], []];
const 随机流 = (() => { let s = 24680; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
for (const d of DB) {
  const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
  if (ids.length !== 5 || !ids.every(可模拟)) continue;
  const 键 = [...ids].sort((a, b) => a - b).join(','); if (见.has(键)) continue; 见.add(键);
  层池[防守名单.分层(ids)].push({ ids, name: d.name || 键 });
}
const 抽样 = (池, n) => 池.map(x => ({ x, r: 随机流() })).sort((a, b) => a.r - b.r).slice(0, n).map(o => o.x);
const 层名 = ['层0(无名单)', '层1(有名单无授予者)', '层2(有授予者)'];
for (let L = 0; L <= 2; L++) {
  const 样 = 抽样(层池[L], 1);
  for (const d of 样) {
    const 禁 = 防守名单.计算禁用防守(d.ids);
    console.log(`  ${层名[L]} 例: ${d.name}[${d.ids}] → 分层=${防守名单.分层(d.ids)} 禁用防守槽位=[${禁.map(x => x ? 1 : 0).join('')}] (1=禁방,共${禁.filter(Boolean).length}个)`);
  }
}

// ===== ② 前瞻贪心 剪枝开/关 一致性 =====
console.log('\n===== ② 前瞻贪心 剪枝on/off 一致性（预期完全一致）=====');
const 样本前瞻 = [...抽样(层池[0], 12), ...抽样(层池[1], 12), ...抽样(层池[2], 6)];
let 一致数 = 0, 不一致数 = 0, 剪枝槽位总 = 0;
for (const d of 样本前瞻) {
  const on = 排程器.先验前瞻贪心(inst, d.ids, 羁绊, {});
  const off = 排程器.先验前瞻贪心(inst, d.ids, 羁绊, { 禁防守剪枝: false });
  if (!on || !off) { console.log(`  ${d.name} 模拟失败`); continue; }
  const 同 = on.dmg === off.dmg && 排程器.toks键(on.toks) === 排程器.toks键(off.toks);
  const 层 = 防守名单.分层(d.ids);
  const 禁数 = 防守名单.计算禁用防守(d.ids).filter(Boolean).length;
  剪枝槽位总 += 禁数;
  if (同) 一致数++; else 不一致数++;
  if (!同) console.log(`  ✗不一致 层${层} ${d.name} on=${on.dmg.toLocaleString()} off=${off.dmg.toLocaleString()}`);
}
console.log(`前瞻贪心: 一致=${一致数} 不一致=${不一致数} / ${样本前瞻.length}队  (层2禁用槽位必为0，on/off恒等)`);

// ===== ③ 束搜索 剪枝开/关 dmg 对比（层0/层1，预期 on>=off）=====
console.log('\n===== ③ 束搜索 剪枝on/off（层0/层1各2队，width=10 sync，预期 on>=off）=====');
const 束设置 = { width: 10, 评分: 'sync', 时限秒: 45 };
const 样本束 = [...抽样(层池[0], 2), ...抽样(层池[1], 2)];
for (const d of 样本束) {
  const 层 = 防守名单.分层(d.ids);
  const t0 = Date.now();
  const on = 排程器.束搜索(inst, d.ids, 羁绊, { ...束设置 });
  const t1 = Date.now();
  const off = 排程器.束搜索(inst, d.ids, 羁绊, { ...束设置, 禁防守剪枝: false });
  const t2 = Date.now();
  const Δ = on.dmg - off.dmg;
  console.log(`  层${层} ${d.name}[${d.ids}] 禁用槽位=${防守名单.计算禁用防守(d.ids).filter(Boolean).length}`);
  console.log(`    on=${on.dmg.toLocaleString()} (${((t1 - t0) / 1000).toFixed(1)}s,扩展${on.扩展数})  off=${off.dmg.toLocaleString()} (${((t2 - t1) / 1000).toFixed(1)}s,扩展${off.扩展数})  Δ=${Δ >= 0 ? '+' : ''}${Δ.toLocaleString()} ${Δ >= 0 ? '✓无损' : '✗有损!'}`);
}
console.log('\n完成');
