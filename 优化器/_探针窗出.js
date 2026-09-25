'use strict';
/*
 * _探针窗出.js —— 隔离排查：直接测 窗对齐构造 的原始 `出` 数组（设置.全部:true，完全绕过 见S/见toks 选择逻辑）
 * 目的：判定 `出`（~100+ 个 S窗×buff窗×방우선 构造）是否跨进程确定、distinct-toks 到底多少。
 *   若 全部:true 在多个 fresh 进程都给同一 distinct → 出确定，则 爬山候选 distinct=1(去重off) vs =9(去重on) 的
 *   矛盾必来自我的 dedup 编辑污染了非-全部 路径 → 回滚排查。
 */
const 排 = require('./排程器.js');
const 适配 = require('./引擎适配.js');
const 键 = t => t.map(x => x.idx + x.act).join('');
const ids = [10197, 10152, 10096, 10177, 10163];  // 94队
const inst = 适配.createEngine();

// 1) 全部:true 原始 出，重复 3 次同进程，看是否稳定
for (let n = 0; n < 3; n++) {
  const 出 = 排.窗对齐构造(inst, ids, [5, 5, 5, 5, 5], { 全部: true });
  const dm = new Set(出.map(c => c.dmg));
  const tk = new Set(出.map(c => 键(c.toks)));
  console.log(`[全部n${n}] 出.length=${出.length} distinct-dmg=${dm.size} distinct-toks=${tk.size} maxDmg=${(Math.max(...出.map(c => c.dmg)) / 1e9).toFixed(2)}G`);
}
// 2) 爬山候选路径（全部 falsy）去重开 vs 关，重复 3 次
for (const 去重 of [false, true]) {
  for (let n = 0; n < 3; n++) {
    const c = 排.窗对齐构造(inst, ids, [5, 5, 5, 5, 5], { TopK: 3, 去重 });
    const tk = new Set(c.map(x => 键(x.toks)));
    console.log(`[候选 去重=${去重} n${n}] length=${c.length} distinct-toks=${tk.size} dmg=${c.map(x => (x.dmg / 1e9).toFixed(2)).join(',')}`);
  }
}
