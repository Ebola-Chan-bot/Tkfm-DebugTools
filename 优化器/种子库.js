'use strict';
/*
 * 种子库：装载 data.json 全部 66476 条社区已验证队伍，作为搜索的"知识起点"。
 *
 * 价值：实验证明（%TEMP%\邻近起点搜索结果.txt）——
 *   - 编辑球/爬山在"接近最优的起点"上能秒级命中库内已验证最优（1-token 扰动 0.4s、2-token 12s）；
 *   - 但从贪心基线（仅 42% 最优）出发，爬山容易困在局部最优。
 * 因此给每个候选团队提供高质量起点排程比堆评估预算有效得多。
 *
 * 两种接种方式：
 *   1) 精确命中：目标团队的"排序后集合"与库内某条相同 → 直接用该条 description 解析出的 toks
 *      （同一集合可能有多个站位/多条记录，取 recommend 最高者；站位不同时按角色 id 重映射，见下）。
 *   2) 排程迁移：目标团队与库内某队共享 ≥4 人 → 把库内最优指令的 token 位置按"角色对应关系"
 *      重映射到目标站位（双射：共享角色映射到新位置，被换入的角色占据种子队中空出的那个位置）。
 *      迁移动作序列原样保留；若因新角色 CD 不同导致非法（重放=0），上层爬山会从其他起点兜底。
 *
 * 索引结构（内存 ~几十 MB，一次性构建）：
 *   bySet: Map("id升序join" → [ {ids, description, recommend, vote} … ])  精确命中
 *   byChar: Map(角色id → Set(集合键))                                      迁移检索加速
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const 排程器 = require('./排程器.js');
const 适配 = require('./引擎适配.js');

const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');

let _库 = null;
function 装载(数据路径) {
  if (_库) return _库;
  const p = 数据路径 || DATA_JSON;
  const buf = fs.readFileSync(p);
  let raw;
  try { raw = zlib.gunzipSync(buf); } catch (e) { raw = zlib.inflateSync(buf); }
  const arr = JSON.parse(raw.toString('utf8'));
  const bySet = new Map();
  const byChar = new Map();
  for (const d of arr) {
    if (!d.compstr || !d.description) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.length !== 5) continue;
    const 键 = ids.slice().sort((a, b) => a - b).join(',');
    const 项 = { ids, description: d.description, recommend: d.recommend || 0, vote: d.vote || 0 };
    if (!bySet.has(键)) bySet.set(键, []);
    bySet.get(键).push(项);
    for (const id of ids) {
      if (!byChar.has(id)) byChar.set(id, new Set());
      byChar.get(id).add(键);
    }
  }
  // 每个集合键内按 recommend 降序，命中时直接取头
  for (const v of bySet.values()) v.sort((a, b) => b.recommend - a.recommend);
  _库 = { bySet, byChar, 条目数: arr.length };
  return _库;
}

// 把种子的 toks 位置重映射到目标站位：种子站位 sIds → 目标站位 tIds。
// 规则：共享角色 → 目标位置；未共享的角色（种子中的 x 与目标中的 y 一一对应，通常各只有一个）→ 顶替位置。
// 返回 null 表示无法映射（共享角色 < 4 或映射非双射）。
function 迁移toks(seedIds, toks, targetIds) {
  const 位置映射 = new Array(5).fill(-1);
  const 未映射种子位 = [], 未映射目标位 = [];
  for (let s = 0; s < 5; s++) {
    const t = targetIds.indexOf(seedIds[s]);
    if (t >= 0) 位置映射[s] = t;
    else 未映射种子位.push(s);
  }
  for (let t = 0; t < 5; t++) if (!seedIds.includes(targetIds[t])) 未映射目标位.push(t);
  if (未映射种子位.length !== 未映射目标位.length) return null;
  for (let k = 0; k < 未映射种子位.length; k++) 位置映射[未映射种子位[k]] = 未映射目标位[k];
  return toks.map(tk => ({ idx: 位置映射[tk.idx], act: tk.act }));
}

/*
 * 为目标团队（含站位 targetIds）寻找最佳起点排程。
 * 返回 [{ toks(已映射到targetIds站位), 种子ids(原始站位), 种子toks(原始站位toks), 来源, 种子键, 种子伤害 }, …]
 * 按期望质量降序（调用方逐个重放校验，取 >0 者作深搜起点）。
 *   - 来源='精确'：库内同集合队伍的最优指令（站位不同则同时给"迁移到targetIds"与"原始站位"两种）；
 *   - 来源='迁移4'：共享 4 人的库内队伍中 recommend 最高者的指令（位置重映射到 targetIds）；
 *   - 无种子兜底由调用方贪心基线负责，这里不生成。
 * 之所以同时返回"原始站位种子"：库内最优可能依赖特定站位，迁移到 targetIds 后未必最优，
 * 让上层把 s.ids 也作为一个候选站位参与竞争（站位层本就穷举全部 120，这里只是提前锁定高质量者）。
 * limit共享4：迁移候选最多尝试的条数（默认 8，按 recommend 降序）。
 */
function 找起点(inst, targetIds, BOND, limit共享4) {
  BOND = BOND || [5, 5, 5, 5, 5];
  limit共享4 = limit共享4 || 8;
  const 库 = 装载();
  const 目标键 = targetIds.slice().sort((a, b) => a - b).join(',');
  const 结果 = [];

  // 1) 精确命中
  const 精确 = 库.bySet.get(目标键);
  if (精确) {
    for (const s of 精确.slice(0, 3)) { // 同集合可能有多条记录（不同站位/提交），试前3
      const 种子toks = 排程器.解析指令集(inst, s.ids, s.description, BOND); // 以种子站位解析
      if (!种子toks) continue;
      const 同站位 = s.ids.join(',') === targetIds.join(',');
      const 迁移 = 同站位 ? 种子toks : 迁移toks(s.ids, 种子toks, targetIds);
      // (a) 迁移到 targetIds 站位的起点
      if (迁移) 结果.push({ toks: 迁移, 种子ids: s.ids, 种子toks, 来源: '精确', 种子键: 目标键, 种子伤害: s.recommend });
      // (b) 原始站位起点（站位不同才额外加，站位相同时与(a)重复）
      if (!同站位) 结果.push({ toks: 种子toks, 站位: s.ids, 种子ids: s.ids, 种子toks, 来源: '精确-原位', 种子键: 目标键, 种子伤害: s.recommend });
    }
  }

  // 2) 迁移（共享4人）：借助 byChar 索引，只扫目标团队角色出现过的集合键
  const 候选键 = new Map(); // 键 → 共享人数
  for (const id of targetIds) {
    const 集 = 库.byChar.get(id);
    if (!集) continue;
    for (const k of 集) {
      if (k === 目标键) continue;
      候选键.set(k, (候选键.get(k) || 0) + 1);
    }
  }
  const 共享4 = [...候选键.entries()].filter(([, n]) => n >= 4).map(([k]) => k);
  共享4.sort((a, b) => (库.bySet.get(b)[0].recommend || 0) - (库.bySet.get(a)[0].recommend || 0));
  for (const k of 共享4.slice(0, limit共享4)) {
    const s = 库.bySet.get(k)[0];
    const 种子toks = 排程器.解析指令集(inst, s.ids, s.description, BOND);
    if (!种子toks) continue;
    const m = 迁移toks(s.ids, 种子toks, targetIds);
    if (m) 结果.push({ toks: m, 种子ids: s.ids, 种子toks, 来源: '迁移4', 种子键: k, 种子伤害: s.recommend });
  }
  return 结果;
}

module.exports = { 装载, 找起点, 迁移toks, DATA_JSON };
