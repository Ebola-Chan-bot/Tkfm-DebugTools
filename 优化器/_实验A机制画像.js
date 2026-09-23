'use strict';
/*
 * 临时实验A：8 支 benchmark 队上对比 旧静态画像 vs 新机制画像 的判别力。
 * 真值 = 基线实测达成率（束+爬山）：
 *   얀코A 100 / 칼리버 100 / 후지카 100 / 신이카 100 / 얀코B 98.34 / 승나미 95.39 / 얀코D 88.05 / 얀코E 88.33
 * 旧画像缺陷：칼리버(100%) 与 얀코D(71.5%) 静态特征逐位相同分不了级（施工计划 阶段5 动机）。
 * 验收判据：新机制画像应把 达成率≤90% 的队（얀코D/얀코E/승나미）与 100% 的队分开——
 *   看 延迟供给占比/门控密度 等字段是否单调相关。
 * 复用 内层benchmark.选队 的同款逻辑（复制自该文件，避免改动 benchmark 本体）。
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));
const 难例特征 = require(path.join(__dirname, '难例特征.js'));
const 机制特征 = require(path.join(__dirname, '机制特征.js'));

const BOND = [5, 5, 5, 5, 5];
const 特例ID = new Set([10162, 10205]);
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');

// ---- 选队（与 内层benchmark.js 完全同款）----
function 选队(N) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const inst = 适配.createEngine();
  const getCharacter = 适配.角色数据().getCharacter;
  const 缓存 = new Map();
  function 角色(id) { if (!缓存.has(id)) 缓存.set(id, getCharacter(id)); return 缓存.get(id); }
  const 可模拟 = id => { const c = 角色(id); return c && c.ok === true && c.rarity === 3 && c.hp && c.atk; };
  const 名单 = new Map();
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.length !== 5 || ids.some(id => !id || !可模拟(id) || 特例ID.has(id))) continue;
    const 键 = ids.join(',');
    const 旧 = 名单.get(键);
    if (!旧 || d.recommend > 旧.recommend) 名单.set(键, { 队: d.name, ids, description: d.description, recommend: d.recommend });
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

// 队级机制画像：聚合每角色机制特征（候选设计A——先算出来看判别力，接入方式后定）
function 队机制画像(ids) {
  let 延迟供给者数 = 0, 注入数 = 0, 门控数 = 0, 叠层数 = 0, 开关数 = 0, 周期数 = 0;
  let 궁공급总 = 0, 궁공급延迟 = 0, 槽位数 = 0, CD操纵 = 0;
  for (const id of ids) {
    const f = 机制特征.画像(id);
    if (!f) continue;
    注入数 += f.注入数; 门控数 += f.门控数; 叠层数 += f.叠层数; 开关数 += f.开关数;
    周期数 += f.周期数; CD操纵 += f.CD操纵数; 槽位数 += f.槽位数;
    const 对外 = f.궁供给队 + f.궁供给Boss;
    궁공급总 += 对外;
    if (机制特征.是延迟供给者(id)) { 延迟供给者数++; 궁공급延迟 += 对外; }
  }
  return {
    延迟供给者数, 延迟供给占比: 궁공급总 > 0 ? 궁공급延迟 / 궁공급总 : 0,
    注入数, 门控数, 叠层数, 开关数, 周期数, CD操纵, 槽位数,
    机制复杂度: 注入数 * 2 + 门控数 + 叠层数 + 开关数 + 周期数,
  };
}

const 队 = 选队(8);
console.log(`选队 ${队.length} 支\n`);
console.log('队名\tids\t旧分级\t旧密度\t旧对齐\t|延迟者\t延迟占比\t注入\t门控\t叠层\t开关\t周期\t复杂度');
for (const d of 队) {
  const 旧 = 难例特征.同步画像(d.ids, id => { const r = 机制特征.画像(id); return r || { role: 2, cd: 13, ultMag: 0, atkMag: 0 }; });
  const 机 = 队机制画像(d.ids);
  console.log([d.队, d.ids.join(','), 旧.分级, 旧.密度, 旧.对齐度,
    '|', 机.延迟供给者数, (机.延迟供给占比 * 100).toFixed(0) + '%', 机.注入数, 机.门控数, 机.叠层数, 机.开关数, 机.周期数, 机.机制复杂度].join('\t'));
}
