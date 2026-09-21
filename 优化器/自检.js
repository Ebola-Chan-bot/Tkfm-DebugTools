'use strict';
/*
 * 优化器自检（M2 地基校验）
 *
 * 目的：在写任何搜索逻辑之前，先锁死"评估器是对的"。三条断言：
 *   ① 引擎适配层能正常建实例（new Function 求值 characterJson 成功、deps 齐备）。
 *   ② 反混淆版引擎（默认 calcSrc）对库内强队算出的伤害 == data.json 的 recommend 字段（= 线上混淆版+服务器口径）。
 *      这是"反混淆没有失真"的权威证据；若不一致，主程序应把 calcSrc 切回线上混淆版。
 *   ③ 增量步进逐 token 驱动 == 整场 battle()（已在 %TEMP% 验过，这里对新工程再复验一遍，防回归）。
 *
 * 运行：node 自检.js
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const 适配 = require('./引擎适配.js');

const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');

const 日志 = [];
const 说 = (s) => { 日志.push(s); console.log(s); };

function 加载队伍库() {
  const buf = fs.readFileSync(DATA_JSON);
  // data.json 为 gzip；个别环境可能是 zlib，二者都试
  let raw;
  try { raw = zlib.gunzipSync(buf); } catch (e) { raw = zlib.inflateSync(buf); }
  return JSON.parse(raw.toString('utf8'));
}

function main() {
  说('================ 优化器自检 ================');

  // ① 适配层建实例
  let inst;
  try {
    inst = 适配.createEngine();
    说('[①] createEngine 成功，API: ' + Object.keys(inst).join(',') + ' / increment: ' + Object.keys(inst.increment).join(','));
  } catch (e) {
    说('[①] ❌ createEngine 失败: ' + e.message); process.exit(1);
  }
  const 可用 = 适配.可模拟SSR清单();
  说('    角色总数=' + 适配.角色表().length + '  可模拟SSR(ok&rarity3&有hp/atk)=' + 可用.length);

  // ② 反混淆版 vs recommend 对齐（取高伤队，recommend 为羁绊全5的13回合伤害）
  const arr = 加载队伍库();
  const 强队 = arr.filter(d => d.recommend > 5e9 && d.description &&
    String(d.compstr).split(/\s+/).filter(Boolean).length === 5)
    .sort((a, b) => b.recommend - a.recommend).slice(0, 40);
  let 对齐符 = 0, 对齐不符 = [];
  for (const d of 强队) {
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    // 该队若含 N/R 或 ok:false 角色，getCharacter 后 setDefault 返回 null → battle 得 0，跳过（recommend 也不该有）
    if (ids.some(id => { const c = 适配.角色数据().getCharacter(id); return !c || c.ok !== true || c.rarity !== 3 || !c.hp; })) continue;
    const 本地 = inst.battle(ids, d.description, [5,5,5,5,5], -1, null);
    if (本地 === d.recommend) 对齐符++; else 对齐不符.push({ 队: d.name, 线上: d.recommend, 本地, 差: d.recommend - 本地 });
  }
  说('[②] 反混淆引擎 vs data.json.recommend（' + (对齐符 + 对齐不符.length) + ' 队）: 逐位一致 ' + 对齐符 + '，不一致 ' + 对齐不符.length);
  对齐不符.slice(0, 6).forEach(x => 说('    ✗ ' + JSON.stringify(x)));
  const 对齐通过 = 对齐不符.length === 0 && 对齐符 >= 20;

  // ③ 增量步进 vs 整场 battle（新工程复验）
  let 步符 = 0, 步不符 = [];
  for (const d of 强队.slice(0, 20)) {
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.some(id => { const c = 适配.角色数据().getCharacter(id); return !c || c.ok !== true || c.rarity !== 3 || !c.hp; })) continue;
    const 整场 = inst.battle(ids, d.description, [5,5,5,5,5], -1, null);
    // 增量：用引擎自带的 setCommandCustom 解析成 token 序列再逐步步进
    const toks = (inst.internals.setCommandCustom(ids, d.description, [5,5,5,5,5]) || []).slice(0, 65);
    if (toks.length < 65) continue;
    const ok = inst.increment.initBattle(ids, [5,5,5,5,5], -1, null);
    if (!ok) continue;
    let 合法 = true;
    for (let i = 0; i < 65; i++) {
      if (!inst.increment.step(Number(toks[i][0]) - 1, toks[i][1])) { 合法 = false; break; }
    }
    const 增量 = inst.increment.dmgSoFar();
    if (合法 && inst.increment.isFinished() && 增量 === 整场) 步符++; else 步不符.push({ 队: d.name, 整场, 增量, 合法, fin: inst.increment.isFinished() });
  }
  说('[③] 增量步进 vs 整场 battle: 一致 ' + 步符 + '，不一致 ' + 步不符.length);
  步不符.slice(0, 6).forEach(x => 说('    ✗ ' + JSON.stringify(x)));
  const 步进通过 = 步不符.length === 0 && 步符 >= 15;

  说('================ 结论 ================');
  说('① 适配层可用: ✅   ② 反混淆==线上: ' + (对齐通过 ? '✅' : '❌（需切 calcSrc=线上混淆版）') + '   ③ 增量==整场: ' + (步进通过 ? '✅' : '❌'));
  const 全通过 = 对齐通过 && 步进通过;
  说(全通过 ? '自检全部通过，可安全构建搜索器。' : '自检未全通过，见上方 ❌ 项。');
  fs.writeFileSync(process.env.TEMP + '\\优化器自检结果.txt', 日志.join('\n'), 'utf8');
  process.exit(全通过 ? 0 : 2);
}

main();
