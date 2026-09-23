'use strict';
/*
 * 临时诊断3：승나미 DB 前缀在死亡层(s13)的评分细节。
 * 早宽到能活过前 12 层（诊断2 实锤 s2~s12 排1），聚焦打印 s11~s15 每层的
 *   db评分 / top评分 / width선评分 / db排名 / 该步DB动作 → 量化"评分低估"在死亡点的确切幅度。
 * 这决定评分器升级的切入点：若 db评分 与 top评分 差距小(<2%) 却排名跌出 → 是"密集平票+非均匀偏差"；
 *   若差距大 → 是 sync 填充对该前缀续航严重低估。
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
const ids = [10177, 10060, 10211, 10208, 10197];

const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
let best = null;
for (const d of arr) {
  if (!(d.recommend > 0) || !d.description) continue;
  const cid = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
  if (cid.join(',') !== ids.join(',')) continue;
  if (!best || d.recommend > best.recommend) best = d;
}
const inst = 适配.createEngine();
const 목표toks = 排程器.解析指令集(inst, ids, best.description, BOND);
const 真값 = 排程器.重放(inst, ids, 목표toks, BOND);
console.log('승나미 DB =', 真값.toLocaleString(), ' t3(s10-14)动作:', 목표toks.slice(10, 15).map(t => `位${t.idx + 1}${t.act}`).join(' '));

const r = 排程器.束搜索(inst, ids, BOND, {
  width: 10, 早期宽度: 30, 早期层数: 16, R: 4, 评分: 'sync', 时限秒: 600,
  诊断: { 目标toks: 목표toks, 真值: 真값 },
});
console.log('束 =', r.dmg.toLocaleString(), `(${(r.dmg / 真값 * 100).toFixed(2)}%)\n`);
console.log('s\tt动\tDB动作\tdb排名\tdb评分G\ttop评分G\twidth线G\tdb-top差\t低估率');
for (const row of r.诊断报告) {
  if (row.s < 9 || row.s > 16 || row.db排名 < 0) continue;
  const tk = 목표toks[row.s];
  const dbG = row.db评分 / 1e9, topG = row.top评分 / 1e9, wlG = row.width线评分 / 1e9;
  console.log(`${row.s}\tt${((row.s / 5) | 0) + 1}.${row.s % 5 + 1}\t位${tk.idx + 1}${tk.act}\t${row.db排名}\t${dbG.toFixed(3)}\t${topG.toFixed(3)}\t${wlG.toFixed(3)}\t${((row.db评分 - row.top评分) / 1e9).toFixed(3)}\t${(row.db评分 / 真값 * 100).toFixed(1)}%`);
}
